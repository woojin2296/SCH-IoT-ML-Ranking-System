import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { RequestLogView } from "@/lib/services/requestLogService";
import AdminRequestLogRow from "./AdminRequestLogRow";

type AdminRequestLogsPageProps = {
  logs: RequestLogView[];
  query?: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

export default function AdminRequestLogsPage({
  logs,
  query,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
}: AdminRequestLogsPageProps) {
  const displayRange = getDisplayRange(totalCount, currentPage, pageSize, logs.length);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-6">
        <div className="px-4 lg:px-6 space-y-2">
          <h2 className="text-lg font-semibold">요청 로그</h2>
          <p className="text-sm text-neutral-500">
            시스템에 기록된 모든 API 요청을 조회하고, 경로·메서드·IP·메타데이터를 키워드로 검색할 수 있습니다.
          </p>
        </div>
        <div className="px-4 lg:px-6">
          <form className="flex flex-wrap items-end gap-4" action="/admin/request-logs" method="get">
            <div className="flex flex-col gap-1">
              <label htmlFor="query" className="text-sm font-medium text-neutral-700">
                검색 키워드
              </label>
              <input
                id="query"
                name="query"
                type="text"
                placeholder="경로, 메서드, IP, 메타데이터 등"
                defaultValue={query ?? ""}
                className="w-72 rounded-md border border-neutral-200 px-3 py-2 text-sm"
              />
              <input type="hidden" name="page" value="1" />
            </div>
            <Button type="submit" className="bg-[#265392] text-white">
              검색
            </Button>
            {query ? (
              <Button type="button" variant="ghost" asChild>
                <Link href="/admin/request-logs">필터 초기화</Link>
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
          <PaginationControls query={query} currentPage={currentPage} totalPages={totalPages} />
        </div>
        <div className="px-4 lg:px-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm rounded-md border">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">시간</th>
                <th className="px-4 py-3">메서드</th>
                <th className="px-4 py-3">경로</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">소스/IP</th>
                <th className="px-4 py-3">메타데이터</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-neutral-500">
                    조건에 해당하는 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => <AdminRequestLogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PaginationControls({
  query,
  currentPage,
  totalPages,
}: {
  query?: string;
  currentPage: number;
  totalPages: number;
}) {
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <div className="flex items-center gap-3">
      <PaginationButton disabled={prevDisabled} href={buildPageLink(currentPage - 1, query)} label="이전" />
      <span className="text-xs text-neutral-500">
        {currentPage} / {totalPages}
      </span>
      <PaginationButton disabled={nextDisabled} href={buildPageLink(currentPage + 1, query)} label="다음" />
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

function buildPageLink(page: number, query?: string) {
  const params = new URLSearchParams();
  if (query) {
    params.set("query", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const search = params.toString();
  return search ? `/admin/request-logs?${search}` : "/admin/request-logs";
}

function getDisplayRange(
  totalCount: number,
  currentPage: number,
  pageSize: number,
  currentLength: number,
): { start: number; end: number } {
  if (totalCount === 0 || currentLength === 0) {
    return { start: 0, end: 0 };
  }
  const start = (currentPage - 1) * pageSize + 1;
  const end = start + currentLength - 1;
  return { start, end };
}
