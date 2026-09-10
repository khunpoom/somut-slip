import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n-hook";
import { categoryTotals, formatBaht, lastMonths, monthShortTitle, sumBy } from "@/lib/ledger/format";
import type { Category, Transaction } from "@/lib/ledger/types";

function ChartFrame({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <Skeleton className="h-56 w-full" />;
  return <div className="h-56 w-full">{children}</div>;
}

function barFill(index: number) {
  const mix = Math.max(28, 100 - index * 14);
  return `color-mix(in oklab, var(--color-primary) ${mix}%, var(--color-border))`;
}

export function TrendChart({ txs, month }: { txs: Transaction[]; month: string }) {
  const { t, lang } = useT();
  const data = lastMonths(month, 6).map((key) => ({
    name: monthShortTitle(key, lang),
    income: sumBy(txs, key, "income"),
    expense: sumBy(txs, key, "expense"),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trendTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                formatter={(value) => formatBaht(Number(value ?? 0), false, lang)}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="income" name={t("income")} fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="expense"
                name={t("expense")}
                fill="var(--color-expense)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

export function CategoryChart({
  txs,
  month,
  categories,
}: {
  txs: Transaction[];
  month: string;
  categories: Category[];
}) {
  const { t, lang } = useT();
  const rows = categoryTotals(txs, month, "expense", categories, lang).slice(0, 6);
  const data = rows.map((row) => ({ name: row.name, total: row.total }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("catChart")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("noExpenseMonth")}</p>
        ) : (
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={108}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => formatBaht(Number(value ?? 0), false, lang)}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="total" name={t("expense")} radius={[0, 6, 6, 0]}>
                  {data.map((row, i) => (
                    <Cell key={row.name} fill={barFill(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}
      </CardContent>
    </Card>
  );
}
