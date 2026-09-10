import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Camera, Plus } from "lucide-react";
import { CategoryGlyph, WalletGlyph } from "@/components/ledger/icons";
import { MonthSwitcher } from "@/components/ledger/month-switcher";
import { QuickAdd } from "@/components/ledger/quick-add";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categoryLabel, WALLET_KIND_KEY } from "@/lib/i18n";
import { useT } from "@/lib/i18n-hook";
import { addDaysIso, todayIso } from "@/lib/ledger/defaults";
import {
  categoryTotals,
  formatBaht,
  formatSignedBaht,
  formatThaiDateShort,
  sumBy,
  walletBalance,
} from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const { t, lang } = useT();
  const month = useLedger((s) => s.selectedMonth);
  const setMonth = useLedger((s) => s.setMonth);
  const transactions = useLedger((s) => s.transactions);
  const categories = useLedger((s) => s.categories);
  const wallets = useLedger((s) => s.wallets);
  const recurring = useLedger((s) => s.recurring);
  const goals = useLedger((s) => s.goals);
  const isDemo = useLedger((s) => s.isDemo);
  const keepDemoData = useLedger((s) => s.keepDemoData);
  const clearAndStart = useLedger((s) => s.clearAndStart);

  const income = sumBy(transactions, month, "income");
  const expense = sumBy(transactions, month, "expense");
  const balance = income - expense;
  const cats = categoryTotals(transactions, month, "expense", categories, lang).slice(0, 5);
  const maxCat = cats[0]?.total ?? 1;
  const recent = [...transactions]
    .filter((tx) => tx.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 6);
  const horizon = addDaysIso(todayIso(), 14);
  const upcoming = recurring
    .filter((r) => r.active && r.nextDate >= todayIso() && r.nextDate <= horizon)
    .sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {isDemo ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-accent px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-accent-foreground">{t("demoBanner")}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={keepDemoData}>
              {t("demoKeep")}
            </Button>
            <Button type="button" size="sm" onClick={clearAndStart}>
              {t("demoReset")}
            </Button>
          </div>
        </div>
      ) : null}

      <MonthSwitcher month={month} onChange={setMonth} />

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowDownLeft className="size-3.5 text-income" />
              {t("income")}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-income">
              {formatBaht(income, false, lang)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowUpRight className="size-3.5 text-expense" />
              {t("expense")}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-expense">
              {formatBaht(expense, false, lang)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">{t("leftover")}</p>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-semibold tabular-nums",
                balance >= 0 ? "text-foreground" : "text-expense",
              )}
            >
              {formatBaht(balance, false, lang)}
            </p>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">{t("transferNote")}</p>

      <QuickAdd />

      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <Button asChild>
          <Link to="/new">
            <Plus />
            {t("addTx")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/new" search={{ slip: true }}>
            <Camera />
            {t("readSlip")}
          </Link>
        </Button>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">{t("accounts")}</h2>
          <Link to="/settings" className="text-sm text-primary hover:underline">
            {t("navSettings")}
          </Link>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet) => {
            const bal = walletBalance(transactions, wallet.id);
            const owed = wallet.kind === "credit_card" && bal < 0;
            return (
              <li key={wallet.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 pt-4">
                    <WalletGlyph kind={wallet.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{wallet.name}</p>
                      <p className="text-xs text-muted-foreground">{t(WALLET_KIND_KEY[wallet.kind])}</p>
                    </div>
                    <p
                      className={cn(
                        "tabular-nums font-medium",
                        owed ? "text-expense" : "text-foreground",
                      )}
                    >
                      {owed
                        ? `${t("owed")} ${formatBaht(Math.abs(bal), false, lang)}`
                        : formatBaht(bal, false, lang)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{t("upcoming")}</h2>
              <Link to="/plan" className="text-sm text-primary hover:underline">
                {t("navPlan")}
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("upcomingEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("dueOn", { date: formatThaiDateShort(item.nextDate, lang) })}
                      </p>
                    </div>
                    <p className="tabular-nums">{formatBaht(item.amount, false, lang)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{t("tabGoals")}</h2>
              <Link to="/plan" className="text-sm text-primary hover:underline">
                {t("seeAll")}
              </Link>
            </div>
            {goals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("noGoals")}</p>
            ) : (
              <ul className="space-y-3">
                {goals.slice(0, 3).map((goal) => {
                  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
                  return (
                    <li key={goal.id}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{goal.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatBaht(goal.saved, false, lang)} / {formatBaht(goal.target, false, lang)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{t("expenseCats")}</h2>
              <Link to="/reports" className="text-sm text-primary hover:underline">
                {t("seeReports")}
              </Link>
            </div>
            {cats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noExpense")}</p>
            ) : (
              <ul className="space-y-3">
                {cats.map((cat) => (
                  <li key={cat.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{categoryLabel(cat.id, cat.name, lang)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatBaht(cat.total, false, lang)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(8, (cat.total / maxCat) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="pt-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{t("recent")}</h2>
              <Link to="/transactions" className="text-sm text-primary hover:underline">
                {t("seeAll")}
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noTx")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((tx) => (
                  <li key={tx.id}>
                    <Link
                      to="/new"
                      search={{ id: tx.id }}
                      className="flex items-center gap-3 py-3 hover:bg-muted/40"
                    >
                      <CategoryGlyph id={tx.type === "transfer" ? "transfer" : tx.categoryId} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{tx.payee}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatThaiDateShort(tx.date, lang)}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "tabular-nums font-medium",
                          tx.type === "income"
                            ? "text-income"
                            : tx.type === "transfer"
                              ? "text-transfer"
                              : "text-foreground",
                        )}
                      >
                        {tx.type === "transfer" ? (
                          <span className="inline-flex items-center gap-1">
                            <ArrowLeftRight className="size-3" />
                            {formatBaht(tx.amount, false, lang)}
                          </span>
                        ) : (
                          formatSignedBaht(tx.type, tx.amount, lang)
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
