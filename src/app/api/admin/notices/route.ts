import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { getRequestIp } from "@/lib/request";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { createNotice, deleteNotice, getAllNotices, updateNotice } from "@/lib/services/noticeService";

const PATH = "/api/admin/notices";

export async function GET(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const adminUser = await requireAdmin();
  const logRequest = createAdminNoticeLogger(request, clientIp, adminUser?.id ?? null);

  if (!adminUser) {
    logRequest(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notices = getAllNotices();
  logRequest(200, { count: notices.length });
  return NextResponse.json({ notices });
}

export async function POST(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const adminUser = await requireAdmin();
  const logRequest = createAdminNoticeLogger(request, clientIp, adminUser?.id ?? null);

  if (!adminUser) {
    logRequest(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = { message?: string; isActive?: boolean };
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    logRequest(400, { reason: "invalid_json" });
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const msg = payload.message?.trim();
  const isActive = Boolean(payload.isActive);
  if (!msg) {
    logRequest(400, { reason: "missing_message" });
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }
  const created = createNotice(msg, isActive);
  if (!created) {
    logRequest(500, { reason: "creation_failed" });
    return NextResponse.json({ error: "공지 생성 실패" }, { status: 500 });
  }
  logRequest(201, { id: created.id });
  return NextResponse.json({ notice: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const adminUser = await requireAdmin();
  const logRequest = createAdminNoticeLogger(request, clientIp, adminUser?.id ?? null);

  if (!adminUser) {
    logRequest(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = { id?: number; message?: string; isActive?: boolean };
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    logRequest(400, { reason: "invalid_json" });
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!payload.id || !Number.isInteger(payload.id) || payload.id <= 0) {
    logRequest(400, { reason: "invalid_id", id: payload.id });
    return NextResponse.json({ error: "유효한 ID가 필요합니다." }, { status: 400 });
  }

  const updated = updateNotice(payload.id, {
    message: payload.message?.trim(),
    isActive: payload.isActive,
  });
  if (!updated) {
    logRequest(404, { reason: "not_found_or_no_change", id: payload.id });
    return NextResponse.json({ error: "수정할 공지를 찾을 수 없거나 변경사항이 없습니다." }, { status: 404 });
  }
  logRequest(200, { id: updated.id });
  return NextResponse.json({ notice: updated });
}

export async function DELETE(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const adminUser = await requireAdmin();
  const logRequest = createAdminNoticeLogger(request, clientIp, adminUser?.id ?? null);

  if (!adminUser) {
    logRequest(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  type Payload = { id?: number };
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    logRequest(400, { reason: "invalid_json" });
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (!payload.id || !Number.isInteger(payload.id) || payload.id <= 0) {
    logRequest(400, { reason: "invalid_id", id: payload.id });
    return NextResponse.json({ error: "유효한 ID가 필요합니다." }, { status: 400 });
  }
  const ok = deleteNotice(payload.id);
  if (!ok) {
    logRequest(404, { reason: "not_found", id: payload.id });
    return NextResponse.json({ error: "삭제 실패" }, { status: 404 });
  }
  logRequest(200, { id: payload.id });
  return NextResponse.json({ success: true });
}

function createAdminNoticeLogger(request: NextRequest, clientIp: string | null, userId: number | null) {
  const resolvedIp = clientIp ?? "unknown";
  return (status: number, metadata?: Record<string, unknown>) => {
    logUserRequest({
      source: resolveRequestSource(userId, clientIp),
      path: PATH,
      method: request.method,
      status,
      metadata,
      ipAddress: resolvedIp,
    });
  };
}
