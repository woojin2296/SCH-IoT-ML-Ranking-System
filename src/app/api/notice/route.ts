import { NextRequest, NextResponse } from "next/server";

import { getActiveNotices } from "@/lib/services/noticeService";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { getRequestIp } from "@/lib/request";
import { requireSessionUser } from "@/lib/auth-guard";

// GET /api/notice
// - Provides active notices without requiring authentication.
// - Logs caller IP for observability.
export async function GET(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: "/api/notice",
      method: "GET",
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: clientIp ?? "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notices = getActiveNotices();
  logUserRequest({
    source: resolveRequestSource(sessionUser.id, clientIp),
    path: "/api/notice",
    method: "GET",
    status: 200,
    ipAddress: clientIp ?? "unknown",
  });
  return NextResponse.json({ notices });
}
