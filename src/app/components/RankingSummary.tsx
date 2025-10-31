import { cn } from "@/lib/utils";

type RankingSummaryProps = {
  selectedYear: number;
  myBestScore: { score: number; evaluatedAt: string } | null;
  myRank: number | null;
  className?: string;
};

export function RankingSummary({ selectedYear, myBestScore, myRank, className }: RankingSummaryProps) {
  const selectedYearLabel = `${selectedYear}년`;
  if (!myBestScore) {
    return (
      <div
        className={cn(
          "rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700",
          className,
        )}
      >
        선택한 {selectedYearLabel}에는 아직 등록된 점수가 없습니다. 점수를 제출하고 기록을 만들어 보세요!
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900",
        className,
      )}
    >
      선택한 {selectedYearLabel} 기준 나의 최고 점수는 {myBestScore.score.toFixed(4)}점이며{" "}
      {typeof myRank === "number" ? `현재 ${myRank}위입니다.` : "현재 순위를 확인할 수 없습니다."}
    </div>
  );
}
