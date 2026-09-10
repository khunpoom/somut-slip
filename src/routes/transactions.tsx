import { createFileRoute } from "@tanstack/react-router";
import { MonthSwitcher } from "@/components/ledger/month-switcher";
import { TransactionList } from "@/components/ledger/tx-list";
import { useT } from "@/lib/i18n-hook";
import { formatBaht, sumBy } from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/transactions")({ component: TransactionsPage });

function TransactionsPage() {
  const { t, lang } = useT();
  const month = useLedger((s) => s.selectedMonth);
  const setMonth = useLedger((s) => s.setMonth);
  const transactions = useLedger((s) => s.transactions);
  const income = sumBy(transactions, month, "income");
  const expense = sumBy(transactions, month, "expense");

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h1 className="font-display text-2xl font-semibold">{t("txPage")}</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
        <p className="text-sm text-muted-foreground">
          {t("txMonthIn", {
            in: formatBaht(income, false, lang),
            out: formatBaht(expense, false, lang),
          })}
        </p>
      </header>
      <TransactionList month={month} />
    </div>
  );
}
