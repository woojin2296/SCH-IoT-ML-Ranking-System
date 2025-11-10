import { NextRequest, NextResponse } from "next/server";
import { handlePublicGetUserByStudentNumberApi } from "@/lib/services/userService";

export const dynamic = "force-dynamic";

// GET /api/user/[studentNumber]
// - Public endpoint used for availability checks.
// - Validates dynamic segment as 8-digit student number and returns existence flag plus record.
type RouteParams = {
  params: Promise<{ studentNumber: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  let resolvedParams: { studentNumber: string } | undefined;
  try {
    resolvedParams = await params;
  } catch (error) {
    console.error("Failed to resolve route params", error);
    return NextResponse.json({ error: "유효하지 않은 학번 형식입니다." }, { status: 400 });
  }

  const studentNumberParam = resolvedParams?.studentNumber ?? "";
  return handlePublicGetUserByStudentNumberApi(request, studentNumberParam);
}
