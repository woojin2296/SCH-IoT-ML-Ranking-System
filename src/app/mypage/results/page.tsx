import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/components/AppHero";
import { AppNoticesList } from "@/components/AppNoticesList";
import { projectFilterOptions as projects } from "@/lib/projects";
import {
  cleanupExpiredSessions,
  getUserBySessionToken,
} from "@/lib/services/sessionService";
import { getBaseUrl } from "@/lib/url";
import { getActiveNotices } from "@/lib/services/noticeService";

import MyResultsTable from "./my-results-table";
import AppNavigationClient from "@/components/AppNavigationClient";

type UserScoreRow = {
  id: number;
  projectNumber: number;
  score: number;
  createdAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

type MyResultsResponse = {
  results: UserScoreRow[];
  projectNumber: number | null;
};

export default async function MyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) redirect("/login");
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken): null;
  if (!sessionUser) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const projectParam = resolvedSearchParams?.project;
  const parsedProject = projectParam ? Number.parseInt(projectParam, 10) : null;
  const projectNumber =
    parsedProject &&
    Number.isInteger(parsedProject) &&
    parsedProject >= 1 &&
    parsedProject <= 4
      ? parsedProject
      : null;

  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = getBaseUrl();
  const query = projectNumber ? `?project=${projectNumber}` : "";

  let data: MyResultsResponse | null = null;
  try {
    const response = await fetch(`${baseUrl}/api/score/my${query}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      redirect("/login");
    }

    if (!response.ok) {
      const message = `개인 결과를 불러오는 중 오류가 발생했습니다. (status: ${response.status})`;
      console.error(message);
      throw new Error(message);
    }

    data = (await response.json()) as MyResultsResponse;
  } catch (error) {
    console.error("Failed to fetch my results", error);
    const displayName = sessionUser.name?.trim()?.length
      ? sessionUser.name
      : `참가자 ${sessionUser.publicId}`;
    const notices = getActiveNotices();
    return (
      <div className="min-h-svh flex flex-col gap-4 p-6 md:p-10">
        <AppHero />
        <AppNoticesList />
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-neutral-200 bg-white px-6 py-4 text-center text-sm text-neutral-600 shadow-sm">
          데이터 로딩 중 오류가 발생했습니다. 네트워크 상태를 확인하거나 문제가
          지속될 경우 관리자에게 문의해주세요.
        </div>
      </div>
    );
  }

  const scores = data.results;

  const displayName = sessionUser.name?.trim()?.length
    ? sessionUser.name
    : `참가자 ${sessionUser.publicId}`;
  const isAdmin = sessionUser.role === "admin";
  const notices = getActiveNotices();

  return (
    <div className="min-h-svh flex flex-col gap-4 p-6 md:p-10 items-center">
      <AppHero />
      <AppNavigationClient isAdmin={isAdmin} />
      <AppNoticesList />
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{displayName}님의 제출 결과</h1>
          <p className="text-sm text-neutral-500">
            개인 제출 기록과 점수를 확인할 수 있습니다.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {projects.map((project) => {
              const isActive =
                project.number === projectNumber ||
                (project.number === null && projectNumber === null);
              const href =
                project.number === null
                  ? "/mypage/results"
                  : `/mypage/results?project=${project.number}`;
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

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Link
              href="/mypage/results/submit"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-700"
            >
              결과 추가하기
            </Link>
          </div>
        </div>

        <MyResultsTable scores={scores} />
      </main>
    </div>
  );
}
