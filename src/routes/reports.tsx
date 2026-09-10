import { createFileRoute } from "@tanstack/react-router";
import { CategoryChart, TrendChart } from "@/components/ledger/charts";
import { MonthSwitcher } from "@/components/ledger/month-switcher";
import { formatBaht, sumBy } from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

function ReportsPage() {
  const month = useLedger((s) => s.selectedMonth);
  const setMonth = useLedger((s) => s.setMonth);
  const transactions = useLedger((s) => s.transactions);
  const categories = useLedger((s) => s.categories);
  const income = sumBy(transactions, month, "income");
  const expense = sumBy(transactions, month, "expense");
  const rate = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h1 className="font-display text-2xl font-semibold">รายงาน</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">อัตราส่วนรายจ่าย</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{rate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">ของรายรับเดือนนี้</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">รายรับ</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-income">
            {formatBaht(income)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">รายจ่าย</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-expense">
            {formatBaht(expense)}
          </p>
        </div>
      </div>

      <TrendChart txs={transactions} month={month} />
      <CategoryChart txs={transactions} month={month} categories={categories} />
    </div>
  );
}
