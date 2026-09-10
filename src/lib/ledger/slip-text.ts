import type { SlipParse } from "./types";

const TH_MONTHS: Record<string, number> = {
  "ม.ค": 1,
  มกราคม: 1,
  "ก.พ": 2,
  กุมภาพันธ์: 2,
  "มี.ค": 3,
  มีนาคม: 3,
  "เม.ย": 4,
  เมษายน: 4,
  "พ.ค": 5,
  พฤษภาคม: 5,
  "มิ.ย": 6,
  มิถุนายน: 6,
  "ก.ค": 7,
  กรกฎาคม: 7,
  "ส.ค": 8,
  สิงหาคม: 8,
  "ก.ย": 9,
  กันยายน: 9,
  "ต.ค": 10,
  ตุลาคม: 10,
  "พ.ย": 11,
  พฤศจิกายน: 11,
  "ธ.ค": 12,
  ธันวาคม: 12,
};

const BANKS: { test: RegExp; name: string }[] = [
  { test: /truemoney|ทรูมันนี่/i, name: "TrueMoney" },
  { test: /พร้อมเพย์|promptpay/i, name: "พร้อมเพย์" },
  { test: /เป๋าตัง|paotang/i, name: "เป๋าตัง" },
  { test: /shopeepay|ช้อปปี้/i, name: "ShopeePay" },
  { test: /rabbit line pay/i, name: "Rabbit LINE Pay" },
  { test: /กสิกร|kasikorn|\bkbank\b/i, name: "กสิกรไทย" },
  { test: /ไทยพาณิชย์|siam commercial|\bscb\b/i, name: "ไทยพาณิชย์" },
  { test: /กรุงไทย|\bktb\b/i, name: "กรุงไทย" },
  { test: /กรุงเทพ|bangkok bank|\bbbl\b/i, name: "กรุงเทพ" },
  { test: /กรุงศรี|krungsri|\bbay\b/i, name: "กรุงศรี" },
  { test: /ออมสิน|gsb/i, name: "ออมสิน" },
  { test: /ธนชาต|ttb|ทหารไทย/i, name: "ทหารไทยธนชาต" },
];

const AMOUNT_LABEL = /จำนวน(?:เงิน)?|ยอด(?:ชำระ|โอน|รวม)?|รวมทั้งสิ้น|total|amount|paid/i;
const PAYEE_LABEL = /ผู้รับ|ชื่อบัญชี(?:ผู้รับ)?|ร้านค้า|ร้าน|ไปยัง|to\b|biller|merchant/i;
const PAYER_LABEL = /ผู้โอน|จากบัญชี|จาก\b|from\b/i;
const REF_LABEL = /เลขที่(?:รายการ)?|รหัสอ้างอิง|อ้างอิง|ref(?:erence)?|txn/i;
const INCOME_HINT = /เงินเข้า|โอนเข้า|ได้รับเงิน|received|incoming|เงินเดือน/i;
const TRANSFER_HINT = /โอนเงิน|พร้อมเพย์|promptpay|transfer/i;
const RECEIPT_HINT = /ใบเสร็จ|receipt|tax invoice/i;

const CAT_HINTS: { test: RegExp; hint: string }[] = [
  { test: /อาหาร|ร้านกาแฟ|7-?eleven|starbucks|grabfood|lineman|อาหาร/i, hint: "อาหารและเครื่องดื่ม" },
  { test: /grab|bolt|bts|mrt|น้ำมัน|ทางด่วน|taxi/i, hint: "เดินทาง" },
  { test: /ค่าไฟ|ค่าน้ำ|เน็ต|ais|true|dtac|บิล/i, hint: "บิลและสาธารณูปโภค" },
  { test: /netflix|spotify|youtube|หนัง/i, hint: "ความบันเทิง" },
  { test: /โรงพยาบาล|คลินิก|ยา|ประกันสุขภาพ/i, hint: "สุขภาพ" },
  { test: /shopee|lazada|central|shopping/i, hint: "ช้อปปิ้ง" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function gregorianYear(year: number) {
  if (year < 100) year += year >= 50 ? 1900 : 2000;
  if (year >= 2400) year -= 543;
  return year;
}

function validDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const y = gregorianYear(year);
  if (y < 2000 || y > 2100) return null;
  return `${y}-${pad(month)}-${pad(day)}`;
}

function parseAmountToken(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return Math.round(n * 100) / 100;
}

function looksLikeAccount(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && !raw.includes(".");
}

export function parseThaiSlipText(text: string): SlipParse {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const blob = lines.join("\n");

  let amount: number | null = null;
  const labeledAmounts: number[] = [];
  const looseAmounts: number[] = [];

  for (const line of lines) {
    const matches = line.match(/(\d{1,3}(?:,\d{3})+|\d{1,7})(?:\.(\d{2}))?/g) ?? [];
    for (const token of matches) {
      if (looksLikeAccount(token)) continue;
      const hasDecimal = token.includes(".");
      const parsed = parseAmountToken(hasDecimal ? token : token.replace(/,/g, ""));
      if (parsed == null) continue;
      if ((parsed >= 2400 && parsed <= 2600) || (parsed >= 2015 && parsed <= 2100 && !hasDecimal && parsed % 1 === 0)) {
        continue;
      }
      if (AMOUNT_LABEL.test(line) || /฿|บาท/.test(line) || hasDecimal) {
        if (AMOUNT_LABEL.test(line) || /฿|บาท/.test(line)) labeledAmounts.push(parsed);
        else looseAmounts.push(parsed);
      }
    }
  }
  amount = labeledAmounts.sort((a, b) => b - a)[0] ?? looseAmounts.sort((a, b) => b - a)[0] ?? null;

  let date: string | null = null;
  let time: string | null = null;
  const numericDate = blob.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (numericDate) {
    date = validDate(Number(numericDate[3]), Number(numericDate[2]), Number(numericDate[1]));
  }
  if (!date) {
    const named = blob.match(
      /(\d{1,2})\s*(ม\.ค|ก\.พ|มี\.ค|เม\.ย|พ\.ค|มิ\.ย|ก\.ค|ส\.ค|ก\.ย|ต\.ค|พ\.ย|ธ\.ค|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\.?\s*(\d{2,4})/,
    );
    if (named) {
      const month = TH_MONTHS[named[2]] ?? TH_MONTHS[named[2].replace(/\.$/, "")];
      if (month) date = validDate(Number(named[3]), month, Number(named[1]));
    }
  }
  const timeMatch = blob.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (timeMatch) {
    const hh = Number(timeMatch[1]);
    const mm = Number(timeMatch[2]);
    if (hh <= 23 && mm <= 59) time = `${pad(hh)}:${pad(mm)}`;
  }

  function valueAfter(label: RegExp) {
    const idx = lines.findIndex((line) => label.test(line));
    if (idx < 0) return null;
    const same = lines[idx].replace(label, " ").replace(/[:：\-]/g, " ").trim();
    if (
      same.length >= 3 &&
      !AMOUNT_LABEL.test(same) &&
      !looksLikeAccount(same) &&
      !/^(เงิน|บาท|สำเร็จ|รายการ)$/.test(same)
    ) {
      return same;
    }
    const next = lines[idx + 1];
    if (
      next &&
      !AMOUNT_LABEL.test(next) &&
      !REF_LABEL.test(next) &&
      !/^(ผู้รับ|ผู้โอน|จากบัญชี)(?:เงิน)?$/.test(next)
    ) {
      return next;
    }
    return null;
  }

  const payee = valueAfter(PAYEE_LABEL);
  const payer = valueAfter(PAYER_LABEL);
  const ref = valueAfter(REF_LABEL);
  const bank = BANKS.find((b) => b.test.test(blob))?.name ?? null;
  const categoryHint = CAT_HINTS.find((c) => c.test.test(blob))?.hint ?? null;

  const type = INCOME_HINT.test(blob) ? "income" : "expense";
  const kind = TRANSFER_HINT.test(blob) ? "transfer" : RECEIPT_HINT.test(blob) ? "receipt" : "unknown";

  const confidence = [amount, date, payee, bank].filter(Boolean).length / 4;

  return {
    kind,
    type,
    amount,
    date,
    time,
    payee,
    payer,
    bank,
    ref,
    note: null,
    categoryHint,
    confidence: amount ? Math.min(0.85, 0.35 + confidence * 0.5) : 0.2,
  };
}
