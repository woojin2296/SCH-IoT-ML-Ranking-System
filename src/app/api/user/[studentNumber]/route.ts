import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSessionUser } from "@/lib/auth-guard";
import { findUserByStudentNumber } from "@/lib/services/userService";
import { createRequestLogger } from "@/lib/request-logger";

export const dynamic = "force-dynamic";

// GET /api/user/[studentNumber]
// - Requires authenticated session.
// - Admins may query any student number; non-admins may only query their own.
// - Validates 8-digit student number and returns existence flag plus record (when permitted).
type RouteParams = {
  params: Promise<{ studentNumber: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const logRequest = createRequestLogger(request, "/api/user/[studentNumber]", request.method);

  let resolvedParams: { studentNumber: string } | undefined;
  try {
    resolvedParams = await params;
  } catch (error) {
    console.error("Failed to resolve route params", error);
    logRequest(400, { reason: "invalid_params" });
    return NextResponse.json({ error: "유효하지 않은 학번 형식입니다." }, { status: 400 });
  }

  const studentNumberParam = resolvedParams?.studentNumber?.trim() ?? "";
  if (!/^\d{8}$/.test(studentNumberParam)) {
    logRequest(400, { reason: "invalid_student_number", studentNumber: studentNumberParam });
    return NextResponse.json({ error: "유효하지 않은 학번 형식입니다." }, { status: 400 });
  }

  const sessionUser = await requireSessionUser();
  if (!sessionUser) {
    logRequest(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUser = await requireAdmin();
  const isAdmin = Boolean(adminUser);
  const isSelf = sessionUser.studentNumber === studentNumberParam;

  if (!isAdmin && !isSelf) {
    logRequest(403, { reason: "forbidden", studentNumber: studentNumberParam });
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  try {
    const record = findUserByStudentNumber(studentNumberParam);
    logRequest(200, { isAdmin, isSelf, found: Boolean(record) });
    return NextResponse.json({ exists: Boolean(record), user: record ?? null });
  } catch (error) {
    console.error("Failed to fetch user by student number", error);
    logRequest(500, { reason: "internal_error" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
