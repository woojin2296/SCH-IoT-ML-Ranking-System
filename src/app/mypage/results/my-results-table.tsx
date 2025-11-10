"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type ScoreRow = {
  id: number;
  projectNumber: number;
  score: number;
  createdAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

type Props = {
  scores: ScoreRow[];
};

export default function MyResultsTable({ scores }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(scores.length / pageSize)), [scores.length]);
  const paginatedScores = useMemo(() => {
    const start = (page - 1) * pageSize;
    return scores.slice(start, start + pageSize);
  }, [scores, page]);
  const startIndex = (page - 1) * pageSize;
  const isBusy = pendingId !== null;

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Seoul",
      }),
    [],
  );

  const handleDelete = useCallback(async (id: number) => {
    const confirmDelete = window.confirm("해당 기록을 삭제하시겠습니까?");
    if (!confirmDelete) {
      return;
    }

    setError(null);
    setPendingId(id);

    try {
      const response = await fetch("/api/score/my", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data?.error ?? "삭제에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setPendingId(null);
    }
  }, [router]);

  if (scores.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600">
        아직 제출된 기록이 없습니다. 결과를 추가해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                No.
              </th>
              <th scope="col" className="px-4 py-3">
                프로젝트
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                점수
              </th>
              <th scope="col" className="px-4 py-3">
                제출일
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                첨부
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {paginatedScores.map((row, index) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{startIndex + index + 1}</td>
                <td className="px-4 py-3">프로젝트 {row.projectNumber}</td>
                <td className="px-4 py-3 text-right">{row.score.toFixed(4)}</td>
                <td className="px-4 py-3">
                  {dateTimeFormatter.format(new Date(row.createdAt))}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.hasFile ? (
                    <a
                      href={`/api/score/my/${row.id}/file`}
                      className="inline-flex items-center rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-[#265392] transition hover:border-[#265392]"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.fileName ?? "파일"}
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400">없음</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleDelete(row.id)}
                    className="bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white disabled:opacity-50"
                  >
                    {pendingId === row.id ? "삭제 중..." : "삭제"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-neutral-600">
        <span>
          {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isBusy}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            이전
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isBusy}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
