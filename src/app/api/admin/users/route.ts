import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { getRequestIp } from "@/lib/request";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { deleteUserById, findUserById, updateUserById } from "@/lib/repositories/userRepository";

type PatchPayload = {
  id?: number;
  role?: string;
};

const ALLOWED_ROLES = new Set(["user", "admin"]);
const PATH = "/api/admin/users";

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin();
  const clientIp = getRequestIp(request);
  const source = resolveRequestSource(adminUser?.id ?? null, clientIp);

  if (!adminUser) {
    logUserRequest({
      source,
      path: PATH,
      method: "PATCH",
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: clientIp ?? "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PatchPayload;
  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { id, role } = payload;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "유효한 사용자 ID가 필요합니다." }, { status: 400 });
  }

  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "허용되지 않은 역할입니다." }, { status: 400 });
  }

  const existing = findUserById(id);
  if (!existing) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = updateUserById({ id, role });
  if (!updated) {
    return NextResponse.json({ error: "변경 사항이 없습니다." }, { status: 400 });
  }

  logUserRequest({
    source,
    path: PATH,
    method: "PATCH",
    status: 200,
    metadata: { targetUserId: id, role },
    ipAddress: clientIp ?? "unknown",
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin();
  const clientIp = getRequestIp(request);
  const source = resolveRequestSource(adminUser?.id ?? null, clientIp);

  if (!adminUser) {
    logUserRequest({
      source,
      path: PATH,
      method: "DELETE",
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: clientIp ?? "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type DeletePayload = { id?: number };
  let payload: DeletePayload;
  try {
    payload = (await request.json()) as DeletePayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { id } = payload;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "유효한 사용자 ID가 필요합니다." }, { status: 400 });
  }

  if (id === adminUser.id) {
    return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  const existing = findUserById(id);
  if (!existing) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const removed = deleteUserById(id);
  if (!removed) {
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }

  logUserRequest({
    source,
    path: PATH,
    method: "DELETE",
    status: 200,
    metadata: { targetUserId: id },
    ipAddress: clientIp ?? "unknown",
  });

  return NextResponse.json({ success: true });
}
