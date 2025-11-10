import type { RequestLogView } from "@/lib/services/requestLogService";

export default function AdminRequestLogRow({ log }: { log: RequestLogView }) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-xs text-neutral-500">#{log.id}</td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">{formatTimestamp(log.createdAt)}</td>
      <td className="px-4 py-3 font-semibold text-sm">{log.method}</td>
      <td className="px-4 py-3 text-sm">{log.path}</td>
      <td className="px-4 py-3 text-sm">{log.status ?? "-"}</td>
      <td className="px-4 py-3 text-xs text-neutral-600">
        <div className="flex flex-col gap-1">
          <span>{log.source}</span>
          {log.ipAddress ? <span className="text-[11px] text-neutral-500">IP: {log.ipAddress}</span> : null}
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        {log.metadata ? (
          <pre className="max-w-xs whitespace-pre-wrap rounded-md bg-neutral-50 p-2 text-[11px] text-neutral-700">
            {formatMetadata(log.metadata)}
          </pre>
        ) : (
          "-"
        )}
      </td>
    </tr>
  );
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
      timeStyle: "medium",
      timeZone: "Asia/Seoul",
    }).format(parsed);
  } catch {
    return parsed.toISOString();
  }
}

function formatMetadata(metadata: Record<string, unknown> | string): string {
  if (typeof metadata === "string") {
    return metadata;
  }
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}
