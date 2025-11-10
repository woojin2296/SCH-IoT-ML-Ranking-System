import {
  countAdminScoreSubmissions,
  deleteScoreById,
  deleteScoreByUser,
  findScoreSummaryByIdForUser,
  findRankingRowForUser,
  findScoreFileMetaById,
  insertScore,
  listAdminRankingRows,
  listAdminScoreSubmissions,
  listDistinctUserYears,
  listRankingRows,
  listScoresByUser,
} from "@/lib/repositories/scoreRepository";
import type {
  AdminRankingRow,
  RankingRow,
  ScoreRow,
  ScoreSubmissionRow,
  ScoreSummaryRow,
  UserYearRow,
} from "@/lib/type/Score";

export type UserScore = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  createdAt: string;
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
export type AdminRankingRecord = AdminRankingRow;
export type ScoreSubmissionRecord = {
  id: number;
  userId: number;
  studentNumber: string;
  name: string | null;
  email: string;
  semester: number;
  projectNumber: number;
  score: number;
  createdAt: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

export function getScoresForUser(
  userId: number,
  projectNumber?: number | null,
): UserScore[] {
  return listScoresByUser(userId, projectNumber).map((row: ScoreRow) => ({
    id: row.id,
    userId: row.userId,
    projectNumber: row.projectNumber,
    score: row.score,
    createdAt: row.createdAt,
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
  createdAt: string;
}): number {
  return insertScore(input);
}

export function getScoreSummaryForUser(
  id: number,
  userId: number,
): ScoreSummary | null {
  return castSummary(findScoreSummaryByIdForUser(id, userId));
}

export function removeScoreForUser(id: number, userId: number): boolean {
  return deleteScoreByUser(id, userId) > 0;
}

export function removeScoreById(id: number): boolean {
  return deleteScoreById(id) > 0;
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
  selectedYear: number,
): AdminRankingRecord[] {
  return listAdminRankingRows(projectNumber, selectedYear);
}

export function getRankingSummaryForUser(
  projectNumber: number,
  selectedYear: number,
  userId: number,
): { rank: number; score: number; createdAt: string } | null {
  return findRankingRowForUser(projectNumber, selectedYear, userId);
}

export function getScoreSubmissionsForAdmin(params: {
  studentNumber?: string;
  limit: number;
  offset: number;
}): ScoreSubmissionRecord[] {
  const rows = listAdminScoreSubmissions(params);
  return rows.map((row: ScoreSubmissionRow) => ({
    id: row.id,
    userId: row.userId,
    studentNumber: row.studentNumber,
    name: row.name,
    email: row.email,
    semester: row.semester,
    projectNumber: row.projectNumber,
    score: row.score,
    createdAt: row.createdAt,
    fileName: row.fileName,
    fileType: row.fileType,
    fileSize: row.fileSize,
    hasFile: Boolean(row.filePath),
  }));
}

export function countScoreSubmissionsForAdmin(studentNumber?: string): number {
  return countAdminScoreSubmissions(studentNumber);
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
