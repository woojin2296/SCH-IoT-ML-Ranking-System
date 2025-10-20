import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

import { getDb } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guard";
import { logUserRequest } from "@/lib/logs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logRequest = (status: number, metadata?: Record<string, unknown>) =>
    logUserRequest({
      userId: sessionUser.id,
      path: `/api/my-results/${id}/file`,
      method: "GET",
      status,
      metadata,
    });

  const { id } = await params;
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

  try {
    const fileBuffer = await readFile(record.filePath);
    const fileName = record.fileName ?? path.basename(record.filePath);
    const fileType = record.fileType ?? "application/octet-stream";

    const response = new NextResponse(fileBuffer, {
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
