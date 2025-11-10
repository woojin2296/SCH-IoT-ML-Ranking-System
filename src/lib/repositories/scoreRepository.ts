import { getDb } from "@/lib/db";
import type {
  RankingRow,
  ScoreFileMetaRow,
  ScoreRow,
  ScoreSummaryRow,
  UserYearRow,
} from "@/lib/type/Score";

export function listRankingRows(projectNumber: number, selectedYear: number): RankingRow[] {
  const db = getDb();
  return db
    .prepare(
      `
        WITH best_scores AS (
          SELECT
            es.id,
            es.user_id,
            es.project_number,
            es.score,
            es.evaluated_at,
            u.public_id,
            ROW_NUMBER() OVER (
              PARTITION BY es.user_id
              ORDER BY es.score DESC, es.evaluated_at ASC
            ) AS per_user_rank
        FROM scores es
        INNER JOIN users u ON u.id = es.user_id
        WHERE es.project_number = ?
          AND (
            CASE
              WHEN u.semester >= 100000 THEN CAST(u.semester / 100 AS INTEGER)
              ELSE u.semester
            END
          ) = ?
        )
        SELECT
          id,
          user_id AS userId,
          public_id AS publicId,
          project_number AS projectNumber,
          score,
          evaluated_at AS evaluatedAt,
          ROW_NUMBER() OVER (ORDER BY score DESC, evaluated_at ASC) AS position
        FROM best_scores
        WHERE per_user_rank = 1
        ORDER BY position ASC
      `,
    )
    .all(projectNumber, selectedYear) as RankingRow[];
}

export function listScoresByUser(userId: number, projectNumber?: number | null): ScoreRow[] {
  const db = getDb();
  const baseQuery = `
    SELECT
      id,
      user_id AS userId,
      project_number AS projectNumber,
      score,
      evaluated_at AS evaluatedAt,
      file_path AS filePath,
      file_name AS fileName,
      file_type AS fileType,
      file_size AS fileSize
    FROM scores
    WHERE user_id = ?
      ${projectNumber !== null && projectNumber !== undefined ? "AND project_number = ?" : ""}
    ORDER BY project_number ASC, evaluated_at DESC
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
  evaluatedAt: string;
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
          evaluated_at
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
      input.evaluatedAt,
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

export function listDistinctUserYears(): UserYearRow[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT DISTINCT
          CASE
            WHEN semester >= 100000 THEN CAST(semester / 100 AS INTEGER)
            ELSE semester
          END AS year
        FROM users
        ORDER BY year DESC
      `,
    )
    .all() as UserYearRow[];
}



export function findRankingRowForUser(
  projectNumber: number,
  selectedYear: number,
  userId: number,
): { rank: number; score: number; evaluatedAt: string } | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        WITH best_scores AS (
          SELECT
            es.id,
            es.user_id,
            es.project_number,
            es.score,
            es.evaluated_at,
            ROW_NUMBER() OVER (
              PARTITION BY es.user_id
              ORDER BY es.score DESC, es.evaluated_at ASC
            ) AS per_user_rank
          FROM scores es
          INNER JOIN users u ON u.id = es.user_id
          WHERE es.project_number = ?
            AND (
              CASE
                WHEN u.semester >= 100000 THEN CAST(u.semester / 100 AS INTEGER)
                ELSE u.semester
              END
            ) = ?
        ),
        ranked AS (
          SELECT
            id,
            user_id,
            project_number,
            score,
            evaluated_at,
            ROW_NUMBER() OVER (ORDER BY score DESC, evaluated_at ASC) AS overall_rank
          FROM best_scores
          WHERE per_user_rank = 1
        )
        SELECT
          overall_rank AS rank,
          score,
          evaluated_at AS evaluatedAt
        FROM ranked
        WHERE user_id = ?
        LIMIT 1
      `,
    )
    .get(projectNumber, selectedYear, userId) as
    | { rank: number; score: number; evaluatedAt: string }
    | undefined;

  return row ?? null;
}
