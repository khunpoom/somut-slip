import { Link } from "@tanstack/react-router";
import { ScanLine, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryGlyph } from "@/components/ledger/icons";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  formatSignedBaht,
  formatThaiDateShort,
  groupByDate,
  weekdayThai,
} from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";
import type { CategoryId, TxType } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

export function TransactionList({ month }: { month: string }) {
  const transactions = useLedger((s) => s.transactions);
  const categories = useLedger((s) => s.categories);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | TxType>("all");
  const [category, setCategory] = useState<"all" | CategoryId>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return transactions
      .filter((tx) => tx.date.startsWith(month))
      .filter((tx) => (type === "all" ? true : tx.type === type))
      .filter((tx) => (category === "all" ? true : tx.categoryId === category))
      .filter((tx) => {
        if (!query) return true;
        return `${tx.payee} ${tx.note}`.toLowerCase().includes(query);
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transactions, month, q, type, category]);

  const grouped = groupByDate(filtered);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาร้านค้า"
            className="pl-9"
          />
        </div>
        <NativeSelect value={type} onChange={(e) => setType(e.target.value as "all" | TxType)}>
          <option value="all">ทุกรายการ</option>
          <option value="expense">รายจ่าย</option>
          <option value="income">รายรับ</option>
        </NativeSelect>
        <NativeSelect
          value={category}
          onChange={(e) => setCategory(e.target.value as "all" | CategoryId)}
        >
          <option value="all">ทุกหมวด</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-lg">ยังไม่มีรายการเดือนนี้</p>
          <p className="mt-1 text-sm text-muted-foreground">เพิ่มรายการมือ หรืออ่านจากสลิป</p>
          <Link
            to="/new"
            search={{ slip: true }}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            อ่านสลิป
          </Link>
        </div>
      ) : (
        grouped.map(([date, rows]) => (
          <section key={date} className="space-y-2">
            <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {weekdayThai(date)} · {formatThaiDateShort(date)}
            </p>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {rows.map((tx, i) => (
                <li key={tx.id} className={cn(i > 0 && "border-t border-border")}>
                  <Link
                    to="/new"
                    search={{ id: tx.id }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60"
                  >
                    <CategoryGlyph id={tx.categoryId} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{tx.payee}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {categories.find((c) => c.id === tx.categoryId)?.name}
                        {tx.source === "slip" ? " · จากสลิป" : ""}
                      </p>
                    </div>
                    {tx.source === "slip" ? (
                      <ScanLine className="size-3.5 text-muted-foreground" />
                    ) : null}
                    <p
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        tx.type === "income" ? "text-income" : "text-foreground",
                      )}
                    >
                      {formatSignedBaht(tx.type, tx.amount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
