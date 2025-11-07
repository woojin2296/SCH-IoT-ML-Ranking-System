import { randomBytes } from "crypto";

import { hashPassword } from "@/lib/auth";
import {
  createUserRecord,
  findUserById,
  findUserByStudentNumber as findUserByStudentNumberRepo,
  isPublicIdTaken,
  updateUserById,
  type UserRecord,
} from "@/lib/repositories/userRepository";
import { establishUserSession } from "@/lib/services/authService";

const ALLOWED_ROLES = new Set(["user", "admin"]);

export type RegisterUserPayload = {
  name?: string;
  studentNumber?: string;
  password?: string;
  role?: string;
};

export type RegisterUserResult =
  | { status: "missing_fields" }
  | { status: "invalid_name" }
  | { status: "invalid_student_number" }
  | { status: "invalid_role" }
  | { status: "duplicate_student_number" }
  | {
      status: "success";
      user: UserRecord;
      session: ReturnType<typeof establishUserSession>;
      role: string;
    };

export async function registerUser(payload: RegisterUserPayload): Promise<RegisterUserResult> {
  const name = payload.name?.trim();
  const studentNumber = payload.studentNumber?.trim();
  const password = payload.password;
  const roleRaw = payload.role?.trim().toLowerCase() ?? "user";
  const role = ALLOWED_ROLES.has(roleRaw) ? roleRaw : "user";

  if (!name || !studentNumber || !password) {
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

  const generatePublicId = () => randomBytes(4).toString("hex");
  let publicId = generatePublicId();
  while (isPublicIdTaken(publicId)) {
    publicId = generatePublicId();
  }

  const passwordHash = await hashPassword(password);

  try {
    const currentYear = new Date().getFullYear();
    const userId = createUserRecord({
      studentNumber,
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
      return { status: "duplicate_student_number" };
    }
    throw error;
  }
}

export type AdminUpdateUserPayload = {
  id?: number;
  name?: string;
  studentNumber?: string;
  role?: string;
  semester?: number;
};

export type AdminUpdateUserResult =
  | { status: "invalid_id" }
  | { status: "missing_name" }
  | { status: "invalid_student_number" }
  | { status: "invalid_role" }
  | { status: "invalid_semester"; semester: number }
  | { status: "duplicate_student_number" }
  | { status: "not_found" }
  | { status: "success"; user: UserRecord };

export function updateUserViaAdmin(payload: AdminUpdateUserPayload): AdminUpdateUserResult {
  const { id, name, studentNumber, role, semester } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { status: "invalid_id" };
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { status: "missing_name" };
  }

  const trimmedStudentNumber = studentNumber?.trim();
  if (!trimmedStudentNumber || !/^\d{8}$/.test(trimmedStudentNumber)) {
    return { status: "invalid_student_number" };
  }

  const normalizedRole = role?.trim().toLowerCase() ?? "user";
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    return { status: "invalid_role" };
  }

  const currentYear = new Date().getFullYear();
  const normalizedSemester = semester ?? currentYear;
  if (
    !Number.isInteger(normalizedSemester) ||
    normalizedSemester < 2000 ||
    normalizedSemester > currentYear + 10
  ) {
    return { status: "invalid_semester", semester: normalizedSemester };
  }

  try {
    const updated = updateUserById({
      id,
      name: trimmedName,
      studentNumber: trimmedStudentNumber,
      role: normalizedRole,
      semester: normalizedSemester,
    });

    if (!updated) {
      return { status: "not_found" };
    }

    const user = findUserById(id);
    if (!user) {
      return { status: "not_found" };
    }

    return { status: "success", user };
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return { status: "duplicate_student_number" };
    }
    throw error;
  }
}

export function findUserByStudentNumber(studentNumber: string): UserRecord | null {
  return findUserByStudentNumberRepo(studentNumber);
}
