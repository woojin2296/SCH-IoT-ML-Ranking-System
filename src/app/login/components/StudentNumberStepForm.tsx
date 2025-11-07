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
};

export default function StudentNumberStepForm({
  studentNumber,
  setStudentNumber,
  setStep,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleStudentNumberChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = event.target.value.replace(/[^0-9]/g, "");
      const limited = sanitized.slice(0, 8);
      setStudentNumber(limited);
      setError(null);
    },
    [setStudentNumber]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!studentNumber.trim()) {
        setError("학번을 입력해주세요.");
        return;
      }

      if (!/^\d{8}$/.test(studentNumber)) {
        setError("학번은 8자리 숫자로 입력해주세요.");
        return;
      }

      if (isLoading) {
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentNumber }),
        });

        const data = (await response.json().catch(() => ({}))) as { error?: string } | { exists: boolean };

        if (!response.ok) {
          setError(
            (data as any)?.error ?? "사용자 조회 중 오류가 발생했습니다."
          );
          return;
        }

        if ((data as any).exists) setStep("login");
        else setStep("register");

      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [setStep, studentNumber]
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">내 계정에 로그인하기</h2>
        <p className="text-balance text-sm text-muted-foreground">
          환영합니다! 학번을 입력해주세요.
        </p>
      </div>
      <div className="grid gap-2">
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
            ref={inputRef}
            aria-invalid={Boolean(error)}
            aria-describedby="student-number-error"
          />
          <p
            id="student-number-error"
            className={`text-xs ${error ? "text-destructive" : "text-transparent"} min-h-[1.25rem]`}
            aria-live="polite"
          >
            {error ?? "placeholder"}
          </p>
        </div>
        <Button
          type="submit"
          className="w-full bg-[#265392]"
          disabled={isLoading}
        >
          {isLoading ? "확인 중..." : "다음으로"}
        </Button>
      </div>
      {/* error is shown under the input with reserved space */}
    </form>
  );
}
