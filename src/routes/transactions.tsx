import { createFileRoute } from "@tanstack/react-router";
import { MonthSwitcher } from "@/components/ledger/month-switcher";
import { TransactionList } from "@/components/ledger/tx-list";
import { formatBaht, sumBy } from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/transactions")({ component: TransactionsPage });

function TransactionsPage() {
  const month = useLedger((s) => s.selectedMonth);
  const setMonth = useLedger((s) => s.setMonth);
  const transactions = useLedger((s) => s.transactions);
  const income = sumBy(transactions, month, "income");
  const expense = sumBy(transactions, month, "expense");

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h1 className="font-display text-2xl font-semibold">รายการ</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
        <p className="text-sm text-muted-foreground">
          รับ {formatBaht(income)} · จ่าย {formatBaht(expense)}
        </p>
      </header>
      <TransactionList month={month} />
    </div>
  );
}
