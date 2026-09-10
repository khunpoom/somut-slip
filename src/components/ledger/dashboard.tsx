import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Camera, Plus } from "lucide-react";
import { CategoryGlyph } from "@/components/ledger/icons";
import { MonthSwitcher } from "@/components/ledger/month-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  categoryTotals,
  formatBaht,
  formatSignedBaht,
  formatThaiDateShort,
  sumBy,
} from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const month = useLedger((s) => s.selectedMonth);
  const setMonth = useLedger((s) => s.setMonth);
  const transactions = useLedger((s) => s.transactions);
  const categories = useLedger((s) => s.categories);
  const isDemo = useLedger((s) => s.isDemo);
  const keepDemoData = useLedger((s) => s.keepDemoData);
  const clearAndStart = useLedger((s) => s.clearAndStart);

  const income = sumBy(transactions, month, "income");
  const expense = sumBy(transactions, month, "expense");
  const balance = income - expense;
  const cats = categoryTotals(transactions, month, "expense", categories).slice(0, 5);
  const maxCat = cats[0]?.total ?? 1;
  const recent = [...transactions]
    .filter((tx) => tx.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {isDemo ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-accent px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-accent-foreground">
            กำลังแสดงข้อมูลตัวอย่าง — ล้างแล้วเริ่มสมุดของคุณ หรือใช้ตัวเลขนี้ต่อ
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={keepDemoData}>
              ใช้ต่อ
            </Button>
            <Button type="button" size="sm" onClick={clearAndStart}>
              เริ่มใหม่
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
              รายรับ
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-income">
              {formatBaht(income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowUpRight className="size-3.5 text-expense" />
              รายจ่าย
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-expense">
              {formatBaht(expense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">คงเหลือเดือนนี้</p>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-semibold tabular-nums",
                balance >= 0 ? "text-foreground" : "text-expense",
              )}
            >
              {formatBaht(balance)}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <Button asChild>
          <Link to="/new">
            <Plus />
            เพิ่มรายการ
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/new" search={{ slip: true }}>
            <Camera />
            อ่านสลิป
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">หมวดรายจ่าย</h2>
              <Link to="/reports" className="text-sm text-primary hover:underline">
                ดูรายงาน
              </Link>
            </div>
            {cats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีรายจ่าย</p>
            ) : (
              <ul className="space-y-3">
                {cats.map((cat) => (
                  <li key={cat.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{cat.name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatBaht(cat.total)}</span>
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
              <h2 className="font-display text-lg font-semibold">รายการล่าสุด</h2>
              <Link to="/transactions" className="text-sm text-primary hover:underline">
                ทั้งหมด
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีรายการ</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((tx) => (
                  <li key={tx.id}>
                    <Link
                      to="/new"
                      search={{ id: tx.id }}
                      className="flex items-center gap-3 py-3 hover:bg-muted/40"
                    >
                      <CategoryGlyph id={tx.categoryId} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{tx.payee}</p>
                        <p className="text-xs text-muted-foreground">{formatThaiDateShort(tx.date)}</p>
                      </div>
                      <p
                        className={cn(
                          "tabular-nums font-medium",
                          tx.type === "income" ? "text-income" : "text-foreground",
                        )}
                      >
                        {formatSignedBaht(tx.type, tx.amount)}
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
