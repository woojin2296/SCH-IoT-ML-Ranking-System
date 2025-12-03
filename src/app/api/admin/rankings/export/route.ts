import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-guard";
import { getRequestIp } from "@/lib/request";
import { projects } from "@/lib/projects";
import { logUserRequest, resolveRequestSource } from "@/lib/services/requestLogService";
import { getAdminRankingRecords, type AdminRankingRecord } from "@/lib/services/scoreService";

const PATH = "/api/admin/rankings/export";

export async function GET(request: NextRequest) {
  const clientIp = getRequestIp(request);
  const resolvedIp = clientIp ?? "unknown";
  const adminUser = await requireAdmin();

  if (!adminUser) {
    logUserRequest({
      source: resolveRequestSource(null, clientIp),
      path: PATH,
      method: request.method,
      status: 401,
      metadata: { reason: "unauthorized" },
      ipAddress: resolvedIp,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = resolveRequestSource(adminUser.id, clientIp);
  const sheetData = projects.map((project) => ({
    projectNumber: project.number,
    label: project.label,
    records: getAdminRankingRecords(project.number),
  }));

  const workbook = createWorkbook(sheetData);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `project-all-rankings-${timestamp}.xls`;

  logUserRequest({
    source,
    path: PATH,
    method: "GET",
    status: 200,
    metadata: {
      projects: sheetData.map((sheet) => sheet.projectNumber),
      rowCounts: sheetData.reduce(
        (acc, sheet) => ({ ...acc, [sheet.projectNumber]: sheet.records.length }),
        {} as Record<number, number>,
      ),
    },
    ipAddress: resolvedIp,
  });

  return new NextResponse(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

type SheetData = {
  projectNumber: number;
  label: string;
  records: AdminRankingRecord[];
};

function createWorkbook(sheets: SheetData[]): string {
  const workbookHeader =
    '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';

  const styles = `
    <Styles>
      <Style ss:ID="sHeader">
        <Font ss:Bold="1"/>
      </Style>
      <Style ss:ID="sText">
        <NumberFormat ss:Format="@"/>
      </Style>
    </Styles>
  `;

  const worksheets = sheets.map((sheet) => createWorksheet(sheet)).join("");

  return (
    "\uFEFF" +
    `${workbookHeader}
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  ${styles}
  ${worksheets}
</Workbook>`
  );
}

function createWorksheet(sheet: SheetData): string {
  const header = [
    "순위",
    "점수",
    "프로젝트",
    "학번",
    "이름",
    "이메일",
    "Public ID",
    "첨부",
    "제출 일시",
  ];

  const rowsXml = [
    createRow(header, true),
    ...sheet.records.map((record) =>
      createRow([
        record.position,
        record.score,
        record.projectNumber,
        record.studentNumber,
        record.name ?? "",
        record.email,
        record.publicId,
        formatAttachment(record),
        formatTimestamp(record.createdAt),
      ]),
    ),
  ].join("");

  const sheetName = escapeXmlAttr(`${sheet.label} (P${sheet.projectNumber})`);

  return `
    <Worksheet ss:Name="${sheetName}">
      <Table>
        ${rowsXml}
      </Table>
    </Worksheet>
  `;
}

function createRow(values: Array<string | number>, isHeader = false): string {
  const cells = values
    .map((value) => {
      const isNumber = typeof value === "number" && Number.isFinite(value);
      const type = isNumber ? "Number" : "String";
      const content = isNumber ? value.toString() : escapeXml(String(value ?? ""));
      const style = isHeader ? ' ss:StyleID="sHeader"' : isNumber ? "" : ' ss:StyleID="sText"';
      return `<Cell${style}><Data ss:Type="${type}">${content}</Data></Cell>`;
    })
    .join("");

  return `<Row>${cells}</Row>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXmlAttr(value: string): string {
  return escapeXml(value);
}

function formatAttachment(record: Pick<AdminRankingRecord, "fileName" | "fileSize" | "hasFile">): string {
  if (!record.hasFile) {
    return "-";
  }
  if (record.fileName && record.fileSize) {
    return `${record.fileName} (${formatBytes(record.fileSize)})`;
  }
  if (record.fileName) {
    return record.fileName;
  }
  if (record.fileSize) {
    return `첨부 (${formatBytes(record.fileSize)})`;
  }
  return "첨부 있음";
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTimestamp(value: string): string {
  const isoCandidate = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    }).format(parsed);
  } catch {
    return parsed.toISOString();
  }
}
