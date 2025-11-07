import { getDb } from "@/lib/db";

export type SessionUserRecord = {
  id: number;
  studentNumber: string;
  name: string | null;
  publicId: string;
  role: string;
  semester: number;
  lastLoginAt: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export function insertSession(userId: number, sessionToken: string, expiresAt: string) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO sessions (user_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `,
  ).run(userId, sessionToken, expiresAt);
}

export function deleteExpiredSessions() {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();
}

export function deleteSessionsByUserId(userId: number) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function deleteSessionByToken(sessionToken: string) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE session_token = ?").run(sessionToken);
}

export function findActiveSessionUser(sessionToken: string): SessionUserRecord | null {
  const db = getDb();
  const record = db
    .prepare(
      `
        SELECT
          u.id,
          u.student_number AS studentNumber,
          u.name,
          u.public_id AS publicId,
          u.role,
          CASE
            WHEN u.semester >= 100000 THEN CAST(u.semester / 100 AS INTEGER)
            ELSE u.semester
          END AS semester,
          u.last_login_at AS lastLoginAt,
          u.is_active AS isActive,
          u.created_at AS createdAt,
          u.updated_at AS updatedAt
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.session_token = ?
          AND s.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `,
    )
    .get(sessionToken) as SessionUserRecord | undefined;

  return record ?? null;
}
