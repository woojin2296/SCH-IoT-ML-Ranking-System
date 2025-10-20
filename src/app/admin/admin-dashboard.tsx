"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import type { Notice } from "@/lib/notices";
import { cn } from "@/lib/utils";

type UserRow = {
  id: number;
  studentNumber: string;
  name: string | null;
  role: string;
  semester: number;
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
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
  userYear: number;
};

type Props = {
  initialUsers: UserRow[];
  initialScores: ScoreRow[];
  initialNotices: Notice[];
  initialLogs: LogRow[];
  initialRequestLogs: RequestLogRow[];
  availableYears: number[];
  selectedYear: number;
  requestMethodOptions: string[];
  initialRankingRecords: RankingRecord[];
  rankingDefaultFrom: string;
  rankingDefaultTo: string;
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
  logYear: number | null;
};

type RequestLogRow = {
  id: number;
  userId: number | null;
  userPublicId: string | null;
  userStudentNumber: string | null;
  name: string | null;
  path: string;
  method: string;
  status: number | null;
  metadata: Record<string, unknown> | string | null;
  createdAt: string;
  logYear: number | null;
};

type RankingRecord = {
  id: number;
  position: number;
  studentNumber: string;
  name: string | null;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

export default function AdminDashboard({
  initialUsers,
  initialScores,
  initialNotices,
  initialLogs,
  initialRequestLogs,
  availableYears,
  selectedYear,
  requestMethodOptions,
  initialRankingRecords,
  rankingDefaultFrom,
  rankingDefaultTo,
}: Props) {
  const [activeTab, setActiveTab] = useState<"users" | "scores" | "notices" | "logs" | "requestLogs">("users");
  const [users, setUsers] = useState(initialUsers);
  const [scores, setScores] = useState(initialScores);
  const [notices, setNotices] = useState(initialNotices);
  const [logs, setLogs] = useState(initialLogs);
  const [requestLogs, setRequestLogs] = useState(initialRequestLogs);
  const [rankingRecords, setRankingRecords] = useState<RankingRecord[]>(initialRankingRecords);
  const [scorePage, setScorePage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [requestLogPage, setRequestLogPage] = useState(1);
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
  const initialYearOptions = availableYears.length ? availableYears : [selectedYear];
  const normalizedSelectedYear =
    initialYearOptions.find((year) => year === selectedYear) ?? initialYearOptions[0] ?? null;
  const initialYearFilter: number | "all" = normalizedSelectedYear ?? "all";
  const [userYearFilter, setUserYearFilter] = useState<number | "all">(initialYearFilter);
  const [scoreYearFilter, setScoreYearFilter] = useState<number | "all">(initialYearFilter);
  const [logYearFilter, setLogYearFilter] = useState<number | "all">(initialYearFilter);
  const [requestLogPathFilter, setRequestLogPathFilter] = useState("");
  const [requestLogMethodFilter, setRequestLogMethodFilter] = useState<string | "all">("all");
  const [yearOptions, setYearOptions] = useState(() => initialYearOptions);
  const [methodOptions, setMethodOptions] = useState(() =>
    requestMethodOptions.length ? requestMethodOptions : ["GET", "POST"],
  );
  const [rankingProject, setRankingProject] = useState<number>(1);
  const [rankingFrom, setRankingFrom] = useState(() => rankingDefaultFrom.slice(0, 10));
  const [rankingTo, setRankingTo] = useState(() => rankingDefaultTo.slice(0, 10));

  useEffect(() => {
    setUsers(initialUsers);
    setEditingUserId(null);
    setUserDraft(null);
    setSemesterDraft(null);
    setUserMessage(null);
  }, [initialUsers]);

  useEffect(() => {
    setScores(initialScores);
    setScorePage(1);
    setScoreMessage(null);
  }, [initialScores]);

  useEffect(() => {
    setLogs(initialLogs);
    setLogPage(1);
  }, [initialLogs]);

  useEffect(() => {
    setRequestLogs(initialRequestLogs);
    setRequestLogPage(1);
  }, [initialRequestLogs]);

  useEffect(() => {
    setRankingRecords(initialRankingRecords);
    setRankingProject(1);
    setRankingFrom(rankingDefaultFrom.slice(0, 10));
    setRankingTo(rankingDefaultTo.slice(0, 10));
  }, [initialRankingRecords, rankingDefaultFrom, rankingDefaultTo]);

  const fetchRankingRecords = async (project: number, fromDate: string, toDate: string) => {
    setRankingLoading(true);
    setRankingError(null);
    try {
      const params = new URLSearchParams({ project: String(project) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const response = await fetch(`/api/admin/rankings?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        rankings?: RankingRecord[];
      };
      if (!response.ok || !data.rankings) {
        throw new Error(data.error ?? "랭킹 데이터를 불러오지 못했습니다.");
      }
      setRankingRecords(data.rankings);
    } catch (error) {
      console.error(error);
      setRankingError(error instanceof Error ? error.message : "랭킹 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    fetchRankingRecords(1, rankingDefaultFrom, rankingDefaultTo);
  }, [rankingDefaultFrom, rankingDefaultTo]);

  useEffect(() => {
    const methods = new Set<string>(requestMethodOptions.map((method) => method.toUpperCase()));
    requestLogs.forEach((log) => methods.add(log.method.toUpperCase()));
    const next = Array.from(methods).sort();
    setMethodOptions(next.length ? next : ["GET", "POST"]);
  }, [requestMethodOptions, requestLogs]);

  useEffect(() => {
    setNotices(initialNotices);
  }, [initialNotices]);

  useEffect(() => {
    const dynamicSet = new Set<number>(availableYears);
    users.forEach((user) => dynamicSet.add(user.semester));
    scores.forEach((score) => dynamicSet.add(score.userYear));
    logs.forEach((log) => {
      if (typeof log.logYear === "number") {
        dynamicSet.add(log.logYear);
      }
    });
    requestLogs.forEach((log) => {
      if (typeof log.logYear === "number") {
        dynamicSet.add(log.logYear);
      }
    });
    const nextYearOptions = Array.from(dynamicSet).sort((a, b) => b - a);
    setYearOptions(nextYearOptions);
  }, [availableYears, users, scores, logs, requestLogs]);

  useEffect(() => {
    if (userYearFilter !== "all" && !yearOptions.includes(userYearFilter)) {
      setUserYearFilter("all");
    }
    if (scoreYearFilter !== "all" && !yearOptions.includes(scoreYearFilter)) {
      setScoreYearFilter("all");
    }
    if (logYearFilter !== "all" && !yearOptions.includes(logYearFilter)) {
      setLogYearFilter("all");
    }
    if (requestLogMethodFilter !== "all" && !methodOptions.includes(requestLogMethodFilter)) {
      setRequestLogMethodFilter("all");
    }
  }, [yearOptions, methodOptions, userYearFilter, scoreYearFilter, logYearFilter, requestLogMethodFilter]);

  useEffect(() => {
    setScorePage(1);
  }, [scoreYearFilter]);

  useEffect(() => {
    setLogPage(1);
  }, [logYearFilter]);

  useEffect(() => {
    setRequestLogPage(1);
  }, [requestLogPathFilter]);

  useEffect(() => {
    setRequestLogPage(1);
  }, [requestLogMethodFilter]);

  const handleUserYearFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setUserYearFilter(value === "all" ? "all" : Number.parseInt(value, 10));
  };

  const handleScoreYearFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setScoreYearFilter(value === "all" ? "all" : Number.parseInt(value, 10));
  };

  const handleLogYearFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setLogYearFilter(value === "all" ? "all" : Number.parseInt(value, 10));
  };

  const applyRankingFilter = () => {
    if (!rankingFrom || !rankingTo) {
      setRankingError("날짜 범위를 모두 선택해주세요.");
      return;
    }

  if (new Date(rankingFrom) > new Date(rankingTo)) {
    setRankingError("시작 날짜가 종료 날짜보다 클 수 없습니다.");
    return;
  }

  fetchRankingRecords(rankingProject, `${rankingFrom}T00:00:00`, `${rankingTo}T23:59:59`);
};

  const filteredUsers = useMemo(() => {
    if (userYearFilter === "all") {
      return users;
    }
    return users.filter((user) => user.semester === userYearFilter);
  }, [users, userYearFilter]);

  const filteredScores = useMemo(() => {
    if (scoreYearFilter === "all") {
      return scores;
    }
    return scores.filter((score) => score.userYear === scoreYearFilter);
  }, [scores, scoreYearFilter]);

  const filteredLogs = useMemo(() => {
    if (logYearFilter === "all") {
      return logs;
    }
    return logs.filter((log) => log.logYear === logYearFilter);
  }, [logs, logYearFilter]);

  const filteredRequestLogs = useMemo(() => {
    return requestLogs.filter((log) => {
      const matchesPath = requestLogPathFilter.trim().length
        ? log.path.toLowerCase().includes(requestLogPathFilter.trim().toLowerCase())
        : true;
      const matchesMethod = requestLogMethodFilter === "all" || log.method === requestLogMethodFilter;
      return matchesPath && matchesMethod;
    });
  }, [requestLogs, requestLogPathFilter, requestLogMethodFilter]);

  const scoreTotalPages = Math.max(1, Math.ceil(filteredScores.length / pageSize));
  const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const requestLogTotalPages = Math.max(1, Math.ceil(filteredRequestLogs.length / pageSize));

  useEffect(() => {
    setScorePage((prev) => Math.min(prev, scoreTotalPages));
  }, [scoreTotalPages]);

  useEffect(() => {
    setLogPage((prev) => Math.min(prev, logTotalPages));
  }, [logTotalPages]);

  useEffect(() => {
    setRequestLogPage((prev) => Math.min(prev, requestLogTotalPages));
  }, [requestLogTotalPages]);

  const paginatedScores = useMemo(() => {
    const start = (scorePage - 1) * pageSize;
    return filteredScores.slice(start, start + pageSize);
  }, [filteredScores, scorePage]);

  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, logPage]);

  const paginatedRequestLogs = useMemo(() => {
    const start = (requestLogPage - 1) * pageSize;
    return filteredRequestLogs.slice(start, start + pageSize);
  }, [filteredRequestLogs, requestLogPage]);

  const beginEditUser = (user: UserRow) => {
    setEditingUserId(user.id);
    setUserDraft({
      name: user.name ?? "",
      studentNumber: user.studentNumber,
      role: user.role,
    });
    setUserMessage(null);
    setSemesterDraft(user.semester.toString());
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setUserDraft(null);
    setSemesterDraft(null);
  };

  const updateDraft = (field: "name" | "studentNumber" | "role", value: string) => {
    setUserDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const [semesterDraft, setSemesterDraft] = useState<string | null>(null);

  const saveUser = async () => {
    if (!userDraft || editingUserId === null || semesterDraft === null) return;

    const trimmedName = userDraft.name.trim();
    const trimmedStudentNumber = userDraft.studentNumber.trim();
    const trimmedSemester = semesterDraft.trim();

    if (!trimmedName) {
      setUserMessage("이름을 입력해주세요.");
      return;
    }

    if (!/^\d{8}$/.test(trimmedStudentNumber)) {
      setUserMessage("학번은 8자리 숫자여야 합니다.");
      return;
    }

    if (!/^\d{4}$/.test(trimmedSemester)) {
      setUserMessage("년도는 4자리 숫자로 입력해주세요.");
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
          semester: Number.parseInt(trimmedSemester, 10),
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
    { key: "rankingRecords", label: "랭킹 기록" },
    { key: "logs", label: "제출 로그" },
    { key: "requestLogs", label: "요청 로그" },
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
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">사용자 관리</h2>
              <p className="text-sm text-neutral-500">
                이름, 학번, 년도, 역할을 수정할 수 있습니다.
              </p>
              {userMessage ? (
                <p className="mt-2 text-sm text-emerald-600">{userMessage}</p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <span>년도 필터</span>
              <select
                value={userYearFilter === "all" ? "all" : String(userYearFilter)}
                onChange={handleUserYearFilter}
                className="rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
              >
                <option value="all">전체</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
            ))}
          </select>
        </label>
          </header>
        <div className="overflow-x-auto border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">공개 ID</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">학번</th>
                <th className="px-4 py-3">년도</th>
                <th className="px-4 py-3">역할</th>
                <th className="px-4 py-3">최근 로그인</th>
                <th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredUsers.map((user) => {
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
                        <input
                          className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                          value={semesterDraft ?? ""}
                          onChange={(event) => setSemesterDraft(event.target.value)}
                        />
                      ) : (
                        user.semester
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
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
                        : "-"}
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
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">제출 기록 관리</h2>
              <p className="text-sm text-neutral-500">참가자의 제출 점수를 확인하고 삭제할 수 있습니다.</p>
              {scoreMessage ? (
                <p className="mt-2 text-sm text-emerald-600">{scoreMessage}</p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <span>년도 필터</span>
              <select
                value={scoreYearFilter === "all" ? "all" : String(scoreYearFilter)}
                onChange={handleScoreYearFilter}
                className="rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
              >
                <option value="all">전체</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>
          </header>
          <div className="overflow-x-auto border border-neutral-200">
            {rankingLoading ? (
              <p className="px-4 py-2 text-xs text-neutral-500">랭킹 데이터를 불러오는 중입니다...</p>
            ) : null}
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">참가자</th>
                  <th className="px-4 py-3">학번</th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">년도</th>
                  <th className="px-4 py-3">프로젝트</th>
                  <th className="px-4 py-3 text-right">점수</th>
                  <th className="px-4 py-3">제출일</th>
                  <th className="px-4 py-3 text-center">첨부</th>
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
                    <td className="px-4 py-3">{score.userYear}</td>
                    <td className="px-4 py-3">프로젝트 {score.projectNumber}</td>
                    <td className="px-4 py-3 text-right">{score.score.toFixed(4)}</td>
                    <td className="px-4 py-3">
                      {new Date(score.evaluatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {score.hasFile ? (
                        <a
                          href={`/api/my-results/${score.id}/file`}
                          className="inline-flex items-center rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-[#265392] transition hover:border-[#265392]"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {score.fileName ?? "파일"}
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-400">없음</span>
                      )}
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

      {activeTab === "rankingRecords" ? (
        <section className="space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">랭킹 기록</h2>
              <p className="text-sm text-neutral-500">선택한 날짜 범위와 프로젝트에 대한 상위 랭킹을 확인할 수 있습니다.</p>
              {rankingError ? (
                <p className="text-sm text-destructive">{rankingError}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-3 text-sm text-neutral-700">
              <label className="flex flex-col gap-1">
                <span>프로젝트</span>
                <select
                  value={rankingProject}
                  onChange={(event) => setRankingProject(Number.parseInt(event.target.value, 10))}
                  className="rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                >
                  {[1, 2, 3, 4].map((project) => (
                    <option key={project} value={project}>
                      프로젝트 {project}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>시작일</span>
                <input
                  type="date"
                  value={rankingFrom}
                  max={rankingTo}
                  onChange={(event) => setRankingFrom(event.target.value)}
                  className="rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>종료일</span>
                <input
                  type="date"
                  value={rankingTo}
                  min={rankingFrom}
                  onChange={(event) => setRankingTo(event.target.value)}
                  className="rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                />
              </label>
              <Button type="button" className="bg-[#265392]" onClick={applyRankingFilter} disabled={rankingLoading}>
                {rankingLoading ? "불러오는 중..." : "적용"}
              </Button>
            </div>
          </header>
          <div className="overflow-x-auto border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">순위</th>
                  <th className="px-4 py-3">학번</th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3 text-right">점수</th>
                  <th className="px-4 py-3 text-center">첨부</th>
                  <th className="px-4 py-3">제출일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rankingRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                      선택한 조건에 해당하는 랭킹 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rankingRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 font-semibold">{record.position}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-600">{record.studentNumber}</td>
                      <td className="px-4 py-3">{record.name ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{record.score.toFixed(4)}</td>
                      <td className="px-4 py-3 text-center">
                        {record.hasFile ? (
                          <a
                            href={`/api/my-results/${record.id}/file`}
                            className="inline-flex items-center rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-[#265392] transition hover:border-[#265392]"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {record.fileName ?? "파일"}
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-400">없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {new Date(record.evaluatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                        {new Date(notice.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
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
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">제출 로그</h2>
              <p className="text-sm text-neutral-500">제출 기록 생성/삭제 내역을 확인할 수 있습니다.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <span>년도 필터</span>
              <select
                value={logYearFilter === "all" ? "all" : String(logYearFilter)}
                onChange={handleLogYearFilter}
                className="rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
              >
                <option value="all">전체</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>
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
                  <th className="px-4 py-3">년도</th>
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
                    <td className="px-4 py-3">{log.logYear ?? "-"}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
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

      {activeTab === "requestLogs" ? (
        <section className="space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">요청 로그</h2>
              <p className="text-sm text-neutral-500">사용자와 관리자 요청 기록을 확인할 수 있습니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
              <label className="flex items-center gap-2">
                <span>메서드</span>
                <select
                  value={requestLogMethodFilter}
                  onChange={(event) =>
                    setRequestLogMethodFilter(
                      event.target.value === "all" ? "all" : event.target.value.toUpperCase(),
                    )
                  }
                  className="rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                >
                  <option value="all">전체</option>
                  {methodOptions.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span>경로</span>
                <input
                  type="text"
                  value={requestLogPathFilter}
                  onChange={(event) => setRequestLogPathFilter(event.target.value)}
                  placeholder="/api/..."
                  className="w-40 rounded-md border border-neutral-200 px-3 py-2 focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
                />
              </label>
            </div>
          </header>
          <div className="overflow-x-auto border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">학번</th>
                  <th className="px-4 py-3">경로</th>
                  <th className="px-4 py-3">메서드</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">메타데이터</th>
                  <th className="px-4 py-3">시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedRequestLogs.map((log) => {
                  const metadataString =
                    log.metadata === null
                      ? "-"
                      : typeof log.metadata === "string"
                        ? log.metadata
                        : JSON.stringify(log.metadata);

                  return (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{log.id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                        {log.userStudentNumber ?? ""}
                      </td>
                      <td className="px-4 py-3">{log.path}</td>
                      <td className="px-4 py-3 uppercase">{log.method}</td>
                      <td className="px-4 py-3">{log.status ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-neutral-600 break-words">{metadataString}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>
              {requestLogPage} / {requestLogTotalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={requestLogPage <= 1}
                onClick={() => setRequestLogPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={requestLogPage >= requestLogTotalPages}
                onClick={() => setRequestLogPage((prev) => Math.min(requestLogTotalPages, prev + 1))}
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
