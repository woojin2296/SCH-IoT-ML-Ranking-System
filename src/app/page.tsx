import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/components/app/AppHero";
import { AppNoticesList } from "@/components/app/AppNoticesList";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/session";
import { getBaseUrl } from "@/lib/url";
import { getActiveNotices } from "@/lib/notices";
import { projects } from "@/lib/projects";
import type { RankingTableRow } from "./components/RankingTable";
import { RankingsBoard } from "./components/RankingsBoard";

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


function renderRankingError(noticeMessages: string[], detail: string) {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center text-neutral-700">
      <AppHero />
      <AppNoticesList items={noticeMessages} />
      <div className="rounded-lg border border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-neutral-600">{detail}</p>
      </div>
    </div>
  );
}

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

  

  const notices = getActiveNotices();

  const params = await searchParams;
  const projectNumber = (() => {
    const n = Number(params?.project);
    return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 1;
  })();
  const requestedYear = (() => {
    const raw = params?.year;
    const n = Number(raw);
    return raw != null && /^\d{4}$/.test(String(raw)) ? n : new Date().getFullYear();
  })();

  
  const baseUrl = getBaseUrl();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const queryParams = new URLSearchParams({ project: String(projectNumber), year: String(requestedYear) });

  let data: RankingsResponse | null = null;
  try {
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
      const message = `랭킹 정보를 불러오는 중 오류가 발생했습니다. (status: ${response.status})`;
      console.error(message);
      throw new Error(message);
    }

    data = (await response.json()) as RankingsResponse;
  } catch (error) {
    console.error("Failed to fetch rankings", error);
    return renderRankingError(
      [`랭킹 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`],
      "시스템 오류로 인해 랭킹을 표시할 수 없습니다. 문제가 지속되면 관리자에게 문의해주세요.",
    );
  }

  if (!data) {
    return renderRankingError(
      [`랭킹 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.`],
      "예상치 못한 오류로 데이터를 로드하지 못했습니다. 재시도 후에도 문제가 지속되면 관리자에게 문의해주세요.",
    );
  }

  const rankings = data.rankings;
  const myBestScore = data.myBestScore;
  const selectedYear = data.selectedYear;
  const availableYears = data.availableYears;
  const myRank = data.myRank;
  const activeProjectNumber = data.projectNumber;
  const rankingTableRows: RankingTableRow[] = rankings.map(({ id, userId, publicId, position, score }) => ({
    id,
    userId,
    publicId,
    position,
    score,
  }));

  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNoticesList
        items={
          notices.length
            ? notices.map((item) => item.message)
            : [`현 시스템은 SCH 머신러닝 미니 프로젝트의 랭킹 확인을 위한 플랫폼입니다.`]
        }
      />
      <RankingsBoard
        rankings={rankingTableRows}
        sessionUserId={sessionUser.id}
        projects={projects}
        activeProject={activeProjectNumber}
        selectedYear={selectedYear}
        availableYears={availableYears}
        myBestScore={myBestScore}
        myRank={myRank}
      />
    </div>
  );
}
