import AppHero from "@/app/components/AppHero";
import SubmitResultForm from "./submit-result-form";
import { AppNoticesList } from "@/app/components/AppNoticesList";

export default function SubmitResultPage() {
  return (
    <div className="min-h-svh flex flex-col gap-4 p-6 md:p-10 items-center">
      <AppHero />
      <AppNoticesList />
      <SubmitResultForm />
    </div>
  );
}
