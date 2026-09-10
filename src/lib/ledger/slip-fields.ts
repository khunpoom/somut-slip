import type { MoneyType, SlipParse } from "./types";

export const SLIP_PROMPT = `Extract data from this photo of a Thai bank transfer slip, PromptPay slip, or store receipt.

Return ONLY a JSON object (no markdown) with this exact shape:
{
  "kind": "transfer" | "receipt" | "unknown",
  "type": "income" | "expense",
  "amount": number | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "payee": string | null,
  "payer": string | null,
  "bank": string | null,
  "ref": string | null,
  "note": string | null,
  "categoryHint": string | null,
  "confidence": number
}

Rules:
- amount is the transaction total in THB as a number (not satang, no thousand separators).
- Money sent / paid / transferred out = expense. Money received = income. Store receipts = expense.
- If the year is Buddhist Era (25xx), convert to Gregorian (year - 543).
- categoryHint must be one of: อาหารและเครื่องดื่ม, เดินทาง, ที่อยู่อาศัย, บิลและสาธารณูปโภค, ช้อปปิ้ง, สุขภาพ, ความบันเทิง, การศึกษา, ครอบครัว, ของใช้, ประกัน, ออมและลงทุน, เงินเดือน, ฟรีแลนซ์, ธุรกิจ, อื่นๆ
- payee is the shop, recipient, or biller. Keep original Thai or English names.
- If a field is unreadable, use null. Never invent an amount.
- confidence is 0..1.`;

export function asType(value: unknown): MoneyType {
  return value === "income" ? "income" : "expense";
}

export function asKind(value: unknown): SlipParse["kind"] {
  if (value === "transfer" || value === "receipt" || value === "unknown") {
    return value;
  }
  return "unknown";
}

export function asAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/[฿บาท,\s]/g, ""));
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100) / 100;
  }
  return null;
}

export function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t && t !== "null" ? t : null;
}

export function asDate(value: unknown): string | null {
  const t = asString(value);
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  let year = Number(m[1]);
  if (year >= 2400) year -= 543;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${m[2]}-${m[3]}`;
}

export function asCategory(value: unknown): string | null {
  return asString(value);
}

export function asConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  return 0.5;
}

export function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("อ่านค่าจากสลิปไม่สำเร็จ");
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

export function toSlip(raw: Record<string, unknown>): SlipParse {
  return {
    kind: asKind(raw.kind),
    type: asType(raw.type),
    amount: asAmount(raw.amount),
    date: asDate(raw.date),
    time: asString(raw.time),
    payee: asString(raw.payee),
    payer: asString(raw.payer),
    bank: asString(raw.bank),
    ref: asString(raw.ref),
    note: asString(raw.note),
    categoryHint: asCategory(raw.categoryHint),
    confidence: asConfidence(raw.confidence),
  };
}

export function splitDataUrl(imageDataUrl: string): { mime: string; base64: string } {
  const comma = imageDataUrl.indexOf(",");
  const header = comma >= 0 ? imageDataUrl.slice(0, comma) : "";
  const base64 = comma >= 0 ? imageDataUrl.slice(comma + 1) : imageDataUrl;
  const mime = header.includes("png") ? "image/png" : "image/jpeg";
  return { mime, base64 };
}
