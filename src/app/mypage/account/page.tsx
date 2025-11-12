import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppHero from "@/components/AppHero";
import { AppNoticesList } from "@/components/AppNoticesList";
import AppNavigationClient from "@/components/AppNavigationClient";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";

function formatKoreanDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });
}

export default async function AccountPage() {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) redirect("/login");
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
  if (!sessionUser) redirect("/login");

  const displayName =
    sessionUser.name?.trim().length ? sessionUser.name : `참가자 ${sessionUser.publicId}`;
  const isAdmin = sessionUser.role === "admin";

  const profileItems = [
    { label: "학번", value: sessionUser.studentNumber },
    { label: "이메일", value: sessionUser.email },
    { label: "권한", value: isAdmin ? "관리자" : "참가자" },
    { label: "최근 로그인", value: formatKoreanDate(sessionUser.lastLoginAt) },
  ];

  return (
    <div className="min-h-svh flex flex-col gap-4 p-6 md:p-10 items-center">
      <AppHero />
      <AppNavigationClient isAdmin={isAdmin} />
      <AppNoticesList />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{displayName}님의 계정</h1>
          <p className="text-sm text-neutral-500">
            현재 세션 정보를 확인하고 필요 시 로그아웃할 수 있습니다.
          </p>
        </header>

        <dl className="grid gap-4 rounded-md border border-neutral-100 bg-neutral-50 p-4 text-sm">
          {profileItems.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-medium text-neutral-600">{label}</dt>
              <dd className="text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>

        <form method="POST" action="/api/auth/logout" className="space-y-3">
          <p className="text-sm text-neutral-600">
            다른 계정으로 전환하거나 보안을 위해 세션을 종료하려면 아래 버튼을 눌러 로그아웃하세요.
          </p>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-red-700"
          >
            로그아웃
          </button>
        </form>
      </div>
      <p className="mt-6 text-xs text-neutral-500 text-center w-full max-w-2xl">
        문제 발생 시 <a href="mailto:woojin2296@kakao.com" className="font-medium underline">woojin2296@kakao.com</a> 으로 연락해주세요.
      </p>
    </div>
  );
}
