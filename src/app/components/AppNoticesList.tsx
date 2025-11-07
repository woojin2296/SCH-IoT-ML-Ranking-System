import { Info } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { getActiveNoticeStrings } from "@/lib/services/noticeService";

export function AppNoticesList() {
  const items = getActiveNoticeStrings();

  if (!items.length) {
    return null;
  }

  return (
    <div className="mt-8 mb-8 flex w-full max-w-xl flex-col gap-4">
      {items.map((content, index) => (
        <Alert
          key={index}
          className="flex items-center bg-blue-50 text-blue-900 border-blue-200"
        >
          <Info color="blue" />
          <div className="font-medium tracking-tight">{content}</div>
        </Alert>
      ))}
    </div>
  );
}
