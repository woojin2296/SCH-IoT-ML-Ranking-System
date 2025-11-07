import { insertRequestLog } from "@/lib/repositories/requestLogRepository";

export type RequestLogEntry = {
  source: string;
  path: string;
  method: string;
  status?: number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

export function resolveRequestSource(userId: number | null | undefined, ipAddress?: string | null) {
  const fallbackIp = ipAddress ?? "unknown";
  return userId != null ? `user:${userId}` : `ip:${fallbackIp}`;
}

export function logUserRequest(entry: RequestLogEntry) {
  const metadataString =
    entry.metadata === undefined || entry.metadata === null
      ? null
      : JSON.stringify(entry.metadata);

  insertRequestLog({
    source: entry.source,
    path: entry.path,
    method: entry.method,
    status: entry.status ?? null,
    metadata: metadataString,
    ipAddress: entry.ipAddress ?? null,
  });
}
