import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

import { getDb } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guard";
import { resolveStoredFilePath } from "@/lib/uploads";
import { createRequestLogger } from "@/lib/request-logger";

// GET /api/my-results/[id]/file
// - Requires authenticated session (owner or admin).
// - Validates numeric `id` path param and ensures attachment exists before streaming download.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const baseLogger = createRequestLogger(request, request.nextUrl.pathname, request.method);
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    baseLogger(401, { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = createRequestLogger(
    request,
    request.nextUrl.pathname,
    request.method,
    sessionUser.id,
  );

  const recordId = Number.parseInt(id, 10);

  if (!Number.isInteger(recordId) || recordId <= 0) {
    logRequest(400, { reason: "invalid_id", id });
    return NextResponse.json({ error: "유효하지 않은 기록 ID입니다." }, { status: 400 });
  }

  const db = getDb();
  const record = db
    .prepare(
      `
        SELECT
          es.user_id AS userId,
          es.file_path AS filePath,
          es.file_name AS fileName,
          es.file_type AS fileType,
          es.file_size AS fileSize
        FROM evaluation_scores es
        WHERE es.id = ?
        LIMIT 1
      `,
    )
    .get(recordId) as
    | {
        userId: number;
        filePath: string | null;
        fileName: string | null;
        fileType: string | null;
        fileSize: number | null;
      }
    | undefined;

  if (!record || !record.filePath) {
    logRequest(404, { reason: "not_found", scoreId: recordId });
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const isOwner = record.userId === sessionUser.id;
  const isAdmin = sessionUser.role === "admin";

  if (!isOwner && !isAdmin) {
    logRequest(403, { reason: "forbidden", scoreId: recordId });
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  let absolutePath: string | null = null;
  try {
    absolutePath = resolveStoredFilePath(record.filePath);
  } catch (error) {
    console.error("Invalid stored file path", error);
  }

  if (!absolutePath) {
    logRequest(500, { scoreId: recordId, reason: "invalid_stored_path" });
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 500 });
  }

  try {
    const fileBuffer = await readFile(absolutePath);
    const fileName = record.fileName ?? path.basename(absolutePath);
    const fileType = record.fileType ?? "application/octet-stream";

    const response = new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": fileType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": record.fileSize ? String(record.fileSize) : fileBuffer.length.toString(),
      },
    });

    logRequest(200, { scoreId: recordId, fileName });

    return response;
  } catch (error) {
    console.error("Failed to read attachment", error);
    logRequest(500, { scoreId: recordId, reason: "read_failed" });
    return NextResponse.json({ error: "파일을 읽는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
