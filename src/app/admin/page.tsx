import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/app/components/AppHero";
import { AppNoticesList } from "@/app/components/AppNoticesList";
import AdminDashboard from "./admin-dashboard";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { listUsersOrderedByCreation } from "@/lib/repositories/userRepository";
import { listRequestLogsWithUsers } from "@/lib/repositories/requestLogRepository";
import { getAllNotices } from "@/lib/services/noticeService";
import { getAllSettings } from "@/lib/services/appSettingService";
import { getAdminEvaluationScores, getAdminRankingRecords } from "@/lib/services/evaluationScoreService";
import { getEvaluationLogs } from "@/lib/services/evaluationLogService";

export const metadata = {
  title: "관리자 대시보드",
};

function normalizeSemesterYear(value: number): number {
  return value >= 100000 ? Math.trunc(value / 100) : value;
}

export default async function AdminPage() {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const sessionUser = getUserBySessionToken(sessionToken);

  if (!sessionUser) {
    redirect("/login");
  }

  if (sessionUser.role !== "admin") {
    redirect("/");
  }

  const users = listUsersOrderedByCreation();
  const scores = getAdminEvaluationScores();

  const notices = getAllNotices();
  const logs = getEvaluationLogs().map((log) => {
    let logYear: number | null = null;
    if (log.targetSemester !== null && log.targetSemester !== undefined) {
      logYear = normalizeSemesterYear(log.targetSemester);
    } else if (log.actorSemester !== null && log.actorSemester !== undefined) {
      logYear = normalizeSemesterYear(log.actorSemester);
    }

    return {
      id: log.id,
      actorUserId: log.actorUserId,
      actorPublicId: log.actorPublicId,
      action: log.action,
      scoreId: log.scoreId,
      targetUserId: log.targetUserId,
      targetPublicId: log.targetPublicId,
      projectNumber: log.projectNumber,
      score: log.score,
      createdAt: log.createdAt,
      logYear,
    };
  });

  const rawRequestLogs = listRequestLogsWithUsers();

  const requestLogs = rawRequestLogs.map((log) => {
    let parsedMetadata: Record<string, unknown> | string | null = null;
    if (log.metadata) {
      try {
        parsedMetadata = JSON.parse(log.metadata) as Record<string, unknown>;
      } catch {
        parsedMetadata = log.metadata;
      }
    }

    const createdDate = log.createdAt ? new Date(log.createdAt) : null;
    const logYear = createdDate ? createdDate.getFullYear() : null;

    let sourceType: "user" | "ip" | "unknown" = "unknown";
    let sourceValue = log.source;
    if (log.source.startsWith("user:")) {
      sourceType = "user";
      sourceValue = log.source.slice(5);
    } else if (log.source.startsWith("ip:")) {
      sourceType = "ip";
      sourceValue = log.source.slice(3);
    }

    let sourceUserId = log.sourceUserId;
    if (sourceUserId === null && sourceType === "user") {
      const parsed = Number.parseInt(sourceValue, 10);
      sourceUserId = Number.isNaN(parsed) ? null : parsed;
    }

    return {
      id: log.id,
      source: log.source,
      sourceType,
      sourceValue,
      sourceUserId,
      userPublicId: log.userPublicId,
      userStudentNumber: log.userStudentNumber,
      name: log.name,
      path: log.path,
      method: log.method.toUpperCase(),
      status: log.status,
      metadata: parsedMetadata,
      createdAt: log.createdAt,
      ipAddress: log.ipAddress,
      logYear,
    };
  });

  const yearSet = new Set<number>();
  users.forEach((user) => yearSet.add(user.semester));
  scores.forEach((score) => yearSet.add(score.userYear));
  logs.forEach((log) => {
    if (typeof log.logYear === "number") {
      yearSet.add(log.logYear);
    }
  });
  requestLogs.forEach((log) => {
    if (typeof log.logYear === "number") {
      yearSet.add(log.logYear);
    }
  });
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);
  const requestMethodOptions = Array.from(new Set(requestLogs.map((log) => log.method))).sort();

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rankingDefaultFrom = new Date(defaultFrom.setHours(0, 0, 0, 0)).toISOString();
  const rankingDefaultTo = new Date(now.setHours(23, 59, 59, 999)).toISOString();

  const rankingRows = getAdminRankingRecords(1, rankingDefaultFrom, rankingDefaultTo);
  const settings = getAllSettings();

  return (
    <div className="min-h-svh flex flex-col gap-6 p-6 md:p-10">
      <AppHero />
      <div className="flex justify-end">
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-[#265392] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#1f4275]"
        >
          메인 페이지로 이동
        </Link>
      </div>
      <AdminDashboard
        initialUsers={users}
        initialScores={scores}
        initialNotices={notices}
        initialLogs={logs}
        initialRequestLogs={requestLogs}
        availableYears={availableYears}
        selectedYear={availableYears[0] ?? new Date().getFullYear()}
        requestMethodOptions={requestMethodOptions}
        initialRankingRecords={rankingRows}
        initialSettings={settings}
        rankingDefaultFrom={rankingDefaultFrom}
        rankingDefaultTo={rankingDefaultTo}
      />
    </div>
  );
}
