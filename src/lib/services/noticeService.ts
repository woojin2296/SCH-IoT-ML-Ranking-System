import { findAllActiveNotices } from "@/lib/repositories/noticeRepository";
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
