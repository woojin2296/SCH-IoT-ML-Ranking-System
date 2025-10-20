import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { logUserRequest } from "@/lib/logs";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    studentNumber: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { studentNumber } = await params;
    const normalizedStudentNumber = studentNumber?.trim();

    if (!normalizedStudentNumber || !/^\d{8}$/.test(normalizedStudentNumber)) {
      logUserRequest({
        path: `/api/users/${studentNumber}`,
        method: request.method,
        status: 400,
        metadata: { reason: "invalid_student_number", studentNumber },
      });
      return NextResponse.json(
        { error: "유효하지 않은 학번 형식입니다." },
        { status: 400 },
      );
    }

    const db = getDb();
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
          WHERE student_number = ?
        `,
      )
      .get(normalizedStudentNumber);

    logUserRequest({
      path: `/api/users/${studentNumber}`,
      method: request.method,
      status: 200,
      metadata: { found: Boolean(record) },
    });

    return NextResponse.json({
      exists: Boolean(record),
      user: record ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch user by student number", error);
    const { studentNumber } = await params;
    logUserRequest({
      path: `/api/users/${studentNumber}`,
      method: request.method,
      status: 500,
      metadata: { reason: "internal_error" },
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
