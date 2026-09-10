import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentMonth, shiftMonth } from "@/lib/ledger/defaults";
import { monthTitle } from "@/lib/ledger/format";

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (next: string) => void;
}) {
  const now = currentMonth();
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="เดือนก่อน"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <p className="flex-1 text-center font-display text-xl font-semibold tracking-tight">
        {monthTitle(month)}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="เดือนถัดไป"
        disabled={month >= now}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
