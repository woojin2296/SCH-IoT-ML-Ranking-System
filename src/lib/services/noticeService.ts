import {
  deleteNoticeRecordById,
  findAllActiveNotices,
  findAllNotices,
  findNoticeById as findNoticeByIdRepo,
  insertNotice,
  updateNoticeById,
} from "@/lib/repositories/noticeRepository";
import type { NoticeRecord } from "@/lib/type/NoticeRecord";

export type Notice = {
  id: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const mapNoticeRecord = (row: NoticeRecord): Notice => ({
  id: row.id,
  message: row.message,
  isActive: Boolean(row.isActive),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// SSR method
// Perfect method do not change!!!!!!!
export function getActiveNoticeStrings(): string[] {
  try {
    const records = findAllActiveNotices() as NoticeRecord[];
    if (!records || records.length === 0) {
      return ["현재 공지사항이 없습니다."];
    }
    return records.map((r) => r.message);
  } catch (error) {
    return ["오류로 인해 공지사항을 불러올 수 없습니다."];
  }
}

export function getActiveNotices(): Notice[] {
  try {
    const records = findAllActiveNotices();
    return records.map(mapNoticeRecord);
  } catch (error) {
    console.error("Failed to fetch active notices", error);
    return [];
  }
}

export function getAllNotices(): Notice[] {
  try {
    return findAllNotices().map(mapNoticeRecord);
  } catch (error) {
    console.error("Failed to fetch notices", error);
    return [];
  }
}

function findNoticeById(id: number): Notice | null {
  try {
    const row = findNoticeByIdRepo(id);
    return row ? mapNoticeRecord(row) : null;
  } catch (error) {
    console.error("Failed to fetch notice by id", { id, error });
    return null;
  }
}

export type CreateNoticeInput = {
  message?: string;
  isActive?: boolean;
};

export type CreateNoticeResult =
  | { status: "invalid_message" }
  | { status: "success"; notice: Notice };

function createNotice(input: { message: string; isActive: boolean }): Notice {
  try {
    const id = insertNotice(input);
    const created = findNoticeByIdRepo(id);
    if (!created) {
      throw new Error("NOTICE_CREATE_LOOKUP_FAILED");
    }
    return mapNoticeRecord(created);
  } catch (error) {
    console.error("Failed to create notice", { input, error });
    throw error;
  }
}

export function createNoticeValidated(payload: CreateNoticeInput): CreateNoticeResult {
  const trimmedMessage = payload.message?.trim();
  const isActive = payload.isActive ?? true;

  if (!trimmedMessage) {
    return { status: "invalid_message" };
  }

  try {
    const notice = createNotice({ message: trimmedMessage, isActive });
    return { status: "success", notice };
  } catch (error) {
    console.error("createNoticeValidated failed", error);
    throw error;
  }
}

function updateNotice(
  id: number,
  updates: { message?: string; isActive?: boolean },
): Notice | null {
  const normalizedUpdates: { message?: string; isActive?: boolean } = {};

  if (Object.prototype.hasOwnProperty.call(updates, "message")) {
    normalizedUpdates.message = updates.message;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "isActive")) {
    normalizedUpdates.isActive = updates.isActive;
  }

  try {
    if (Object.keys(normalizedUpdates).length > 0) {
      updateNoticeById(id, normalizedUpdates);
    }
    const updated = findNoticeByIdRepo(id);
    return updated ? mapNoticeRecord(updated) : null;
  } catch (error) {
    console.error("Failed to update notice", { id, updates, error });
    return null;
  }
}

export type UpdateNoticeInput = {
  id?: number;
  message?: string;
  isActive?: boolean;
};

export type UpdateNoticeResult =
  | { status: "invalid_id" }
  | { status: "no_changes" }
  | { status: "invalid_message"; id: number }
  | { status: "not_found"; id: number }
  | { status: "success"; notice: Notice };

export function updateNoticeValidated(payload: UpdateNoticeInput): UpdateNoticeResult {
  const { id } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { status: "invalid_id" };
  }

  const hasMessage = Object.prototype.hasOwnProperty.call(payload, "message");
  const hasActive = Object.prototype.hasOwnProperty.call(payload, "isActive");

  if (!hasMessage && !hasActive) {
    return { status: "no_changes" };
  }

  const existing = findNoticeById(id);
  if (!existing) {
    return { status: "not_found", id };
  }

  const updates: { message?: string; isActive?: boolean } = {};

  if (hasMessage) {
    const trimmed = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!trimmed) {
      return { status: "invalid_message", id };
    }
    updates.message = trimmed;
  }

  if (hasActive) {
    updates.isActive = !!payload.isActive;
  }

  try {
    const notice = updateNotice(id, updates);
    if (!notice) {
      return { status: "not_found", id };
    }
    return { status: "success", notice };
  } catch (error) {
    console.error("updateNoticeValidated failed", { id, updates, error });
    throw error;
  }
}

function deleteNotice(id: number): boolean {
  try {
    return deleteNoticeRecordById(id) > 0;
  } catch (error) {
    console.error("Failed to delete notice", { id, error });
    throw error;
  }
}

export type DeleteNoticeResult =
  | { status: "invalid_id" }
  | { status: "not_found" }
  | { status: "success" };

export function deleteNoticeValidated(id?: number): DeleteNoticeResult {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { status: "invalid_id" };
  }

  try {
    const deleted = deleteNotice(id);
    if (!deleted) {
      return { status: "not_found" };
    }
    return { status: "success" };
  } catch (error) {
    console.error("deleteNoticeValidated failed", { id, error });
    throw error;
  }
}
