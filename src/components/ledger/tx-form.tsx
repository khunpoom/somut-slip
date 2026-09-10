import { useNavigate } from "@tanstack/react-router";
import { Camera, LoaderCircle, ScanLine, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabel } from "@/lib/i18n";
import { useT } from "@/lib/i18n-hook";
import {
  categoriesForType,
  pickCategoryId,
  todayIso,
  TRANSFER_CATEGORY_ID,
} from "@/lib/ledger/defaults";
import { parseBahtInput } from "@/lib/ledger/format";
import { prepareSlipImage } from "@/lib/ledger/image";
import { parseSlipImage } from "@/lib/ledger/parse-slip";
import { matchRule } from "@/lib/ledger/rules";
import { useLedger } from "@/lib/ledger/store";
import type { CategoryId, MoneyType, Transaction, TxType } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

type FormState = {
  type: TxType;
  amount: string;
  date: string;
  categoryId: CategoryId;
  walletId: string;
  toWalletId: string;
  memberId: string;
  payee: string;
  note: string;
  ref: string;
  source: Transaction["source"];
  slipThumb?: string;
};

function emptyForm(
  type: TxType,
  walletId: string,
  toWalletId: string,
  categoryId: string,
  memberId: string,
): FormState {
  return {
    type,
    amount: "",
    date: todayIso(),
    categoryId,
    walletId,
    toWalletId,
    memberId,
    payee: "",
    note: "",
    ref: "",
    source: "manual",
  };
}

function fromTx(tx: Transaction, fallbackTo: string): FormState {
  return {
    type: tx.type,
    amount: String(tx.amount),
    date: tx.date,
    categoryId: tx.categoryId,
    walletId: tx.walletId,
    toWalletId: tx.toWalletId ?? fallbackTo,
    memberId: tx.memberId ?? "",
    payee: tx.payee,
    note: tx.note,
    ref: tx.ref ?? "",
    source: tx.source,
    slipThumb: tx.slipThumb,
  };
}

export function TransactionForm({
  editing,
  startWithSlip = false,
  defaultType = "expense",
}: {
  editing?: Transaction;
  startWithSlip?: boolean;
  defaultType?: MoneyType;
}) {
  const navigate = useNavigate();
  const { t, lang } = useT();
  const wallets = useLedger((s) => s.wallets);
  const members = useLedger((s) => s.members);
  const allCategories = useLedger((s) => s.categories);
  const rules = useLedger((s) => s.rules);
  const addTransaction = useLedger((s) => s.addTransaction);
  const updateTransaction = useLedger((s) => s.updateTransaction);
  const defaultWallet = wallets[0]?.id ?? "cash";
  const defaultTo = wallets[1]?.id ?? wallets[0]?.id ?? "bank";

  const [form, setForm] = useState<FormState>(() =>
    editing
      ? fromTx(editing, defaultTo)
      : emptyForm(
          defaultType,
          defaultWallet,
          defaultTo,
          pickCategoryId(allCategories, defaultType),
          members[0]?.id ?? "",
        ),
  );
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(editing?.slipThumb);
  const [slipOpen, setSlipOpen] = useState(startWithSlip && !editing);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setForm(fromTx(editing, defaultTo));
  }, [editing, defaultTo]);

  const categories = useMemo(
    () => (form.type === "transfer" ? [] : categoriesForType(allCategories, form.type)),
    [allCategories, form.type],
  );

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function applyPayee(payee: string, extra: Partial<FormState> = {}) {
    const rule = matchRule(rules, payee);
    patch({
      payee,
      ...(rule
        ? {
            categoryId: rule.categoryId,
            ...(rule.walletId ? { walletId: rule.walletId } : {}),
          }
        : {}),
      ...extra,
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    try {
      const prepared = await prepareSlipImage(file);
      setPreview(prepared.thumb);
      const result = await parseSlipImage({ data: { imageDataUrl: prepared.dataUrl } });
      if (!result.ok) {
        patch({ source: "slip", slipThumb: prepared.thumb });
        toast.error(result.error);
        return;
      }
      const slip = result.slip;
      const nextType = slip.type;
      const rule = matchRule(rules, slip.payee ?? "");
      const categoryId =
        rule?.categoryId ?? pickCategoryId(allCategories, nextType, slip.categoryHint);
      const noteBits = [slip.bank, slip.time ? `เวลา ${slip.time}` : null].filter(Boolean);
      patch({
        type: nextType,
        amount: slip.amount != null ? String(slip.amount) : "",
        date: slip.date ?? todayIso(),
        categoryId,
        walletId: rule?.walletId ?? form.walletId,
        payee: slip.payee ?? "",
        note: [slip.note, ...noteBits].filter(Boolean).join(" · "),
        ref: slip.ref ?? "",
        source: "slip",
        slipThumb: prepared.thumb,
      });
      const conf = Math.round(slip.confidence * 100);
      if (slip.amount == null) {
        toast.message(t("slipPartial"));
      } else {
        toast.success(conf ? t("slipOkP", { n: conf }) : t("slipOk"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("slipPartial"));
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseBahtInput(form.amount);
    if (amount == null || amount <= 0) {
      toast.error(t("invalidAmount"));
      return;
    }
    if (!form.date) {
      toast.error(t("pickDate"));
      return;
    }
    if (form.type === "transfer" && form.walletId === form.toWalletId) {
      toast.error(t("sameWallet"));
      return;
    }
    const toName = wallets.find((w) => w.id === form.toWalletId)?.name ?? "";
    const draft = {
      type: form.type,
      amount,
      date: form.date,
      categoryId: form.type === "transfer" ? TRANSFER_CATEGORY_ID : form.categoryId,
      walletId: form.walletId || defaultWallet,
      toWalletId: form.type === "transfer" ? form.toWalletId : undefined,
      memberId: form.memberId || undefined,
      payee:
        form.payee.trim() ||
        (form.type === "income"
          ? t("defaultPayeeIn")
          : form.type === "transfer"
            ? `${t("defaultPayeeTransfer")} → ${toName}`
            : t("defaultPayeeOut")),
      note: form.note.trim(),
      ref: form.ref.trim() || undefined,
      source: form.source,
      slipThumb: form.slipThumb,
    };
    if (editing) {
      updateTransaction(editing.id, draft);
      toast.success(t("savedEdit"));
    } else {
      addTransaction(draft);
      toast.success(t("savedTx"));
    }
    void navigate({ to: "/" });
  }

  const types: TxType[] = ["expense", "income", "transfer"];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              if (type === "transfer") {
                patch({ type, categoryId: TRANSFER_CATEGORY_ID });
                return;
              }
              const keep = categoriesForType(allCategories, type).some(
                (c) => c.id === form.categoryId,
              );
              patch({
                type,
                categoryId: keep ? form.categoryId : pickCategoryId(allCategories, type),
              });
            }}
            className={cn(
              "h-11 rounded-md text-sm font-medium transition-colors duration-150",
              form.type === type
                ? type === "income"
                  ? "bg-income text-income-foreground"
                  : type === "transfer"
                    ? "bg-transfer text-transfer-foreground"
                    : "bg-expense text-expense-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(type)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">{t("amount")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-2xl text-muted-foreground">
                ฿
              </span>
              <Input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={form.amount}
                onChange={(e) => patch({ amount: e.target.value })}
                className="h-16 pl-12 font-display text-3xl font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">{t("date")}</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            {form.type !== "transfer" ? (
              <div className="space-y-2">
                <Label htmlFor="category">{t("category")}</Label>
                <NativeSelect
                  id="category"
                  value={form.categoryId}
                  onChange={(e) => patch({ categoryId: e.target.value as CategoryId })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryLabel(c.id, c.name, lang)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="payee">
                {form.type === "income"
                  ? t("payeeIncome")
                  : form.type === "transfer"
                    ? t("note")
                    : t("payeeExpense")}
              </Label>
              <Input
                id="payee"
                value={form.payee}
                placeholder={
                  form.type === "income" ? t("payeePlaceholderIn") : t("payeePlaceholderOut")
                }
                onChange={(e) => applyPayee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet">{form.type === "transfer" ? t("fromWallet") : t("wallet")}</Label>
              <NativeSelect
                id="wallet"
                value={form.walletId}
                onChange={(e) => patch({ walletId: e.target.value })}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {form.type === "transfer" ? (
              <div className="space-y-2">
                <Label htmlFor="toWallet">{t("toWallet")}</Label>
                <NativeSelect
                  id="toWallet"
                  value={form.toWalletId}
                  onChange={(e) => patch({ toWalletId: e.target.value })}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="member">{t("member")}</Label>
              <NativeSelect
                id="member"
                value={form.memberId}
                onChange={(e) => patch({ memberId: e.target.value })}
              >
                <option value="">{t("memberNone")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("note")}</Label>
            <Textarea
              id="note"
              rows={2}
              value={form.note}
              placeholder={t("notePh")}
              onChange={(e) => patch({ note: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {form.type !== "transfer" ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{t("slipCard")}</p>
                <p className="text-sm text-muted-foreground">{t("slipCardHint")}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSlipOpen((v) => !v)}>
                <ScanLine />
                {slipOpen ? t("hide") : t("open")}
              </Button>
            </div>

            {slipOpen ? (
              <div className="space-y-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void onFile(e.dataTransfer.files?.[0]);
                  }}
                  className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/50 px-4 py-6 text-center transition-colors hover:bg-muted"
                >
                  {reading ? (
                    <>
                      <LoaderCircle className="size-6 animate-spin text-primary" />
                      <p className="text-sm font-medium">{t("slipReading")}</p>
                    </>
                  ) : preview ? (
                    <div className="relative">
                      <img
                        src={preview}
                        alt={t("slipAlt")}
                        className="max-h-48 rounded-md object-contain"
                      />
                      <span className="mt-2 block text-sm text-muted-foreground">{t("slipChange")}</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="size-6 text-primary" />
                      <p className="text-sm font-medium">{t("slipDrop")}</p>
                      <p className="text-xs text-muted-foreground">{t("slipSupport")}</p>
                    </>
                  )}
                </button>
                {preview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreview(undefined);
                      patch({ slipThumb: undefined, source: "manual" });
                    }}
                  >
                    <X />
                    {t("slipRemove")}
                  </Button>
                ) : null}
              </div>
            ) : preview ? (
              <img src={preview} alt={t("slipAlt")} className="max-h-28 rounded-md object-contain" />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => void navigate({ to: "/" })}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={reading}>
          {editing ? t("save") : t("save")}
        </Button>
      </div>
    </form>
  );
}
