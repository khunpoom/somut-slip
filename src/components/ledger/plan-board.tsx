import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { categoryLabel, FREQ_KEY } from "@/lib/i18n";
import { useT } from "@/lib/i18n-hook";
import { categoriesForType, todayIso } from "@/lib/ledger/defaults";
import { formatBaht, formatThaiDateShort, parseBahtInput, sumBy } from "@/lib/ledger/format";
import { monthlySubscriptionTotal } from "@/lib/ledger/rules";
import { useLedger } from "@/lib/ledger/store";
import type { MoneyType, RecurringFreq } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

type Tab = "recurring" | "debts" | "goals" | "family";

export function PlanBoard() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("recurring");
  const tabs: { id: Tab; label: string }[] = [
    { id: "recurring", label: t("tabRecurring") },
    { id: "debts", label: t("tabDebts") },
    { id: "goals", label: t("tabGoals") },
    { id: "family", label: t("tabFamily") },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold">{t("plan")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("planHint")}</p>
      </header>
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-secondary p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-11 rounded-md px-1 text-xs font-medium transition-colors duration-150 sm:text-sm",
              tab === item.id
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "recurring" ? <RecurringPanel /> : null}
      {tab === "debts" ? <DebtPanel /> : null}
      {tab === "goals" ? <GoalPanel /> : null}
      {tab === "family" ? <FamilyPanel /> : null}
    </div>
  );
}

function RecurringPanel() {
  const { t, lang } = useT();
  const items = useLedger((s) => s.recurring);
  const wallets = useLedger((s) => s.wallets);
  const categories = useLedger((s) => s.categories);
  const members = useLedger((s) => s.members);
  const addRecurring = useLedger((s) => s.addRecurring);
  const updateRecurring = useLedger((s) => s.updateRecurring);
  const removeRecurring = useLedger((s) => s.removeRecurring);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<MoneyType>("expense");
  const [freq, setFreq] = useState<RecurringFreq>("monthly");
  const [day, setDay] = useState("1");
  const [categoryId, setCategoryId] = useState("bills");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "bank");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [isSub, setIsSub] = useState(true);
  const subTotal = monthlySubscriptionTotal(items);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("recurringHint")}</p>
      {subTotal > 0 ? (
        <p className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
          {t("subTotal", { amount: formatBaht(subTotal, false, lang) })}
        </p>
      ) : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBaht(item.amount, false, lang)} · {t(FREQ_KEY[item.frequency])}
                  {item.isSubscription ? ` · ${t("isSub")}` : ""} ·{" "}
                  {t("nextBill", { date: formatThaiDateShort(item.nextDate, lang) })}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateRecurring(item.id, { active: !item.active })}
                >
                  {item.active ? t("pause") : t("resume")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeRecurring(item.id)}>
                  {t("delete")}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader>
          <CardTitle>{t("add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseBahtInput(amount);
              if (!name.trim()) {
                toast.error(t("needCatName"));
                return;
              }
              if (n == null || n <= 0) {
                toast.error(t("invalidAmount"));
                return;
              }
              const dayNum = Math.min(28, Math.max(1, Number(day) || 1));
              const [y, m] = todayIso().split("-").map(Number);
              const nextDate = `${y}-${String(m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              addRecurring({
                name: name.trim(),
                type: kind,
                amount: n,
                categoryId,
                walletId,
                memberId: memberId || undefined,
                frequency: freq,
                dayOfMonth: dayNum,
                nextDate: nextDate < todayIso() ? nextDate.replace(/^\d{4}-\d{2}/, (p) => {
                  const [yy, mm] = p.split("-").map(Number);
                  const d = new Date(yy, mm, dayNum);
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                }) : nextDate,
                isSubscription: isSub,
                active: true,
              });
              setName("");
              setAmount("");
              toast.success(t("recAdded"));
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("recNamePh")} />
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("amount")}
            />
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as MoneyType)}>
              <option value="expense">{t("expense")}</option>
              <option value="income">{t("income")}</option>
            </NativeSelect>
            <NativeSelect value={freq} onChange={(e) => setFreq(e.target.value as RecurringFreq)}>
              <option value="weekly">{t("freqWeekly")}</option>
              <option value="monthly">{t("freqMonthly")}</option>
              <option value="yearly">{t("freqYearly")}</option>
            </NativeSelect>
            <Input
              inputMode="numeric"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder={t("dayOfMonth")}
            />
            <NativeSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categoriesForType(categories, kind).map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c.id, c.name, lang)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
            <label className="flex h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSub}
                onChange={(e) => setIsSub(e.target.checked)}
                className="size-4 accent-primary"
              />
              {t("isSub")}
            </label>
            <Button type="submit">{t("add")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function DebtPanel() {
  const { t, lang } = useT();
  const debts = useLedger((s) => s.debts);
  const wallets = useLedger((s) => s.wallets);
  const addDebt = useLedger((s) => s.addDebt);
  const removeDebt = useLedger((s) => s.removeDebt);
  const payDebt = useLedger((s) => s.payDebt);
  const [name, setName] = useState("");
  const [lender, setLender] = useState("");
  const [total, setTotal] = useState("");
  const [due, setDue] = useState("");
  const [payId, setPayId] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payWallet, setPayWallet] = useState(wallets[0]?.id ?? "bank");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("debtHint")}</p>
      {debts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("noDebts")}
        </p>
      ) : (
        <ul className="space-y-2">
          {debts.map((debt) => {
            const pct = debt.total > 0 ? Math.min(100, ((debt.total - debt.remaining) / debt.total) * 100) : 0;
            return (
              <li key={debt.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{debt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {debt.lender}
                      {debt.dueDate ? ` · ${formatThaiDateShort(debt.dueDate, lang)}` : ""}
                    </p>
                  </div>
                  <p className="tabular-nums text-sm">
                    {debt.remaining <= 0
                      ? t("settled")
                      : `${formatBaht(debt.remaining, false, lang)} / ${formatBaht(debt.total, false, lang)}`}
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setPayId(debt.id)}>
                    {t("pay")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeDebt(debt.id)}>
                    {t("delete")}
                  </Button>
                </div>
                {payId === debt.id ? (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = parseBahtInput(payAmt);
                      if (n == null || n <= 0) {
                        toast.error(t("invalidAmount"));
                        return;
                      }
                      payDebt(debt.id, n, payWallet, todayIso());
                      setPayAmt("");
                      setPayId(null);
                      toast.success(t("debtPaid"));
                    }}
                  >
                    <Input
                      inputMode="decimal"
                      value={payAmt}
                      onChange={(e) => setPayAmt(e.target.value)}
                      placeholder={t("payAmount")}
                    />
                    <NativeSelect value={payWallet} onChange={(e) => setPayWallet(e.target.value)}>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button type="submit" size="sm">
                      {t("save")}
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseBahtInput(total);
              if (!name.trim() || n == null || n <= 0) {
                toast.error(t("needAmount"));
                return;
              }
              addDebt({
                name: name.trim(),
                lender: lender.trim(),
                total: n,
                remaining: n,
                dueDate: due || undefined,
                note: "",
              });
              setName("");
              setLender("");
              setTotal("");
              setDue("");
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("debtNamePh")} />
            <Input value={lender} onChange={(e) => setLender(e.target.value)} placeholder={t("lender")} />
            <Input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder={t("total")}
            />
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            <Button type="submit">{t("add")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalPanel() {
  const { t, lang } = useT();
  const goals = useLedger((s) => s.goals);
  const wallets = useLedger((s) => s.wallets);
  const addGoal = useLedger((s) => s.addGoal);
  const removeGoal = useLedger((s) => s.removeGoal);
  const contributeGoal = useLedger((s) => s.contributeGoal);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [giveId, setGiveId] = useState<string | null>(null);
  const [giveAmt, setGiveAmt] = useState("");
  const [giveWallet, setGiveWallet] = useState(wallets.find((w) => w.kind === "bank")?.id ?? wallets[0]?.id);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("goalHint")}</p>
      {goals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("noGoals")}
        </p>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
            return (
              <li key={goal.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {goal.deadline ? formatThaiDateShort(goal.deadline, lang) : t("tabGoals")}
                      {pct >= 100 ? ` · ${t("reached")}` : ""}
                    </p>
                  </div>
                  <p className="tabular-nums text-sm">
                    {formatBaht(goal.saved, false, lang)} / {formatBaht(goal.target, false, lang)}
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setGiveId(goal.id)}>
                    {t("contribute")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeGoal(goal.id)}>
                    {t("delete")}
                  </Button>
                </div>
                {giveId === goal.id ? (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = parseBahtInput(giveAmt);
                      if (n == null || n <= 0) {
                        toast.error(t("invalidAmount"));
                        return;
                      }
                      contributeGoal(goal.id, n, giveWallet, todayIso());
                      setGiveAmt("");
                      setGiveId(null);
                      toast.success(t("goalIn"));
                    }}
                  >
                    <Input
                      inputMode="decimal"
                      value={giveAmt}
                      onChange={(e) => setGiveAmt(e.target.value)}
                      placeholder={t("amount")}
                    />
                    <NativeSelect value={giveWallet} onChange={(e) => setGiveWallet(e.target.value)}>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button type="submit" size="sm">
                      {t("save")}
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseBahtInput(target);
              if (!name.trim() || n == null || n <= 0) {
                toast.error(t("needAmount"));
                return;
              }
              addGoal({ name: name.trim(), target: n, saved: 0, deadline: deadline || undefined, note: "" });
              setName("");
              setTarget("");
              setDeadline("");
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("goalNamePh")} />
            <Input
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={t("target")}
            />
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <Button type="submit">{t("add")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FamilyPanel() {
  const { t, lang } = useT();
  const members = useLedger((s) => s.members);
  const transactions = useLedger((s) => s.transactions);
  const month = useLedger((s) => s.selectedMonth);
  const addMember = useLedger((s) => s.addMember);
  const updateMember = useLedger((s) => s.updateMember);
  const removeMember = useLedger((s) => s.removeMember);
  const [name, setName] = useState("");
  const totals = members.map((m) => ({
    ...m,
    total: transactions
      .filter((tx) => tx.date.startsWith(month) && tx.type === "expense" && tx.memberId === m.id)
      .reduce((s, tx) => s + tx.amount, 0),
  }));
  const unassigned = transactions
    .filter((tx) => tx.date.startsWith(month) && tx.type === "expense" && !tx.memberId)
    .reduce((s, tx) => s + tx.amount, 0);
  const max = Math.max(1, ...totals.map((m) => m.total), unassigned);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("familyHint")}</p>
      <Card>
        <CardHeader>
          <CardTitle>{t("spendByMember")}</CardTitle>
          <CardDescription>{formatBaht(sumBy(transactions, month, "expense"), false, lang)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {totals.map((m) => (
            <div key={m.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{m.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatBaht(m.total, false, lang)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (m.total / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          {unassigned > 0 ? (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>{t("unassigned")}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatBaht(unassigned, false, lang)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-muted-foreground"
                  style={{ width: `${Math.max(4, (unassigned / max) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 px-3 py-2">
            <Input defaultValue={m.name} onBlur={(e) => updateMember(m.id, e.target.value)} className="h-10" />
            {members.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                {t("delete")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            toast.error(t("needCatName"));
            return;
          }
          addMember(name);
          setName("");
          toast.success(t("memberAdded"));
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("memberNamePh")} />
        <Button type="submit" variant="outline">
          {t("add")}
        </Button>
      </form>
    </div>
  );
}
