import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { getDistinctUserYears } from "@/lib/services/scoreService";
import { projects } from "@/lib/projects";
import AppHero from "@/components/AppHero";
import { AppNoticesList } from "@/components/AppNoticesList";
import AppNavigationClient from "@/components/AppNavigationClient";

type PastSearchParams = {
  project?: string | string[];
  year?: string | string[];
};

function pickSingle(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function PastRankingsPage({ searchParams }: { searchParams: Promise<PastSearchParams> }) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) redirect("/login");
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken): null;
  if (!sessionUser) redirect("/login");

  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNavigationClient isAdmin={sessionUser.role === "admin"} />
      <AppNoticesList />
      추후 추가될 예정입니다.
    </div>
  );
}
