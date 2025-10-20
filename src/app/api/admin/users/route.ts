import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { logUserRequest } from "@/lib/logs";

const ROLE_SET = new Set(["user", "admin"]);

export async function GET() {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    logUserRequest({
      path: "/api/admin/users",
      method: "GET",
      status: 401,
      metadata: { reason: "unauthorized" },
    });
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
          CASE
            WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
            ELSE semester
          END AS semester,
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

  logUserRequest({
    userId: adminUser.id,
    path: "/api/admin/users",
    method: "GET",
    status: 200,
    metadata: { count: users.length },
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    logUserRequest({
      path: "/api/admin/users",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    id?: number;
    name?: string;
    studentNumber?: string;
    role?: string;
    semester?: number;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_json" },
    });
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { id, name, studentNumber, role } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_id", id },
    });
    return NextResponse.json({ error: "유효한 사용자 ID가 필요합니다." }, { status: 400 });
  }

  const trimmedName = name?.trim();
  const trimmedStudentNumber = studentNumber?.trim();
  const normalizedRole = role?.trim();
  const semesterValue = typeof payload.semester === "number" ? payload.semester : undefined;

  if (!trimmedName) {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 400,
      metadata: { reason: "missing_name", id },
    });
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  if (!trimmedStudentNumber || !/^\d{8}$/.test(trimmedStudentNumber)) {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_student_number", id },
    });
    return NextResponse.json({ error: "학번은 8자리 숫자여야 합니다." }, { status: 400 });
  }

  if (!normalizedRole || !ROLE_SET.has(normalizedRole)) {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_role", id },
    });
    return NextResponse.json({ error: "역할 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const normalizedSemester =
    semesterValue !== undefined ? semesterValue : currentYear;

  if (
    !Number.isInteger(normalizedSemester) ||
    normalizedSemester < 2000 ||
    normalizedSemester > currentYear + 10
  ) {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_semester", id, semester: normalizedSemester },
    });
    return NextResponse.json({ error: "년도는 4자리 숫자로 입력해주세요." }, { status: 400 });
  }

  const db = getDb();

  try {
    const stmt = db.prepare(
      `
        UPDATE users
        SET name = ?, student_number = ?, role = ?, semester = ?
        WHERE id = ?
      `,
    );

    const result = stmt.run(
      trimmedName,
      trimmedStudentNumber,
      normalizedRole,
      normalizedSemester,
      id,
    );

    if (result.changes === 0) {
      logUserRequest({
        userId: adminUser.id,
        path: "/api/admin/users",
        method: request.method,
        status: 404,
        metadata: { reason: "not_found", id },
      });
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
            CASE
              WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
              ELSE semester
            END AS semester,
            public_id AS publicId,
            last_login_at AS lastLoginAt,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM users
          WHERE id = ?
        `,
      )
      .get(id);

    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 200,
      metadata: { id },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      logUserRequest({
        userId: adminUser.id,
        path: "/api/admin/users",
        method: request.method,
        status: 409,
        metadata: { reason: "duplicate_student_number", id },
      });
      return NextResponse.json({ error: "중복된 학번입니다." }, { status: 409 });
    }

    console.error("Failed to update user", error);
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/users",
      method: request.method,
      status: 500,
      metadata: { id, reason: "update_failed" },
    });
    return NextResponse.json({ error: "사용자 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
