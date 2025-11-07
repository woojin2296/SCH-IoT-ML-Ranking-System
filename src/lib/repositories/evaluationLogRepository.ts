import { getDb } from "@/lib/db";

export type EvaluationLogInsert = {
  actorUserId?: number | null;
  action: "create" | "delete";
  scoreId?: number | null;
  targetUserId?: number | null;
  projectNumber?: number | null;
  score?: number | null;
  payload?: string | null;
};

export function insertEvaluationLog(entry: EvaluationLogInsert) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO evaluation_logs (
        actor_user_id,
        action,
        score_id,
        target_user_id,
        project_number,
        score,
        payload
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    entry.actorUserId ?? null,
    entry.action,
    entry.scoreId ?? null,
    entry.targetUserId ?? null,
    entry.projectNumber ?? null,
    entry.score ?? null,
    entry.payload ?? null,
  );
}

export type EvaluationLogWithUsersRow = {
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

export function listEvaluationLogsWithUsers(): EvaluationLogWithUsersRow[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT
          el.id,
          el.actor_user_id AS actorUserId,
          actor.public_id AS actorPublicId,
          el.action,
          el.score_id AS scoreId,
          el.target_user_id AS targetUserId,
          target.public_id AS targetPublicId,
          el.project_number AS projectNumber,
          el.score,
          el.created_at AS createdAt,
          actor.semester AS actorSemester,
          target.semester AS targetSemester
        FROM evaluation_logs el
        LEFT JOIN users actor ON actor.id = el.actor_user_id
        LEFT JOIN users target ON target.id = el.target_user_id
        ORDER BY el.created_at DESC
      `,
    )
    .all() as EvaluationLogWithUsersRow[];
}
