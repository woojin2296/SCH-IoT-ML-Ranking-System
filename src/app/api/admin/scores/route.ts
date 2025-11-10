import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { getRequestIp } from "@/lib/request";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { removeScoreById } from "@/lib/services/scoreService";

const PATH = "/api/admin/scores";

export async function DELETE(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  const adminUser = await requireAdmin();
  if (!adminUser) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: PATH,
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = resolveRequestSource(adminUser.id, clientIp);

  type Payload = { id?: number | string };
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    logUserRequest({
      source,
      path: PATH,
      method: "DELETE",
      status: 400,
      metadata: { reason: "invalid_json" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const idRaw = payload.id;
  const scoreId =
    typeof idRaw === "string"
      ? Number.parseInt(idRaw, 10)
      : typeof idRaw === "number"
        ? idRaw
        : Number.NaN;

  if (!Number.isInteger(scoreId) || scoreId <= 0) {
    logUserRequest({
      source,
      path: PATH,
      method: "DELETE",
      status: 400,
      metadata: { reason: "invalid_id", id: idRaw },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "유효하지 않은 ID 입니다." }, { status: 400 });
  }

  const removed = removeScoreById(scoreId);
  if (!removed) {
    logUserRequest({
      source,
      path: PATH,
      method: "DELETE",
      status: 404,
      metadata: { reason: "not_found", id: scoreId },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "이미 삭제되었거나 존재하지 않습니다." }, { status: 404 });
  }

  logUserRequest({
    source,
      path: PATH,
      method: "DELETE",
      status: 200,
      metadata: { id: scoreId },
      ipAddress: resolvedIp,
    });

  return NextResponse.json({ success: true });
}
