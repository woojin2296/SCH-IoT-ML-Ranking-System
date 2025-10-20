"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { projects } from "@/lib/projects";
import AppHero from "@/components/app/AppHero";
import { Alert } from "@/components/ui/alert";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function SubmitResultForm() {
  const router = useRouter();
  const [projectNumber, setProjectNumber] = useState<number>(projects[0].number);
  const [score, setScore] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitState>("idle");
  const [noticeMessages, setNoticeMessages] = useState<string[]>([]);

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        router.replace("/my-results");
        router.refresh();
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, router]);

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const response = await fetch("/api/notices");
        if (!response.ok) return;
        const data = (await response.json()) as { notices?: { message: string }[] };
        if (data.notices?.length) {
          setNoticeMessages(data.notices.map((item) => item.message));
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchNotice();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const numericScore = Number.parseFloat(score);
    if (Number.isNaN(numericScore)) {
      setError("점수를 숫자로 입력해주세요.");
      return;
    }

    if (!file) {
      setError("제출 파일을 첨부해주세요.");
      return;
    }

    setStatus("submitting");
    try {
      const formData = new FormData();
      formData.append("projectNumber", String(projectNumber));
      formData.append("score", String(numericScore));
      formData.append("attachment", file);

      const response = await fetch("/api/my-results", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "제출에 실패했습니다.";
        try {
          const data = (await response.json()) as { error?: string };
          if (data?.error) {
            message = data.error;
          }
        } catch {
          // ignore parse errors, fallback message will be used
        }
        setStatus("error");
        setError(message);
        return;
      }

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-svh flex flex-col gap-4 p-6 md:p-10">
      <AppHero
        alerts={
          noticeMessages.length
            ? noticeMessages
            : ["현 시스템은 SCH 머신러닝 미니 프로젝트의 랭킹 확인을 위한 플랫폼입니다."]
        }
      />
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <h2 className="text-xl font-bold">결과 제출</h2>
        {status === "success" ? (
          <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
            제출이 완료되었습니다. 잠시 후 결과 목록으로 이동합니다.
          </Alert>
        ) : (
          <Alert className="bg-blue-50 text-blue-900 border-blue-200">
            프로젝트 결과를 제출하려면 아래 폼을 작성해 주세요.
          </Alert>
        )}
      </div>
      <div className="mx-auto w-full max-w-xl rounded-lg border bg-white p-6 shadow-sm">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="project">프로젝트</Label>
            <select
              id="project"
              value={projectNumber}
              onChange={(event) => setProjectNumber(Number.parseInt(event.target.value, 10))}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-[#265392] focus:outline-none focus:ring-2 focus:ring-[#265392]/20"
              required
            >
              {projects.map((project) => (
                <option key={project.number} value={project.number ?? ""}>
                  {project.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="score">점수</Label>
          <Input
            id="score"
            type="number"
            inputMode="decimal"
            step="0.0001"
            placeholder="예: 0.9123"
          value={score}
          onChange={(event) => setScore(event.target.value)}
          required
        />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="attachment">결과 파일</Label>
            <Input
              id="attachment"
              type="file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
              required
            />
            <p className="text-xs text-neutral-500">파일은 10MB 이하로 업로드해주세요.</p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-[#265392]"
              disabled={status === "submitting" || !!error}
            >
              {status === "submitting" ? "제출 중..." : "결과 제출"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={status === "submitting"}
            >
              돌아가기
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
