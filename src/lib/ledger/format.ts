import { CATEGORIES } from "./defaults";
import type { Category, CategoryId, Transaction, TxType } from "./types";

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

export function formatBaht(n: number, compact = false) {
  const abs = Math.abs(n);
  const digits = Number.isInteger(abs) ? 0 : 2;
  const body = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: compact ? 0 : digits,
    maximumFractionDigits: 2,
  }).format(abs);
  return `฿${body}`;
}

export function formatSignedBaht(type: TxType, n: number) {
  const prefix = type === "income" ? "+" : "−";
  return `${prefix}${formatBaht(n)}`;
}

export function parseBahtInput(raw: string) {
  const cleaned = raw.replace(/[฿บาท,\s]/g, "").replace(/^\./, "0.");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function monthTitle(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function monthShortTitle(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${THAI_MONTHS_SHORT[m - 1]} ${String(y + 543).slice(2)}`;
}

export function formatThaiDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function formatThaiDateShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
}

export function weekdayThai(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const names = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  return names[new Date(y, m - 1, d).getDay()];
}

export function categoryName(id: CategoryId, categories: Category[] = CATEGORIES) {
  return categories.find((c) => c.id === id)?.name ?? "อื่นๆ";
}

export function inMonth(tx: Transaction, month: string) {
  return tx.date.startsWith(month);
}

export function sumBy(
  txs: Transaction[],
  month: string,
  type?: TxType,
) {
  return txs.reduce((sum, tx) => {
    if (!inMonth(tx, month)) return sum;
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
) {
  const totals = new Map<CategoryId, number>();
  for (const tx of txs) {
    if (!inMonth(tx, month) || tx.type !== type) continue;
    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount);
  }
  return [...totals.entries()]
    .map(([id, total]) => ({ id, name: categoryName(id, categories), total }))
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
