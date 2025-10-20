import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import {
  cleanupExpiredSessions,
  getUserBySessionToken,
} from "@/lib/session";
import { logUserRequest } from "@/lib/logs";

type RankingRow = {
  id: number;
  userId: number;
  publicId: string;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  position: number;
};

export async function GET(request: NextRequest) {
  cleanupExpiredSessions();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) {
    logUserRequest({
      path: "/api/rankings",
      method: request.method,
      status: 401,
      metadata: { reason: "missing_session" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = getUserBySessionToken(sessionToken);

  if (!sessionUser) {
    logUserRequest({
      path: "/api/rankings",
      method: request.method,
      status: 401,
      metadata: { reason: "invalid_session" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectParam = request.nextUrl.searchParams.get("project");
  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : 1;

  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4) {
    logUserRequest({
      userId: sessionUser.id,
      path: "/api/rankings",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_project", projectNumber },
    });
    return NextResponse.json(
      { error: "유효하지 않은 프로젝트 번호입니다." },
      { status: 400 },
    );
  }

  const yearParam = request.nextUrl.searchParams.get("year");
  const isValidYearParam = yearParam ? /^\d{4}$/.test(yearParam) : false;
  const parsedYear = isValidYearParam ? Number.parseInt(yearParam!, 10) : undefined;

  const db = getDb();

  const yearRows = db
    .prepare(
      `
        SELECT DISTINCT
          CASE
            WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
            ELSE semester
          END AS year
        FROM users
        ORDER BY year DESC
      `,
    )
    .all() as { year: number }[];

  const distinctYears = yearRows.map((row) => row.year);
  let selectedYear = isValidYearParam ? (parsedYear as number) : undefined;
  if (typeof selectedYear !== "number") {
    selectedYear = distinctYears[0] ?? new Date().getFullYear();
  }

  const yearSet = new Set(distinctYears);
  yearSet.add(selectedYear);
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  const rankingBaseQuery = `
    WITH best_scores AS (
      SELECT
        es.id,
        es.user_id,
        es.project_number,
        es.score,
        es.evaluated_at,
        ROW_NUMBER() OVER (
          PARTITION BY es.user_id
          ORDER BY es.score DESC, es.evaluated_at ASC
        ) AS per_user_rank
      FROM evaluation_scores es
      INNER JOIN users u ON u.id = es.user_id
      WHERE es.project_number = ?
        AND (
          CASE
            WHEN u.semester >= 100000 THEN CAST(u.semester / 100 AS INTEGER)
            ELSE u.semester
          END
        ) = ?
    ),
    ranked AS (
      SELECT
        id,
        user_id,
        project_number,
        score,
        evaluated_at,
        ROW_NUMBER() OVER (ORDER BY score DESC, evaluated_at ASC) AS overall_rank
      FROM best_scores
      WHERE per_user_rank = 1
    )
  `;

  const rankings = db
    .prepare(
      `
        ${rankingBaseQuery}
        SELECT
          r.id,
          r.user_id AS userId,
          u.public_id AS publicId,
          r.project_number AS projectNumber,
          r.score,
          r.evaluated_at AS evaluatedAt,
          r.overall_rank AS position
        FROM ranked r
        INNER JOIN users u ON u.id = r.user_id
        ORDER BY r.overall_rank ASC
      `,
    )
    .all(projectNumber, selectedYear) as RankingRow[];

  const myRankRow =
    sessionUser.semester === selectedYear
      ? (db
          .prepare(
            `
              ${rankingBaseQuery}
              SELECT
                overall_rank AS rank,
                score,
                evaluated_at AS evaluatedAt
              FROM ranked
              WHERE user_id = ?
              LIMIT 1
            `,
          )
          .get(projectNumber, selectedYear, sessionUser.id) as
          | { rank: number; score: number; evaluatedAt: string }
          | undefined)
      : undefined;

  const myBestScore = myRankRow
    ? { score: myRankRow.score, evaluatedAt: myRankRow.evaluatedAt }
    : null;
  const myRank = myRankRow?.rank ?? null;

  logUserRequest({
    userId: sessionUser.id,
    path: "/api/rankings",
    method: request.method,
    status: 200,
    metadata: { projectNumber, selectedYear },
  });

  return NextResponse.json({
    rankings,
    myBestScore,
    projectNumber,
    selectedYear,
    availableYears,
    myRank,
  });
}
