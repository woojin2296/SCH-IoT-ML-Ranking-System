import {
  listRequestLogs
} from "@/lib/repositories/requestLogRepository";
import { getDb } from "@/lib/db";
import { CreateRequestLogInput, RequestLogRecord } from "../type/RequestLog";

export type ParsedMetadata = Record<string, unknown> | string | null;

export type RequestLog = {
  id: number;
  source: string;
  sourceType: "user" | "ip" | "unknown";
  sourceValue: string;
  sourceUserId: number | null;
  userPublicId: string | null;
  userStudentNumber: string | null;
  name: string | null;
  path: string;
  method: string;
  status: number | null;
  metadata: ParsedMetadata;
  ipAddress: string | null;
  createdAt: string;
  logYear: number | null;
};

function parseMetadata(raw: string | null): ParsedMetadata {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return raw;
  }
}

function deriveSource(rawSource: string): {
  sourceType: "user" | "ip" | "unknown";
  sourceValue: string;
  sourceUserId: number | null;
} {
  if (rawSource.startsWith("user:")) {
    const val = rawSource.slice(5);
    const id = Number.parseInt(val, 10);
    return { sourceType: "user", sourceValue: val, sourceUserId: Number.isNaN(id) ? null : id };
  }
  if (rawSource.startsWith("ip:")) {
    return { sourceType: "ip", sourceValue: rawSource.slice(3), sourceUserId: null };
  }
  return { sourceType: "unknown", sourceValue: rawSource, sourceUserId: null };
}

function computeLogYear(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
}

function mapBasic(row: RequestLogRecord): RequestLog {
  const { sourceType, sourceValue, sourceUserId } = deriveSource(row.source);
  return {
    id: row.id,
    source: row.source,
    sourceType,
    sourceValue,
    sourceUserId,
    userPublicId: null,
    userStudentNumber: null,
    name: null,
    path: row.path,
    method: row.method.toUpperCase(),
    status: row.status,
    metadata: parseMetadata(row.metadata),
    ipAddress: row.ipAddress,
    createdAt: row.createdAt,
    logYear: computeLogYear(row.createdAt),
  };
}

export function getRequestLogs(options?: { limit?: number; beforeId?: number }): {
  logs: RequestLog[];
  totalCount?: number;
  hasMore: boolean;
} {
  const { logs, totalCount, hasMore } = listRequestLogs(options);
  return {
    logs: logs.map(mapBasic),
    totalCount,
    hasMore,
  };
}

export function createRequestLog(entry: CreateRequestLogInput) {
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

  createRequestLog({
    source: entry.source,
    path: entry.path,
    method: entry.method,
    status: entry.status ?? null,
    metadata: metadataString,
    ipAddress: entry.ipAddress ?? null,
  });
}
