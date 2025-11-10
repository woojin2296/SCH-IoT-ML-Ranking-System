import type { ReactNode } from "react";

type AdminTableProps = {
  head: ReactNode;
  body: ReactNode;
  beforeTable?: ReactNode;
  afterTable?: ReactNode;
};

export function AdminTable({ head, body, beforeTable, afterTable }: AdminTableProps) {
  return (
    <div className="overflow-x-auto border border-neutral-200">
      {beforeTable}
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {head}
        </thead>
        <tbody className="divide-y divide-neutral-100">{body}</tbody>
      </table>
      {afterTable}
    </div>
  );
}
