import { NextRequest, NextResponse } from "next/server";

import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { getRequestIp } from "@/lib/request";
import { registerUser } from "@/lib/services/userService";

export const dynamic = "force-dynamic";

type CreateUserPayload = {
  name: string;
  studentNumber: string;
  email?: string;
  password: string;
  role?: string;
};

// POST /api/users
// - Public endpoint for self-signup.
// - Accepts JSON body with `name`, 8-digit `studentNumber`, `password`, optional `role` ("user"/"admin").
// - Creates user, issues session cookie, and returns normalized record; handles duplicate student numbers.
export async function POST(request: NextRequest) {
  let payload: CreateUserPayload;
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";

  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_json" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await registerUser(payload);
  } catch (error) {
    console.error("Failed to register user", error);
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 500,
      metadata: { reason: "insert_failed", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  if (result.status === "missing_fields") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "missing_fields", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이름, 학번, 비밀번호는 필수 입력값입니다." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_name") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_name", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이름은 한글 또는 영문으로 입력해주세요." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_student_number") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_student_number", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "학번 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_role") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_role", role: payload.role },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "역할 정보가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_email") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_email", email: payload.email },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이메일 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (result.status === "duplicate_student_number") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 409,
      metadata: { reason: "duplicate_student_number", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이미 존재하는 학번입니다." },
      { status: 409 },
    );
  }

  if (result.status === "duplicate_email") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 409,
      metadata: { reason: "duplicate_email", email: payload.email?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이미 등록된 이메일입니다." },
      { status: 409 },
    );
  }

  if (result.status !== "success") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 500,
      metadata: { reason: "unexpected_error" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const { user, session, role } = result;

  const response = NextResponse.json(
    { success: true, user },
    { status: 201 },
  );

  response.cookies.set({
    name: "session_token",
    value: session.sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  logUserRequest({
    source: resolveRequestSource(user.id, clientIp),
    path: "/api/users",
    method: request.method,
    status: 201,
    metadata: { studentNumber: user.studentNumber, role },
    ipAddress: resolvedIp,
  });

  return response;
}
