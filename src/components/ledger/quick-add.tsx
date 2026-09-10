import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { categoryLabel } from "@/lib/i18n";
import { useT } from "@/lib/i18n-hook";
import { categoriesForType, pickCategoryId, todayIso } from "@/lib/ledger/defaults";
import { parseBahtInput } from "@/lib/ledger/format";
import { matchRule } from "@/lib/ledger/rules";
import { useLedger } from "@/lib/ledger/store";
import type { MoneyType } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

export function QuickAdd() {
  const { t, lang } = useT();
  const wallets = useLedger((s) => s.wallets);
  const members = useLedger((s) => s.members);
  const allCategories = useLedger((s) => s.categories);
  const rules = useLedger((s) => s.rules);
  const addTransaction = useLedger((s) => s.addTransaction);
  const [type, setType] = useState<MoneyType>("expense");
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [categoryId, setCategoryId] = useState(() => pickCategoryId(allCategories, "expense"));
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "cash");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");

  const categories = useMemo(
    () => categoriesForType(allCategories, type),
    [allCategories, type],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseBahtInput(amount);
    if (n == null || n <= 0) {
      toast.error(t("invalidAmount"));
      return;
    }
    const rule = matchRule(rules, payee);
    addTransaction({
      type,
      amount: n,
      date: todayIso(),
      categoryId: rule?.categoryId ?? categoryId,
      walletId: rule?.walletId ?? walletId,
      memberId: memberId || undefined,
      payee: payee.trim() || (type === "income" ? t("defaultPayeeIn") : t("defaultPayeeOut")),
      note: "",
      source: "quick",
    });
    setAmount("");
    setPayee("");
    toast.success(t("savedTx"));
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{t("quickAdd")}</h2>
          <p className="text-xs text-muted-foreground">{t("quickHint")}</p>
        </div>
        <form onSubmit={submit} className="space-y-2">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
            {(["expense", "income"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setType(item);
                  setCategoryId(pickCategoryId(allCategories, item));
                }}
                className={cn(
                  "h-10 rounded-sm text-sm font-medium transition-colors duration-150",
                  type === item
                    ? item === "income"
                      ? "bg-income text-income-foreground"
                      : "bg-expense text-expense-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(item)}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              ฿
            </span>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="h-12 pl-8 font-display text-xl font-semibold tabular-nums"
              aria-label={t("amount")}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={payee}
              onChange={(e) => {
                const next = e.target.value;
                setPayee(next);
                const rule = matchRule(rules, next);
                if (rule) {
                  setCategoryId(rule.categoryId);
                  if (rule.walletId) setWalletId(rule.walletId);
                }
              }}
              placeholder={type === "income" ? t("payeePlaceholderIn") : t("payeePlaceholderOut")}
            />
            <NativeSelect
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-label={t("category")}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c.id, c.name, lang)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              aria-label={t("wallet")}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              aria-label={t("member")}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            {t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
