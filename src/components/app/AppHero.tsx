"use client";

import Image from "next/image";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type AppHeroProps = {
  title?: ReactNode;
  alert?: ReactNode;
  alerts?: ReactNode[];
  className?: string;
  alertClassName?: string;
};

export default function AppHero({
  title = "머신러닝 미니 프로젝트 랭킹 시스템",
  alert,
  alerts,
  className,
  alertClassName,
}: AppHeroProps) {
  const alertItems: ReactNode[] = alerts
    ? alerts
    : alert
      ? Array.isArray(alert)
        ? alert
        : [alert]
      : [];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <div className="flex items-center gap-2">
        <Image src="/schiot_logo.png" alt="SCH Logo" width={150} height={150} />
        <Image src="/ubicomplab_logo.png" alt="UBICOMPLAB Logo" width={147} height={147} />
      </div>
      <div className="mb-2 flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {alertItems.length ? (
        <div className="mt-8 mb-8 flex w-full max-w-xl flex-col gap-4">
          {alertItems.map((content, index) => (
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
      ) : null}
    </div>
  );
}
