import type { NextRequest } from "next/server";

function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  if (trimmed === "::1") {
    return "127.0.0.1";
  }
  return trimmed;
}

export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = normalizeIp(forwarded.split(",")[0]);
    if (ip) return ip;
  }

  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  const requestWithIp = request as { ip?: string | null };
  return normalizeIp(requestWithIp.ip) ?? "unknown";
}
