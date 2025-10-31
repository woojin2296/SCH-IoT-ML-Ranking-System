'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import AppHero from "@/components/app/AppHero"
import { AppNoticesList } from "@/components/app/AppNoticesList"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Step = "studentNumber" | "login" | "register"

type UserRecord = {
  id: number
  studentNumber: string
  name: string | null
  publicId: string
  role: string
  semester: number
  lastLoginAt: string | null
  isActive: number
  createdAt: string
  updatedAt: string
}

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("studentNumber")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentNumber, setStudentNumber] = useState("")
  const [user, setUser] = useState<UserRecord | null>(null)
  const [password, setPassword] = useState("")
  const [newName, setNewName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isComposingName, setIsComposingName] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const studentNumberRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const registerNameRef = useRef<HTMLInputElement>(null)
  const [noticeMessages, setNoticeMessages] = useState<string[]>([])

  const resetPasswordFields = () => {
    setPassword("")
    setNewName("")
    setNewPassword("")
    setConfirmPassword("")
    setIsComposingName(false)
  }

  const handleStudentNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/[^0-9]/g, "")
    const limited = sanitized.slice(0, 8)
    setStudentNumber(limited)
    if (step !== "studentNumber") {
      setStep("studentNumber")
      setUser(null)
      resetPasswordFields()
    }
    setError(null)
    setSuccessMessage(null)
  }

  const handleLookup = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(studentNumber)}`)
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        setError(data?.error ?? "사용자 조회 중 오류가 발생했습니다.")
        return
      }
      const data: { exists: boolean; user: UserRecord | null } = await response.json()

      resetPasswordFields()

      if (data.exists && data.user) {
        setUser(data.user)
        setStep("login")
      } else {
        setUser(null)
        setStep("register")
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitStudentNumber = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage(null)
    if (!studentNumber.trim()) {
      setError("학번을 입력해주세요.")
      return
    }

    if (!/^\d{8}$/.test(studentNumber)) {
      setError("학번은 8자리 숫자로 입력해주세요.")
      return
    }
    await handleLookup()
  }

  const handleSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.")
      return
    }
    if (!/^\d{8}$/.test(studentNumber)) {
      setError("학번 형식이 올바르지 않습니다.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentNumber,
          password,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !data.success) {
        setError(data?.error ?? "로그인에 실패했습니다.")
        return
      }

      router.replace("/")
      router.refresh()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = newName.trim()
    if (!trimmedName) {
      setError("이름을 입력해주세요.")
      return
    }
    if (!/^[가-힣a-zA-Z\s]{2,}$/u.test(trimmedName)) {
      setError("이름은 한글 또는 영문으로 입력해주세요.")
      return
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("비밀번호를 모두 입력해주세요.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 서로 일치하지 않습니다.")
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    const createdPassword = newPassword

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          studentNumber,
          password: createdPassword,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        user?: UserRecord
      }

      if (!response.ok || !data.success) {
        setError(data?.error ?? "회원가입에 실패했습니다.")
        return
      }

      setUser(data.user ?? null)
      resetPasswordFields()
      router.replace("/")
      router.refresh()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (step === "studentNumber") {
      studentNumberRef.current?.focus()
    } else if (step === "login") {
      passwordRef.current?.focus()
    } else if (step === "register") {
      registerNameRef.current?.focus()
    }
  }, [step])

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const response = await fetch("/api/notices")
        if (!response.ok) return
        const data = (await response.json()) as { notices?: { message: string }[] }
        if (data.notices?.length) {
          setNoticeMessages(data.notices.map((item) => item.message))
        }
      } catch (error) {
        console.error(error)
      }
    }

    fetchNotice()
  }, [])

  const renderStudentNumberStep = () => (
    <form className="flex flex-col gap-6" onSubmit={handleSubmitStudentNumber}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">내 계정에 로그인하기</h2>
        <p className="text-balance text-sm text-muted-foreground">환영합니다! 학번을 입력해주세요.</p>
      </div>
      <div className="grid gap-6">
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
            ref={studentNumberRef}
            required
          />
        </div>
        <Button type="submit" className="w-full bg-[#265392]" disabled={isLoading}>
          {isLoading ? "확인 중..." : "다음으로"}
        </Button>
      </div>
      {step === "studentNumber" && error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )

  const renderLoginStep = () => (
    <form className="flex flex-col gap-6" onSubmit={handleSubmitLogin}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">환영합니다!</h2>
        <p className="text-sm text-muted-foreground">
          {user?.name ? `${user.name}님, 비밀번호를 입력해 주세요.` : "등록된 계정입니다. 비밀번호를 입력해 주세요."}
        </p>
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
            required
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
            onChange={(event) => setPassword(event.target.value)}
            ref={passwordRef}
            required
          />
        </div>
        <Button type="submit" className="w-full bg-[#265392]" disabled={isLoading}>
          로그인
        </Button>
      </div>
      {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
      {step === "login" && error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )

  const renderRegisterStep = () => (
    <form className="flex flex-col gap-6" onSubmit={handleSubmitRegister}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">처음 방문하셨나요?</h2>
        <p className="text-sm text-muted-foreground">
          이름과 사용할 비밀번호를 입력해 주세요.
        </p>
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
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="register-name">이름</Label>
        <Input
          id="register-name"
          type="text"
          placeholder="홍길동"
          value={newName}
          onChange={(event) => {
            const value = event.target.value
            if (isComposingName) {
              setNewName(value)
              return
            }
            const sanitized = value.replace(/[^가-힣a-zA-Z\s]/g, "")
            setNewName(sanitized)
          }}
          onCompositionStart={() => setIsComposingName(true)}
          onCompositionEnd={(event) => {
            setIsComposingName(false)
            const value = event.currentTarget.value
            const sanitized = value.replace(/[^가-힣a-zA-Z\s]/g, "")
            setNewName(sanitized)
          }}
          ref={registerNameRef}
          maxLength={10}
          required
        />
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="new-password">비밀번호</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="******"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">비밀번호 확인</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="******"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full bg-[#265392]" disabled={isLoading}>
          회원가입
        </Button>
      </div>
      {step === "register" && error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )

  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNoticesList
        items={ noticeMessages }
      />
      <div className="flex min-w-xl flex-col items-center justify-center">
        <div className="w-full max-w-xs space-y-8">
          {step === "studentNumber" ? renderStudentNumberStep() : null}
          {step === "login" ? renderLoginStep() : null}
          {step === "register" ? renderRegisterStep() : null}
        </div>
      </div>
    </div>
  )
}
