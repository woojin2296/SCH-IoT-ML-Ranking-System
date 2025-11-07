import {
  insertEvaluationLog,
  listEvaluationLogsWithUsers,
  type EvaluationLogInsert,
  type EvaluationLogWithUsersRow,
} from "@/lib/repositories/evaluationLogRepository";

export type EvaluationLogEntry = EvaluationLogInsert & {
  payload?: Record<string, unknown> | null;
};

export function logEvaluationChange(entry: EvaluationLogEntry) {
  insertEvaluationLog({
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    scoreId: entry.scoreId ?? null,
    targetUserId: entry.targetUserId ?? null,
    projectNumber: entry.projectNumber ?? null,
    score: entry.score ?? null,
    payload: entry.payload ? JSON.stringify(entry.payload) : null,
  });
}

export type EvaluationLogRecord = {
  id: number;
  actorUserId: number | null;
  actorPublicId: string | null;
  action: string;
  scoreId: number | null;
  targetUserId: number | null;
  targetPublicId: string | null;
  projectNumber: number | null;
  score: number | null;
  createdAt: string;
  actorSemester: number | null;
  targetSemester: number | null;
};

export function getEvaluationLogs(): EvaluationLogRecord[] {
  return listEvaluationLogsWithUsers().map((row: EvaluationLogWithUsersRow) => ({
    id: row.id,
    actorUserId: row.actorUserId,
    actorPublicId: row.actorPublicId,
    action: row.action,
    scoreId: row.scoreId,
    targetUserId: row.targetUserId,
    targetPublicId: row.targetPublicId,
    projectNumber: row.projectNumber,
    score: row.score,
    createdAt: row.createdAt,
    actorSemester: row.actorSemester,
    targetSemester: row.targetSemester,
  }));
}
