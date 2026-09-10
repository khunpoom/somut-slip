import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-hook";
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
  const { t, lang } = useT();
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("prevMonth")}
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <p className="flex-1 text-center font-display text-xl font-semibold tracking-tight">
        {monthTitle(month, lang)}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("nextMonth")}
        disabled={month >= now}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
