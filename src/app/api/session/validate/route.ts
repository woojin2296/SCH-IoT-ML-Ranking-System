import { NextRequest, NextResponse } from "next/server";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";

export async function GET(request: NextRequest) {
  cleanupExpiredSessions();

  const sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserBySessionToken(sessionToken);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        role: user.role,
      },
    },
    { status: 200 },
  );
}
