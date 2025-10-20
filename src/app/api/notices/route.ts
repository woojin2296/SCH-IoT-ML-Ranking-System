import { NextResponse } from "next/server";

import { getActiveNotices } from "@/lib/notices";
import { logUserRequest } from "@/lib/logs";

export async function GET() {
  const notices = getActiveNotices();
  logUserRequest({ path: "/api/notices", method: "GET", status: 200 });
  return NextResponse.json({ notices });
}
