import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  cleanupExpiredSessions,
  deleteSession,
  getUserBySessionToken,
} from "@/lib/services/sessionService";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { getRequestIp } from "@/lib/request";

function shouldUseSecureCookies() {
  const flag = process.env.COOKIE_SECURE;
  if (typeof flag === "string") {
    return flag.toLowerCase() !== "false" && flag !== "0";
  }
  return process.env.NODE_ENV === "production";
}

function resolveRedirectUrl(request: NextRequest, path: string) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const origin = `${forwardedProto ?? "https"}://${forwardedHost}`;
    return new URL(path, origin);
  }
  return new URL(path, request.url);
}

// POST /api/auth/logout
// - Requires valid session cookie if present; silently succeeds when missing.
// - Cleans up session record, clears cookie, and redirects to /login with 303.
export async function POST(request: NextRequest) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";

  if (sessionToken) {
    deleteSession(sessionToken);
  }

  const response = NextResponse.redirect(resolveRedirectUrl(request, "/login"), {
    status: 303,
  });

  response.cookies.set({
    name: "session_token",
    value: "",
    maxAge: 0,
    path: "/",
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
  });

  logUserRequest({
    source: resolveRequestSource(sessionUser?.id ?? null, clientIp),
    path: "/api/auth/logout",
    method: request.method,
    status: 303,
    ipAddress: resolvedIp,
  });

  return response;
}
