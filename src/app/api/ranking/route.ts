import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  cleanupExpiredSessions,
  getUserBySessionToken,
} from "@/lib/services/sessionService";
import { getDistinctUserYears, getRankingRecords, getRankingSummaryForUser } from "@/lib/services/scoreService";
import { createRequestLogger } from "@/lib/request-logger";

export async function GET(request: NextRequest) {
  const anonymousLogger = createRequestLogger(request, "/api/ranking", request.method);
  cleanupExpiredSessions();

  const cookieStore = await cookies();

  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) {
    anonymousLogger(401, { reason: "missing_session" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = getUserBySessionToken(sessionToken);
  if (!sessionUser) {
    anonymousLogger(401, { reason: "invalid_session" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(request, "/api/ranking", request.method, sessionUser.id);

  const projectParam = request.nextUrl.searchParams.get("project");
  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : 1;

  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4) {
    logRequest(400, { reason: "invalid_project", projectParam });
    return NextResponse.json(
      { error: "유효하지 않은 프로젝트 번호입니다." },
      { status: 400 },
    );
  }

  const yearParam = request.nextUrl.searchParams.get("year");
  const isValidYearParam = yearParam ? /^\d{4}$/.test(yearParam) : false;
  const parsedYear = isValidYearParam ? Number.parseInt(yearParam!, 10) : undefined;

  const distinctYears = getDistinctUserYears();
  let selectedYear = isValidYearParam ? (parsedYear as number) : undefined;
  if (typeof selectedYear !== "number") {
    selectedYear = distinctYears[0] ?? new Date().getFullYear();
  }

  const yearSet = new Set(distinctYears);
  yearSet.add(selectedYear);
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  const rankings = getRankingRecords(projectNumber, selectedYear);

  const myRankRow =
    sessionUser.semester === selectedYear
      ? getRankingSummaryForUser(projectNumber, selectedYear, sessionUser.id)
      : null;

  const myBestScore = myRankRow
    ? { score: myRankRow.score, createdAt: myRankRow.createdAt }
    : null;
  const myRank = myRankRow?.rank ?? null;

  logRequest(200, {
    count: rankings.length,
    projectNumber,
    selectedYear,
  });

  return NextResponse.json({
    rankings,
    myBestScore,
    projectNumber,
    selectedYear,
    availableYears,
    myRank,
  });
}
