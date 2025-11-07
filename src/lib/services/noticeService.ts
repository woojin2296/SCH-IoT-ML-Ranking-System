import {
  deleteNoticeRowById,
  findNoticeRowById,
  insertNoticeRow,
  listActiveNoticeRows,
  listAllNoticeRows,
  updateNoticeRowById,
  type NoticeRow,
} from "@/lib/repositories/noticeRepository";

export type Notice = {
  id: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const mapNoticeRow = (row: NoticeRow): Notice => ({
  id: row.id,
  message: row.message,
  isActive: Boolean(row.isActive),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export function getActiveNotices(): Notice[] {
  return listActiveNoticeRows().map(mapNoticeRow);
}

export function getAllNotices(): Notice[] {
  return listAllNoticeRows().map(mapNoticeRow);
}

function findNoticeById(id: number): Notice | null {
  const row = findNoticeRowById(id);
  return row ? mapNoticeRow(row) : null;
}

export type CreateNoticeInput = {
  message?: string;
  isActive?: boolean;
};

export type CreateNoticeResult =
  | { status: "invalid_message" }
  | { status: "success"; notice: Notice };

function createNotice(input: { message: string; isActive: boolean }): Notice {
  const id = insertNoticeRow(input);
  const created = findNoticeRowById(id);
  if (!created) {
    throw new Error("NOTICE_CREATE_LOOKUP_FAILED");
  }
  return mapNoticeRow(created);
}

export function createNoticeValidated(payload: CreateNoticeInput): CreateNoticeResult {
  const trimmedMessage = payload.message?.trim();
  const isActive = payload.isActive ?? true;

  if (!trimmedMessage) {
    return { status: "invalid_message" };
  }

  const notice = createNotice({ message: trimmedMessage, isActive });
  return { status: "success", notice };
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

  if (Object.keys(normalizedUpdates).length > 0) {
    updateNoticeRowById(id, normalizedUpdates);
  }

  const updated = findNoticeRowById(id);
  return updated ? mapNoticeRow(updated) : null;
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

  const notice = updateNotice(id, updates);
  if (!notice) {
    return { status: "not_found", id };
  }

  return { status: "success", notice };
}

function deleteNotice(id: number): boolean {
  return deleteNoticeRowById(id) > 0;
}

export type DeleteNoticeResult =
  | { status: "invalid_id" }
  | { status: "not_found" }
  | { status: "success" };

export function deleteNoticeValidated(id?: number): DeleteNoticeResult {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { status: "invalid_id" };
  }

  const deleted = deleteNotice(id);
  if (!deleted) {
    return { status: "not_found" };
  }

  return { status: "success" };
}
