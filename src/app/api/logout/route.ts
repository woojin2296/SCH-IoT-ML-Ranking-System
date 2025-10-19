import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  cleanupExpiredSessions,
  deleteSession,
} from "@/lib/session";

export async function POST(request: NextRequest) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

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

  return response;
}
