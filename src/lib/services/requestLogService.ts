import { getDb } from "@/lib/db";
import { countRequestLogs, listRequestLogsPaginated } from "@/lib/repositories/requestLogRepository";
import type { CreateRequestLogInput, RequestLogRecord } from "../type/RequestLog";

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

export type RequestLogView = {
  id: number;
  source: string;
  path: string;
  method: string;
  status: number | null;
  metadata: Record<string, unknown> | string | null;
  ipAddress: string | null;
  createdAt: string;
};

export function getRequestLogsForAdmin(params: {
  limit: number;
  offset: number;
  search?: string;
}): RequestLogView[] {
  const rows = listRequestLogsPaginated(params);
  return rows.map(normalizeRequestLogRecord);
}

export function countRequestLogsForAdmin(search?: string): number {
  return countRequestLogs(search);
}

function normalizeRequestLogRecord(record: RequestLogRecord): RequestLogView {
  return {
    id: record.id,
    source: record.source,
    path: record.path,
    method: record.method,
    status: record.status,
    metadata: parseMetadata(record.metadata),
    ipAddress: record.ipAddress,
    createdAt: record.createdAt,
  };
}

function parseMetadata(value: string | null): Record<string, unknown> | string | null {
  if (value == null) {
    return null;
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return value;
  }
}
