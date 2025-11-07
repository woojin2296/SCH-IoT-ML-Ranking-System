import {
  deleteEvaluationScoreById,
  deleteEvaluationScoreByUser,
  findEvaluationScoreSummaryById,
  findEvaluationScoreSummaryByIdForUser,
  findRankingRowForUser,
  findEvaluationScoreFileMetaById,
  insertEvaluationScore,
  listAdminRankingRows,
  listDistinctUserYears,
  listRankingRows,
  listScoresByUser,
  listScoresWithUserMeta,
  type EvaluationScoreRow,
  type EvaluationScoreSummaryRow,
  type EvaluationScoreFileMetaRow,
  type EvaluationScoreWithUserRow,
  type RankingRow,
  type UserYearRow,
} from "@/lib/repositories/evaluationScoreRepository";

export type AdminEvaluationScore = {
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
  hasFile: boolean;
  userYear: number;
};

export type UserEvaluationScore = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

export type EvaluationScoreSummary = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  filePath: string | null;
};

export type EvaluationScoreFileMeta = {
  id: number;
  userId: number;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
};

export type RankingRecord = RankingRow;

export type AdminRankingRecord = {
  id: number;
  position: number;
  studentNumber: string;
  name: string | null;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

export function getAdminEvaluationScores(): AdminEvaluationScore[] {
  return listScoresWithUserMeta().map((row: EvaluationScoreWithUserRow) => ({
    id: row.id,
    userId: row.userId,
    userPublicId: row.userPublicId,
    studentNumber: row.studentNumber,
    name: row.name,
    projectNumber: row.projectNumber,
    score: row.score,
    evaluatedAt: row.evaluatedAt,
    fileName: row.fileName,
    fileSize: row.fileSize,
    hasFile: Boolean(row.hasFile),
    userYear: row.userYear,
  }));
}

export function getEvaluationScoresForUser(
  userId: number,
  projectNumber?: number | null,
): UserEvaluationScore[] {
  return listScoresByUser(userId, projectNumber).map((row: EvaluationScoreRow) => ({
    id: row.id,
    userId: row.userId,
    projectNumber: row.projectNumber,
    score: row.score,
    evaluatedAt: row.evaluatedAt,
    fileName: row.fileName,
    fileType: row.fileType,
    fileSize: row.fileSize,
    hasFile: Boolean(row.filePath),
  }));
}

export function createEvaluationScore(input: {
  userId: number;
  projectNumber: number;
  score: number;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  evaluatedAt: string;
}): number {
  return insertEvaluationScore(input);
}

export function getEvaluationScoreSummary(id: number): EvaluationScoreSummary | null {
  return castSummary(findEvaluationScoreSummaryById(id));
}

export function getEvaluationScoreSummaryForUser(
  id: number,
  userId: number,
): EvaluationScoreSummary | null {
  return castSummary(findEvaluationScoreSummaryByIdForUser(id, userId));
}

export function removeEvaluationScore(id: number): boolean {
  return deleteEvaluationScoreById(id) > 0;
}

export function removeEvaluationScoreForUser(id: number, userId: number): boolean {
  return deleteEvaluationScoreByUser(id, userId) > 0;
}

export function getEvaluationScoreFileMeta(id: number): EvaluationScoreFileMeta | null {
  const row = findEvaluationScoreFileMetaById(id);
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.userId,
    filePath: row.filePath,
    fileName: row.fileName,
    fileType: row.fileType,
    fileSize: row.fileSize,
  };
}

export function getDistinctUserYears(): number[] {
  return listDistinctUserYears().map((row: UserYearRow) => row.year);
}

export function getRankingRecords(
  projectNumber: number,
  selectedYear: number,
): RankingRecord[] {
  return listRankingRows(projectNumber, selectedYear);
}

export function getAdminRankingRecords(
  projectNumber: number,
  fromIso: string,
  toIso: string,
): AdminRankingRecord[] {
  return listAdminRankingRows(projectNumber, fromIso, toIso).map((row) => ({
    id: row.id,
    position: row.position,
    studentNumber: row.studentNumber,
    name: row.name,
    score: row.score,
    evaluatedAt: row.evaluatedAt,
    fileName: row.fileName,
    fileSize: row.fileSize,
    hasFile: Boolean(row.hasFile),
  }));
}

export function getRankingSummaryForUser(
  projectNumber: number,
  selectedYear: number,
  userId: number,
): { rank: number; score: number; evaluatedAt: string } | null {
  return findRankingRowForUser(projectNumber, selectedYear, userId);
}

function castSummary(row: EvaluationScoreSummaryRow | null): EvaluationScoreSummary | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.userId,
    projectNumber: row.projectNumber,
    score: row.score,
    filePath: row.filePath,
  };
}
