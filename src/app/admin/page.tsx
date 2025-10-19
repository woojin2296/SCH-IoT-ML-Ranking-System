import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/components/app/AppHero";
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
      publicId: string;
      lastLoginAt: string | null;
      createdAt: string;
      updatedAt: string;
    }[];

  const scores = db
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
          es.evaluated_at AS evaluatedAt
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
    }[];
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
          el.created_at AS createdAt
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
    }[];

  return (
    <div className="min-h-svh flex flex-col gap-6 p-6 md:p-10">
      <AppHero
        title="관리자 대시보드"
        alert="관리자는 이 페이지에서 제출 기록과 시스템 현황을 관리할 수 있습니다."
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
      />
    </div>
  );
}
