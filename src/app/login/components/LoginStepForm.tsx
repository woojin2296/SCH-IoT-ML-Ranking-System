"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LoginStep = "studentNumber" | "login" | "register";

type Props = {
  studentNumber: string;
  setStudentNumber: (value: string) => void;
  setStep: (step: LoginStep) => void;
  // Local state inside component
  onSuccess: () => void;
};

export default function LoginStepForm({
  studentNumber,
  setStudentNumber,
  setStep,
  onSuccess,
}: Props) {
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  const handleStudentNumberChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = event.target.value.replace(/[^0-9]/g, "");
      const limited = sanitized.slice(0, 8);
      setStudentNumber(limited);
      setStep("studentNumber");
      setError(null);
    },
    [setError, setStep, setStudentNumber],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!password.trim()) {
        setError("비밀번호를 입력해주세요.");
        return;
      }
      if (!/^\d{8}$/.test(studentNumber)) {
        setError("학번 형식이 올바르지 않습니다.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ studentNumber, password }),
        });
        const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
        if (!response.ok || !data.success) {
          setError(data?.error ?? "로그인에 실패했습니다.");
          return;
        }
        onSuccess();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, password, setError, setIsLoading, studentNumber],
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">환영합니다!</h2>
        <p className="text-sm text-muted-foreground">등록된 계정입니다. 비밀번호를 입력해 주세요.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="student-number">학번</Label>
        <Input
          id="student-number"
          type="text"
          placeholder="20230000"
          value={studentNumber}
          onChange={handleStudentNumberChange}
          disabled={isLoading}
          maxLength={8}
        />
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            ref={passwordRef}
          />
        </div>
        <Button type="submit" className="w-full bg-[#265392]" disabled={isLoading}>
          로그인
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
