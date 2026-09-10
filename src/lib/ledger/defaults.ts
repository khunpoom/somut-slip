import type {
  AutoRule,
  Category,
  CategoryId,
  Debt,
  Goal,
  Member,
  MoneyType,
  RecurringItem,
  Transaction,
  Wallet,
} from "./types";

export const FALLBACK_CATEGORY_ID = "other";
export const TRANSFER_CATEGORY_ID = "transfer";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "อาหารและเครื่องดื่ม", type: "expense" },
  { id: "transport", name: "เดินทาง", type: "expense" },
  { id: "housing", name: "ที่อยู่อาศัย", type: "expense" },
  { id: "bills", name: "บิลและสาธารณูปโภค", type: "expense" },
  { id: "shopping", name: "ช้อปปิ้ง", type: "expense" },
  { id: "health", name: "สุขภาพ", type: "expense" },
  { id: "fun", name: "ความบันเทิง", type: "expense" },
  { id: "education", name: "การศึกษา", type: "expense" },
  { id: "family", name: "ครอบครัว", type: "expense" },
  { id: "household", name: "ของใช้", type: "expense" },
  { id: "insurance", name: "ประกัน", type: "expense" },
  { id: "saving", name: "ออมและลงทุน", type: "both" },
  { id: "salary", name: "เงินเดือน", type: "income" },
  { id: "freelance", name: "ฟรีแลนซ์", type: "income" },
  { id: "business", name: "ธุรกิจ", type: "income" },
  { id: FALLBACK_CATEGORY_ID, name: "อื่นๆ", type: "both" },
  { id: TRANSFER_CATEGORY_ID, name: "โอนภายใน", type: "both" },
];

export const CATEGORIES = DEFAULT_CATEGORIES;

export const CATEGORY_HINT_MAP: Record<string, CategoryId> = {
  อาหารและเครื่องดื่ม: "food",
  อาหาร: "food",
  Food: "food",
  เดินทาง: "transport",
  Transport: "transport",
  ที่อยู่อาศัย: "housing",
  Housing: "housing",
  บิลและสาธารณูปโภค: "bills",
  บิล: "bills",
  Bills: "bills",
  ช้อปปิ้ง: "shopping",
  Shopping: "shopping",
  สุขภาพ: "health",
  Health: "health",
  ความบันเทิง: "fun",
  Fun: "fun",
  การศึกษา: "education",
  ครอบครัว: "family",
  ของใช้: "household",
  ประกัน: "insurance",
  ออมและลงทุน: "saving",
  เงินเดือน: "salary",
  ฟรีแลนซ์: "freelance",
  ธุรกิจ: "business",
  อื่นๆ: FALLBACK_CATEGORY_ID,
  Other: FALLBACK_CATEGORY_ID,
};

export const DEFAULT_WALLETS: Wallet[] = [
  { id: "cash", name: "เงินสด", kind: "cash" },
  { id: "bank", name: "บัญชีธนาคาร", kind: "bank" },
  { id: "credit", name: "บัตรเครดิต", kind: "credit_card" },
  { id: "promptpay", name: "พร้อมเพย์", kind: "ewallet" },
  { id: "truemoney", name: "TrueMoney", kind: "ewallet" },
];

export const DEFAULT_MEMBERS: Member[] = [
  { id: "me", name: "ฉัน" },
  { id: "partner", name: "ครอบครัว" },
];

export function categoriesForType(categories: Category[], type: MoneyType) {
  return categories.filter(
    (c) => c.id !== TRANSFER_CATEGORY_ID && (c.type === "both" || c.type === type),
  );
}

export function pickCategoryId(
  categories: Category[],
  type: MoneyType,
  hint?: string | null,
) {
  const list = categoriesForType(categories, type);
  if (hint) {
    const direct = list.find((c) => c.id === hint || c.name === hint);
    if (direct) return direct.id;
    const mapped = CATEGORY_HINT_MAP[hint];
    const fromMap = mapped ? list.find((c) => c.id === mapped) : undefined;
    if (fromMap) return fromMap.id;
  }
  const preferred = type === "income" ? "salary" : "food";
  return (
    list.find((c) => c.id === preferred)?.id ??
    list.find((c) => c.id === FALLBACK_CATEGORY_ID)?.id ??
    list[0]?.id ??
    FALLBACK_CATEGORY_ID
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoDate(year: number, monthIndex: number, day: number) {
  const d = new Date(year, monthIndex, day);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(now = new Date()) {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(y, m - 1, d + days);
}

export function addMonthsIso(iso: string, months: number, dayOfMonth?: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = dayOfMonth ?? d;
  const base = new Date(y, m - 1 + months, 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return isoDate(base.getFullYear(), base.getMonth(), Math.min(target, last));
}

export function normalizeWallet(raw: Partial<Wallet> & { id: string; name: string }): Wallet {
  if (raw.kind) return { id: raw.id, name: raw.name, kind: raw.kind };
  const n = `${raw.id} ${raw.name}`.toLowerCase();
  if (n.includes("cash") || n.includes("เงินสด")) return { id: raw.id, name: raw.name, kind: "cash" };
  if (
    n.includes("true") ||
    n.includes("prompt") ||
    n.includes("wallet") ||
    n.includes("พร้อม") ||
    n.includes("ewallet")
  ) {
    return { id: raw.id, name: raw.name, kind: "ewallet" };
  }
  if (n.includes("credit") || n.includes("บัตร")) return { id: raw.id, name: raw.name, kind: "credit_card" };
  return { id: raw.id, name: raw.name, kind: "bank" };
}

function tx(
  partial: Omit<Transaction, "createdAt" | "source"> & { source?: Transaction["source"] },
): Transaction {
  return {
    memberId: "me",
    ...partial,
    source: partial.source ?? "manual",
    createdAt: `${partial.date}T09:00:00.000Z`,
  };
}

export function buildDemoTransactions(now = new Date()): Transaction[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = (day: number, monthOffset = 0) => isoDate(y, m + monthOffset, day);

  return [
    tx({
      id: "demo-1",
      type: "income",
      amount: 42000,
      date: d(1, -1),
      categoryId: "salary",
      walletId: "bank",
      payee: "บริษัท ต้นร่ม จำกัด",
      note: "เงินเดือนเดือนที่แล้ว",
    }),
    tx({
      id: "demo-2",
      type: "expense",
      amount: 8500,
      date: d(3, -1),
      categoryId: "housing",
      walletId: "bank",
      payee: "ค่าเช่าห้อง",
      note: "",
    }),
    tx({
      id: "demo-3",
      type: "expense",
      amount: 6240,
      date: d(18, -1),
      categoryId: "food",
      walletId: "cash",
      memberId: "partner",
      payee: "ตลาดนัดจตุจักร",
      note: "",
    }),
    tx({
      id: "demo-4",
      type: "income",
      amount: 42000,
      date: d(1),
      categoryId: "salary",
      walletId: "bank",
      payee: "บริษัท ต้นร่ม จำกัด",
      note: "เงินเดือน",
    }),
    tx({
      id: "demo-5",
      type: "income",
      amount: 7800,
      date: d(5),
      categoryId: "freelance",
      walletId: "promptpay",
      payee: "งานออกแบบโลโก้",
      note: "ลูกค้าคุณแพร",
    }),
    tx({
      id: "demo-6",
      type: "expense",
      amount: 8500,
      date: d(2),
      categoryId: "housing",
      walletId: "bank",
      payee: "ค่าเช่าห้อง",
      note: "ประจำเดือน",
      source: "recurring",
      recurringId: "rec-rent",
    }),
    tx({
      id: "demo-7",
      type: "expense",
      amount: 1284.5,
      date: d(4),
      categoryId: "bills",
      walletId: "bank",
      payee: "การไฟฟ้านครหลวง",
      note: "",
    }),
    tx({
      id: "demo-8",
      type: "expense",
      amount: 89,
      date: d(6),
      categoryId: "food",
      walletId: "cash",
      payee: "7-Eleven",
      note: "กาแฟกับแซนด์วิช",
    }),
    tx({
      id: "demo-9",
      type: "expense",
      amount: 165,
      date: d(7),
      categoryId: "transport",
      walletId: "promptpay",
      payee: "Grab",
      note: "ไปออฟฟิศ",
    }),
    tx({
      id: "demo-10",
      type: "expense",
      amount: 420,
      date: d(7),
      categoryId: "food",
      walletId: "cash",
      payee: "ร้านข้าวแกงป้าศรี",
      note: "",
    }),
    tx({
      id: "demo-11",
      type: "expense",
      amount: 169,
      date: d(8),
      categoryId: "fun",
      walletId: "credit",
      payee: "Netflix",
      note: "รายเดือน",
      source: "recurring",
      recurringId: "rec-netflix",
    }),
    tx({
      id: "demo-12",
      type: "expense",
      amount: 2450,
      date: d(8),
      categoryId: "shopping",
      walletId: "credit",
      memberId: "partner",
      payee: "Uniqlo",
      note: "",
    }),
    tx({
      id: "demo-13",
      type: "expense",
      amount: 320,
      date: d(9),
      categoryId: "food",
      walletId: "promptpay",
      payee: "ร้านกาแฟบ้านไม้",
      note: "ประชุมลูกค้า",
    }),
    tx({
      id: "demo-14",
      type: "expense",
      amount: 980,
      date: d(9),
      categoryId: "transport",
      walletId: "cash",
      payee: "ปตท.",
      note: "เติมน้ำมัน",
    }),
    tx({
      id: "demo-15",
      type: "expense",
      amount: 590,
      date: d(10),
      categoryId: "health",
      walletId: "truemoney",
      payee: "ร้านขายยา",
      note: "",
    }),
    tx({
      id: "demo-16",
      type: "transfer",
      amount: 2000,
      date: d(3),
      categoryId: TRANSFER_CATEGORY_ID,
      walletId: "bank",
      toWalletId: "promptpay",
      payee: "โอนเข้าพร้อมเพย์",
      note: "เติมใช้จ่าย",
    }),
    tx({
      id: "demo-17",
      type: "transfer",
      amount: 3000,
      date: d(6),
      categoryId: TRANSFER_CATEGORY_ID,
      walletId: "bank",
      goalId: "goal-japan",
      payee: "ออมเที่ยวญี่ปุ่น",
      note: "",
    }),
    tx({
      id: "demo-18",
      type: "expense",
      amount: 500,
      date: d(8),
      categoryId: FALLBACK_CATEGORY_ID,
      walletId: "promptpay",
      payee: "คืนเพื่อน",
      note: "ผ่อนหนี้",
      debtId: "debt-friend",
    }),
  ];
}

export function buildDemoRecurring(now = new Date()): RecurringItem[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    {
      id: "rec-rent",
      name: "ค่าเช่าห้อง",
      type: "expense",
      amount: 8500,
      categoryId: "housing",
      walletId: "bank",
      memberId: "me",
      frequency: "monthly",
      dayOfMonth: 2,
      nextDate: isoDate(y, m + 1, 2),
      isSubscription: false,
      active: true,
    },
    {
      id: "rec-netflix",
      name: "Netflix",
      type: "expense",
      amount: 169,
      categoryId: "fun",
      walletId: "credit",
      memberId: "partner",
      frequency: "monthly",
      dayOfMonth: 8,
      nextDate: isoDate(y, m + 1, 8),
      isSubscription: true,
      active: true,
    },
    {
      id: "rec-gym",
      name: "ฟิตเนส",
      type: "expense",
      amount: 990,
      categoryId: "health",
      walletId: "bank",
      memberId: "me",
      frequency: "monthly",
      dayOfMonth: 15,
      nextDate: isoDate(y, m, 15) > todayIso(now) ? isoDate(y, m, 15) : isoDate(y, m + 1, 15),
      isSubscription: true,
      active: true,
    },
  ];
}

export function buildDemoDebts(): Debt[] {
  return [
    {
      id: "debt-friend",
      name: "ยืมเพื่อน",
      lender: "คุณแพร",
      total: 3000,
      remaining: 2500,
      dueDate: addMonthsIso(todayIso(), 1, 20),
      note: "คืนเป็นงวด",
    },
  ];
}

export function buildDemoGoals(): Goal[] {
  return [
    {
      id: "goal-japan",
      name: "เที่ยวญี่ปุ่น",
      target: 50000,
      saved: 3000,
      deadline: `${new Date().getFullYear() + 1}-03-31`,
      note: "ซากุระปีหน้า",
    },
    {
      id: "goal-emergency",
      name: "กองฉุกเฉิน",
      target: 30000,
      saved: 0,
      note: "",
    },
  ];
}

export function buildDemoRules(): AutoRule[] {
  return [
    { id: "rule-7", pattern: "7-Eleven", categoryId: "food" },
    { id: "rule-grab", pattern: "Grab", categoryId: "transport", walletId: "promptpay" },
    { id: "rule-netflix", pattern: "Netflix", categoryId: "fun" },
    { id: "rule-ptt", pattern: "ปตท", categoryId: "transport" },
  ];
}
