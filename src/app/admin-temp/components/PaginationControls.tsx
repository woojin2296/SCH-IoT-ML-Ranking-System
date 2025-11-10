import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  disablePrevious?: boolean;
  disableNext?: boolean;
};

export function PaginationControls({
  page,
  totalPages,
  onPrevious,
  onNext,
  disablePrevious,
  disableNext,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between text-sm text-neutral-600">
      <span>
        {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disablePrevious}
          onClick={onPrevious}
        >
          이전
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disableNext}
          onClick={onNext}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
