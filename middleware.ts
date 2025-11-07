import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/api/login",
  "/api/session/validate",
]);

const PUBLIC_PREFIXES = ["/_next", "/static", "/api/notices", "/api/users"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function buildRedirectResponse(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const pathWithQuery = request.nextUrl.pathname + request.nextUrl.search;
  loginUrl.searchParams.set("redirect", pathWithQuery);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "OPTIONS" || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    return pathname.startsWith("/api")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : buildRedirectResponse(request);
  }

  const validateUrl = new URL("/api/session/validate", request.url);

  const validationResponse = await fetch(validateUrl, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (validationResponse.ok) {
    return NextResponse.next();
  }

  return pathname.startsWith("/api")
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : buildRedirectResponse(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
