"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Notice = {
  id: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function NoticeRow({ notice, isNew }: { notice: Notice; isNew?: boolean }) {
  const [message, setMessage] = useState(notice.message);
  const [isActive, setIsActive] = useState<boolean>(notice.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = isNew
        ? { message, isActive }
        : { id: notice.id, message, isActive };
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch("/api/admin/notices", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data?.error ?? "실패했습니다.");
        return;
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 오류");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (isNew) {
      setMessage("");
      setIsActive(true);
      return;
    }
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: notice.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data?.error ?? "삭제 실패");
        return;
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 오류");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3">{isNew ? "새 공지" : notice.id}</td>
      <td className="px-4 py-3 w-full">
        <input
          type="text"
          className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="공지 내용을 입력하세요"
          disabled={saving}
        />
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={saving} />
          활성화
        </label>
      </td>
      <td className="px-4 py-3 flex items-center gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={saving} className="bg-[#265392]">
          {saving ? "저장 중..." : isNew ? "추가" : "저장"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete} disabled={saving}>
          {isNew ? "초기화" : "삭제"}
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </td>
    </tr>
  );
}

