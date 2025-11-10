import { randomBytes } from "crypto";

import { hashPassword } from "@/lib/auth";
import {
  createUser,
  findUserById,
  findUserByStudentNumber as findUserByStudentNumberRepo,
  findAllUsers,
  isEmailTaken,
  isPublicIdTaken,
} from "@/lib/repositories/userRepository";
import type { UserRecord } from "@/lib/type/User";
import { establishUserSession } from "@/lib/services/authService";
import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/request";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";

const ALLOWED_ROLES = new Set(["user", "admin"]);

type RegisterUserPayload = {
  name?: string;
  studentNumber?: string;
  email: string;
  password?: string;
  role?: string;
};

type RegisterUserResult =
  | { status: "missing_fields" }
  | { status: "invalid_name" }
  | { status: "invalid_student_number" }
  | { status: "invalid_email" }
  | { status: "invalid_role" }
  | { status: "duplicate_student_number" }
  | { status: "duplicate_email" }
  | {
      status: "success";
      user: UserRecord;
      session: ReturnType<typeof establishUserSession>;
      role: string;
    };

async function registerUser(payload: RegisterUserPayload): Promise<RegisterUserResult> {
  const name = payload.name?.trim();
  const studentNumber = payload.studentNumber?.trim();
  const emailRaw = payload.email.trim();
  const password = payload.password;
  const roleRaw = payload.role?.trim().toLowerCase() ?? "user";
  const role = ALLOWED_ROLES.has(roleRaw) ? roleRaw : "user";

  if (!name || !studentNumber || !password || !emailRaw) {
    return { status: "missing_fields" };
  }

  if (!/^[가-힣a-zA-Z\s]{2,}$/u.test(name)) {
    return { status: "invalid_name" };
  }

  if (!/^\d{8}$/.test(studentNumber)) {
    return { status: "invalid_student_number" };
  }

  if (!ALLOWED_ROLES.has(role)) {
    return { status: "invalid_role" };
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw);
  if (!emailOk) {
    return { status: "invalid_email" };
  }
  if (isEmailTaken(emailRaw)) {
    return { status: "duplicate_email" };
  }

  const generatePublicId = () => randomBytes(4).toString("hex");
  let publicId = generatePublicId();
  while (isPublicIdTaken(publicId)) {
    publicId = generatePublicId();
  }

  const passwordHash = await hashPassword(password);

  try {
    const currentYear = new Date().getFullYear();
    const userId = createUser({
      studentNumber,
      email: emailRaw,
      passwordHash,
      name,
      publicId,
      role,
      semester: currentYear,
    });

    const user = findUserById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND_AFTER_INSERT");
    }

    const session = establishUserSession(userId);

    return {
      status: "success",
      user,
      session,
      role,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      if (error.message.includes("users.student_number")) {
        return { status: "duplicate_student_number" };
      }
      if (error.message.includes("users.email")) {
        return { status: "duplicate_email" };
      }
    }
    throw error;
  }
}

export function findUserByStudentNumber(studentNumber: string): UserRecord | null {
  return findUserByStudentNumberRepo(studentNumber);
}

export function listUsersOrderedByCreation(): UserRecord[] {
  return findAllUsers();
}

// Service-level user listing for consumers (admin pages etc.)
// API Orchestrators (API routes should call these and only handle network-level failures)

export async function handleRegisterUserApi(request: NextRequest): Promise<NextResponse> {
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";

  type CreateUserPayload = {
    name?: string;
    studentNumber?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  let payload: CreateUserPayload;
  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_json" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  let result: RegisterUserResult;
  try {
    result = await registerUser({
      name: payload.name,
      studentNumber: payload.studentNumber,
      email: String(payload.email ?? ""),
      password: payload.password,
      role: payload.role,
    });
  } catch (error) {
    console.error("Failed to register user", error);
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 500,
      metadata: { reason: "insert_failed", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  if (result.status === "missing_fields") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "missing_fields", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이름, 학번, 이메일, 비밀번호는 필수 입력값입니다." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_name") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_name", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이름은 한글 또는 영문으로 입력해주세요." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_student_number") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_student_number", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "학번 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_role") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_role", role: payload.role },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "역할 정보가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (result.status === "invalid_email") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_email", email: payload.email },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이메일 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (result.status === "duplicate_student_number") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 409,
      metadata: { reason: "duplicate_student_number", studentNumber: payload.studentNumber?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이미 존재하는 학번입니다." },
      { status: 409 },
    );
  }

  if (result.status === "duplicate_email") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 409,
      metadata: { reason: "duplicate_email", email: payload.email?.trim() },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "이미 등록된 이메일입니다." },
      { status: 409 },
    );
  }

  if (result.status !== "success") {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/users",
      method: request.method,
      status: 500,
      metadata: { reason: "unexpected_error" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const { user, session, role } = result;

  const response = NextResponse.json(
    { success: true, user },
    { status: 201 },
  );

  response.cookies.set({
    name: "session_token",
    value: session.sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  logUserRequest({
    source: resolveRequestSource(user.id, clientIp),
    path: "/api/users",
    method: request.method,
    status: 201,
    metadata: { studentNumber: user.studentNumber, role },
    ipAddress: resolvedIp,
  });

  return response;
}

export async function handlePublicGetUserByStudentNumberApi(
  request: NextRequest,
  studentNumberParam: string,
): Promise<NextResponse> {
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  const normalizedStudentNumber = studentNumberParam?.trim() ?? "";

  if (!normalizedStudentNumber || !/^\d{8}$/.test(normalizedStudentNumber)) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: `/api/users/${studentNumberParam}`,
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_student_number", studentNumber: studentNumberParam },
      ipAddress: resolvedIp,
    });
    return NextResponse.json(
      { error: "유효하지 않은 학번 형식입니다." },
      { status: 400 },
    );
  }

  try {
    const record = findUserByStudentNumber(normalizedStudentNumber);

    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: `/api/users/${studentNumberParam}`,
      method: request.method,
      status: 200,
      metadata: { found: Boolean(record) },
      ipAddress: resolvedIp,
    });

    return NextResponse.json({ exists: Boolean(record), user: record ?? null });
  } catch (error) {
    console.error("Failed to fetch user by student number", error);
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: `/api/users/${studentNumberParam}`,
      method: request.method,
      status: 500,
      metadata: { reason: "internal_error" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
