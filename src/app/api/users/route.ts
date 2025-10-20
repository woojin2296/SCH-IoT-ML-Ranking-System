import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cleanupExpiredSessions, createSession } from "@/lib/session";
import { logUserRequest } from "@/lib/logs";

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
    logUserRequest({
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_json" },
    });
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
    logUserRequest({
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "missing_fields", studentNumber },
    });
    return NextResponse.json(
      { error: "이름, 학번, 비밀번호는 필수 입력값입니다." },
      { status: 400 },
    );
  }

  if (!/^[가-힣a-zA-Z\s]{2,}$/u.test(name)) {
    logUserRequest({
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_name", studentNumber },
    });
    return NextResponse.json(
      { error: "이름은 한글 또는 영문으로 입력해주세요." },
      { status: 400 },
    );
  }

  if (!/^\d{8}$/.test(studentNumber)) {
    logUserRequest({
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_student_number", studentNumber },
    });
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
    const currentYear = new Date().getFullYear();
    const insert = db.prepare(
      `
        INSERT INTO users (student_number, password_hash, name, public_id, role, semester)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    );
    const result = insert.run(
      studentNumber,
      passwordHash,
      name,
      publicId,
      role,
      currentYear,
    );

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
            CASE
              WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
              ELSE semester
            END AS semester,
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

    logUserRequest({
      userId,
      path: "/api/users",
      method: request.method,
      status: 201,
      metadata: { studentNumber, role },
    });

    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      logUserRequest({
        path: "/api/users",
        method: request.method,
        status: 409,
        metadata: { reason: "duplicate_student_number", studentNumber },
      });
      return NextResponse.json(
        { error: "이미 존재하는 학번입니다." },
        { status: 409 },
      );
    }

    console.error("Failed to create user", error);
    logUserRequest({
      path: "/api/users",
      method: request.method,
      status: 500,
      metadata: { reason: "insert_failed", studentNumber },
    });
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
