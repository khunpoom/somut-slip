import { createFileRoute } from "@tanstack/react-router";
import { CategoryChart, TrendChart } from "@/components/ledger/charts";
import { MonthSwitcher } from "@/components/ledger/month-switcher";
import { useT } from "@/lib/i18n-hook";
import { formatBaht, sumBy } from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

function ReportsPage() {
  const { t, lang } = useT();
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
        <h1 className="font-display text-2xl font-semibold">{t("reports")}</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
        <p className="text-xs text-muted-foreground">{t("transferNote")}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("spendRate")}</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{rate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("ofIncome")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("income")}</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-income">
            {formatBaht(income, false, lang)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("expense")}</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-expense">
            {formatBaht(expense, false, lang)}
          </p>
        </div>
      </div>

      <TrendChart txs={transactions} month={month} />
      <CategoryChart txs={transactions} month={month} categories={categories} />
    </div>
  );
}
