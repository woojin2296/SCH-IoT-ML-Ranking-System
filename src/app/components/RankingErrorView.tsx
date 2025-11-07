import AppHero from "@/components/app/AppHero";
import { AppNoticesList } from "@/components/app/AppNoticesList";

export type RankingErrorViewProps = {
  notices: string[];
  detail: string;
};

export function RankingErrorView({ notices, detail }: RankingErrorViewProps) {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center text-neutral-700">
      <AppHero />
      <AppNoticesList items={notices} />
      <div className="rounded-lg border border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-neutral-600">{detail}</p>
      </div>
    </div>
  );
}
