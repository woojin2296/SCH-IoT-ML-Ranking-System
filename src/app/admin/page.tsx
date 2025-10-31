import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/components/app/AppHero";
import { AppNoticesList } from "@/components/app/AppNoticesList";
import AdminDashboard from "./admin-dashboard";
import { getDb } from "@/lib/db";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/session";
import { getAllNotices } from "@/lib/notices";

export const metadata = {
  title: "관리자 대시보드",
};

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

  const db = getDb();

  const users = db
    .prepare(
      `
        SELECT
          id,
          student_number AS studentNumber,
          name,
          role,
          CASE
            WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
            ELSE semester
          END AS semester,
          public_id AS publicId,
          last_login_at AS lastLoginAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        ORDER BY created_at ASC
      `,
    )
    .all() as {
      id: number;
      studentNumber: string;
      name: string | null;
      role: string;
      semester: number;
      publicId: string;
      lastLoginAt: string | null;
      createdAt: string;
      updatedAt: string;
    }[];

  const rawScores = db
    .prepare(
      `
        SELECT
          es.id,
          es.user_id AS userId,
          u.public_id AS userPublicId,
          u.student_number AS studentNumber,
          u.name,
          es.project_number AS projectNumber,
          es.score,
          es.evaluated_at AS evaluatedAt,
          es.file_name AS fileName,
          es.file_size AS fileSize,
          CASE WHEN es.file_path IS NOT NULL THEN 1 ELSE 0 END AS hasFile,
          CASE
            WHEN u.semester >= 100000 THEN CAST(u.semester / 100 AS INTEGER)
            ELSE u.semester
          END AS userYear
        FROM evaluation_scores es
        INNER JOIN users u ON u.id = es.user_id
        ORDER BY es.evaluated_at DESC
      `,
    )
    .all() as {
      id: number;
      userId: number;
      userPublicId: string;
      studentNumber: string;
      name: string | null;
      projectNumber: number;
      score: number;
      evaluatedAt: string;
      fileName: string | null;
      fileSize: number | null;
      hasFile: number;
      userYear: number;
    }[];
  const scores = rawScores.map((score) => ({
    ...score,
    hasFile: Boolean(score.hasFile),
  }));

  const notices = getAllNotices();

  const logs = db
    .prepare(
      `
        SELECT
          el.id,
          el.actor_user_id AS actorUserId,
          actor.public_id AS actorPublicId,
          el.action,
          el.score_id AS scoreId,
          el.target_user_id AS targetUserId,
          target.public_id AS targetPublicId,
          el.project_number AS projectNumber,
          el.score,
          el.created_at AS createdAt,
          CASE
            WHEN target.semester IS NOT NULL THEN
              CASE
                WHEN target.semester >= 100000 THEN CAST(target.semester / 100 AS INTEGER)
                ELSE target.semester
              END
            WHEN actor.semester IS NOT NULL THEN
              CASE
                WHEN actor.semester >= 100000 THEN CAST(actor.semester / 100 AS INTEGER)
                ELSE actor.semester
              END
            ELSE NULL
          END AS logYear
        FROM evaluation_logs el
        LEFT JOIN users actor ON actor.id = el.actor_user_id
        LEFT JOIN users target ON target.id = el.target_user_id
        ORDER BY el.created_at DESC
      `,
    )
    .all() as {
      id: number;
      actorUserId: number | null;
      actorPublicId: string | null;
      action: string;
      scoreId: number | null;
      targetUserId: number | null;
      targetPublicId: string | null;
      projectNumber: number | null;
      score: number | null;
      createdAt: string;
      logYear: number | null;
    }[];

  const rawRequestLogs = db
    .prepare(
      `
        SELECT
          rl.id,
          rl.user_id AS userId,
          u.public_id AS userPublicId,
          u.student_number AS userStudentNumber,
          u.name,
          rl.path,
          rl.method,
          rl.status,
          rl.metadata,
          rl.created_at AS createdAt
        FROM request_logs rl
        LEFT JOIN users u ON u.id = rl.user_id
        ORDER BY rl.created_at DESC
      `,
    )
    .all() as {
      id: number;
      userId: number | null;
      userPublicId: string | null;
      userStudentNumber: string | null;
      name: string | null;
      path: string;
      method: string;
      status: number | null;
      metadata: string | null;
      createdAt: string;
    }[];

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

    return {
      id: log.id,
      userId: log.userId,
      userPublicId: log.userPublicId,
      userStudentNumber: log.userStudentNumber,
      name: log.name,
      path: log.path,
      method: log.method.toUpperCase(),
      status: log.status,
      metadata: parsedMetadata,
      createdAt: log.createdAt,
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

  const rankingRows = db
    .prepare(
      `
        WITH filtered AS (
          SELECT
            es.id,
            es.user_id,
            es.project_number,
            es.score,
            es.evaluated_at,
            es.file_name,
            es.file_size,
            es.file_path,
            u.student_number,
            u.name
          FROM evaluation_scores es
          INNER JOIN users u ON u.id = es.user_id
          WHERE es.project_number = 1
            AND es.evaluated_at BETWEEN ? AND ?
        ),
        ranked AS (
          SELECT
            id,
            student_number,
            name,
            score,
            evaluated_at,
            file_name,
            file_size,
            file_path,
            ROW_NUMBER() OVER (
              PARTITION BY student_number
              ORDER BY score DESC, evaluated_at ASC
            ) AS per_user_rank
          FROM filtered
        ),
        best AS (
          SELECT
            id,
            student_number,
            name,
            score,
            evaluated_at,
            file_name,
            file_size,
            file_path,
            ROW_NUMBER() OVER (ORDER BY score DESC, evaluated_at ASC) AS position
          FROM ranked
          WHERE per_user_rank = 1
        )
        SELECT
          id,
          position,
          student_number AS studentNumber,
          name,
          score,
          evaluated_at AS evaluatedAt,
          file_name AS fileName,
          file_size AS fileSize,
          CASE WHEN file_path IS NOT NULL THEN 1 ELSE 0 END AS hasFile
        FROM best
        ORDER BY position ASC
      `,
    )
    .all(rankingDefaultFrom, rankingDefaultTo) as {
      id: number;
      position: number;
      studentNumber: string;
      name: string | null;
      score: number;
      evaluatedAt: string;
      fileName: string | null;
      fileSize: number | null;
      hasFile: number;
    }[];

  return (
    <div className="min-h-svh flex flex-col gap-6 p-6 md:p-10">
      <AppHero title="관리자 대시보드" />
      <AppNoticesList
        items={[
          "관리자는 이 페이지에서 제출 기록과 시스템 현황을 관리할 수 있습니다.",
        ]}
      />
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
        initialRankingRecords={rankingRows.map((row) => ({
          ...row,
          hasFile: Boolean(row.hasFile),
        }))}
        rankingDefaultFrom={rankingDefaultFrom}
        rankingDefaultTo={rankingDefaultTo}
      />
    </div>
  );
}
