"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type YearSwitcherProps = {
  availableYears: number[];
  activeProject: number;
  selectedYear: number;
  basePath?: string;
};

export function YearSwitcher({ availableYears, activeProject, selectedYear, basePath = "/" }: YearSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {availableYears.map((year) => {
        const params = new URLSearchParams({ project: String(activeProject), year: String(year) });
        const href = `${basePath}?${params.toString()}`;
        return (
          <Link
            key={year}
            href={href}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition",
              year === selectedYear
                ? "bg-[#1f4275] text-white shadow"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
            )}
          >
            {year}년
          </Link>
        );
      })}
    </div>
  );
}
