import { getDb } from "@/lib/db";

export type Notice = {
  id: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type NoticeRow = {
  id: number;
  message: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

const mapNoticeRow = (row: NoticeRow): Notice => ({
  ...row,
  isActive: !!row.isActive,
});

let initialized = false;

function ensureNoticesSchema() {
  if (initialized) {
    return;
  }

  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS notices_updated_at_trigger
    AFTER UPDATE ON notices
    BEGIN
      UPDATE notices
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.id;
    END;
  `);

  initialized = true;
}

export function getActiveNotice(): Notice | null {
  const notices = getActiveNotices();
  return notices[0] ?? null;
}

export function getActiveNotices(): Notice[] {
  ensureNoticesSchema();
  const db = getDb();
  const rows = db
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
    .all() as NoticeRow[];

  return rows.map(mapNoticeRow);
}

export function getAllNotices(): Notice[] {
  ensureNoticesSchema();
  const db = getDb();
  const rows = db
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
    .all() as NoticeRow[];

  return rows.map(mapNoticeRow);
}
