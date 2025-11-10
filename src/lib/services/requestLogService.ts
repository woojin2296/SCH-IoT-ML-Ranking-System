import { getDb } from "@/lib/db";
import type { CreateRequestLogInput } from "../type/RequestLog";

type RequestLogEntry = {
  source: string;
  path: string;
  method: string;
  status?: number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

function writeRequestLog(entry: CreateRequestLogInput) {
  try {
    const db = getDb();
    db.prepare(
      `
        INSERT INTO request_logs (
          source,
          path,
          method,
          status,
          metadata,
          ip_address
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(
      entry.source,
      entry.path,
      entry.method,
      entry.status ?? null,
      entry.metadata ?? null,
      entry.ipAddress ?? null,
    );
  } catch (error) {
    console.error("Failed to write request log", { entry, error });
  }
}

export function resolveRequestSource(userId: number | null | undefined, ipAddress?: string | null) {
  const fallbackIp = ipAddress ?? "unknown";
  return userId != null ? `user:${userId}` : `ip:${fallbackIp}`;
}

export function logUserRequest(entry: RequestLogEntry) {
  const metadataString =
    entry.metadata === undefined || entry.metadata === null
      ? null
      : JSON.stringify(entry.metadata);

  writeRequestLog({
    source: entry.source,
    path: entry.path,
    method: entry.method,
    status: entry.status ?? null,
    metadata: metadataString,
    ipAddress: entry.ipAddress ?? null,
  });
}
