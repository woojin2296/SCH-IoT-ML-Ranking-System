import { Suspense } from "react";

import AppHero from "@/components/AppHero";
import LoginClient from "./LoginClient";
import { AppNoticesList } from "@/components/AppNoticesList";

export default function LoginPage() {
  
  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNoticesList />
      <Suspense fallback={<div className="w-full max-w-xs text-center text-sm text-neutral-500">로그인 정보를 불러오는 중...</div>}>
        <LoginClient />
      </Suspense>
    </div>
  );
}
