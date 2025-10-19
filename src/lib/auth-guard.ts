import { cookies } from "next/headers";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/session";

export async function requireSessionUser() {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) {
    return null;
  }

  return getUserBySessionToken(sessionToken) ?? null;
}

export async function requireAdmin() {
  const user = await requireSessionUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}
