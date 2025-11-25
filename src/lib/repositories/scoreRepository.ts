import { getDb } from "@/lib/db";
import type {
  AdminRankingRow,
  RankingRow,
  ScoreFileMetaRow,
  ScoreRow,
  ScoreSubmissionRow,
  ScoreSummaryRow,
} from "@/lib/type/Score";

export function listRankingRows(projectNumber: number): RankingRow[] {
  const db = getDb();
  const scoreOrder = resolveScoreOrder(projectNumber);
  return db
    .prepare(
      `
        WITH best_scores AS (
          SELECT
            es.id,
            es.user_id,
            es.project_number,
            es.score,
            es.created_at,
            u.public_id,
            ROW_NUMBER() OVER (
              PARTITION BY es.user_id
              ORDER BY es.score ${scoreOrder}, es.created_at ASC
            ) AS per_user_rank
        FROM scores es
        INNER JOIN users u ON u.id = es.user_id
        WHERE es.project_number = ?
        )
        SELECT
          id,
          user_id AS userId,
          public_id AS publicId,
          project_number AS projectNumber,
          score,
          created_at AS createdAt,
          ROW_NUMBER() OVER (ORDER BY score ${scoreOrder}, created_at ASC) AS position
        FROM best_scores
        WHERE per_user_rank = 1
        ORDER BY position ASC
      `,
    )
    .all(projectNumber) as RankingRow[];
}

export function listAdminRankingRows(projectNumber: number): AdminRankingRow[] {
  const db = getDb();
  const scoreOrder = resolveScoreOrder(projectNumber);
  const rows = db
    .prepare(
      `
        WITH best_scores AS (
          SELECT
            es.id,
            es.user_id,
            es.project_number,
            es.score,
            es.created_at,
            es.file_name,
            es.file_size,
            es.file_path,
            u.public_id,
            u.name,
            u.email,
            u.student_number,
            ROW_NUMBER() OVER (
              PARTITION BY es.user_id
              ORDER BY es.score ${scoreOrder}, es.created_at ASC
            ) AS per_user_rank
        FROM scores es
        INNER JOIN users u ON u.id = es.user_id
        WHERE es.project_number = ?
        )
        SELECT
          id,
          user_id AS userId,
          public_id AS publicId,
          name,
          email,
          student_number AS studentNumber,
          project_number AS projectNumber,
          score,
          created_at AS createdAt,
          file_name AS fileName,
          file_size AS fileSize,
          CASE WHEN file_path IS NOT NULL AND file_path != '' THEN 1 ELSE 0 END AS hasFile,
          ROW_NUMBER() OVER (ORDER BY score ${scoreOrder}, created_at ASC) AS position
        FROM best_scores
        WHERE per_user_rank = 1
        ORDER BY position ASC
      `,
    )
    .all(projectNumber) as Array<Omit<AdminRankingRow, "hasFile"> & { hasFile: number | boolean }>;

  return rows.map((row) => ({ ...row, hasFile: Boolean(row.hasFile) }));
}

export function listScoresByUser(userId: number, projectNumber?: number | null): ScoreRow[] {
  const db = getDb();
  const baseQuery = `
    SELECT
      id,
      user_id AS userId,
      project_number AS projectNumber,
      score,
      created_at AS createdAt,
      file_path AS filePath,
      file_name AS fileName,
      file_type AS fileType,
      file_size AS fileSize
    FROM scores
    WHERE user_id = ?
      ${projectNumber !== null && projectNumber !== undefined ? "AND project_number = ?" : ""}
    ORDER BY project_number ASC, created_at DESC
  `;

  return projectNumber !== null && projectNumber !== undefined
    ? (db.prepare(baseQuery).all(userId, projectNumber) as ScoreRow[])
    : (db.prepare(baseQuery).all(userId) as ScoreRow[]);
}

export function insertScore(input: {
  userId: number;
  projectNumber: number;
  score: number;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  createdAt: string;
}): number {
  const db = getDb();
  const result = db
    .prepare(
      `
        INSERT INTO scores (
          user_id,
          project_number,
          score,
          file_path,
          file_name,
          file_type,
          file_size,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      input.userId,
      input.projectNumber,
      input.score,
      input.filePath,
      input.fileName,
      input.fileType,
      input.fileSize,
      input.createdAt,
    );

  return Number(result.lastInsertRowid);
}

export function findScoreSummaryByIdForUser(
  id: number,
  userId: number,
): ScoreSummaryRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT
          id,
          user_id AS userId,
          project_number AS projectNumber,
          score,
          file_path AS filePath
        FROM scores
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
    )
    .get(id, userId) as ScoreSummaryRow | undefined;

  return row ?? null;
}

export function deleteScoreByUser(id: number, userId: number): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM scores WHERE id = ? AND user_id = ?").run(id, userId);
  return result.changes ?? 0;
}

export function deleteScoreById(id: number): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM scores WHERE id = ?").run(id);
  return result.changes ?? 0;
}

export function listAdminScoreSubmissions(params: {
  limit: number;
  offset: number;
  studentNumber?: string | null;
}): ScoreSubmissionRow[] {
  const db = getDb();
  const normalized = params.studentNumber?.trim();
  const filterValue = normalized ? `%${normalized}%` : null;
  const whereClause = normalized ? "WHERE u.student_number LIKE ?" : "";

  const query = `
    SELECT
      s.id,
      s.user_id AS userId,
      u.student_number AS studentNumber,
      u.name,
      u.email,
      s.project_number AS projectNumber,
      s.score,
      s.created_at AS createdAt,
      s.file_path AS filePath,
      s.file_name AS fileName,
      s.file_type AS fileType,
      s.file_size AS fileSize
    FROM scores s
    INNER JOIN users u ON u.id = s.user_id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  const paramsArray = normalized
    ? [filterValue, params.limit, params.offset]
    : [params.limit, params.offset];

  return db.prepare(query).all(...paramsArray) as ScoreSubmissionRow[];
}

export function countAdminScoreSubmissions(studentNumber?: string | null): number {
  const db = getDb();
  const normalized = studentNumber?.trim();
  const filterValue = normalized ? `%${normalized}%` : null;
  const whereClause = normalized ? "WHERE u.student_number LIKE ?" : "";

  const statement = db.prepare(
    `
      SELECT COUNT(*) as total
      FROM scores s
      INNER JOIN users u ON u.id = s.user_id
      ${whereClause}
    `,
  );

  const row = normalized
    ? (statement.get(filterValue) as { total: number } | undefined)
    : (statement.get() as { total: number } | undefined);

  return row?.total ?? 0;
}

export function findScoreFileMetaById(id: number): ScoreFileMetaRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT
          id,
          user_id AS userId,
          file_path AS filePath,
          file_name AS fileName,
          file_type AS fileType,
          file_size AS fileSize
        FROM scores
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(id) as ScoreFileMetaRow | undefined;

  return row ?? null;
}

export function findRankingRowForUser(
  projectNumber: number,
  userId: number,
): { rank: number; score: number; createdAt: string } | null {
  const db = getDb();
  const scoreOrder = resolveScoreOrder(projectNumber);
  const row = db
    .prepare(
      `
        WITH best_scores AS (
          SELECT
            es.id,
            es.user_id,
            es.project_number,
            es.score,
            es.created_at,
            ROW_NUMBER() OVER (
              PARTITION BY es.user_id
              ORDER BY es.score ${scoreOrder}, es.created_at ASC
            ) AS per_user_rank
          FROM scores es
          INNER JOIN users u ON u.id = es.user_id
          WHERE es.project_number = ?
        ),
        ranked AS (
          SELECT
            id,
            user_id,
            project_number,
            score,
            created_at,
            ROW_NUMBER() OVER (ORDER BY score ${scoreOrder}, created_at ASC) AS overall_rank
          FROM best_scores
          WHERE per_user_rank = 1
        )
        SELECT
          overall_rank AS rank,
          score,
          created_at AS createdAt
        FROM ranked
        WHERE user_id = ?
        LIMIT 1
      `,
    )
    .get(projectNumber, userId) as
    | { rank: number; score: number; createdAt: string }
    | undefined;

  return row ?? null;
}

type ScoreOrder = "ASC" | "DESC";

function resolveScoreOrder(projectNumber: number): ScoreOrder {
  return projectNumber === 3 || projectNumber === 4 ? "ASC" : "DESC";
}
