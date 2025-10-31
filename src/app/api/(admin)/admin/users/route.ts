import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { createRequestLogger } from "@/lib/request-logger";

const ROLE_SET = new Set(["user", "admin"]);

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

  const { id, name, studentNumber, role } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    logRequest(400, { reason: "invalid_id", id });
    return NextResponse.json({ error: "유효한 사용자 ID가 필요합니다." }, { status: 400 });
  }

  const trimmedName = name?.trim();
  const trimmedStudentNumber = studentNumber?.trim();
  const normalizedRole = role?.trim();
  const semesterValue = typeof payload.semester === "number" ? payload.semester : undefined;

  if (!trimmedName) {
    logRequest(400, { reason: "missing_name", id });
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  if (!trimmedStudentNumber || !/^\d{8}$/.test(trimmedStudentNumber)) {
    logRequest(400, { reason: "invalid_student_number", id });
    return NextResponse.json({ error: "학번은 8자리 숫자여야 합니다." }, { status: 400 });
  }

  if (!normalizedRole || !ROLE_SET.has(normalizedRole)) {
    logRequest(400, { reason: "invalid_role", id });
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
    logRequest(400, { reason: "invalid_semester", id, semester: normalizedSemester });
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
      logRequest(404, { reason: "not_found", id });
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

    logRequest(200, { id });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      logRequest(409, { reason: "duplicate_student_number", id });
      return NextResponse.json({ error: "중복된 학번입니다." }, { status: 409 });
    }

    console.error("Failed to update user", error);
    logRequest(500, { id, reason: "update_failed" });
    return NextResponse.json({ error: "사용자 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
