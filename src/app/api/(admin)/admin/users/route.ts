import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { createRequestLogger } from "@/lib/request-logger";
import { listUsersOrderedByCreation } from "@/lib/repositories/userRepository";
import { updateUserViaAdmin } from "@/lib/services/userService";

// GET /api/admin/users
// - Requires admin session.
// - Returns all users sorted by creation, normalizing semester values.
export async function GET(request: NextRequest) {
  const baseLogger = createRequestLogger(request, request.nextUrl.pathname, request.method);
  const adminUser = await requireAdmin();

  if (!adminUser) {
    baseLogger(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(request, request.nextUrl.pathname, request.method, adminUser.id);

  const users = listUsersOrderedByCreation();

  logRequest(200, { count: users.length });

  return NextResponse.json({ users });
}

// PATCH /api/admin/users
// - Requires admin session.
// - Accepts JSON body with positive integer `id` plus updated `name`, 8-digit `studentNumber`, `role` in ROLE_SET, and optional `semester`.
// - Enforces validation and uniqueness before applying updates.
export async function PATCH(request: NextRequest) {
  const baseLogger = createRequestLogger(request, request.nextUrl.pathname, request.method);
  const adminUser = await requireAdmin();

  if (!adminUser) {
    baseLogger(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(request, request.nextUrl.pathname, request.method, adminUser.id);

  type Payload = {
    id?: number;
    name?: string;
    studentNumber?: string;
    email?: string | null;
    role?: string;
    semester?: number;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    logRequest(400, { reason: "invalid_json" });
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const result = updateUserViaAdmin(payload);

  if (result.status === "invalid_id") {
    logRequest(400, { reason: "invalid_id", id: payload.id });
    return NextResponse.json({ error: "유효한 사용자 ID가 필요합니다." }, { status: 400 });
  }

  if (result.status === "missing_name") {
    logRequest(400, { reason: "missing_name", id: payload.id });
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  if (result.status === "invalid_student_number") {
    logRequest(400, { reason: "invalid_student_number", id: payload.id });
    return NextResponse.json({ error: "학번은 8자리 숫자여야 합니다." }, { status: 400 });
  }

  if (result.status === "invalid_email") {
    logRequest(400, { reason: "invalid_email", id: payload.id });
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (result.status === "invalid_role") {
    logRequest(400, { reason: "invalid_role", id: payload.id });
    return NextResponse.json({ error: "역할 정보가 올바르지 않습니다." }, { status: 400 });
  }

  if (result.status === "invalid_semester") {
    logRequest(400, { reason: "invalid_semester", id: payload.id, semester: result.semester });
    return NextResponse.json({ error: "년도는 4자리 숫자로 입력해주세요." }, { status: 400 });
  }

  if (result.status === "duplicate_student_number") {
    logRequest(409, { reason: "duplicate_student_number", id: payload.id });
    return NextResponse.json({ error: "중복된 학번입니다." }, { status: 409 });
  }

  if (result.status === "duplicate_email") {
    logRequest(409, { reason: "duplicate_email", id: payload.id });
    return NextResponse.json({ error: "중복된 이메일입니다." }, { status: 409 });
  }

  if (result.status === "not_found") {
    logRequest(404, { reason: "not_found", id: payload.id });
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (result.status !== "success") {
    logRequest(500, { reason: "update_failed", id: payload.id });
    return NextResponse.json({ error: "사용자 수정 중 오류가 발생했습니다." }, { status: 500 });
  }

  logRequest(200, { id: result.user.id });

  return NextResponse.json({ user: result.user });
}
