import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { getDb } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guard";
import { logEvaluationChange, logUserRequest } from "@/lib/logs";

type ResultRow = {
  id: number;
  projectNumber: number;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean | number;
};

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "evaluation-scores");
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET(request: NextRequest) {
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    logUserRequest({
      path: "/api/my-results",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      userId: sessionUser.id,
      path: "/api/my-results",
      method: request.method,
      status,
      metadata,
    });

  const projectParam = request.nextUrl.searchParams.get("project");
  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : null;

  if (projectNumber !== null && (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4)) {
    logRequest(400, { projectNumber });
    return NextResponse.json(
      { error: "유효하지 않은 프로젝트 번호입니다." },
      { status: 400 },
    );
  }

  const db = getDb();

  const sql = `
    SELECT
      id,
      project_number AS projectNumber,
      score,
      evaluated_at AS evaluatedAt,
      file_name AS fileName,
      file_size AS fileSize,
      CASE WHEN file_path IS NOT NULL THEN 1 ELSE 0 END AS hasFile
    FROM evaluation_scores
    WHERE user_id = ?
      ${projectNumber !== null ? "AND project_number = ?" : ""}
    ORDER BY project_number ASC, evaluated_at DESC
  `;

  const results = projectNumber !== null
    ? db.prepare(sql).all(sessionUser.id, projectNumber)
    : db.prepare(sql).all(sessionUser.id);

  const normalized = (results as ResultRow[]).map((row) => ({
    ...row,
    hasFile: Boolean(row.hasFile),
  }));

  logRequest(200, { projectNumber });

  return NextResponse.json({
    results: normalized,
    projectNumber,
  });
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    logUserRequest({
      path: "/api/my-results",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      userId: sessionUser.id,
      path: "/api/my-results",
      method: request.method,
      status,
      metadata,
    });

  const formData = await request.formData();
  const projectNumberRaw = formData.get("projectNumber");
  const scoreRaw = formData.get("score");
  const file = formData.get("attachment");

  const projectNumber = typeof projectNumberRaw === "string" ? Number.parseInt(projectNumberRaw, 10) : Number(projectNumberRaw);
  const score = typeof scoreRaw === "string" ? Number.parseFloat(scoreRaw) : Number(scoreRaw);

  if (
    typeof projectNumber !== "number" ||
    !Number.isInteger(projectNumber) ||
    projectNumber < 1 ||
    projectNumber > 4
  ) {
    logRequest(400, { reason: "invalid_project", projectNumber: projectNumberRaw });
    return NextResponse.json(
      { error: "프로젝트 번호가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (typeof score !== "number" || Number.isNaN(score) || !Number.isFinite(score)) {
    logRequest(400, { reason: "invalid_score", projectNumber });
    return NextResponse.json(
      { error: "점수는 유효한 숫자여야 합니다." },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    logRequest(400, { reason: "missing_file", projectNumber });
    return NextResponse.json({ error: "제출 파일을 첨부해주세요." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    logRequest(400, { reason: "file_too_large", projectNumber, fileSize: file.size });
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
  }

  const originalFileName = file.name ?? "submission";
  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId = randomUUID();
  const storedFileName = `${uniqueId}_${sanitizedFileName}`;
  const filePath = path.join(UPLOAD_ROOT, String(sessionUser.id));
  const fullStoredPath = path.join(filePath, storedFileName);

  const db = getDb();

  await mkdir(filePath, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    await writeFile(fullStoredPath, buffer);

    const insert = db.prepare(
      `
        INSERT INTO evaluation_scores (user_id, project_number, score, file_path, file_name, file_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    );

    const result = insert.run(
      sessionUser.id,
      projectNumber,
      score,
      fullStoredPath,
      originalFileName,
      file.type || "application/octet-stream",
      file.size,
    );

    logEvaluationChange({
      actorUserId: sessionUser.id,
      action: "create",
      scoreId: Number(result.lastInsertRowid),
      targetUserId: sessionUser.id,
      projectNumber,
      score,
      payload: { source: "self-submit" },
    });

    logRequest(201, {
      projectNumber,
      score,
      fileName: originalFileName,
      fileSize: file.size,
    });

    return NextResponse.json(
      { success: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to insert evaluation score", error);
    try {
      await unlink(fullStoredPath);
    } catch (unlinkError) {
      console.error("Failed to cleanup uploaded file", unlinkError);
    }
    logRequest(500, { projectNumber, reason: "insert_failed" });
    return NextResponse.json(
      { error: "결과 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    logUserRequest({
      path: "/api/my-results",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      userId: sessionUser.id,
      path: "/api/my-results",
      method: request.method,
      status,
      metadata,
    });

  type Payload = {
    id?: number;
  };

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const { id } = payload;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    logRequest(400, { reason: "invalid_id", id });
    return NextResponse.json(
      { error: "유효한 기록 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const db = getDb();

  const existing = db
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
      `,
    )
    .get(id, sessionUser.id) as
    | { id: number; userId: number; projectNumber: number; score: number; filePath: string | null }
    | undefined;

  if (!existing) {
    logRequest(404, { reason: "not_found", id });
    return NextResponse.json(
      { error: "삭제할 기록을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    const stmt = db.prepare(
      `
        DELETE FROM evaluation_scores
        WHERE id = ? AND user_id = ?
      `,
    );

    stmt.run(id, sessionUser.id);

    if (existing.filePath) {
      try {
        await unlink(existing.filePath);
      } catch (unlinkError) {
        console.error("Failed to delete attachment", unlinkError);
      }
    }

    logEvaluationChange({
      actorUserId: sessionUser.id,
      action: "delete",
      scoreId: existing.id,
      targetUserId: existing.userId,
      projectNumber: existing.projectNumber,
      score: existing.score,
      payload: { source: "self-delete" },
    });

    logRequest(200, { action: "delete", scoreId: existing.id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete evaluation score", error);
    logRequest(500, { action: "delete", scoreId: existing.id, reason: "delete_failed" });
    return NextResponse.json(
      { error: "결과 삭제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
