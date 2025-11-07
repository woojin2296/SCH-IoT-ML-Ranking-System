import { getDb } from "@/lib/db";

export type CreateRequestLogInput = {
  source: string;
  path: string;
  method: string;
  status?: number | null;
  metadata?: string | null;
  ipAddress?: string | null;
};

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

export type RequestLogWithUserRow = {
  id: number;
  source: string;
  path: string;
  method: string;
  status: number | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  sourceUserId: number | null;
  userPublicId: string | null;
  userStudentNumber: string | null;
  name: string | null;
};

export function listRequestLogsWithUsers(): RequestLogWithUserRow[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          rl.id,
          rl.source,
          rl.path,
          rl.method,
          rl.status,
          rl.metadata,
          rl.ip_address AS ipAddress,
          rl.created_at AS createdAt,
          CASE
            WHEN rl.source LIKE 'user:%' THEN CAST(SUBSTR(rl.source, 6) AS INTEGER)
            ELSE NULL
          END AS sourceUserId,
          u.public_id AS userPublicId,
          u.student_number AS userStudentNumber,
          u.name
        FROM request_logs rl
        LEFT JOIN users u ON rl.source LIKE 'user:%' AND u.id = CAST(SUBSTR(rl.source, 6) AS INTEGER)
        ORDER BY rl.created_at DESC
      `,
    )
    .all() as RequestLogWithUserRow[];
}
