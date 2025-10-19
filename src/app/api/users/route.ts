import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cleanupExpiredSessions, createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type CreateUserPayload = {
  name: string;
  studentNumber: string;
  password: string;
  role?: string;
};

export async function POST(request: NextRequest) {
  let payload: CreateUserPayload;

  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const name = payload.name?.trim();
  const studentNumber = payload.studentNumber?.trim();
  const password = payload.password;
  const allowedRoles = new Set(["user", "admin"]);
  const roleRaw =
    typeof payload.role === "string" && payload.role.trim().length > 0
      ? payload.role.trim().toLowerCase()
      : "user";
  const role = allowedRoles.has(roleRaw) ? roleRaw : "user";

  if (!name || !studentNumber || !password) {
    return NextResponse.json(
      { error: "이름, 학번, 비밀번호는 필수 입력값입니다." },
      { status: 400 },
    );
  }

  if (!/^[가-힣a-zA-Z\s]{2,}$/u.test(name)) {
    return NextResponse.json(
      { error: "이름은 한글 또는 영문으로 입력해주세요." },
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
  const generatePublicId = () => randomBytes(4).toString("hex");

  let publicId = generatePublicId();
  while (
    db
      .prepare("SELECT 1 FROM users WHERE public_id = ?")
      .get(publicId)
  ) {
    publicId = generatePublicId();
  }
  const passwordHash = await hashPassword(password);

  try {
    const insert = db.prepare(
      `
        INSERT INTO users (student_number, password_hash, name, public_id, role)
        VALUES (?, ?, ?, ?, ?)
      `,
    );
    const result = insert.run(studentNumber, passwordHash, name, publicId, role);

    const userId = result.lastInsertRowid as number;

    db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      userId,
    );

    const record = db
      .prepare(
        `
          SELECT
            id,
            student_number AS studentNumber,
            name,
            public_id AS publicId,
            role,
            last_login_at AS lastLoginAt,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM users
          WHERE id = ?
        `,
      )
      .get(userId);

    cleanupExpiredSessions();
    const session = createSession(userId);

    const response = NextResponse.json(
      { success: true, user: record },
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

    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return NextResponse.json(
        { error: "이미 존재하는 학번입니다." },
        { status: 409 },
      );
    }

    console.error("Failed to create user", error);
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
