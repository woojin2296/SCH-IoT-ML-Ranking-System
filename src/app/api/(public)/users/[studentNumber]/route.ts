import { NextRequest, NextResponse } from "next/server";

import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { getRequestIp } from "@/lib/request";
import { findUserByStudentNumber } from "@/lib/services/userService";

export const dynamic = "force-dynamic";

// GET /api/users/[studentNumber]
// - Public endpoint used for availability checks.
// - Validates dynamic segment as 8-digit student number and returns existence flag plus record.
type RouteParams = {
  params: Promise<{ studentNumber: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  let resolvedParams: { studentNumber: string } | undefined;
  try {
    resolvedParams = await params;
  } catch (error) {
    console.error("Failed to resolve route params", error);
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users/[studentNumber]",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_params" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "유효하지 않은 학번 형식입니다." },
      { status: 400 },
    );
  }

  const studentNumberParam = resolvedParams?.studentNumber ?? "";
  try {
    const normalizedStudentNumber = studentNumberParam.trim();

    if (!normalizedStudentNumber || !/^\d{8}$/.test(normalizedStudentNumber)) {
      logUserRequest({
        source: resolveRequestSource(null, clientIp),
        path: `/api/users/${studentNumberParam}`,
        method: request.method,
        status: 400,
        metadata: { reason: "invalid_student_number", studentNumber: studentNumberParam },
        ipAddress: resolvedIp,
      });
      return NextResponse.json(
        { error: "유효하지 않은 학번 형식입니다." },
        { status: 400 },
      );
    }

    const record = findUserByStudentNumber(normalizedStudentNumber);

    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: `/api/users/${studentNumberParam}`,
      method: request.method,
      status: 200,
      metadata: { found: Boolean(record) },
      ipAddress: resolvedIp,
    });

    return NextResponse.json({
      exists: Boolean(record),
      user: record ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch user by student number", error);
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: `/api/users/${studentNumberParam}`,
      method: request.method,
      status: 500,
      metadata: { reason: "internal_error" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
