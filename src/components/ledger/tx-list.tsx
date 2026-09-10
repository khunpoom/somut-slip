import { Link } from "@tanstack/react-router";
import { Repeat, ScanLine, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryGlyph } from "@/components/ledger/icons";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { categoryLabel } from "@/lib/i18n";
import { useT } from "@/lib/i18n-hook";
import {
  formatBaht,
  formatSignedBaht,
  formatThaiDateShort,
  groupByDate,
  weekdayThai,
} from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";
import type { CategoryId, TxType } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

export function TransactionList({ month }: { month: string }) {
  const { t, lang } = useT();
  const transactions = useLedger((s) => s.transactions);
  const categories = useLedger((s) => s.categories);
  const wallets = useLedger((s) => s.wallets);
  const members = useLedger((s) => s.members);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | TxType>("all");
  const [category, setCategory] = useState<"all" | CategoryId>("all");
  const [wallet, setWallet] = useState<"all" | string>("all");
  const [member, setMember] = useState<"all" | string>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return transactions
      .filter((tx) => tx.date.startsWith(month))
      .filter((tx) => (type === "all" ? true : tx.type === type))
      .filter((tx) => (category === "all" ? true : tx.categoryId === category))
      .filter((tx) =>
        wallet === "all" ? true : tx.walletId === wallet || tx.toWalletId === wallet,
      )
      .filter((tx) => (member === "all" ? true : tx.memberId === member))
      .filter((tx) => {
        if (!query) return true;
        return `${tx.payee} ${tx.note} ${tx.ref ?? ""}`.toLowerCase().includes(query);
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transactions, month, q, type, category, wallet, member]);

  const grouped = groupByDate(filtered);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPh")}
            className="pl-9"
          />
        </div>
        <NativeSelect value={type} onChange={(e) => setType(e.target.value as "all" | TxType)}>
          <option value="all">{t("filterAll")}</option>
          <option value="expense">{t("expense")}</option>
          <option value="income">{t("income")}</option>
          <option value="transfer">{t("transfer")}</option>
        </NativeSelect>
        <NativeSelect
          value={category}
          onChange={(e) => setCategory(e.target.value as "all" | CategoryId)}
        >
          <option value="all">{t("filterCat")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryLabel(c.id, c.name, lang)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={wallet} onChange={(e) => setWallet(e.target.value)}>
          <option value="all">{t("filterWallet")}</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={member} onChange={(e) => setMember(e.target.value)}>
          <option value="all">{t("filterMember")}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-lg">{t("emptyMonth")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyMonthHint")}</p>
          <Link
            to="/new"
            search={{ slip: true }}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {t("readSlip")}
          </Link>
        </div>
      ) : (
        grouped.map(([date, rows]) => (
          <section key={date} className="space-y-2">
            <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {weekdayThai(date, lang)} · {formatThaiDateShort(date, lang)}
            </p>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {rows.map((tx, i) => (
                <li key={tx.id} className={cn(i > 0 && "border-t border-border")}>
                  <Link
                    to="/new"
                    search={{ id: tx.id }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60"
                  >
                    <CategoryGlyph id={tx.type === "transfer" ? "transfer" : tx.categoryId} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{tx.payee}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tx.type === "transfer"
                          ? t("transfer")
                          : categoryLabel(
                              tx.categoryId,
                              categories.find((c) => c.id === tx.categoryId)?.name ?? "",
                              lang,
                            )}
                        {tx.source === "slip" ? ` · ${t("fromSlip")}` : ""}
                        {tx.source === "recurring" ? ` · ${t("fromRecurring")}` : ""}
                        {tx.memberId
                          ? ` · ${members.find((m) => m.id === tx.memberId)?.name ?? ""}`
                          : ""}
                      </p>
                    </div>
                    {tx.source === "slip" ? (
                      <ScanLine className="size-3.5 text-muted-foreground" />
                    ) : null}
                    {tx.source === "recurring" ? (
                      <Repeat className="size-3.5 text-muted-foreground" />
                    ) : null}
                    <p
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        tx.type === "income"
                          ? "text-income"
                          : tx.type === "transfer"
                            ? "text-transfer"
                            : "text-foreground",
                      )}
                    >
                      {tx.type === "transfer"
                        ? `⇄ ${formatBaht(tx.amount, false, lang)}`
                        : formatSignedBaht(tx.type, tx.amount, lang)}
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
