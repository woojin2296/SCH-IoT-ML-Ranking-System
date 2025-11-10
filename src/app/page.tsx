import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { getBaseUrl } from "@/lib/url";
import { getActiveNotices } from "@/lib/services/noticeService";
import type { RankingRecord } from "@/lib/services/scoreService";
import { HomeView } from "@/app/components/HomeView";
import { RankingErrorView } from "@/app/components/RankingErrorView";

type RankingsResponse = {
  rankings: RankingRecord[];
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

  

  const activeNotices = getActiveNotices();
  const noticeMessages =
    activeNotices.length > 0
      ? activeNotices.map((notice) => notice.message)
      : ["현 시스템은 SCH 머신러닝 미니 프로젝트의 랭킹 확인을 위한 플랫폼입니다."];

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
    const response = await fetch(`${baseUrl}/api/auth/rankings?${queryParams.toString()}`, {
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
    return (
      <RankingErrorView
        notices={noticeMessages}
        detail="시스템 오류로 인해 랭킹을 표시할 수 없습니다. 문제가 지속되면 관리자에게 문의해주세요."
      />
    );
  }

  if (!data) {
    return (
      <RankingErrorView
        notices={noticeMessages}
        detail="예상치 못한 오류로 데이터를 로드하지 못했습니다. 재시도 후에도 문제가 지속되면 관리자에게 문의해주세요."
      />
    );
  }

  return (
    <HomeView
      notices={noticeMessages}
      ranking={{
        rankings: data.rankings,
        projectNumber: data.projectNumber,
        selectedYear: data.selectedYear,
        availableYears: data.availableYears,
        myBestScore: data.myBestScore,
        myRank: data.myRank,
      }}
      sessionUserId={sessionUser.id}
    />
  );
}
