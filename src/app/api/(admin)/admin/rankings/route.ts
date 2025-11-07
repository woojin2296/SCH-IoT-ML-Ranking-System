import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { getRequestIp } from "@/lib/request";
import { getAdminRankingRecords } from "@/lib/services/evaluationScoreService";

// GET /api/admin/rankings
// - Requires admin session.
// - Accepts `project` query (1-4) and optional `from`/`to` ISO dates; defaults to trailing 7 days.
// - Returns deduplicated best scores per student with attachment flags.
export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin();
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";

  if (!adminUser) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/admin/rankings",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const projectParam = url.searchParams.get("project");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : 1;

  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4) {
    logUserRequest({
      source: resolveRequestSource(adminUser.id, clientIp),
      path: "/api/admin/rankings",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_project", projectParam },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "유효하지 않은 프로젝트 번호입니다." }, { status: 400 });
  }

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : now;

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    logUserRequest({
      source: resolveRequestSource(adminUser.id, clientIp),
      path: "/api/admin/rankings",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_date", fromParam, toParam },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "유효한 날짜 범위가 필요합니다." }, { status: 400 });
  }

  const normalizedFrom = fromDate <= toDate ? fromDate : toDate;
  const normalizedTo = toDate >= fromDate ? toDate : fromDate;

  const fromIso = new Date(normalizedFrom.setHours(0, 0, 0, 0)).toISOString();
  const toIso = new Date(normalizedTo.setHours(23, 59, 59, 999)).toISOString();

  const normalized = getAdminRankingRecords(projectNumber, fromIso, toIso);

  logUserRequest({
    source: resolveRequestSource(adminUser.id, clientIp),
    path: "/api/admin/rankings",
    method: request.method,
    status: 200,
    metadata: {
      projectNumber,
      from: fromIso,
      to: toIso,
      count: normalized.length,
    },
    ipAddress: resolvedIp,
  });

  return NextResponse.json({
    rankings: normalized,
    projectNumber,
    from: fromIso,
    to: toIso,
  });
}
