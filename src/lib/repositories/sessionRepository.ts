import { getDb } from "@/lib/db";
import { UserRecord } from "../type/User";

//Create
export function insertSession(userId: number, sessionToken: string, expiresAt: string) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO sessions (user_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `,
  ).run(userId, sessionToken, expiresAt);
}

//Read
export function findActiveSessionUser(sessionToken: string): UserRecord | null {
  const db = getDb();
  const record = db
    .prepare(
      `
        SELECT
          u.id,
          u.student_number AS studentNumber,
          u.email,
          u.name,
          u.public_id AS publicId,
          u.role,
          u.semester AS semester,
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
    .get(sessionToken) as UserRecord | undefined;

  return record ?? null;
}

//Delete
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
