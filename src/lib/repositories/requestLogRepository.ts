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
export function listRequestLogsPaginated(params: {
  limit: number;
  offset: number;
  search?: string | null;
}): RequestLogRecord[] {
  const db = getDb();
  const normalizedSearch = params.search?.trim();
  const searchTerm = normalizedSearch ? `%${normalizedSearch}%` : null;

  const whereClause = searchTerm
    ? `
        WHERE
          source LIKE ?
          OR path LIKE ?
          OR method LIKE ?
          OR CAST(status AS TEXT) LIKE ?
          OR COALESCE(ip_address, '') LIKE ?
          OR COALESCE(metadata, '') LIKE ?
      `
    : "";

  const query = `
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
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
    OFFSET ?
  `;

  const statement = db.prepare(query);

  const args = searchTerm
    ? [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, params.limit, params.offset]
    : [params.limit, params.offset];

  return statement.all(...args) as RequestLogRecord[];
}

export function countRequestLogs(search?: string | null): number {
  const db = getDb();
  const normalizedSearch = search?.trim();
  const searchTerm = normalizedSearch ? `%${normalizedSearch}%` : null;

  const whereClause = searchTerm
    ? `
        WHERE
          source LIKE ?
          OR path LIKE ?
          OR method LIKE ?
          OR CAST(status AS TEXT) LIKE ?
          OR COALESCE(ip_address, '') LIKE ?
          OR COALESCE(metadata, '') LIKE ?
      `
    : "";

  const statement = db.prepare(
    `
      SELECT COUNT(*) AS total
      FROM request_logs
      ${whereClause}
    `,
  );

  const row = searchTerm
    ? (statement.get(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm) as { total: number } | undefined)
    : (statement.get() as { total: number } | undefined);

  return row?.total ?? 0;
}
