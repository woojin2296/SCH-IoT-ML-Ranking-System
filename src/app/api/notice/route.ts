import { NextRequest, NextResponse } from "next/server";

import { getActiveNotices } from "@/lib/services/noticeService";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { getRequestIp } from "@/lib/request";

// GET /api/notice
// - Provides active notices without requiring authentication.
// - Logs caller IP for observability.
export async function GET(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const notices = getActiveNotices();
  logUserRequest({
    source: resolveRequestSource(null, clientIp),
    path: "/api/notice",
    method: "GET",
    status: 200,
    metadata: { count: notices.length },
    ipAddress: clientIp ?? "unknown",
  });
  return NextResponse.json({ notices });
}
