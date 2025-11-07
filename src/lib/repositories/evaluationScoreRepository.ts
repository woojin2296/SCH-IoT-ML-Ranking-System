import { getDb } from "@/lib/db";

export type EvaluationScoreRow = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
};

export type EvaluationScoreWithUserRow = {
  id: number;
  userId: number;
  userPublicId: string;
  studentNumber: string;
  name: string | null;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: number;
  userYear: number;
};

export type EvaluationScoreSummaryRow = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  filePath: string | null;
};

export type EvaluationScoreFileMetaRow = {
  id: number;
  userId: number;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
};

export type RankingRow = {
  id: number;
  userId: number;
  publicId: string;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  position: number;
};

export type UserYearRow = {
  year: number;
};

export type AdminRankingRow = {
  id: number;
  position: number;
  studentNumber: string;
  name: string | null;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: number;
};

export function listScoresWithUserMeta(): EvaluationScoreWithUserRow[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          es.id,
          es.user_id AS userId,
          u.public_id AS userPublicId,
          u.student_number AS studentNumber,
          u.name,
          es.project_number AS projectNumber,
          es.score,
          es.evaluated_at AS evaluatedAt,
          es.file_name AS fileName,
          es.file_size AS fileSize,
          CASE WHEN es.file_path IS NOT NULL THEN 1 ELSE 0 END AS hasFile,
          CASE
            WHEN u.semester >= 100000 THEN CAST(u.semester / 100 AS INTEGER)
            ELSE u.semester
          END AS userYear
        FROM evaluation_scores es
        INNER JOIN users u ON u.id = es.user_id
        ORDER BY es.evaluated_at DESC
      `,
    )
    .all() as EvaluationScoreWithUserRow[];
}

export function listScoresByUser(userId: number, projectNumber?: number | null): EvaluationScoreRow[] {
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
    FROM evaluation_scores
    WHERE user_id = ?
      ${projectNumber !== null && projectNumber !== undefined ? "AND project_number = ?" : ""}
    ORDER BY project_number ASC, evaluated_at DESC
  `;

  return projectNumber !== null && projectNumber !== undefined
    ? (db.prepare(baseQuery).all(userId, projectNumber) as EvaluationScoreRow[])
    : (db.prepare(baseQuery).all(userId) as EvaluationScoreRow[]);
}

export function insertEvaluationScore(input: {
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
        INSERT INTO evaluation_scores (
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

export function findEvaluationScoreSummaryById(id: number): EvaluationScoreSummaryRow | null {
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
        FROM evaluation_scores
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(id) as EvaluationScoreSummaryRow | undefined;

  return row ?? null;
}

export function findEvaluationScoreSummaryByIdForUser(
  id: number,
  userId: number,
): EvaluationScoreSummaryRow | null {
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
        FROM evaluation_scores
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
    )
    .get(id, userId) as EvaluationScoreSummaryRow | undefined;

  return row ?? null;
}

export function deleteEvaluationScoreById(id: number): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM evaluation_scores WHERE id = ?").run(id);
  return result.changes ?? 0;
}

export function deleteEvaluationScoreByUser(id: number, userId: number): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM evaluation_scores WHERE id = ? AND user_id = ?").run(id, userId);
  return result.changes ?? 0;
}

export function findEvaluationScoreFileMetaById(id: number): EvaluationScoreFileMetaRow | null {
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
        FROM evaluation_scores
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(id) as EvaluationScoreFileMetaRow | undefined;

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

export function listRankingRows(
  projectNumber: number,
  selectedYear: number,
): RankingRow[] {
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
          FROM evaluation_scores es
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
          FROM evaluation_scores es
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

export function listAdminRankingRows(
  projectNumber: number,
  fromIso: string,
  toIso: string,
): AdminRankingRow[] {
  const db = getDb();
  return db
    .prepare(
      `
        WITH filtered AS (
          SELECT
            es.id,
            es.project_number,
            es.score,
            es.evaluated_at,
            es.file_name,
            es.file_size,
            es.file_path,
            u.student_number,
            u.name,
            ROW_NUMBER() OVER (
              PARTITION BY u.student_number
              ORDER BY es.score DESC, es.evaluated_at ASC
            ) AS per_user_rank
          FROM evaluation_scores es
          INNER JOIN users u ON u.id = es.user_id
          WHERE es.project_number = ?
            AND es.evaluated_at BETWEEN ? AND ?
        ),
        best AS (
          SELECT
            id,
            student_number,
            name,
            score,
            evaluated_at,
            file_name,
            file_size,
            file_path,
            ROW_NUMBER() OVER (ORDER BY score DESC, evaluated_at ASC) AS position
          FROM filtered
          WHERE per_user_rank = 1
        )
        SELECT
          id,
          position,
          student_number AS studentNumber,
          name,
          score,
          evaluated_at AS evaluatedAt,
          file_name AS fileName,
          file_size AS fileSize,
          CASE WHEN file_path IS NOT NULL THEN 1 ELSE 0 END AS hasFile
        FROM best
        ORDER BY position ASC
      `,
    )
    .all(projectNumber, fromIso, toIso) as AdminRankingRow[];
}
