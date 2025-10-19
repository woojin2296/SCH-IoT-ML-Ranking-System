import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";

const ROLE_SET = new Set(["user", "admin"]);

export async function GET() {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const users = db
    .prepare(
      `
        SELECT
          id,
          student_number AS studentNumber,
          name,
          role,
          public_id AS publicId,
          last_login_at AS lastLoginAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        ORDER BY created_at ASC
      `,
    )
    .all();

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    id?: number;
    name?: string;
    studentNumber?: string;
    role?: string;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { id, name, studentNumber, role } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "유효한 사용자 ID가 필요합니다." }, { status: 400 });
  }

  const trimmedName = name?.trim();
  const trimmedStudentNumber = studentNumber?.trim();
  const normalizedRole = role?.trim();

  if (!trimmedName) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  if (!trimmedStudentNumber || !/^\d{8}$/.test(trimmedStudentNumber)) {
    return NextResponse.json({ error: "학번은 8자리 숫자여야 합니다." }, { status: 400 });
  }

  if (!normalizedRole || !ROLE_SET.has(normalizedRole)) {
    return NextResponse.json({ error: "역할 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const db = getDb();

  try {
    const stmt = db.prepare(
      `
        UPDATE users
        SET name = ?, student_number = ?, role = ?
        WHERE id = ?
      `,
    );

    const result = stmt.run(trimmedName, trimmedStudentNumber, normalizedRole, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const user = db
      .prepare(
        `
          SELECT
            id,
            student_number AS studentNumber,
            name,
            role,
            public_id AS publicId,
            last_login_at AS lastLoginAt,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM users
          WHERE id = ?
        `,
      )
      .get(id);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "중복된 학번입니다." }, { status: 409 });
    }

    console.error("Failed to update user", error);
    return NextResponse.json({ error: "사용자 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
