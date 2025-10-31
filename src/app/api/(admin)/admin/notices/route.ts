import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { getDb } from "@/lib/db";
import { logUserRequest } from "@/lib/logs";
import type { Notice } from "@/lib/notices";
import { getRequestIp } from "@/lib/request";

const ROUTE_PATH = "/api/admin/notices";

type NoticeRow = {
  id: number;
  message: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

type AdminUser = NonNullable<Awaited<ReturnType<typeof requireAdmin>>>;
type DbInstance = ReturnType<typeof getDb>;

type AdminRouteContext = {
  adminUser: AdminUser;
  clientIp: string;
  log: (status: number, metadata?: Record<string, unknown>) => void;
};

const SELECT_NOTICE_BASE = `
  SELECT
    id,
    message,
    is_active AS isActive,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM notices
`;

const toNotice = (row: NoticeRow): Notice => ({
  ...row,
  isActive: Boolean(row.isActive),
});

async function withAdmin(
  request: NextRequest,
  handler: (ctx: AdminRouteContext) => Promise<NextResponse>,
) {
  const clientIp = getRequestIp(request);
  const adminUser = await requireAdmin();

  if (!adminUser) {
    logUserRequest({
      path: ROUTE_PATH,
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: clientIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      userId: adminUser.id,
      path: ROUTE_PATH,
      method: request.method,
      status,
      metadata,
      ipAddress: clientIp,
    });

  return handler({ adminUser, clientIp, log });
}

function listNotices(db: DbInstance) {
  return db.prepare(`${SELECT_NOTICE_BASE} ORDER BY updated_at DESC`).all() as NoticeRow[];
}

function fetchNoticeById(db: DbInstance, id: number) {
  const row = db.prepare(`${SELECT_NOTICE_BASE} WHERE id = ?`).get(id) as NoticeRow | undefined;
  return row ?? null;
}

async function parseJsonOrBadRequest<T>(
  request: NextRequest,
  ctx: AdminRouteContext,
) {
  try {
    const data = (await request.json()) as T;
    return { ok: true as const, data };
  } catch {
    ctx.log(400, { reason: "invalid_json" });
    return {
      ok: false as const,
      response: NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }),
    };
  }
}

function badRequest(
  ctx: AdminRouteContext,
  reason: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  ctx.log(400, { reason, ...metadata });
  return NextResponse.json({ error: message }, { status: 400 });
}

function notFound(
  ctx: AdminRouteContext,
  reason: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  ctx.log(404, { reason, ...metadata });
  return NextResponse.json({ error: message }, { status: 404 });
}

function internalError(
  ctx: AdminRouteContext,
  reason: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  ctx.log(500, { reason, ...metadata });
  return NextResponse.json({ error: message }, { status: 500 });
}

// GET /api/admin/notices
// - Requires admin session.
// - Returns all notices ordered by last update.
export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ log }) => {
    const db = getDb();
    const notices = listNotices(db).map(toNotice);
    log(200, { count: notices.length });
    return NextResponse.json({ notices });
  });
}

// POST /api/admin/notices
// - Requires admin session.
// - Accepts JSON body with `message` (non-empty string) and optional `isActive` boolean.
// - Inserts new notice and returns normalized record.
export async function POST(request: NextRequest) {
  return withAdmin(request, async (ctx) => {
    const parsed = await parseJsonOrBadRequest<{ message?: string; isActive?: boolean }>(
      request,
      ctx,
    );
    if (!parsed.ok) return parsed.response;

    const message = parsed.data.message?.trim();
    const isActive = parsed.data.isActive ?? true;

    if (!message) {
      return badRequest(ctx, "missing_message", "공지 내용을 입력해주세요.");
    }

    const db = getDb();
    const insert = db.prepare(
      `
        INSERT INTO notices (message, is_active)
        VALUES (?, ?)
      `,
    );
    const result = insert.run(message, isActive ? 1 : 0);

    const noticeRow = fetchNoticeById(db, Number(result.lastInsertRowid));
    if (!noticeRow) {
      return internalError(ctx, "insert_lookup_failed", "공지 저장 중 오류가 발생했습니다.");
    }

    const notice = toNotice(noticeRow);
    ctx.log(201, { id: notice.id });

    return NextResponse.json({ notice }, { status: 201 });
  });
}

// PATCH /api/admin/notices
// - Requires admin session.
// - Accepts JSON body with positive integer `id` plus at least one of `message` or `isActive`.
// - Validates input and updates targeted notice.
export async function PATCH(request: NextRequest) {
  return withAdmin(request, async (ctx) => {
    const parsed = await parseJsonOrBadRequest<{
      id?: number;
      message?: string;
      isActive?: boolean;
    }>(request, ctx);
    if (!parsed.ok) return parsed.response;

    const { id, message: rawMessage, isActive } = parsed.data;

    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      return badRequest(ctx, "invalid_id", "유효한 공지 ID가 필요합니다.", { id });
    }

    const hasMessage = Object.prototype.hasOwnProperty.call(parsed.data, "message");
    const hasActive = Object.prototype.hasOwnProperty.call(parsed.data, "isActive");

    if (!hasMessage && !hasActive) {
      return badRequest(ctx, "no_changes", "변경할 항목이 없습니다.");
    }

    const db = getDb();
    const existing = fetchNoticeById(db, id);
    if (!existing) {
      return notFound(ctx, "not_found", "공지를 찾을 수 없습니다.", { id });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (hasMessage) {
      const trimmed = typeof rawMessage === "string" ? rawMessage.trim() : "";
      if (!trimmed) {
        return badRequest(ctx, "empty_message", "공지 내용을 입력해주세요.", { id });
      }
      fields.push("message = ?");
      values.push(trimmed);
    }

    if (hasActive) {
      fields.push("is_active = ?");
      values.push(isActive ? 1 : 0);
    }

    values.push(id);

    db.prepare(`UPDATE notices SET ${fields.join(", ")} WHERE id = ?`).run(values);

    const updated = fetchNoticeById(db, id);
    if (!updated) {
      return internalError(ctx, "update_lookup_failed", "공지 조회 중 오류가 발생했습니다.", {
        id,
      });
    }

    ctx.log(200, { id });
    return NextResponse.json({ notice: toNotice(updated) });
  });
}

// DELETE /api/admin/notices
// - Requires admin session.
// - Accepts JSON body with positive integer `id` and deletes matching notice.
export async function DELETE(request: NextRequest) {
  return withAdmin(request, async (ctx) => {
    const parsed = await parseJsonOrBadRequest<{ id?: number }>(request, ctx);
    if (!parsed.ok) return parsed.response;

    const { id } = parsed.data;

    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      return badRequest(ctx, "invalid_id", "유효한 공지 ID가 필요합니다.", { id });
    }

    const db = getDb();
    const result = db.prepare(`DELETE FROM notices WHERE id = ?`).run(id);

    if (result.changes === 0) {
      return notFound(ctx, "not_found", "공지를 찾을 수 없습니다.", { id });
    }

    ctx.log(200, { action: "delete", id });
    return NextResponse.json({ success: true });
  });
}
