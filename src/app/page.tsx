import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/components/app/AppHero";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/session";
import { getBaseUrl } from "@/lib/url";
import { getActiveNotices } from "@/lib/notices";
import { projects } from "@/lib/projects";

type RankingRow = {
  id: number;
  userId: number;
  publicId: string;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  position: number;
};

type RankingsResponse = {
  rankings: RankingRow[];
  myBestScore: { score: number; evaluatedAt: string } | null;
  projectNumber: number;
  selectedYear: number;
  availableYears: number[];
  myRank: number | null;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; year?: string }>;
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

  const displayName = sessionUser.name?.trim()?.length
    ? sessionUser.name
    : `참가자 ${sessionUser.publicId}`;
  const notices = getActiveNotices();

  const resolvedSearchParams = await searchParams;
  const projectParam = resolvedSearchParams?.project;
  const parsedProject = projectParam ? Number.parseInt(projectParam, 10) : 1;
  const projectNumber =
    Number.isInteger(parsedProject) && parsedProject >= 1 && parsedProject <= 4
      ? parsedProject
      : 1;
  const yearParam = resolvedSearchParams?.year;
  const requestedYear =
    yearParam && /^\d{4}$/.test(yearParam)
      ? Number.parseInt(yearParam, 10)
      : undefined;

  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = getBaseUrl();

  const queryParams = new URLSearchParams({ project: String(projectNumber) });
  if (typeof requestedYear === "number") {
    queryParams.set("year", String(requestedYear));
  }

  const response = await fetch(`${baseUrl}/api/rankings?${queryParams.toString()}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    throw new Error("랭킹 정보를 불러오는데 실패했습니다.");
  }

  const data = (await response.json()) as RankingsResponse;
  const rankings = data.rankings;
  const myBestScore = data.myBestScore;
  const selectedYear = data.selectedYear;
  const availableYears = data.availableYears;
  const myRank = data.myRank;
  const selectedYearLabel = `${selectedYear}년`;
  const activeProjectNumber = data.projectNumber;

  return (
    <div className="min-h-svh flex flex-col gap-4 p-6 md:p-10">
      <AppHero
        alerts={
          notices.length
            ? notices.map((item) => item.message)
            : [`${displayName}님, 현 시스템은 SCH 머신러닝 미니 프로젝트의 랭킹 확인을 위한 플랫폼입니다.`]
        }
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">
            전체 등수 랭킹 보드{" "}
            <span className="text-sm font-normal text-neutral-500">
              ({selectedYearLabel})
            </span>
          </h2>
          <div className="flex items-center gap-2 justify-between">
            {projects.map((project) => (
              <Link
                key={project.number}
                href={`/?${(() => {
                  const params = new URLSearchParams({ project: String(project.number) });
                  params.set("year", String(selectedYear));
                  return params.toString();
                })()}`}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  project.number === activeProjectNumber
                    ? "bg-[#265392] text-white shadow"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {project.label}
              </Link>
            ))}
          </div>
          <Link
            href="/my-results"
            className="inline-flex justify-center items-center rounded-md bg-[#265392] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#1f4275]"
          >
            내 결과 관리하기
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableYears.map((year) => {
            const params = new URLSearchParams({
              project: String(activeProjectNumber),
              year: String(year),
            });
            const href = `/?${params.toString()}`;
            const isActive = year === selectedYear;
            return (
              <Link
                key={year}
                href={href}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#1f4275] text-white shadow"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {year}년
              </Link>
            );
          })}
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-4 py-3">순위</th>
                <th scope="col" className="px-4 py-3">익명 ID</th>
                <th scope="col" className="px-4 py-3 text-right">점수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                    아직 등록된 랭킹 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                rankings.map((row) => {
                  const isMyRecord = row.userId === sessionUser.id;

                  return (
                    <tr
                      key={row.id}
                      className={isMyRecord ? "bg-blue-50/60 font-semibold text-[#1f4275]" : ""}
                    >
                      <td className="px-4 py-3 font-semibold">{row.position}</td>
                      <td className="px-4 py-3 text-neutral-500">{row.publicId}</td>
                      <td className="px-4 py-3 text-right">{row.score.toFixed(4)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {myBestScore ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            선택한 {selectedYearLabel} 기준 나의 최고 점수는 {myBestScore.score.toFixed(4)}점이며{" "}
            {typeof myRank === "number" ? `현재 ${myRank}위입니다.` : "현재 순위를 확인할 수 없습니다."}
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            선택한 {selectedYearLabel}에는 아직 등록된 점수가 없습니다. 점수를 제출하고 기록을 만들어 보세요!
          </div>
        )}
      </div>
    </div>
  );
}
