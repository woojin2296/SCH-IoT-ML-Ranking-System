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

export function getActiveNotices(): Notice[] {
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
