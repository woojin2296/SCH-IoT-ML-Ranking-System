import { randomUUID } from "crypto";

import {
  deleteExpiredSessions,
  deleteSessionByToken,
  deleteSessionsByUserId,
  findActiveSessionUser,
  insertSession,
} from "@/lib/repositories/sessionRepository";
import type { UserRecord } from "@/lib/type/User";
import { InvalidArgumentError } from "../Error";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = UserRecord;

export function createSession(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new InvalidArgumentError("userId", "must be a positive integer");
  }

  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  try {
    insertSession(userId, sessionToken, expiresAt);
  } catch (error) {
    console.error("Failed to insert session", { userId, error });
    throw error;
  }

  return {
    sessionToken,
    expiresAt,
  };
}

export function cleanupExpiredSessions() {
  try {
    deleteExpiredSessions();
  } catch (error) {
    console.error("Failed to cleanup expired sessions", { error });
  }
}

export function revokeSessionsForUser(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) return;
  try {
    deleteSessionsByUserId(userId);
  } catch (error) {
    console.error("Failed to revoke sessions for user", { userId, error });
  }
}

export function deleteSession(sessionToken: string) {
  if (!sessionToken) return;
  try {
    deleteSessionByToken(sessionToken);
  } catch (error) {
    console.error("Failed to delete session by token", { error });
  }
}

export function getUserBySessionToken(sessionToken: string): SessionUser | null {
  if (!sessionToken) return null;
  try {
    const row = findActiveSessionUser(sessionToken) as UserRecord | null;
    if (!row) return null;
    const normalized: SessionUser = {
      id: row.id,
      studentNumber: row.studentNumber,
      email: row.email,
      name: row.name,
      publicId: row.publicId,
      role: row.role,
      lastLoginAt: row.lastLoginAt,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return normalized;
  } catch (error) {
    console.error("Failed to get user by session token", { error });
    return null;
  }
}
