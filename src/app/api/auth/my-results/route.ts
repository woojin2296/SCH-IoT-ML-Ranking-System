import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { requireSessionUser } from "@/lib/auth-guard";
import { ALLOWED_UPLOAD_EXTENSIONS, resolveWithinUploadRoot, resolveStoredFilePath } from "@/lib/uploads";
import { createRequestLogger } from "@/lib/request-logger";
import { getSeoulTimestamp } from "@/lib/time";
import {
  createScore,
  getScoreSummaryForUser,
  getScoresForUser,
  removeScoreForUser,
} from "@/lib/services/scoreService";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// GET /api/my-results
// - Requires authenticated session.
// - Optional `project` query accepts integer 1-4; otherwise returns all results.
// - Responds with normalized score records and attachment availability.
export async function GET(request: NextRequest) {
  const baseLogger = createRequestLogger(request, "/api/my-results", request.method);
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    baseLogger(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(request, "/api/my-results", request.method, sessionUser.id);

  const projectParam = request.nextUrl.searchParams.get("project");
  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : null;

  if (projectNumber !== null && (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4)) {
    logRequest(400, { projectNumber });
    return NextResponse.json(
      { error: "유효하지 않은 프로젝트 번호입니다." },
      { status: 400 },
    );
  }

  const results = getScoresForUser(sessionUser.id, projectNumber);

  const normalized = results.map((row) => ({
    id: row.id,
    projectNumber: row.projectNumber,
    score: row.score,
    evaluatedAt: row.evaluatedAt,
    fileName: row.fileName,
    fileSize: row.fileSize,
    hasFile: row.hasFile,
  }));

  logRequest(200, { projectNumber });

  return NextResponse.json({
    results: normalized,
    projectNumber,
  });
}

// POST /api/my-results
// - Requires authenticated session.
// - Accepts multipart form with `projectNumber` (1-4), numeric `score`, and `attachment` file (.ipynb/.py <= 10MB).
// - Validates payload before writing attachment and inserting evaluation record.
export async function POST(request: NextRequest) {
  const baseLogger = createRequestLogger(request, "/api/my-results", request.method);
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    baseLogger(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(request, "/api/my-results", request.method, sessionUser.id);

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
  const extension = path.extname(sanitizedFileName).toLowerCase();

  if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
    logRequest(400, { reason: "disallowed_extension", extension, projectNumber });
    return NextResponse.json(
      { error: "허용되지 않은 파일 형식입니다. (.ipynb 또는 .py만 업로드 가능)" },
      { status: 400 },
    );
  }

  const uniqueId = randomUUID();
  const storedFileName = `${uniqueId}_${sanitizedFileName}`;
  const relativeDirectory = path.join(String(sessionUser.id));
  const relativePath = path.join(relativeDirectory, storedFileName);
  const fullStoredPath = resolveWithinUploadRoot(relativePath);

  await mkdir(path.dirname(fullStoredPath), { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (extension === ".ipynb") {
    try {
      const notebookJson = JSON.parse(buffer.toString("utf8"));
      if (!notebookJson || typeof notebookJson !== "object" || !Array.isArray((notebookJson as { cells?: unknown[] }).cells)) {
        logRequest(400, { reason: "invalid_ipynb_structure", projectNumber });
        return NextResponse.json({ error: "유효한 주피터 노트북 파일이 아닙니다." }, { status: 400 });
      }
    } catch {
      logRequest(400, { reason: "invalid_ipynb_json", projectNumber });
      return NextResponse.json({ error: "주피터 노트북 파일이 손상되었거나 JSON 형식이 아닙니다." }, { status: 400 });
    }
  }

  if (extension === ".py") {
    if (buffer.includes(0)) {
      logRequest(400, { reason: "python_contains_null_byte", projectNumber });
      return NextResponse.json({ error: "파이썬 스크립트에 유효하지 않은 문자가 포함되어 있습니다." }, { status: 400 });
    }
  }

  const inferredFileType = extension === ".ipynb" ? "application/json" : "text/x-python";

  try {
    await writeFile(fullStoredPath, buffer);

    const evaluatedAt = getSeoulTimestamp();

    const insertedId = createScore({
      userId: sessionUser.id,
      projectNumber,
      score,
      filePath: relativePath,
      fileName: originalFileName,
      fileType: inferredFileType,
      fileSize: file.size,
      evaluatedAt,
    });

    logRequest(201, {
      projectNumber,
      score,
      fileName: originalFileName,
      fileSize: file.size,
      evaluatedAt,
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

// DELETE /api/my-results
// - Requires authenticated session.
// - Accepts JSON body containing positive integer `id` owned by caller.
// - Deletes the evaluation record and associated stored file if present.
export async function DELETE(request: NextRequest) {
  const baseLogger = createRequestLogger(request, "/api/my-results", request.method);
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    baseLogger(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(request, "/api/my-results", request.method, sessionUser.id);

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

  const existing = getScoreSummaryForUser(id, sessionUser.id);

  if (!existing) {
    logRequest(404, { reason: "not_found", id });
    return NextResponse.json(
      { error: "삭제할 기록을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    const removed = removeScoreForUser(id, sessionUser.id);

    if (!removed) {
      logRequest(500, { action: "delete", scoreId: existing.id, reason: "delete_failed" });
      return NextResponse.json(
        { error: "결과 삭제 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    const absoluteStoredPath = resolveStoredFilePath(existing.filePath ?? null);
    if (absoluteStoredPath) {
      try {
        await unlink(absoluteStoredPath);
      } catch (unlinkError) {
        console.error("Failed to delete attachment", unlinkError);
      }
    }

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
