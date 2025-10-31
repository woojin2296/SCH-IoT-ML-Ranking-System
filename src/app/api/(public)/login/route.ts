import { NextRequest, NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  cleanupExpiredSessions,
  createSession,
  revokeSessionsForUser,
} from "@/lib/session";
import { createRequestLogger } from "@/lib/request-logger";

export const dynamic = "force-dynamic";

type LoginPayload = {
  studentNumber?: string;
  password?: string;
};

type UserRow = {
  id: number;
  studentNumber: string;
  name: string | null;
  publicId: string;
  role: string;
  semester: number;
  isActive: number;
  passwordHash: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
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

  const studentNumber = payload.studentNumber?.trim();
  const password = payload.password;

  if (!studentNumber || !password) {
    logRequest(400, { reason: "missing_fields", studentNumber });
    return NextResponse.json(
      { error: "학번과 비밀번호를 모두 입력해주세요." },
      { status: 400 },
    );
  }

  if (!/^\d{8}$/.test(studentNumber)) {
    logRequest(400, { reason: "invalid_student_number", studentNumber });
    return NextResponse.json(
      { error: "학번 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const db = getDb();

  const user = db
    .prepare(
      `
        SELECT
          id,
          student_number AS studentNumber,
          name,
          public_id AS publicId,
          role,
          CASE
            WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
            ELSE semester
          END AS semester,
          is_active AS isActive,
          password_hash AS passwordHash,
          last_login_at AS lastLoginAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE student_number = ?
        LIMIT 1
      `,
    )
    .get(studentNumber) as UserRow | undefined;

  if (!user) {
    logRequest(401, { reason: "not_registered", studentNumber });
    return NextResponse.json(
      { error: "등록되지 않은 학번입니다." },
      { status: 401 },
    );
  }

  if (!user.isActive) {
    logRequest(403, { reason: "inactive_account", studentNumber }, user.id);
    return NextResponse.json(
      { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
      { status: 403 },
    );
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    logRequest(401, { reason: "wrong_password", studentNumber }, user.id);
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }

  cleanupExpiredSessions();
  revokeSessionsForUser(user.id);
  db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

  const session = createSession(user.id);

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

  logRequest(200, { studentNumber }, user.id);

  return response;
}
