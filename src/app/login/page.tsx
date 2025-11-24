import { Suspense } from "react";

import AppHero from "@/components/AppHero";
import LoginClient from "./LoginClient";
import { AppNoticesList } from "@/components/AppNoticesList";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNoticesList />
      <Suspense fallback={<div className="w-full max-w-xs text-center text-sm text-neutral-500">로그인 정보를 불러오는 중...</div>}>
        <LoginClient />
      </Suspense>
      <p className="mt-6 text-xs text-neutral-500">
        문제 발생 시 <a href="mailto:woojin2296@kakao.com" className="font-medium underline">woojin2296@kakao.com</a> 으로 연락해주세요.
      </p>
    </div>
  );
}
