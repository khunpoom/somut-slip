import type { Category, CategoryId, Transaction, TxType, Wallet } from "./types";

export const FALLBACK_CATEGORY_ID = "other";

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
];

export const CATEGORIES = DEFAULT_CATEGORIES;

export const CATEGORY_HINT_MAP: Record<string, CategoryId> = {
  อาหารและเครื่องดื่ม: "food",
  อาหาร: "food",
  เดินทาง: "transport",
  ที่อยู่อาศัย: "housing",
  บิลและสาธารณูปโภค: "bills",
  บิล: "bills",
  ช้อปปิ้ง: "shopping",
  สุขภาพ: "health",
  ความบันเทิง: "fun",
  การศึกษา: "education",
  ครอบครัว: "family",
  ของใช้: "household",
  ประกัน: "insurance",
  ออมและลงทุน: "saving",
  เงินเดือน: "salary",
  ฟรีแลนซ์: "freelance",
  ธุรกิจ: "business",
  อื่นๆ: FALLBACK_CATEGORY_ID,
};

export const DEFAULT_WALLETS: Wallet[] = [
  { id: "cash", name: "เงินสด" },
  { id: "bank", name: "บัญชีธนาคาร" },
  { id: "promptpay", name: "พร้อมเพย์" },
];

export function categoriesForType(categories: Category[], type: TxType) {
  return categories.filter((c) => c.type === "both" || c.type === type);
}

export function pickCategoryId(
  categories: Category[],
  type: TxType,
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

function tx(
  partial: Omit<Transaction, "id" | "createdAt" | "source"> & { id: string },
): Transaction {
  return {
    ...partial,
    source: "manual",
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
      walletId: "bank",
      payee: "Netflix",
      note: "รายเดือน",
    }),
    tx({
      id: "demo-12",
      type: "expense",
      amount: 2450,
      date: d(8),
      categoryId: "shopping",
      walletId: "bank",
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
      walletId: "cash",
      payee: "ร้านขายยา",
      note: "",
    }),
  ];
}
