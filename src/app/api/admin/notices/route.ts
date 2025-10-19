import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import type { Notice } from "@/lib/notices";

type NoticeRow = {
  id: number;
  message: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

const toNotice = (row: NoticeRow): Notice => ({
  ...row,
  isActive: !!row.isActive,
});

export async function GET() {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const notices = (db
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
    .all() as NoticeRow[]).map(toNotice);

  return NextResponse.json({ notices });
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    message?: string;
    isActive?: boolean;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const message = payload.message?.trim();
  const isActive = payload.isActive ?? true;

  if (!message) {
    return NextResponse.json({ error: "공지 내용을 입력해주세요." }, { status: 400 });
  }

  const db = getDb();

  const stmt = db.prepare(
    `
      INSERT INTO notices (message, is_active)
      VALUES (?, ?)
    `,
  );
  const result = stmt.run(message, isActive ? 1 : 0);

  const noticeRow = db
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
      `,
    )
    .get(result.lastInsertRowid) as NoticeRow;

  const notice = toNotice(noticeRow);

  return NextResponse.json({ notice }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    id?: number;
    message?: string;
    isActive?: boolean;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { id } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "유효한 공지 ID가 필요합니다." }, { status: 400 });
  }

  const message = payload.message?.trim();
  const hasMessage = typeof message === "string";
  const hasActive = typeof payload.isActive === "boolean";

  if (!hasMessage && !hasActive) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const db = getDb();

  const existing = db
    .prepare(
      `
        SELECT id FROM notices WHERE id = ?
      `,
    )
    .get(id) as { id: number } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (hasMessage) {
    if (!message) {
      return NextResponse.json({ error: "공지 내용을 입력해주세요." }, { status: 400 });
    }
    fields.push("message = ?");
    values.push(message);
  }

  if (hasActive) {
    fields.push("is_active = ?");
    values.push(payload.isActive ? 1 : 0);
  }

  values.push(id);

  db.prepare(`UPDATE notices SET ${fields.join(", ")} WHERE id = ?`).run(values);

  const noticeRow = db
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
      `,
    )
    .get(id) as NoticeRow;

  const notice = toNotice(noticeRow);

  return NextResponse.json({ notice });
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Payload = {
    id?: number;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { id } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "유효한 공지 ID가 필요합니다." }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`DELETE FROM notices WHERE id = ?`).run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
