import { createFileRoute } from "@tanstack/react-router";
import { Download, Monitor, Moon, ScanLine, Sun, Upload } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { categoryLabel } from "@/lib/i18n";
import { useT } from "@/lib/i18n-hook";
import { FALLBACK_CATEGORY_ID, TRANSFER_CATEGORY_ID } from "@/lib/ledger/defaults";
import { formatBaht } from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";
import type { CategoryKind, Lang, LedgerSnapshot, ThemeMode, WalletKind } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function SettingsPage() {
  const { t, lang } = useT();
  const wallets = useLedger((s) => s.wallets);
  const categories = useLedger((s) => s.categories);
  const transactions = useLedger((s) => s.transactions);
  const rules = useLedger((s) => s.rules);
  const theme = useLedger((s) => s.theme);
  const setLang = useLedger((s) => s.setLang);
  const setTheme = useLedger((s) => s.setTheme);
  const geminiKey = useLedger((s) => s.geminiKey);
  const setGeminiKey = useLedger((s) => s.setGeminiKey);
  const addWallet = useLedger((s) => s.addWallet);
  const updateWallet = useLedger((s) => s.updateWallet);
  const removeWallet = useLedger((s) => s.removeWallet);
  const addCategory = useLedger((s) => s.addCategory);
  const updateCategory = useLedger((s) => s.updateCategory);
  const removeCategory = useLedger((s) => s.removeCategory);
  const addRule = useLedger((s) => s.addRule);
  const removeRule = useLedger((s) => s.removeRule);
  const exportSnapshot = useLedger((s) => s.exportSnapshot);
  const replaceAll = useLedger((s) => s.replaceAll);
  const restoreDemo = useLedger((s) => s.restoreDemo);
  const clearAndStart = useLedger((s) => s.clearAndStart);
  const [walletName, setWalletName] = useState("");
  const [walletKind, setWalletKind] = useState<WalletKind>("bank");
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<CategoryKind>("expense");
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCat, setRuleCat] = useState("food");
  const [geminiDraft, setGeminiDraft] = useState(geminiKey);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGeminiDraft(geminiKey);
  }, [geminiKey]);

  function exportJson() {
    const snap = exportSnapshot();
    download(
      `somut-slip-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(snap, null, 2),
      "application/json",
    );
    toast.success(t("exported"));
  }

  function exportCsv() {
    const header = ["date", "type", "amount", "category", "payee", "wallet", "member", "note", "ref"];
    const members = useLedger.getState().members;
    const lines = transactions.map((tx) =>
      [
        tx.date,
        tx.type,
        String(tx.amount),
        categoryLabel(tx.categoryId, categories.find((c) => c.id === tx.categoryId)?.name ?? "", lang),
        tx.payee,
        wallets.find((w) => w.id === tx.walletId)?.name ?? "",
        members.find((m) => m.id === tx.memberId)?.name ?? "",
        tx.note,
        tx.ref ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
    download(
      `somut-slip-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${header.join(",")}\n${lines.join("\n")}`,
      "text/csv;charset=utf-8",
    );
    toast.success(t("exported"));
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as LedgerSnapshot;
      if (!Array.isArray(parsed.transactions)) throw new Error("invalid");
      replaceAll({
        version: 2,
        transactions: parsed.transactions,
        wallets: parsed.wallets ?? wallets,
        categories: parsed.categories ?? categories,
        members: parsed.members ?? useLedger.getState().members,
        recurring: parsed.recurring ?? [],
        debts: parsed.debts ?? [],
        goals: parsed.goals ?? [],
        rules: parsed.rules ?? rules,
        lang: parsed.lang ?? lang,
        theme: parsed.theme ?? theme,
        isDemo: Boolean(parsed.isDemo),
        initialized: true,
      });
      toast.success(t("imported"));
    } catch {
      toast.error(t("badFile"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const cashflow = transactions.reduce((s, tx) => {
    if (tx.type === "income") return s + tx.amount;
    if (tx.type === "expense") return s + tx.amount;
    return s;
  }, 0);

  const themes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: "paper", label: t("themePaper"), icon: Sun },
    { id: "night", label: t("themeNight"), icon: Moon },
    { id: "system", label: t("themeSystem"), icon: Monitor },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold">{t("settings")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settingsHint")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">{t("language")}</p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
              {(["th", "en"] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={cn(
                    "h-11 rounded-md text-sm font-medium transition-colors duration-150",
                    lang === code
                      ? "bg-card text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {code === "th" ? t("langTh") : t("langEn")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t("theme")}</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
              {themes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id)}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150",
                      theme === item.id
                        ? "bg-card text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("cats")}</CardTitle>
          <CardDescription>{t("catsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {categories
              .filter((c) => c.id !== TRANSFER_CATEGORY_ID)
              .map((category) => (
                <li
                  key={category.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center"
                >
                  <Input
                    defaultValue={categoryLabel(category.id, category.name, lang)}
                    onBlur={(e) => updateCategory(category.id, { name: e.target.value })}
                    className="h-10 sm:flex-1"
                    aria-label={category.name}
                  />
                  <div className="sm:w-36">
                    <NativeSelect
                      className="h-10"
                      value={category.type}
                      onChange={(e) =>
                        updateCategory(category.id, { type: e.target.value as CategoryKind })
                      }
                    >
                      <option value="expense">{t("catExpense")}</option>
                      <option value="income">{t("catIncome")}</option>
                      <option value="both">{t("catBoth")}</option>
                    </NativeSelect>
                  </div>
                  {category.id === FALLBACK_CATEGORY_ID ? (
                    <span className="h-10 px-2 text-xs leading-10 text-muted-foreground">
                      {t("undeletable")}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(category.id)}
                    >
                      {t("delete")}
                    </Button>
                  )}
                </li>
              ))}
          </ul>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!categoryName.trim()) {
                toast.error(t("catNeedName"));
                return;
              }
              if (!addCategory(categoryName, categoryKind)) {
                toast.error(t("catDup"));
                return;
              }
              toast.success(t("catAdded"));
              setCategoryName("");
            }}
          >
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={t("catPh")}
            />
            <div className="sm:w-36">
              <NativeSelect
                value={categoryKind}
                onChange={(e) => setCategoryKind(e.target.value as CategoryKind)}
              >
                <option value="expense">{t("catExpense")}</option>
                <option value="income">{t("catIncome")}</option>
                <option value="both">{t("catBoth")}</option>
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              {t("addCat")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("wallets")}</CardTitle>
          <CardDescription>{t("walletsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {wallets.map((wallet) => (
              <li key={wallet.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                <Input
                  defaultValue={wallet.name}
                  onBlur={(e) => updateWallet(wallet.id, { name: e.target.value })}
                  className="h-10 sm:flex-1"
                />
                <div className="sm:w-40">
                  <NativeSelect
                    className="h-10"
                    value={wallet.kind}
                    onChange={(e) =>
                      updateWallet(wallet.id, { kind: e.target.value as WalletKind })
                    }
                  >
                    <option value="cash">{t("kindCash")}</option>
                    <option value="bank">{t("kindBank")}</option>
                    <option value="credit_card">{t("kindCard")}</option>
                    <option value="ewallet">{t("kindWallet")}</option>
                  </NativeSelect>
                </div>
                {wallets.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWallet(wallet.id)}
                  >
                    {t("delete")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!walletName.trim()) {
                toast.error(t("needCatName"));
                return;
              }
              addWallet(walletName, walletKind);
              setWalletName("");
              toast.success(t("walletAdded"));
            }}
          >
            <Input
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder={t("walletNamePh")}
            />
            <div className="sm:w-40">
              <NativeSelect
                value={walletKind}
                onChange={(e) => setWalletKind(e.target.value as WalletKind)}
              >
                <option value="cash">{t("kindCash")}</option>
                <option value="bank">{t("kindBank")}</option>
                <option value="credit_card">{t("kindCard")}</option>
                <option value="ewallet">{t("kindWallet")}</option>
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              {t("add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("rules")}</CardTitle>
          <CardDescription>{t("rulesHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRules")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-center gap-2 px-3 py-2">
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium">{rule.pattern}</span>
                    <span className="text-muted-foreground">
                      {" → "}
                      {categoryLabel(
                        rule.categoryId,
                        categories.find((c) => c.id === rule.categoryId)?.name ?? "",
                        lang,
                      )}
                    </span>
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeRule(rule.id)}>
                    {t("delete")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!addRule(rulePattern, ruleCat)) {
                toast.error(t("needCatName"));
                return;
              }
              setRulePattern("");
              toast.success(t("ruleAdded"));
            }}
          >
            <Input
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              placeholder={t("rulePatternPh")}
            />
            <div className="sm:w-44">
              <NativeSelect value={ruleCat} onChange={(e) => setRuleCat(e.target.value)}>
                {categories
                  .filter((c) => c.id !== TRANSFER_CATEGORY_ID)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryLabel(c.id, c.name, lang)}
                    </option>
                  ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              {t("add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="size-4" />
            {t("ocrTitle")}
          </CardTitle>
          <CardDescription>{t("ocrHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            {geminiKey ? t("ocrHasKey") : t("ocrLocal")}
          </p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setGeminiKey(geminiDraft);
              toast.success(geminiDraft.trim() ? t("ocrGeminiSaved") : t("ocrGeminiCleared"));
            }}
          >
            <Input
              type="password"
              autoComplete="off"
              value={geminiDraft}
              onChange={(e) => setGeminiDraft(e.target.value)}
              placeholder={t("ocrGeminiPh")}
              aria-label={t("ocrGemini")}
            />
            <Button type="submit" variant="outline">
              {t("save")}
            </Button>
          </form>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-primary hover:underline"
          >
            {t("ocrGetKey")}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("backup")}</CardTitle>
          <CardDescription>
            {t("backupHint", {
              n: transactions.length,
              amount: formatBaht(cashflow, false, lang),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={exportJson}>
            <Download />
            {t("exportJson")}
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download />
            {t("exportCsv")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => void importJson(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload />
            {t("importJson")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("desktop")}</CardTitle>
          <CardDescription>{t("desktopHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild>
            <a href="/SomutSlip.exe" download>
              <Download />
              {t("downloadExe")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/somut-slip.bat" download>
              <Download />
              {t("downloadBat")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("about")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{t("aboutBody")}</p>
          <p>{t("aboutBody2")}</p>
          <a
            href="https://github.com/khunpoom/somut-slip"
            className="inline-block text-primary hover:underline"
          >
            {t("github")}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("bookData")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={restoreDemo}>
            {t("loadDemo")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                {t("wipe")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("wipeQ")}</AlertDialogTitle>
                <AlertDialogDescription>{t("wipeHint")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    clearAndStart();
                    toast.success(t("wiped"));
                  }}
                >
                  {t("wipe")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
