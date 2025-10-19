import { getDb } from "@/lib/db";

type EvaluationLogAction = "create" | "delete";

type EvaluationLogEntry = {
  actorUserId?: number | null;
  action: EvaluationLogAction;
  scoreId?: number | null;
  targetUserId?: number | null;
  projectNumber?: number | null;
  score?: number | null;
  payload?: Record<string, unknown> | null;
};

export function logEvaluationChange(entry: EvaluationLogEntry) {
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
    entry.payload ? JSON.stringify(entry.payload) : null,
  );
}
