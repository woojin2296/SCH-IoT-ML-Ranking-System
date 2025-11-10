import AppHero from "@/components/AppHero";
import LoginClient from "./LoginClient";
import { AppNoticesList } from "@/components/AppNoticesList";

export default function LoginPage() {
  
  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNoticesList />
      <LoginClient />
    </div>
  );
}
