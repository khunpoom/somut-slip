import { categoryLabel } from "@/lib/i18n";
import { CATEGORIES } from "./defaults";
import type { Category, CategoryId, Lang, Transaction, TxType, Wallet } from "./types";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatBaht(n: number, compact = false, lang: Lang = "th") {
  const abs = Math.abs(n);
  const digits = Number.isInteger(abs) ? 0 : 2;
  const body = new Intl.NumberFormat(lang === "en" ? "en-US" : "th-TH", {
    minimumFractionDigits: compact ? 0 : digits,
    maximumFractionDigits: 2,
  }).format(abs);
  return `฿${body}`;
}

export function formatSignedBaht(type: TxType, n: number, lang: Lang = "th") {
  if (type === "transfer") return `⇄ ${formatBaht(n, false, lang)}`;
  const prefix = type === "income" ? "+" : "−";
  return `${prefix}${formatBaht(n, false, lang)}`;
}

export function parseBahtInput(raw: string) {
  const cleaned = raw.replace(/[฿บาท,\s]/g, "").replace(/^\./, "0.");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function monthTitle(month: string, lang: Lang = "th") {
  const [y, m] = month.split("-").map(Number);
  if (lang === "en") {
    return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function monthShortTitle(month: string, lang: Lang = "th") {
  const [y, m] = month.split("-").map(Number);
  if (lang === "en") return `${EN_MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
  return `${THAI_MONTHS_SHORT[m - 1]} ${String(y + 543).slice(2)}`;
}

export function formatThaiDate(iso: string, lang: Lang = "th") {
  const [y, m, d] = iso.split("-").map(Number);
  if (lang === "en") {
    return new Date(y, m - 1, d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function formatThaiDateShort(iso: string, lang: Lang = "th") {
  const [y, m, d] = iso.split("-").map(Number);
  if (lang === "en") return `${EN_MONTHS_SHORT[m - 1]} ${d}`;
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
}

export function weekdayThai(iso: string, lang: Lang = "th") {
  const [y, m, d] = iso.split("-").map(Number);
  if (lang === "en") {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(y, m - 1, d).getDay()];
  }
  const names = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  return names[new Date(y, m - 1, d).getDay()];
}

export function categoryName(
  id: CategoryId,
  categories: Category[] = CATEGORIES,
  lang: Lang = "th",
) {
  const found = categories.find((c) => c.id === id);
  return categoryLabel(id, found?.name ?? (lang === "en" ? "Other" : "อื่นๆ"), lang);
}

export function inMonth(tx: Transaction, month: string) {
  return tx.date.startsWith(month);
}

export function isCashflow(tx: Transaction) {
  return tx.type === "income" || tx.type === "expense";
}

export function sumBy(txs: Transaction[], month: string, type?: TxType) {
  return txs.reduce((sum, tx) => {
    if (!inMonth(tx, month)) return sum;
    if (tx.type === "transfer") return type === "transfer" ? sum + tx.amount : sum;
    if (type && tx.type !== type) return sum;
    return sum + tx.amount;
  }, 0);
}

export function groupByDate(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const list = map.get(tx.date) ?? [];
    list.push(tx);
    map.set(tx.date, list);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function categoryTotals(
  txs: Transaction[],
  month: string,
  type: TxType,
  categories: Category[] = CATEGORIES,
  lang: Lang = "th",
) {
  const totals = new Map<CategoryId, number>();
  for (const tx of txs) {
    if (!inMonth(tx, month) || tx.type !== type) continue;
    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount);
  }
  return [...totals.entries()]
    .map(([id, total]) => ({ id, name: categoryName(id, categories, lang), total }))
    .sort((a, b) => b.total - a.total);
}

export function lastMonths(month: string, count: number) {
  const [y, m] = month.split("-").map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(y, m - 1 - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${d.getFullYear()}-${mm}`);
  }
  return out;
}

export function walletBalance(txs: Transaction[], walletId: string) {
  let n = 0;
  for (const tx of txs) {
    if (tx.type === "transfer") {
      if (tx.walletId === walletId) n -= tx.amount;
      if (tx.toWalletId === walletId) n += tx.amount;
    } else if (tx.walletId === walletId) {
      n += tx.type === "income" ? tx.amount : -tx.amount;
    }
  }
  return n;
}

export function walletLabel(wallet: Wallet | undefined, fallback = "") {
  return wallet?.name ?? fallback;
}
