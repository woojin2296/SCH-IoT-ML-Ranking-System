import { NextResponse } from "next/server";

import { getActiveNotices } from "@/lib/notices";

export async function GET() {
  const notices = getActiveNotices();
  return NextResponse.json({ notices });
}
