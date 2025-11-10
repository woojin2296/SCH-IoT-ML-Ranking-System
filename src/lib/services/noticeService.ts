import {
  deleteNoticeRecordById,
  findAllActiveNotices,
  findAllNotices,
  findNoticeById,
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
    console.error("Failed to fetch active notice strings", error);
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

// Admin-facing helpers
export function getAllNotices(): Notice[] {
  try {
    return findAllNotices().map(mapNoticeRecord);
  } catch (error) {
    console.error("Failed to fetch all notices", error);
    return [];
  }
}

export function createNotice(message: string, isActive: boolean): Notice | null {
  try {
    const id = insertNotice({ message, isActive });
    const row = findNoticeById(id);
    return row ? mapNoticeRecord(row) : null;
  } catch (error) {
    console.error("Failed to create notice", error);
    return null;
  }
}

export function updateNotice(
  id: number,
  fields: { message?: string; isActive?: boolean },
): Notice | null {
  try {
    const changed = updateNoticeById(id, fields);
    if (!changed) return null;
    const row = findNoticeById(id);
    return row ? mapNoticeRecord(row) : null;
  } catch (error) {
    console.error("Failed to update notice", error);
    return null;
  }
}

export function deleteNotice(id: number): boolean {
  try {
    const removed = deleteNoticeRecordById(id);
    return removed > 0;
  } catch (error) {
    console.error("Failed to delete notice", error);
    return false;
  }
}
