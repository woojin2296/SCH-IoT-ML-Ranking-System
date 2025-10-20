import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/components/app/AppHero";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/session";
import { getBaseUrl } from "@/lib/url";
import { getActiveNotices } from "@/lib/notices";

import MyResultsTable from "./my-results-table";

type UserScoreRow = {
  id: number;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

type MyResultsResponse = {
  results: UserScoreRow[];
  projectNumber: number | null;
};

const projects = [
  { number: null, label: "전체" },
  { number: 1, label: "프로젝트 1" },
  { number: 2, label: "프로젝트 2" },
  { number: 3, label: "프로젝트 3" },
  { number: 4, label: "프로젝트 4" },
];

export default async function MyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const sessionUser = sessionToken
    ? getUserBySessionToken(sessionToken)
    : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const projectParam = resolvedSearchParams?.project;
  const parsedProject = projectParam ? Number.parseInt(projectParam, 10) : null;
  const projectNumber =
    parsedProject && Number.isInteger(parsedProject) && parsedProject >= 1 && parsedProject <= 4
      ? parsedProject
      : null;

  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = getBaseUrl();
  const query = projectNumber ? `?project=${projectNumber}` : "";

  const response = await fetch(`${baseUrl}/api/my-results${query}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    throw new Error("개인 결과를 불러오는데 실패했습니다.");
  }

  const data = (await response.json()) as MyResultsResponse;
  const scores = data.results;

  const displayName = sessionUser.name?.trim()?.length
    ? sessionUser.name
    : `참가자 ${sessionUser.publicId}`;
  const isAdmin = sessionUser.role === "admin";
  const notices = getActiveNotices();

  return (
    <div className="min-h-svh flex flex-col gap-4 p-6 md:p-10">
      <AppHero
        alerts={
          notices.length
            ? notices.map((item) => item.message)
            : [`${displayName}님, 현 시스템은 SCH 머신러닝 미니 프로젝트의 랭킹 확인을 위한 플랫폼입니다.`]
        }
      />
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{displayName}님의 제출 결과</h1>
          <p className="text-sm text-neutral-500">
            개인 제출 기록과 점수를 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Link
            href="/my-results/submit"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-700"
          >
            결과 추가하기
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-[#265392] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#1f4275]"
          >
            랭킹 보드로 돌아가기
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-md bg-yellow-400 px-4 py-2 text-sm font-medium text-neutral-900 shadow transition hover:bg-yellow-500"
            >
              관리자 페이지
            </Link>
          ) : null}
          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-red-600 border border-neutral-300 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-red-700 md:w-auto"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto mt-8 w-full max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {projects.map((project) => {
            const isActive = project.number === projectNumber || (project.number === null && projectNumber === null);
            const href =
              project.number === null ? "/my-results" : `/my-results?project=${project.number}`;
            return (
              <Link
                key={project.label}
                href={href}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#265392] text-white shadow"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {project.label}
              </Link>
            );
          })}
        </div>
        <MyResultsTable scores={scores} />
      </main>
    </div>
  );
}
