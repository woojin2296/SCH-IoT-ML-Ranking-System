"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Notice } from "@/lib/notices";
import { cn } from "@/lib/utils";

type UserRow = {
  id: number;
  studentNumber: string;
  name: string | null;
  role: string;
  publicId: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ScoreRow = {
  id: number;
  userId: number;
  userPublicId: string;
  studentNumber: string;
  name: string | null;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
};

type Props = {
  initialUsers: UserRow[];
  initialScores: ScoreRow[];
  initialNotices: Notice[];
  initialLogs: LogRow[];
};

const ROLE_OPTIONS = [
  { value: "user", label: "일반 사용자" },
  { value: "admin", label: "관리자" },
];

type LogRow = {
  id: number;
  actorUserId: number | null;
  actorPublicId: string | null;
  action: string;
  scoreId: number | null;
  targetUserId: number | null;
  targetPublicId: string | null;
  projectNumber: number | null;
  score: number | null;
  createdAt: string;
};

export default function AdminDashboard({ initialUsers, initialScores, initialNotices, initialLogs }: Props) {
  const [activeTab, setActiveTab] = useState<"users" | "scores" | "notices" | "logs">("users");
  const [users, setUsers] = useState(initialUsers);
  const [scores, setScores] = useState(initialScores);
  const [notices, setNotices] = useState(initialNotices);
  const [logs] = useState(initialLogs);
  const [scorePage, setScorePage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userDraft, setUserDraft] = useState<{ name: string; studentNumber: string; role: string } | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);
  const [pendingScoreId, setPendingScoreId] = useState<number | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeForm, setNoticeForm] = useState<{ message: string; isActive: boolean }>({
    message: "",
    isActive: true,
  });
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [noticeDraft, setNoticeDraft] = useState<{ message: string; isActive: boolean } | null>(null);
  const pageSize = 10;

  const scoreTotalPages = Math.max(1, Math.ceil(scores.length / pageSize));
  const logTotalPages = Math.max(1, Math.ceil(logs.length / pageSize));

  useEffect(() => {
    setScorePage((prev) => Math.min(prev, scoreTotalPages));
  }, [scoreTotalPages]);

  useEffect(() => {
    setLogPage((prev) => Math.min(prev, logTotalPages));
  }, [logTotalPages]);

  const paginatedScores = useMemo(() => {
    const start = (scorePage - 1) * pageSize;
    return scores.slice(start, start + pageSize);
  }, [scores, scorePage]);

  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, logPage]);

  const beginEditUser = (user: UserRow) => {
    setEditingUserId(user.id);
    setUserDraft({
      name: user.name ?? "",
      studentNumber: user.studentNumber,
      role: user.role,
    });
    setUserMessage(null);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setUserDraft(null);
  };

  const updateDraft = (field: "name" | "studentNumber" | "role", value: string) => {
    setUserDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveUser = async () => {
    if (!userDraft || editingUserId === null) return;

    const trimmedName = userDraft.name.trim();
    const trimmedStudentNumber = userDraft.studentNumber.trim();

    if (!trimmedName) {
      setUserMessage("이름을 입력해주세요.");
      return;
    }

    if (!/^\d{8}$/.test(trimmedStudentNumber)) {
      setUserMessage("학번은 8자리 숫자여야 합니다.");
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingUserId,
          name: trimmedName,
          studentNumber: trimmedStudentNumber,
          role: userDraft.role,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: UserRow;
      };

      if (!response.ok || !data.user) {
        throw new Error(data?.error ?? "사용자 정보를 저장하는 데 실패했습니다.");
      }

      setUsers((prev) => prev.map((user) => (user.id === data.user!.id ? data.user! : user)));
      setUserMessage("저장되었습니다.");
      cancelEdit();
    } catch (error) {
      console.error(error);
      setUserMessage(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    }
  };

  const deleteScore = async (id: number) => {
    const confirmed = window.confirm("해당 제출 기록을 삭제하시겠습니까?");
    if (!confirmed) return;

    setPendingScoreId(id);
    setScoreMessage(null);

    try {
      const response = await fetch("/api/admin/scores", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data?.error ?? "기록 삭제에 실패했습니다.");
      }

      setScores((prev) => {
        const next = prev.filter((score) => score.id !== id);
        const nextTotalPages = Math.max(1, Math.ceil(next.length / pageSize));
        setScorePage((prevPage) => Math.min(prevPage, nextTotalPages));
        return next;
      });
      setScoreMessage("기록이 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      setScoreMessage(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setPendingScoreId(null);
    }
  };

  const resetNoticeForm = () => {
    setNoticeForm({ message: "", isActive: true });
  };

  const createNotice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNoticeMessage(null);

    const trimmed = noticeForm.message.trim();
    if (!trimmed) {
      setNoticeMessage("공지 내용을 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/admin/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          isActive: noticeForm.isActive,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; notice?: Notice };

      if (!response.ok || !data.notice) {
        throw new Error(data?.error ?? "공지를 등록하는 데 실패했습니다.");
      }

      setNotices((prev) => [data.notice!, ...prev]);
      resetNoticeForm();
      setNoticeMessage("공지가 등록되었습니다.");
    } catch (error) {
      console.error(error);
      setNoticeMessage(error instanceof Error ? error.message : "공지 등록 중 오류가 발생했습니다.");
    }
  };

  const beginEditNotice = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setNoticeDraft({ message: notice.message, isActive: !!notice.isActive });
    setNoticeMessage(null);
  };

  const cancelNoticeEdit = () => {
    setEditingNoticeId(null);
    setNoticeDraft(null);
  };

  const saveNotice = async () => {
    if (editingNoticeId === null || !noticeDraft) {
      return;
    }

    const trimmed = noticeDraft.message.trim();
    if (!trimmed) {
      setNoticeMessage("공지 내용을 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/admin/notices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingNoticeId,
          message: trimmed,
          isActive: noticeDraft.isActive,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; notice?: Notice };

      if (!response.ok || !data.notice) {
        throw new Error(data?.error ?? "공지 수정에 실패했습니다.");
      }

      setNotices((prev) => prev.map((notice) => (notice.id === data.notice!.id ? data.notice! : notice)));
      setNoticeMessage("공지 정보가 저장되었습니다.");
      cancelNoticeEdit();
    } catch (error) {
      console.error(error);
      setNoticeMessage(error instanceof Error ? error.message : "공지 수정 중 오류가 발생했습니다.");
    }
  };

  const deleteNotice = async (id: number) => {
    const confirmed = window.confirm("해당 공지를 삭제하시겠습니까?");
    if (!confirmed) return;

    setNoticeMessage(null);

    try {
      const response = await fetch("/api/admin/notices", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data?.error ?? "공지 삭제에 실패했습니다.");
      }

      if (editingNoticeId === id) {
        cancelNoticeEdit();
      }
      setNotices((prev) => prev.filter((notice) => notice.id !== id));
      setNoticeMessage("공지가 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      setNoticeMessage(error instanceof Error ? error.message : "공지 삭제 중 오류가 발생했습니다.");
    }
  };

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "users", label: "사용자 관리" },
    { key: "scores", label: "제출 기록" },
    { key: "notices", label: "공지 관리" },
    { key: "logs", label: "로그" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition",
              activeTab === tab.key
                ? "bg-[#265392] text-white shadow"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "users" ? (
        <section className="space-y-4">
          <header>
            <h2 className="text-lg font-semibold">사용자 관리</h2>
            <p className="text-sm text-neutral-500">이름, 학번, 역할을 수정할 수 있습니다.</p>
            {userMessage ? (
              <p className="mt-2 text-sm text-emerald-600">{userMessage}</p>
            ) : null}
          </header>
        <div className="overflow-x-auto border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">공개 ID</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">학번</th>
                <th className="px-4 py-3">역할</th>
                <th className="px-4 py-3">최근 로그인</th>
                <th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((user) => {
                const isEditing = editingUserId === user.id && userDraft;
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {user.publicId}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                          value={userDraft!.name}
                          onChange={(event) => updateDraft("name", event.target.value)}
                        />
                      ) : (
                        user.name ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                          value={userDraft!.studentNumber}
                          onChange={(event) => updateDraft("studentNumber", event.target.value)}
                        />
                      ) : (
                        user.studentNumber
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                          value={userDraft!.role}
                          onChange={(event) => updateDraft("role", event.target.value)}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        user.role === "admin" ? "관리자" : "사용자"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            취소
                          </Button>
                          <Button size="sm" onClick={saveUser}>
                            저장
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => beginEditUser(user)}>
                          수정
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </section>
      ) : null}

      {activeTab === "scores" ? (
        <section className="space-y-4">
          <header>
            <h2 className="text-lg font-semibold">제출 기록 관리</h2>
            <p className="text-sm text-neutral-500">참가자의 제출 점수를 확인하고 삭제할 수 있습니다.</p>
            {scoreMessage ? (
              <p className="mt-2 text-sm text-emerald-600">{scoreMessage}</p>
            ) : null}
          </header>
          <div className="overflow-x-auto border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">참가자</th>
                  <th className="px-4 py-3">학번</th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">프로젝트</th>
                  <th className="px-4 py-3 text-right">점수</th>
                  <th className="px-4 py-3">제출일</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedScores.map((score) => (
                  <tr key={score.id}>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{score.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {score.userPublicId}
                    </td>
                    <td className="px-4 py-3">{score.studentNumber}</td>
                    <td className="px-4 py-3">{score.name ?? "-"}</td>
                    <td className="px-4 py-3">프로젝트 {score.projectNumber}</td>
                    <td className="px-4 py-3 text-right">{score.score.toFixed(4)}</td>
                    <td className="px-4 py-3">
                      {new Date(score.evaluatedAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingScoreId !== null}
                        onClick={() => deleteScore(score.id)}
                      >
                        {pendingScoreId === score.id ? "삭제 중..." : "삭제"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>
              {scorePage} / {scoreTotalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={scorePage <= 1 || pendingScoreId !== null}
                onClick={() => setScorePage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={scorePage >= scoreTotalPages || pendingScoreId !== null}
                onClick={() => setScorePage((prev) => Math.min(scoreTotalPages, prev + 1))}
              >
                다음
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "notices" ? (
        <section className="space-y-4">
          <header>
            <h2 className="text-lg font-semibold">공지 관리</h2>
            <p className="text-sm text-neutral-500">Hero 영역에 보여질 공지를 등록하고 관리합니다.</p>
            {noticeMessage ? (
              <p className="mt-2 text-sm text-emerald-600">{noticeMessage}</p>
            ) : null}
          </header>
          <form className="grid gap-3 rounded-md border border-neutral-200 p-4" onSubmit={createNotice}>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">공지 내용</label>
              <textarea
                value={noticeForm.message}
                onChange={(event) => setNoticeForm((prev) => ({ ...prev, message: event.target.value }))}
                className="min-h-[80px] rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                placeholder="공지 내용을 입력하세요."
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={noticeForm.isActive}
                onChange={(event) =>
                  setNoticeForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
              공지를 즉시 노출하기
            </label>
            <div className="flex justify-end">
              <Button type="submit" className="bg-[#265392]">
                공지 등록
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">내용</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">작성일</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {notices.map((notice) => {
                  const isEditing = editingNoticeId === notice.id && noticeDraft;
                  return (
                    <tr key={notice.id}>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{notice.id}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <textarea
                            className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                            rows={2}
                            value={noticeDraft!.message}
                            onChange={(event) =>
                              setNoticeDraft((prev) => (prev ? { ...prev, message: event.target.value } : prev))
                            }
                          />
                        ) : (
                          notice.message
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={noticeDraft!.isActive}
                              onChange={(event) =>
                                setNoticeDraft((prev) =>
                                  prev ? { ...prev, isActive: event.target.checked } : prev,
                                )
                              }
                            />
                            노출
                          </label>
                        ) : notice.isActive ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                            노출 중
                          </span>
                        ) : (
                          <span className="rounded-full bg-neutral-200 px-2 py-1 text-xs text-neutral-600">
                            숨김
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {new Date(notice.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={cancelNoticeEdit}>
                              취소
                            </Button>
                            <Button size="sm" onClick={saveNotice}>
                              저장
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => beginEditNotice(notice)}>
                              수정
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteNotice(notice.id)}>
                              삭제
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "logs" ? (
        <section className="space-y-4">
          <header>
            <h2 className="text-lg font-semibold">제출 로그</h2>
            <p className="text-sm text-neutral-500">제출 기록 생성/삭제 내역을 확인할 수 있습니다.</p>
          </header>
          <div className="overflow-x-auto border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">행위자</th>
                  <th className="px-4 py-3">액션</th>
                  <th className="px-4 py-3">대상</th>
                  <th className="px-4 py-3">프로젝트</th>
                  <th className="px-4 py-3 text-right">점수</th>
                  <th className="px-4 py-3">시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{log.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {log.actorPublicId ?? "시스템"}
                    </td>
                    <td className="px-4 py-3 capitalize">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {log.targetPublicId ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {log.projectNumber ? `프로젝트 ${log.projectNumber}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {typeof log.score === "number" ? log.score.toFixed(4) : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(log.createdAt).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>
              {logPage} / {logTotalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logPage <= 1}
                onClick={() => setLogPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logPage >= logTotalPages}
                onClick={() => setLogPage((prev) => Math.min(logTotalPages, prev + 1))}
              >
                다음
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
