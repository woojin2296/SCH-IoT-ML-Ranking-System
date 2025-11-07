import { getDb } from "@/lib/db";
import { CreateRequestLogInput, RequestLogRecord } from "../type/RequestLog";

// Create
export function insertRequestLog(entry: CreateRequestLogInput) {
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
}

// Read
export function listRequestLogs(options?: { limit?: number; beforeId?: number }) {
  const db = getDb();
  const limit = options?.limit ?? 100;
  const beforeId = options?.beforeId ?? null;

  const query = beforeId
    ? `
        SELECT
          id,
          source,
          path,
          method,
          status,
          metadata,
          ip_address AS ipAddress,
          created_at AS createdAt
        FROM request_logs
        WHERE id < ?
        ORDER BY id DESC
        LIMIT ?
      `
    : `
        SELECT
          id,
          source,
          path,
          method,
          status,
          metadata,
          ip_address AS ipAddress,
          created_at AS createdAt
        FROM request_logs
        ORDER BY id DESC
        LIMIT ?
      `;

  const logs = beforeId
    ? (db.prepare(query).all(beforeId, limit) as RequestLogRecord[])
    : (db.prepare(query).all(limit) as RequestLogRecord[]);

  const totalCount = beforeId
    ? undefined
    : (db.prepare("SELECT COUNT(*) AS total FROM request_logs").get() as { total: number }).total;

  const hasMore = logs.length === limit;

  return { logs, totalCount, hasMore };
}