import { NextRequest, NextResponse } from "next/server";

import { findUserByStudentNumber } from "@/lib/services/userService";
import { createRequestLogger } from "@/lib/request-logger";

type Payload = {
  studentNumber?: string;
};

// POST /api/auth/check
// - Accepts JSON body: { studentNumber }
// - Validates format (8 digits), returns existence and minimal user record
export async function POST(request: NextRequest) {
  const logRequest = createRequestLogger(request, "/api/auth/check", request.method);
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    logRequest(400, { reason: "invalid_json" });
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const studentNumber = payload.studentNumber?.trim();
  if (!studentNumber || !/^\d{8}$/.test(studentNumber)) {
    logRequest(400, { reason: "invalid_student_number", studentNumber });
    return NextResponse.json({ error: "유효하지 않은 학번 형식입니다." }, { status: 400 });
  }

  try {
    const record = findUserByStudentNumber(studentNumber);
    logRequest(200, { exists: Boolean(record), studentNumber });
    return NextResponse.json({ exists: Boolean(record) }, { status: 200 });
  } catch (error) {
    console.error("Failed to check student number", error);
    logRequest(500, { reason: "internal_error" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
