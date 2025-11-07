import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  cleanupExpiredSessions,
  getUserBySessionToken,
} from "@/lib/services/sessionService";
import { createRequestLogger } from "@/lib/request-logger";
import {
  getDistinctUserYears,
  getRankingRecords,
  getRankingSummaryForUser,
} from "@/lib/services/evaluationScoreService";

type RankingRow = {
  id: number;
  userId: number;
  publicId: string;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  position: number;
};

export async function GET(request: NextRequest) {
  cleanupExpiredSessions();
  const baseLogger = createRequestLogger(request, request.nextUrl.pathname, request.method);

  // 쿠키 설정
  const cookieStore = await cookies();

  // 세션 토큰 검증
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) {
    baseLogger(401, { reason: "missing_session" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 세션 유저 검증
  const sessionUser = getUserBySessionToken(sessionToken);
  if (!sessionUser) {
    baseLogger(401, { reason: "invalid_session" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(
    request,
    request.nextUrl.pathname,
    request.method,
    sessionUser.id,
  );

  const projectParam = request.nextUrl.searchParams.get("project");
  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : 1;

  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4) {
    logRequest(400, { reason: "invalid_project", projectNumber });
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
    ? { score: myRankRow.score, evaluatedAt: myRankRow.evaluatedAt }
    : null;
  const myRank = myRankRow?.rank ?? null;

  logRequest(200, { projectNumber, selectedYear });

  return NextResponse.json({
    rankings,
    myBestScore,
    projectNumber,
    selectedYear,
    availableYears,
    myRank,
  });
}
