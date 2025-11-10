import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { getRequestIp } from "@/lib/request";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { createNotice, deleteNotice, getAllNotices, updateNotice } from "@/lib/services/noticeService";

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin();
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  if (!adminUser) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/admin/notices",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notices = getAllNotices();
  logUserRequest({
    source: resolveRequestSource(adminUser.id, clientIp),
    path: "/api/admin/notices",
    method: request.method,
    status: 200,
    metadata: { count: notices.length },
    ipAddress: resolvedIp,
  });
  return NextResponse.json({ notices });
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin();
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  if (!adminUser) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/admin/notices",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = { message?: string; isActive?: boolean };
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const msg = payload.message?.trim();
  const isActive = Boolean(payload.isActive);
  if (!msg) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }
  const created = createNotice(msg, isActive);
  if (!created) {
    return NextResponse.json({ error: "공지 생성 실패" }, { status: 500 });
  }
  logUserRequest({
    source: resolveRequestSource(adminUser.id, clientIp),
    path: "/api/admin/notices",
    method: request.method,
    status: 201,
    metadata: { id: created.id },
    ipAddress: resolvedIp,
  });
  return NextResponse.json({ notice: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin();
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = { id?: number; message?: string; isActive?: boolean };
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!payload.id || !Number.isInteger(payload.id) || payload.id <= 0) {
    return NextResponse.json({ error: "유효한 ID가 필요합니다." }, { status: 400 });
  }

  const updated = updateNotice(payload.id, {
    message: payload.message?.trim(),
    isActive: payload.isActive,
  });
  if (!updated) {
    return NextResponse.json({ error: "수정할 공지를 찾을 수 없거나 변경사항이 없습니다." }, { status: 404 });
  }
  logUserRequest({
    source: resolveRequestSource(adminUser.id, clientIp),
    path: "/api/admin/notices",
    method: request.method,
    status: 200,
    metadata: { id: updated.id },
    ipAddress: resolvedIp,
  });
  return NextResponse.json({ notice: updated });
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  type Payload = { id?: number };
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (!payload.id || !Number.isInteger(payload.id) || payload.id <= 0) {
    return NextResponse.json({ error: "유효한 ID가 필요합니다." }, { status: 400 });
  }
  const ok = deleteNotice(payload.id);
  return ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: "삭제 실패" }, { status: 404 });
}

