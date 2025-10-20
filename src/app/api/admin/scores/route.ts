import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";

import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { logEvaluationChange, logUserRequest } from "@/lib/logs";
import { resolveStoredFilePath } from "@/lib/uploads";
import { getRequestIp } from "@/lib/request";

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    const clientIp = getRequestIp(request);
    logUserRequest({
      path: "/api/admin/scores",
      method: "GET",
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: clientIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getRequestIp(request);

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
          es.evaluated_at AS evaluatedAt,
          es.file_name AS fileName,
          es.file_size AS fileSize,
          CASE WHEN es.file_path IS NOT NULL THEN 1 ELSE 0 END AS hasFile
        FROM evaluation_scores es
        INNER JOIN users u ON u.id = es.user_id
        ORDER BY es.evaluated_at DESC
      `,
    )
    .all();

  const normalizedScores = (scores as Array<Record<string, unknown>>).map((score) => ({
    ...score,
    hasFile: Boolean(score.hasFile),
  }));

  logUserRequest({
    userId: adminUser.id,
    path: "/api/admin/scores",
    method: "GET",
    status: 200,
    ipAddress: clientIp,
  });

  return NextResponse.json({ scores: normalizedScores });
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    logUserRequest({
      path: "/api/admin/scores",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: getRequestIp(request),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getRequestIp(request);

  const logRequest = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/scores",
      method: "DELETE",
      status,
      metadata,
      ipAddress: clientIp,
    });

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
    logRequest(400, { reason: "invalid_id", id });
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
          es.score,
          es.file_path AS filePath
        FROM evaluation_scores es
        WHERE es.id = ?
      `,
    )
    .get(id) as { id: number; userId: number; projectNumber: number; score: number; filePath: string | null } | undefined;

  if (!existing) {
    logRequest(404, { reason: "not_found", id });
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

    const absoluteStoredPath = resolveStoredFilePath(existing.filePath ?? null);
    if (absoluteStoredPath) {
      try {
        await unlink(absoluteStoredPath);
      } catch (unlinkError) {
        console.error("Failed to delete attachment", unlinkError);
      }
    }

    logEvaluationChange({
      actorUserId: adminUser.id,
      action: "delete",
      scoreId: existing.id,
      targetUserId: existing.userId,
      projectNumber: existing.projectNumber,
      score: existing.score,
      payload: { source: "admin-delete" },
    });

    logRequest(200, { action: "delete", scoreId: existing.id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete evaluation score", error);
    logRequest(500, { action: "delete", scoreId: existing.id, reason: "delete_failed" });
    return NextResponse.json({ error: "결과 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
