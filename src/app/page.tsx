import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { projects } from "@/lib/projects";
import AppHero from "../components/AppHero";
import { AppNoticesList } from "../components/AppNoticesList";
import { RankingsBoard } from "./components/RankingsBoard";
import AppNavigationClient from "../components/AppNavigationClient";


function getProjectFromParams(value?: string | string[]): number {
  if (!value) return 1;
  const singleValue = Array.isArray(value) ? value[0] : value;
  if (!singleValue) return 1;
  const parsed = Number(singleValue);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= projects.length ? parsed : 1;
}

export default async function Home({ searchParams }: { searchParams: { project: string | string[] } }) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) redirect("/login");
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken): null;
  if (!sessionUser) redirect("/login");

  const userId = sessionUser.id;
  const params = await searchParams;
  const activeProject = getProjectFromParams(params.project);

  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNavigationClient isAdmin={sessionUser.role === "admin"} />
      <AppNoticesList />
      <RankingsBoard
        sessionUserId={userId}
        activeProject={activeProject}
      />
    </div>
  );
}
