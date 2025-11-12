"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type User = {
  id: number;
  studentNumber: string;
  email: string;
  name: string | null;
  role: string;
};

export default function AdminUserRow({ user }: { user: User }) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: user.id,
          name: user.name ?? "",
          studentNumber: user.studentNumber,
          role,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data?.error ?? "수정에 실패했습니다.");
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3">{user.id}</td>
      <td className="px-4 py-3">{user.studentNumber}</td>
      <td className="px-4 py-3">{user.name ?? "-"}</td>
      <td className="px-4 py-3">{user.email}</td>
      <td className="px-4 py-3">
        <select
          className="rounded-md border border-neutral-200 px-2 py-1 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={saving}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td className="px-4 py-3 flex items-center gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={saving} className="bg-[#265392]">
          {saving ? "저장 중..." : "저장"}
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </td>
    </tr>
  );
}
