import { getDb } from "@/lib/db";
import { NoticeRecord } from "../type/NoticeRecord";

// To Codex : Do not change this file except when i tell you to.

// Create
export function insertNotice(input: { message: string; isActive: boolean }): number {
  const db = getDb();
  const result = db
    .prepare(
      `
        INSERT INTO notices (message, is_active)
        VALUES (?, ?)
      `,
    )
    .run(input.message, input.isActive ? 1 : 0);

  return Number(result.lastInsertRowid);
}

// Read
export function findAllNotices(): NoticeRecord[] {
  const db = getDb();
    return db
      .prepare(
        `
          SELECT
            id,
            message,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM notices
          ORDER BY updated_at DESC
        `,
      )
    .all() as NoticeRecord[];
}

// Used!! Do not change!!
export function findAllActiveNotices(): NoticeRecord[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          id,
          message,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM notices
        WHERE is_active = 1
        ORDER BY updated_at DESC
      `,
    )
    .all() as NoticeRecord[];
}

export function findNoticeById(id: number): NoticeRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT
          id,
          message,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM notices
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(id) as NoticeRecord | undefined;

  return row ?? null;
}

// Update
export function updateNoticeById(
  id: number,
  fields: { message?: string; isActive?: boolean },
): number {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (fields.message !== undefined) {
    updates.push("message = ?");
    values.push(fields.message);
  }

  if (fields.isActive !== undefined) {
    updates.push("is_active = ?");
    values.push(fields.isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return 0;
  }

  values.push(id);
  const db = getDb();
  const result = db.prepare(`UPDATE notices SET ${updates.join(", ")} WHERE id = ?`).run(values);
  return result.changes ?? 0;
}

// Delete
export function deleteNoticeRecordById(id: number): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM notices WHERE id = ?").run(id);
  return result.changes ?? 0;
}
