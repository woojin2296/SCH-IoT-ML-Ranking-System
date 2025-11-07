import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";

import { requireAdmin } from "@/lib/auth-guard";
import { logEvaluationChange } from "@/lib/services/evaluationLogService";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { resolveStoredFilePath } from "@/lib/uploads";
import { getRequestIp } from "@/lib/request";
import {
  getAdminEvaluationScores,
  getEvaluationScoreSummary,
  removeEvaluationScore,
} from "@/lib/services/evaluationScoreService";

// GET /api/admin/scores
// - Requires admin session.
// - Returns all evaluation scores with normalized attachment flags.
export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    const clientIp = getRequestIp(request);
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/admin/scores",
      method: "GET",
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: clientIp ?? "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";

  const normalizedScores = getAdminEvaluationScores();

  logUserRequest({
    source: resolveRequestSource(adminUser.id, clientIp),
    path: "/api/admin/scores",
    method: "GET",
    status: 200,
    ipAddress: resolvedIp,
  });

  return NextResponse.json({ scores: normalizedScores });
}

// DELETE /api/admin/scores
// - Requires admin session.
// - Accepts JSON body with positive integer `id`; deletes score and attachment.
// - Logs evaluation change for audit trail.
export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    const unauthIp = getRequestIp(request);
    logUserRequest({
      source: resolveRequestSource(null, unauthIp),
      path: "/api/admin/scores",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: unauthIp ?? "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";

  const logRequest = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      source: resolveRequestSource(adminUser.id, clientIp),
      path: "/api/admin/scores",
      method: "DELETE",
      status,
      metadata,
      ipAddress: resolvedIp,
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

  const existing = getEvaluationScoreSummary(id);

  if (!existing) {
    logRequest(404, { reason: "not_found", id });
    return NextResponse.json({ error: "삭제할 기록을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const removed = removeEvaluationScore(id);

    if (!removed) {
      logRequest(500, { action: "delete", scoreId: existing.id, reason: "delete_failed" });
      return NextResponse.json({ error: "결과 삭제 중 오류가 발생했습니다." }, { status: 500 });
    }

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
