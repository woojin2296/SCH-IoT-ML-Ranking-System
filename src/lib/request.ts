import type { NextRequest } from "next/server";

export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const requestWithIp = request as { ip?: string | null };
  return requestWithIp.ip ?? "unknown";
}
