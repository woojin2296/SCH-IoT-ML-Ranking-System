import {
  findSetting,
  listSettings,
  upsertSetting,
  type AppSettingRow,
} from "@/lib/repositories/appSettingRepository";

export type AppSetting<T = unknown> = {
  key: string;
  value: T;
  updatedAt: string;
};

export function getSetting(key: string): AppSetting<string> | null {
  const row = findSetting(key);
  if (!row) return null;
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt,
  };
}

export function getSettingJson<T>(key: string): AppSetting<T> | null {
  const row = findSetting(key);
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as T;
    return {
      key: row.key,
      value: parsed,
      updatedAt: row.updatedAt,
    };
  } catch {
    return null;
  }
}

export function getAllSettings(): AppSetting<string>[] {
  return listSettings().map((row: AppSettingRow) => ({
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt,
  }));
}

export function setSetting(key: string, value: string) {
  upsertSetting(key, value);
}

export function setSettingJson(key: string, value: unknown) {
  upsertSetting(key, JSON.stringify(value));
}
