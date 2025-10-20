import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { logUserRequest } from "@/lib/logs";
import { getRequestIp } from "@/lib/request";

type RankingRow = {
  id: number;
  position: number;
  studentNumber: string;
  name: string | null;
  score: number;
  evaluatedAt: string;
  fileName: string | null;
  fileSize: number | null;
  hasFile: number;
};

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin();
  const clientIp = getRequestIp(request);

  if (!adminUser) {
    logUserRequest({
      path: "/api/admin/rankings",
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: clientIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const projectParam = url.searchParams.get("project");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const projectNumber = projectParam ? Number.parseInt(projectParam, 10) : 1;

  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 4) {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/rankings",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_project", projectParam },
      ipAddress: clientIp,
    });
    return NextResponse.json({ error: "유효하지 않은 프로젝트 번호입니다." }, { status: 400 });
  }

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : now;

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    logUserRequest({
      userId: adminUser.id,
      path: "/api/admin/rankings",
      method: request.method,
      status: 400,
      metadata: { reason: "invalid_date", fromParam, toParam },
      ipAddress: clientIp,
    });
    return NextResponse.json({ error: "유효한 날짜 범위가 필요합니다." }, { status: 400 });
  }

  const normalizedFrom = fromDate <= toDate ? fromDate : toDate;
  const normalizedTo = toDate >= fromDate ? toDate : fromDate;

  const fromIso = new Date(normalizedFrom.setHours(0, 0, 0, 0)).toISOString();
  const toIso = new Date(normalizedTo.setHours(23, 59, 59, 999)).toISOString();

  const db = getDb();

  const rankings = db
    .prepare(
      `
        WITH filtered AS (
          SELECT
            es.id,
            es.user_id,
            es.project_number,
            es.score,
            es.evaluated_at,
            es.file_name,
            es.file_size,
            es.file_path,
            u.student_number,
            u.name
          FROM evaluation_scores es
          INNER JOIN users u ON u.id = es.user_id
          WHERE es.project_number = ?
            AND es.evaluated_at BETWEEN ? AND ?
        ),
        ranked AS (
          SELECT
            id,
            student_number,
            name,
            score,
            evaluated_at,
            file_name,
            file_size,
            file_path,
            ROW_NUMBER() OVER (
              PARTITION BY student_number
              ORDER BY score DESC, evaluated_at ASC
            ) AS per_user_rank
          FROM filtered
        ),
        best AS (
          SELECT
            id,
            student_number,
            name,
            score,
            evaluated_at,
            file_name,
            file_size,
            file_path,
            ROW_NUMBER() OVER (ORDER BY score DESC, evaluated_at ASC) AS position
          FROM ranked
          WHERE per_user_rank = 1
        )
        SELECT
          id,
          position,
          student_number AS studentNumber,
          name,
          score,
          evaluated_at AS evaluatedAt,
          file_name AS fileName,
          file_size AS fileSize,
          CASE WHEN file_path IS NOT NULL THEN 1 ELSE 0 END AS hasFile
        FROM best
        ORDER BY position ASC
      `,
    )
    .all(projectNumber, fromIso, toIso) as RankingRow[];

  const normalized = rankings.map((row) => ({
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

  logUserRequest({
    userId: adminUser.id,
    path: "/api/admin/rankings",
    method: request.method,
    status: 200,
    metadata: {
      projectNumber,
      from: fromIso,
      to: toIso,
      count: normalized.length,
    },
    ipAddress: clientIp,
  });

  return NextResponse.json({
    rankings: normalized,
    projectNumber,
    from: fromIso,
    to: toIso,
  });
}
