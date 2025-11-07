import type { NextRequest } from "next/server";

import { logUserRequest, resolveRequestSource } from "@/lib/services/logService";
import { getRequestIp } from "@/lib/request";

export type RequestLogger = (
  status: number,
  metadata?: Record<string, unknown>,
  overrideUserId?: number | null,
) => void;

export function createRequestLogger(
  request: NextRequest,
  path: string,
  method: string,
  defaultUserId?: number | null,
): RequestLogger {
  const ipAddress = getRequestIp(request);
  const fallbackIp = ipAddress ?? "unknown";

  return (status, metadata, overrideUserId) => {
    const resolvedUserId = overrideUserId ?? defaultUserId ?? null;
    logUserRequest({
      source: resolveRequestSource(resolvedUserId, ipAddress),
      path,
      method,
      status,
      metadata,
      ipAddress: fallbackIp,
    });
  };
}
