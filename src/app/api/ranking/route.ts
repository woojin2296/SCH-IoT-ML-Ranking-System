import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { getRankingRecords, getRankingSummaryForUser } from "@/lib/services/scoreService";
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

  const rankings = getRankingRecords(projectNumber);

  const myRankRow = getRankingSummaryForUser(projectNumber, sessionUser.id);

  const myBestScore = myRankRow
    ? { score: myRankRow.score, createdAt: myRankRow.createdAt }
    : null;
  const myRank = myRankRow?.rank ?? null;

  logRequest(200, { count: rankings.length, projectNumber });

  return NextResponse.json({
    rankings,
    myBestScore,
    projectNumber,
    myRank,
  });
}
