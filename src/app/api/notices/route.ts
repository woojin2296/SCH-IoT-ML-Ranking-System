import { NextRequest, NextResponse } from "next/server";

import { getActiveNotices } from "@/lib/notices";
import { logUserRequest } from "@/lib/logs";
import { getRequestIp } from "@/lib/request";

export async function GET(request: NextRequest) {
  const notices = getActiveNotices();
  const clientIp = getRequestIp(request);
  logUserRequest({
    path: "/api/notices",
    method: "GET",
    status: 200,
    ipAddress: clientIp,
  });
  return NextResponse.json({ notices });
}
