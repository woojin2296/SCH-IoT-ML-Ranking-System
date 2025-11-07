import { NextRequest, NextResponse } from "next/server";

import { createRequestLogger } from "@/lib/request-logger";
import { authenticateUser, establishUserSession } from "@/lib/services/authService";

export const dynamic = "force-dynamic";

type LoginPayload = {
  studentNumber?: string;
  password?: string;
};

// POST /api/login
// - Accepts JSON body with 8-digit `studentNumber` and `password`.
// - Rejects inactive accounts and invalid credentials; responds with 401/403/400 errors.
// - On success revokes previous sessions, issues new session cookie, and returns user profile.
export async function POST(request: NextRequest) {
  let payload: LoginPayload;
  const logRequest = createRequestLogger(request, "/api/login", request.method);

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    logRequest(400, { reason: "invalid_json" });
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const authResult = await authenticateUser(payload.studentNumber, payload.password);

  const normalizedStudentNumber =
    authResult.status === "inactive" || authResult.status === "wrong_password" || authResult.status === "success"
      ? authResult.user.studentNumber
      : authResult.status === "invalid_student_number" || authResult.status === "not_found"
        ? authResult.studentNumber
        : payload.studentNumber?.trim();

  if (authResult.status === "missing_credentials") {
    logRequest(400, { reason: "missing_fields", studentNumber: normalizedStudentNumber });
    return NextResponse.json(
      { error: "학번과 비밀번호를 모두 입력해주세요." },
      { status: 400 },
    );
  }

  if (authResult.status === "invalid_student_number") {
    logRequest(400, { reason: "invalid_student_number", studentNumber: normalizedStudentNumber });
    return NextResponse.json(
      { error: "학번 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (authResult.status === "not_found") {
    logRequest(401, { reason: "not_registered", studentNumber: normalizedStudentNumber });
    return NextResponse.json(
      { error: "등록되지 않은 학번입니다." },
      { status: 401 },
    );
  }

  const user = authResult.user;

  if (authResult.status === "inactive") {
    logRequest(403, { reason: "inactive_account", studentNumber: normalizedStudentNumber }, user.id);
    return NextResponse.json(
      { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
      { status: 403 },
    );
  }

  if (authResult.status === "wrong_password") {
    logRequest(401, { reason: "wrong_password", studentNumber: normalizedStudentNumber }, user.id);
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }

  const session = establishUserSession(user.id);

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      studentNumber: user.studentNumber,
      name: user.name,
      publicId: user.publicId,
      role: user.role,
      semester: user.semester,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });

  response.cookies.set({
    name: "session_token",
    value: session.sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  logRequest(200, { studentNumber: normalizedStudentNumber }, user.id);

  return response;
}
