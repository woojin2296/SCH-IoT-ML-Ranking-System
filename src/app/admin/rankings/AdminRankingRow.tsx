"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type RankingRecord = {
  id: number;
  userId: number;
  publicId: string;
  projectNumber: number;
  score: number;
  createdAt: string;
  position: number;
  name: string | null;
  email: string;
  studentNumber: string;
};

export default function AdminRankingRow({ record }: { record: RankingRecord }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedTimestamp = formatTimestamp(record.createdAt);

  const handleDelete = async () => {
    if (!confirm("정말로 이 랭킹 기록을 삭제하시겠습니까?")) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rankings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: record.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data?.error ?? "삭제에 실패했습니다.");
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-center">{record.position}</td>
      <td className="px-4 py-3">{formatScore(record.score)}</td>
      <td className="px-4 py-3">{record.projectNumber}</td>
      <td className="px-4 py-3">{record.studentNumber}</td>
      <td className="px-4 py-3">{record.name ?? "-"}</td>
      <td className="px-4 py-3">{record.email}</td>
      <td className="px-4 py-3">{record.publicId}</td>
      <td className="px-4 py-3 whitespace-nowrap">{formattedTimestamp}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "삭제 중..." : "삭제"}
          </Button>
          {error ? (
            <span className="text-xs text-destructive text-center">{error}</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function formatTimestamp(value: string): string {
  const isoCandidate = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    }).format(parsed);
  } catch {
    return parsed.toISOString();
  }
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 4,
  });
}
