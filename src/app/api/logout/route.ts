import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  cleanupExpiredSessions,
  deleteSession,
  getUserBySessionToken,
} from "@/lib/session";
import { logUserRequest } from "@/lib/logs";
import { getRequestIp } from "@/lib/request";

export async function POST(request: NextRequest) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
  const clientIp = getRequestIp(request);

  if (sessionToken) {
    deleteSession(sessionToken);
  }

  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });

  response.cookies.set({
    name: "session_token",
    value: "",
    maxAge: 0,
    path: "/",
  });

  logUserRequest({
    userId: sessionUser?.id ?? null,
    path: "/api/logout",
    method: request.method,
    status: 303,
    ipAddress: clientIp,
  });

  return response;
}
