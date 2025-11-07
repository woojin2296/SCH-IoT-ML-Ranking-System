"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import StudentNumberStepForm from "@/app/login/components/StudentNumberStepForm";
import LoginStepForm from "@/app/login/components/LoginStepForm";
import RegisterStepForm from "@/app/login/components/RegisterStepForm";

type Step = "studentNumber" | "login" | "register";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("studentNumber");
  const [studentNumber, setStudentNumber] = useState("");

  const redirectParam = searchParams.get("redirect") ?? "/";
  const redirectPath = redirectParam.startsWith("/") ? redirectParam : "/";

  const navigateToTarget = useCallback(
    (target: string) => {
      const path = target.startsWith("/") ? target : "/";
      router.replace(path);
      router.refresh();
      if (typeof window !== "undefined") {
        window.location.href = path;
      }
    },
    [router]
  );

  return (
    <div className="flex min-w-xl flex-col items-center justify-center">
      <div className="w-full max-w-xs space-y-8">
        {step === "studentNumber" ? (
          <StudentNumberStepForm
            studentNumber={studentNumber}
            setStudentNumber={(v) => setStudentNumber(v)}
            setStep={(s) => setStep(s)}
          />
        ) : null}
        {step === "login" ? (
          <LoginStepForm
            studentNumber={studentNumber}
            setStudentNumber={setStudentNumber}
            setStep={setStep}
            onSuccess={() => navigateToTarget(redirectPath)}
          />
        ) : null}
        {step === "register" ? (
          <RegisterStepForm
            studentNumber={studentNumber}
            onSuccess={() => navigateToTarget(redirectPath)}
          />
        ) : null}
      </div>
    </div>
  );
}
