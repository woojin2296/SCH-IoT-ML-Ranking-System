"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  studentNumber: string;
  onSuccess: () => void;
};

export default function RegisterStepForm({ studentNumber, onSuccess }: Props) {
  const registerNameRef = useRef<HTMLInputElement | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isComposingName, setIsComposingName] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  useEffect(() => {
    registerNameRef.current?.focus();
  }, []);

  const onChangeName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (isComposingName) {
        setNewName(value);
        return;
      }
      const sanitized = value.replace(/[^가-힣a-zA-Z\s]/g, "");
      setNewName(sanitized);
    },
    [isComposingName, setNewName],
  );

  const onCompositionEnd = useCallback(
    (event: React.CompositionEvent<HTMLInputElement>) => {
      setIsComposingName(false);
      const value = event.currentTarget.value;
      const sanitized = value.replace(/[^가-힣a-zA-Z\s]/g, "");
      setNewName(sanitized);
    },
    [setIsComposingName, setNewName],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = newName.trim();
      const trimmedEmail = newEmail.trim();
      // reset field errors
      setNameError(null);
      setPasswordError(null);
      setConfirmPasswordError(null);
      setFormError(null);
      if (!trimmedName) {
        setNameError("이름을 입력해주세요.");
        return;
      }
      if (!/^[가-힣a-zA-Z\s]{2,}$/u.test(trimmedName)) {
        setNameError("이름은 한글 또는 영문으로 입력해주세요.");
        return;
      }
      // 이메일 즉시 검증 에러가 있다면 우선 처리
      if (emailError) {
        setFormError(emailError);
        return;
      }
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setEmailError("이메일 형식이 올바르지 않습니다.");
        return;
      }
      if (!newPassword.trim()) {
        setPasswordError("비밀번호를 입력해주세요.");
        return;
      }
      if (!confirmPassword.trim()) {
        setConfirmPasswordError("비밀번호 확인을 입력해주세요.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setConfirmPasswordError("비밀번호가 서로 일치하지 않습니다.");
        return;
      }

      setIsLoading(true);
      setFormError(null);
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: trimmedName,
            studentNumber,
            email: trimmedEmail || undefined,
            password: newPassword,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };
        if (!response.ok || !data.success) {
          setFormError(data?.error ?? "회원가입에 실패했습니다.");
          return;
        }
        onSuccess();
      } catch (err) {
        console.error(err);
        setFormError(err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [confirmPassword, emailError, newEmail, newName, newPassword, onSuccess, setIsLoading, studentNumber],
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">처음 방문하셨나요?</h2>
        <p className="text-sm text-muted-foreground">이름과 사용할 비밀번호, 이메일을 입력해 주세요.</p>
      </div>
      <div>
        
      </div>
      <div className="grid gap-2">
        <Label htmlFor="student-number">학번</Label>
        <Input id="student-number" type="text" placeholder="20230000" value={studentNumber} disabled maxLength={8} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="register-name">이름</Label>
        <Input
          id="register-name"
          type="text"
          placeholder="홍길동"
          value={newName}
          onChange={onChangeName}
          onCompositionStart={() => setIsComposingName(true)}
          onCompositionEnd={onCompositionEnd}
          ref={registerNameRef}
          maxLength={10}
          aria-invalid={Boolean(nameError)}
          aria-describedby="register-name-error"
        />
        <p id="register-name-error" className={`text-xs ${nameError ? "text-destructive" : "text-transparent"} min-h-[1.25rem]`} aria-live="polite">{nameError ?? "placeholder"}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="register-email">이메일 (선택)</Label>
        <Input
          id="register-email"
          type="email"
          placeholder="name@example.com"
          value={newEmail}
          onChange={(e) => {
            const v = e.target.value;
            setNewEmail(v);
            const t = v.trim();
            if (!t) {
              setEmailError(null);
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
              setEmailError("이메일 형식이 올바르지 않습니다.");
            } else {
              setEmailError(null);
            }
          }}
          aria-invalid={Boolean(emailError)}
          aria-describedby="register-email-error"
          autoComplete="email"
        />
        <p id="register-email-error" className={`text-xs ${emailError ? "text-destructive" : "text-transparent"} min-h-[1.25rem]`} aria-live="polite">{emailError ?? "placeholder"}</p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="new-password">비밀번호</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="******"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
            aria-invalid={Boolean(passwordError)}
            aria-describedby="register-password-error"
            
          />
          <p id="register-password-error" className={`text-xs ${passwordError ? "text-destructive" : "text-transparent"} min-h-[1.25rem]`} aria-live="polite">{passwordError ?? "placeholder"}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">비밀번호 확인</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="******"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(null); }}
            aria-invalid={Boolean(confirmPasswordError)}
            aria-describedby="register-confirm-password-error"
            
          />
          <p id="register-confirm-password-error" className={`text-xs ${confirmPasswordError ? "text-destructive" : "text-transparent"} min-h-[1.25rem]`} aria-live="polite">{confirmPasswordError ?? "placeholder"}</p>
        </div>
        <Button type="submit" className="w-full bg-[#265392]" disabled={isLoading}>
          회원가입
        </Button>
      </div>
      <p className={`text-sm ${formError ? "text-destructive" : "text-transparent"} min-h-[1.25rem]`} aria-live="polite">{formError ?? "placeholder"}</p>
    </form>
  );
}
