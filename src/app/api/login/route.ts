import { NextRequest, NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  cleanupExpiredSessions,
  createSession,
  revokeSessionsForUser,
} from "@/lib/session";

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
  isActive: number;
  passwordHash: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function POST(request: NextRequest) {
  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const studentNumber = payload.studentNumber?.trim();
  const password = payload.password;

  if (!studentNumber || !password) {
    return NextResponse.json(
      { error: "학번과 비밀번호를 모두 입력해주세요." },
      { status: 400 },
    );
  }

  if (!/^\d{8}$/.test(studentNumber)) {
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
    return NextResponse.json(
      { error: "등록되지 않은 학번입니다." },
      { status: 401 },
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
      { status: 403 },
    );
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
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

  return response;
}
