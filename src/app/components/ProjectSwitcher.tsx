"use client";

import Link from "next/link";

export type ProjectSwitcherProject = {
  number: number;
  label: string;
};

type ProjectSwitcherProps = {
  projects: ProjectSwitcherProject[];
  activeProject: number;
  selectedYear: number;
  basePath?: string;
  includeYearParam?: boolean;
};

export function ProjectSwitcher({
  projects,
  activeProject,
  selectedYear,
  basePath = "/",
  includeYearParam = true,
}: ProjectSwitcherProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {projects.map((project) => {
        const params = new URLSearchParams({ project: String(project.number) });
        if (includeYearParam) {
          params.set("year", String(selectedYear));
        }
        const href = `${basePath}?${params.toString()}`;
        const isActive = project.number === activeProject;

        return (
          <Link
            key={project.number}
            href={href}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              isActive ? "bg-[#265392] text-white shadow" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {project.label}
          </Link>
        );
      })}
    </div>
  );
}
