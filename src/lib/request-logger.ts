import type { NextRequest } from "next/server";

import { logUserRequest } from "@/lib/logs";
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

  return (status, metadata, overrideUserId) => {
    logUserRequest({
      userId: overrideUserId ?? defaultUserId ?? null,
      path,
      method,
      status,
      metadata,
      ipAddress,
    });
  };
}
