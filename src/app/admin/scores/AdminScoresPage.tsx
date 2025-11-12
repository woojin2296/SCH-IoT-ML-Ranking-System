import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ScoreSubmissionRecord } from "@/lib/services/scoreService";
import AdminScoreRow from "./AdminScoreRow";

type AdminScoresPageProps = {
  records: ScoreSubmissionRecord[];
  studentNumber?: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

export default function AdminScoresPage({
  records,
  studentNumber,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
}: AdminScoresPageProps) {
  const displayRange = getDisplayRange(totalCount, currentPage, pageSize, records.length);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-6">
        <div className="px-4 lg:px-6 space-y-2">
          <h2 className="text-lg font-semibold">제출 점수 관리</h2>
          <p className="text-sm text-neutral-500">
            모든 제출 기록을 확인하고 학번으로 필터링하거나 페이지를 이동해 원하는 기록을 찾을 수 있습니다.
          </p>
        </div>
        <div className="px-4 lg:px-6">
          <form className="flex flex-wrap items-end gap-4" action="/admin/scores" method="get">
            <div className="flex flex-col gap-1">
              <label htmlFor="studentNumber" className="text-sm font-medium text-neutral-700">
                학번
              </label>
              <input
                id="studentNumber"
                name="studentNumber"
                type="text"
                placeholder="예: 20231234"
                defaultValue={studentNumber ?? ""}
                className="w-52 rounded-md border border-neutral-200 px-3 py-2 text-sm"
              />
              <input type="hidden" name="page" value="1" />
            </div>
            <Button type="submit" className="bg-[#265392] text-white">
              검색
            </Button>
            {studentNumber ? (
              <Button type="button" variant="ghost" asChild>
                <Link href="/admin/scores">필터 초기화</Link>
              </Button>
            ) : null}
          </form>
        </div>
        <div className="px-4 lg:px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-600">
          <p>
            총 {totalCount.toLocaleString()}건 중{" "}
            {totalCount === 0
              ? "0건"
              : `${displayRange.start.toLocaleString()}-${displayRange.end.toLocaleString()}건`}{" "}
            표시 중
          </p>
          <PaginationControls studentNumber={studentNumber} currentPage={currentPage} totalPages={totalPages} />
        </div>
        <div className="px-4 lg:px-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm rounded-md border">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">제출 ID</th>
                <th className="px-4 py-3">프로젝트</th>
                <th className="px-4 py-3">점수</th>
                <th className="px-4 py-3">학번</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">첨부</th>
                <th className="px-4 py-3">제출 일시</th>
                <th className="px-4 py-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-neutral-500">
                    조건에 해당하는 제출 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((record) => <AdminScoreRow key={record.id} record={record} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PaginationControls({
  studentNumber,
  currentPage,
  totalPages,
}: {
  studentNumber?: string;
  currentPage: number;
  totalPages: number;
}) {
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <div className="flex items-center gap-3">
      <PaginationButton
        disabled={prevDisabled}
        href={buildPageLink(currentPage - 1, studentNumber)}
        label="이전"
      />
      <span className="text-xs text-neutral-500">
        {currentPage} / {totalPages}
      </span>
      <PaginationButton
        disabled={nextDisabled}
        href={buildPageLink(currentPage + 1, studentNumber)}
        label="다음"
      />
    </div>
  );
}

function PaginationButton({ disabled, href, label }: { disabled: boolean; href: string; label: string }) {
  if (disabled) {
    return (
      <Button type="button" size="sm" variant="outline" disabled>
        {label}
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function buildPageLink(page: number, studentNumber?: string) {
  const params = new URLSearchParams();
  if (studentNumber) {
    params.set("studentNumber", studentNumber);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/admin/scores?${query}` : "/admin/scores";
}

function getDisplayRange(
  totalCount: number,
  currentPage: number,
  pageSize: number,
  currentLength: number,
): { start: number; end: number } {
  if (totalCount === 0) {
    return { start: 0, end: 0 };
  }
  if (currentLength === 0) {
    return { start: 0, end: 0 };
  }
  const start = (currentPage - 1) * pageSize + 1;
  const end = start + currentLength - 1;
  return { start, end };
}
