import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import {
  createNoticeValidated,
  deleteNoticeValidated,
  getAllNotices,
  updateNoticeValidated,
} from "@/lib/services/noticeService";
import { getRequestIp } from "@/lib/request";

const ROUTE_PATH = "/api/admin/notices";

type AdminUser = NonNullable<Awaited<ReturnType<typeof requireAdmin>>>;

type AdminRouteContext = {
  adminUser: AdminUser;
  clientIp: string;
  log: (status: number, metadata?: Record<string, unknown>) => void;
};

async function withAdmin(
  request: NextRequest,
  handler: (ctx: AdminRouteContext) => Promise<NextResponse>,
) {
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  const adminUser = await requireAdmin();

  if (!adminUser) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: ROUTE_PATH,
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      source: resolveRequestSource(adminUser.id, clientIp),
      path: ROUTE_PATH,
      method: request.method,
      status,
      metadata,
      ipAddress: resolvedIp,
    });

  return handler({ adminUser, clientIp: resolvedIp, log });
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
    const notices = getAllNotices();
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

    const result = createNoticeValidated(parsed.data);

    if (result.status === "invalid_message") {
      return badRequest(ctx, "missing_message", "공지 내용을 입력해주세요.");
    }

    if (result.status !== "success") {
      console.error("Failed to create notice", result);
      return internalError(ctx, "insert_lookup_failed", "공지 저장 중 오류가 발생했습니다.");
    }

    ctx.log(201, { id: result.notice.id });
    return NextResponse.json({ notice: result.notice }, { status: 201 });
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

    const result = updateNoticeValidated(parsed.data);

    if (result.status === "invalid_id") {
      return badRequest(ctx, "invalid_id", "유효한 공지 ID가 필요합니다.", { id: parsed.data.id });
    }

    if (result.status === "no_changes") {
      return badRequest(ctx, "no_changes", "변경할 항목이 없습니다.");
    }

    if (result.status === "invalid_message") {
      return badRequest(ctx, "empty_message", "공지 내용을 입력해주세요.", { id: result.id });
    }

    if (result.status === "not_found") {
      return notFound(ctx, "not_found", "공지를 찾을 수 없습니다.", { id: result.id });
    }

    if (result.status !== "success") {
      return internalError(ctx, "update_lookup_failed", "공지 조회 중 오류가 발생했습니다.", {
        id: parsed.data.id,
      });
    }

    ctx.log(200, { id: result.notice.id });
    return NextResponse.json({ notice: result.notice });
  });
}

// DELETE /api/admin/notices
// - Requires admin session.
// - Accepts JSON body with positive integer `id` and deletes matching notice.
export async function DELETE(request: NextRequest) {
  return withAdmin(request, async (ctx) => {
    const parsed = await parseJsonOrBadRequest<{ id?: number }>(request, ctx);
    if (!parsed.ok) return parsed.response;

    const result = deleteNoticeValidated(parsed.data.id);

    if (result.status === "invalid_id") {
      return badRequest(ctx, "invalid_id", "유효한 공지 ID가 필요합니다.", { id: parsed.data.id });
    }

    if (result.status === "not_found") {
      return notFound(ctx, "not_found", "공지를 찾을 수 없습니다.", { id: parsed.data.id });
    }

    if (result.status !== "success") {
      return internalError(ctx, "delete_failed", "공지 삭제 중 오류가 발생했습니다.", {
        id: parsed.data.id,
      });
    }

    ctx.log(200, { action: "delete", id: parsed.data.id });
    return NextResponse.json({ success: true });
  });
}
