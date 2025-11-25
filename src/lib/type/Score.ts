export type ScoreRow = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  createdAt: string;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
};

export type ScoreSummaryRow = {
  id: number;
  userId: number;
  projectNumber: number;
  score: number;
  filePath: string | null;
};

export type ScoreFileMetaRow = {
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
  createdAt: string;
  position: number;
};

export type AdminRankingRow = RankingRow & {
  name: string | null;
  email: string;
  studentNumber: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

export type ScoreSubmissionRow = {
  id: number;
  userId: number;
  studentNumber: string;
  name: string | null;
  email: string;
  projectNumber: number;
  score: number;
  createdAt: string;
  filePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
};
