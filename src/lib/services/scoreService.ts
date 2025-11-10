import {
  deleteScoreById,
  deleteScoreByUser,
  findScoreSummaryById,
  findScoreSummaryByIdForUser,
  findRankingRowForUser,
  findScoreFileMetaById,
  insertScore,
  listAdminRankingRows,
  listDistinctUserYears,
  listRankingRows,
  listScoresByUser,
  listScoresWithUserMeta,
  type ScoreRow,
  type ScoreSummaryRow,
  type ScoreFileMetaRow,
  type ScoreWithUserRow,
  type RankingRow,
  type UserYearRow,
} from "@/lib/repositories/scoreRepository";

export type AdminScore = {
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

export type UserScore = {
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

export type ScoreSummary = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  filePath: string | null;
};

export type ScoreFileMeta = {
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

export function getAdminScores(): AdminScore[] {
  return listScoresWithUserMeta().map((row: ScoreWithUserRow) => ({
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

export function getScoresForUser(
  userId: number,
  projectNumber?: number | null,
): UserScore[] {
  return listScoresByUser(userId, projectNumber).map((row: ScoreRow) => ({
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

export function createScore(input: {
  userId: number;
  projectNumber: number;
  score: number;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  evaluatedAt: string;
}): number {
  return insertScore(input);
}

export function getScoreSummary(id: number): ScoreSummary | null {
  return castSummary(findScoreSummaryById(id));
}

export function getScoreSummaryForUser(
  id: number,
  userId: number,
): ScoreSummary | null {
  return castSummary(findScoreSummaryByIdForUser(id, userId));
}

export function removeScore(id: number): boolean {
  return deleteScoreById(id) > 0;
}

export function removeScoreForUser(id: number, userId: number): boolean {
  return deleteScoreByUser(id, userId) > 0;
}

export function getScoreFileMeta(id: number): ScoreFileMeta | null {
  const row = findScoreFileMetaById(id);
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

function castSummary(row: ScoreSummaryRow | null): ScoreSummary | null {
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
