"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type AppNoticesListProps = {
  items: ReactNode[];
  className?: string;
  alertClassName?: string;
};

export function AppNoticesList({ items, className, alertClassName }: AppNoticesListProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className={cn("mt-8 mb-8 flex w-full max-w-xl flex-col gap-4", className)}>
      {items.map((content, index) => (
        <Alert
          key={index}
          className={cn(
            "flex items-center bg-blue-50 text-blue-900 border-blue-200",
            alertClassName,
          )}
        >
          <Info color="blue" />
          <div className="font-medium tracking-tight">{content}</div>
        </Alert>
      ))}
    </div>
  );
}
