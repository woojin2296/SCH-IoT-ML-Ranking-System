import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import {
  cleanupExpiredSessions,
  getUserBySessionToken,
} from "@/lib/session";

type RankingRow = {
  id: number;
  userId: number;
  publicId: string;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
};

export async function GET(request: NextRequest) {
  cleanupExpiredSessions();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = getUserBySessionToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectParam = request.nextUrl.searchParams.get("project");
  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : 1;

  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4) {
    return NextResponse.json(
      { error: "유효하지 않은 프로젝트 번호입니다." },
      { status: 400 },
    );
  }

  const db = getDb();

  const rankings = db
    .prepare(
      `
        SELECT
          es.id,
          es.user_id AS userId,
          u.public_id AS publicId,
          es.project_number AS projectNumber,
          es.score,
          es.evaluated_at AS evaluatedAt
        FROM evaluation_scores es
        INNER JOIN users u ON u.id = es.user_id
        WHERE es.project_number = ?
          AND es.id IN (
            SELECT id FROM (
              SELECT
                id,
                ROW_NUMBER() OVER (
                  PARTITION BY user_id
                  ORDER BY score DESC, evaluated_at ASC
                ) AS rn
              FROM evaluation_scores
              WHERE project_number = ?
            ) ranked
            WHERE rn = 1
          )
        ORDER BY es.score DESC, es.evaluated_at ASC
        LIMIT 10
      `,
    )
    .all(projectNumber, projectNumber) as RankingRow[];

  const myBestScore = db
    .prepare(
      `
        SELECT
          score,
          evaluated_at AS evaluatedAt
        FROM evaluation_scores
        WHERE user_id = ?
          AND project_number = ?
        ORDER BY score DESC, evaluated_at ASC
        LIMIT 1
      `,
    )
    .get(sessionUser.id, projectNumber) as
    | { score: number; evaluatedAt: string }
    | undefined;

  return NextResponse.json({
    rankings,
    myBestScore: myBestScore ?? null,
    projectNumber,
  });
}
