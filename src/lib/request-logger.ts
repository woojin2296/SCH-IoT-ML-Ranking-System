import type { NextRequest } from "next/server";

import { getRequestIp } from "@/lib/request";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";

export function createRequestLogger(
  request: NextRequest,
  path: string,
  method: string,
  userId?: number,
) {
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  return (status: number, metadata?: Record<string, unknown>) => {
    logUserRequest({
      source: resolveRequestSource(userId ?? null, clientIp),
      path,
      method,
      status,
      metadata: metadata ?? undefined,
      ipAddress: resolvedIp,
    });
  };
}

