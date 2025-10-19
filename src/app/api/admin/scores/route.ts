import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { logEvaluationChange } from "@/lib/logs";

export async function GET() {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const scores = db
    .prepare(
      `
        SELECT
          es.id,
          es.user_id AS userId,
          u.public_id AS userPublicId,
          u.student_number AS studentNumber,
          u.name,
          es.project_number AS projectNumber,
          es.score,
          es.evaluated_at AS evaluatedAt
        FROM evaluation_scores es
        INNER JOIN users u ON u.id = es.user_id
        ORDER BY es.evaluated_at DESC
      `,
    )
    .all();

  return NextResponse.json({ scores });
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    id?: number;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { id } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "유효한 기록 ID가 필요합니다." }, { status: 400 });
  }

  const db = getDb();

  const existing = db
    .prepare(
      `
        SELECT
          es.id,
          es.user_id AS userId,
          es.project_number AS projectNumber,
          es.score
        FROM evaluation_scores es
        WHERE es.id = ?
      `,
    )
    .get(id) as { id: number; userId: number; projectNumber: number; score: number } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "삭제할 기록을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const stmt = db.prepare(
      `
        DELETE FROM evaluation_scores
        WHERE id = ?
      `,
    );

    stmt.run(id);

    logEvaluationChange({
      actorUserId: adminUser.id,
      action: "delete",
      scoreId: existing.id,
      targetUserId: existing.userId,
      projectNumber: existing.projectNumber,
      score: existing.score,
      payload: { source: "admin-delete" },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete evaluation score", error);
    return NextResponse.json({ error: "결과 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
