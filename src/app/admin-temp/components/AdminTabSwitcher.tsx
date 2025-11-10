"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AdminTabItem<T extends string> = {
  key: T;
  label: ReactNode;
};

type AdminTabSwitcherProps<T extends string> = {
  tabs: AdminTabItem<T>[];
  activeTab: T;
  onSelect: (tab: T) => void;
};

export function AdminTabSwitcher<T extends string>({
  tabs,
  activeTab,
  onSelect,
}: AdminTabSwitcherProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition",
            activeTab === tab.key
              ? "bg-[#265392] text-white shadow"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
