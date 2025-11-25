"use client";

import { useState } from "react";

import type { ScoreSubmissionRecord } from "@/lib/services/scoreService";
import { projects } from "@/lib/projects";
import { Button } from "@/components/ui/button";

const projectMap = new Map(projects.map((project) => [project.number, project.label]));

export default function AdminScoreRow({ record }: { record: ScoreSubmissionRecord }) {
  const projectLabel = projectMap.get(record.projectNumber) ?? `프로젝트 ${record.projectNumber}`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const downloadUrl = record.hasFile ? `/api/score/my/${record.id}/file` : null;

  const handleDelete = async () => {
    if (!confirm("이 제출 기록을 삭제하시겠습니까?")) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/scores", {
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
      setError(err instanceof Error ? err.message : "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-neutral-900">#{record.id}</td>
      <td className="px-4 py-3">{projectLabel}</td>
      <td className="px-4 py-3">{formatScore(record.score)}</td>
      <td className="px-4 py-3">{record.studentNumber}</td>
      <td className="px-4 py-3">{record.name ?? "-"}</td>
      <td className="px-4 py-3">{record.email}</td>
      <td className="px-4 py-3">
        {record.hasFile ? (
          <div className="flex flex-col gap-1">
            {downloadUrl ? (
              <a
                href={downloadUrl}
                className="inline-flex items-center rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-[#265392] transition hover:border-[#265392]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {formatFileInfo(record) ?? "파일"}
              </a>
            ) : null}
          </div>
        ) : (
          "-"
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{formatTimestamp(record.createdAt)}</td>
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
          {error ? <span className="text-xs text-destructive text-center">{error}</span> : null}
        </div>
      </td>
    </tr>
  );
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toString();
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

function formatFileInfo(record: ScoreSubmissionRecord): string {
  if (!record.hasFile) {
    return "-";
  }
  if (record.fileName && record.fileSize) {
    return `${record.fileName} (${formatBytes(record.fileSize)})`;
  }
  if (record.fileName) {
    return record.fileName;
  }
  if (record.fileSize) {
    return `첨부 (${formatBytes(record.fileSize)})`;
  }
  return "첨부 있음";
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
