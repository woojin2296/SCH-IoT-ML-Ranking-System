import { randomUUID } from "crypto";

import {
  deleteExpiredSessions,
  deleteSessionByToken,
  deleteSessionsByUserId,
  findActiveSessionUser,
  insertSession,
  type SessionUserRecord,
} from "@/lib/repositories/sessionRepository";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = SessionUserRecord;

export function createSession(userId: number) {
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  insertSession(userId, sessionToken, expiresAt);

  return {
    sessionToken,
    expiresAt,
  };
}

export function cleanupExpiredSessions() {
  deleteExpiredSessions();
}

export function revokeSessionsForUser(userId: number) {
  deleteSessionsByUserId(userId);
}

export function deleteSession(sessionToken: string) {
  deleteSessionByToken(sessionToken);
}

export function getUserBySessionToken(sessionToken: string): SessionUser | null {
  return findActiveSessionUser(sessionToken);
}
