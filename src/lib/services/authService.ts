import { verifyPassword } from "@/lib/auth";
import {
  findUserWithPasswordByStudentNumber,
  updateUserLastLogin,
  type UserWithPasswordRecord,
} from "@/lib/repositories/userRepository";
import {
  cleanupExpiredSessions,
  createSession,
  revokeSessionsForUser,
} from "@/lib/services/sessionService";

export type AuthenticatedUser = UserWithPasswordRecord;

export type AuthenticateUserResult =
  | { status: "missing_credentials" }
  | { status: "invalid_student_number"; studentNumber: string }
  | { status: "not_found"; studentNumber: string }
  | { status: "inactive"; user: AuthenticatedUser }
  | { status: "wrong_password"; user: AuthenticatedUser }
  | { status: "success"; user: AuthenticatedUser };

export async function authenticateUser(
  studentNumberRaw: string | undefined,
  passwordRaw: string | undefined,
): Promise<AuthenticateUserResult> {
  const studentNumber = studentNumberRaw?.trim();
  const password = passwordRaw;

  if (!studentNumber || !password) {
    return { status: "missing_credentials" };
  }

  if (!/^\d{8}$/.test(studentNumber)) {
    return { status: "invalid_student_number", studentNumber };
  }

  const user = findUserWithPasswordByStudentNumber(studentNumber);

  if (!user) {
    return { status: "not_found", studentNumber };
  }

  if (!user.isActive) {
    return { status: "inactive", user };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return { status: "wrong_password", user };
  }

  return { status: "success", user };
}

export function establishUserSession(userId: number) {
  cleanupExpiredSessions();
  revokeSessionsForUser(userId);
  updateUserLastLogin(userId);
  return createSession(userId);
}
