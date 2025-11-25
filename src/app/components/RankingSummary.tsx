type RankingSummaryProps = {
  myBestScore: { rank: number; score: number; createdAt?: string } | null;
};

function formatScore(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toString();
}

export function RankingSummary({ myBestScore }: RankingSummaryProps) {
  if (!myBestScore) {
    return (
      <div className= "rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        등록된 점수가 없습니다. 점수를 제출하고 기록을 만들어 보세요!
      </div>
    );
  }

  return (
    <div className= "rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
      나의 최고 점수는 {formatScore(myBestScore.score)}점이며{" "}
      {typeof myBestScore.rank === "number" ? `현재 ${myBestScore.rank}위입니다.` : "현재 순위를 확인할 수 없습니다."}
    </div>
  );
}
