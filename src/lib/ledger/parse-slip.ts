import { createServerFn } from "@tanstack/react-start";
import type { SlipParse, TxType } from "./types";

const PROMPT = `Extract data from this photo of a Thai bank transfer slip, PromptPay slip, or store receipt.

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

function asType(value: unknown): TxType {
  return value === "income" ? "income" : "expense";
}

function asKind(value: unknown): SlipParse["kind"] {
  if (value === "transfer" || value === "receipt" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function asAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/[฿บาท,\s]/g, ""));
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100) / 100;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t && t !== "null" ? t : null;
}

function asDate(value: unknown): string | null {
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

function asCategory(value: unknown): string | null {
  return asString(value);
}

function asConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  return 0.5;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("อ่านค่าจากสลิปไม่สำเร็จ");
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

function toSlip(raw: Record<string, unknown>): SlipParse {
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

async function callXai(apiKey: string, imageDataUrl: string) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });
  return res;
}

export const parseSlipImage = createServerFn({ method: "POST" })
  .validator((input: { imageDataUrl: string }) => {
    if (!input || typeof input.imageDataUrl !== "string") {
      throw new Error("ไม่มีรูปสลิป");
    }
    const url = input.imageDataUrl;
    if (!url.startsWith("data:image/jpeg") && !url.startsWith("data:image/png")) {
      throw new Error("รองรับเฉพาะไฟล์ JPG หรือ PNG");
    }
    if (url.length > 1_800_000) {
      throw new Error("รูปใหญ่เกินไป กรุณาถ่ายใหม่ให้ชัดขึ้นในระยะใกล้");
    }
    return { imageDataUrl: url };
  })
  .handler(async ({ data }): Promise<{ ok: true; slip: SlipParse } | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "ยังอ่านสลิปด้วย AI ไม่ได้ในขณะนี้ กรอกยอดมือได้" };
    }

    let res: Response;
    try {
      res = await callXai(apiKey, data.imageDataUrl);
      if (!res.ok && res.status >= 500) {
        res = await callXai(apiKey, data.imageDataUrl);
      }
    } catch {
      return { ok: false, error: "เชื่อมต่อตัวอ่านสลิปไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }

    if (!res.ok) {
      return { ok: false, error: "อ่านสลิปไม่สำเร็จ ลองถ่ายใหม่ให้ชัดขึ้น" };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    try {
      return { ok: true, slip: toSlip(parseJsonObject(text)) };
    } catch {
      return { ok: false, error: "อ่านค่าจากสลิปไม่ครบ กรอกมือแล้วแนบรูปได้" };
    }
  });
