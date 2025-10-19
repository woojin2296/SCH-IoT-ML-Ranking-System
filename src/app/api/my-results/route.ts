import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guard";
import { logEvaluationChange } from "@/lib/logs";

type ResultRow = {
  id: number;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
};

export async function GET(request: NextRequest) {
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectParam = request.nextUrl.searchParams.get("project");
  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : null;

  if (projectNumber !== null && (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4)) {
    return NextResponse.json(
      { error: "유효하지 않은 프로젝트 번호입니다." },
      { status: 400 },
    );
  }

  const db = getDb();

  const sql = `
    SELECT
      id,
      project_number AS projectNumber,
      score,
      evaluated_at AS evaluatedAt
    FROM evaluation_scores
    WHERE user_id = ?
      ${projectNumber !== null ? "AND project_number = ?" : ""}
    ORDER BY project_number ASC, evaluated_at DESC
  `;

  const results = projectNumber !== null
    ? db.prepare(sql).all(sessionUser.id, projectNumber)
    : db.prepare(sql).all(sessionUser.id);

  return NextResponse.json({
    results: results as ResultRow[],
    projectNumber,
  });
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    projectNumber?: number;
    score?: number;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const projectNumber = payload.projectNumber;
  const score = payload.score;

  if (
    typeof projectNumber !== "number" ||
    !Number.isInteger(projectNumber) ||
    projectNumber < 1 ||
    projectNumber > 4
  ) {
    return NextResponse.json(
      { error: "프로젝트 번호가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (typeof score !== "number" || Number.isNaN(score) || !Number.isFinite(score)) {
    return NextResponse.json(
      { error: "점수는 유효한 숫자여야 합니다." },
      { status: 400 },
    );
  }

  const db = getDb();

  try {
    const insert = db.prepare(
      `
        INSERT INTO evaluation_scores (user_id, project_number, score)
        VALUES (?, ?, ?)
      `,
    );

    const result = insert.run(sessionUser.id, projectNumber, score);

    logEvaluationChange({
      actorUserId: sessionUser.id,
      action: "create",
      scoreId: Number(result.lastInsertRowid),
      targetUserId: sessionUser.id,
      projectNumber,
      score,
      payload: { source: "self-submit" },
    });

    return NextResponse.json(
      { success: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to insert evaluation score", error);
    return NextResponse.json(
      { error: "결과 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    id?: number;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const { id } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "유효한 기록 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const db = getDb();

  const existing = db
    .prepare(
      `
        SELECT
          id,
          user_id AS userId,
          project_number AS projectNumber,
          score
        FROM evaluation_scores
        WHERE id = ? AND user_id = ?
      `,
    )
    .get(id, sessionUser.id) as
    | { id: number; userId: number; projectNumber: number; score: number }
    | undefined;

  if (!existing) {
    return NextResponse.json(
      { error: "삭제할 기록을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    const stmt = db.prepare(
      `
        DELETE FROM evaluation_scores
        WHERE id = ? AND user_id = ?
      `,
    );

    stmt.run(id, sessionUser.id);

    logEvaluationChange({
      actorUserId: sessionUser.id,
      action: "delete",
      scoreId: existing.id,
      targetUserId: existing.userId,
      projectNumber: existing.projectNumber,
      score: existing.score,
      payload: { source: "self-delete" },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete evaluation score", error);
    return NextResponse.json(
      { error: "결과 삭제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
