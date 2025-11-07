import { getDb } from "@/lib/db";

export type AppSettingRow = {
  key: string;
  value: string;
  updatedAt: string;
};

export function upsertSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  ).run(key, value);
}

export function findSetting(key: string): AppSettingRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT key, value, updated_at AS updatedAt
        FROM app_settings
        WHERE key = ?
        LIMIT 1
      `,
    )
    .get(key) as AppSettingRow | undefined;
  return row ?? null;
}

export function listSettings(): AppSettingRow[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT key, value, updated_at AS updatedAt
        FROM app_settings
        ORDER BY key ASC
      `,
    )
    .all() as AppSettingRow[];
}
