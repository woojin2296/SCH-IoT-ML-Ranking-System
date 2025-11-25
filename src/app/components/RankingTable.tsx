"use client";

export type RankingTableRow = {
  id: number;
  userId: number;
  publicId: string;
  position: number;
  score: number;
  createdAt: string;
};

type RankingTableProps = {
  rankings: RankingTableRow[];
  sessionUserId: number;
};

const topRankClasses: Record<number, string> = {
  1: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  2: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  3: "bg-orange-50 text-orange-900 ring-1 ring-orange-200",
};

const medalIcons = ["🥇", "🥈", "🥉"];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toString();
}

export function RankingTable({ rankings, sessionUserId }: RankingTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm text-center">
        <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              순위
            </th>
            <th scope="col" className="px-4 py-3">
              점수
            </th>
            <th scope="col" className="px-4 py-3">
              익명 ID
            </th>
            <th scope="col" className="px-4 py-3">
              등록 날짜
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 text-neutral-700">
          {rankings.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-neutral-500">
                아직 등록된 랭킹 정보가 없습니다.
              </td>
            </tr>
          ) : (
            rankings.map((row) => {
              const isMyRecord = row.userId === sessionUserId;
              const isTopThree = row.position <= 3;
              const rowClassNames = [
                isMyRecord ? "outline outline-2 outline-[#1f4275]/60 bg-blue-50/50" : "",
                isTopThree ? topRankClasses[row.position as 1 | 2 | 3] ?? "" : "",
              ]
                .filter(Boolean)
                .join(" ");

              const rankLabel = isTopThree ? `${medalIcons[row.position - 1]} ${row.position}` : row.position;

              return (
                <tr key={row.id} className={rowClassNames}>
                  <td className="px-4 py-3 font-semibold">{rankLabel}</td>
                  <td className="px-4 py-3 font-medium">{formatScore(row.score)}</td>
                  <td className="px-4 py-3 text-neutral-500">{row.publicId}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDateTime(row.createdAt)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
