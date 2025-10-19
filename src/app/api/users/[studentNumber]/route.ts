import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    studentNumber: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { studentNumber } = await params;
    const normalizedStudentNumber = studentNumber?.trim();

    if (!normalizedStudentNumber || !/^\d{8}$/.test(normalizedStudentNumber)) {
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

    return NextResponse.json({
      exists: Boolean(record),
      user: record ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch user by student number", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
