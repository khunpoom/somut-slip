export type MoneyType = "income" | "expense";
export type TxType = MoneyType | "transfer";
export type TxSource = "manual" | "slip" | "recurring" | "quick";
export type CategoryKind = MoneyType | "both";
export type CategoryId = string;
export type WalletKind = "cash" | "bank" | "credit_card" | "ewallet";
export type RecurringFreq = "weekly" | "monthly" | "yearly";
export type ThemeMode = "paper" | "night" | "system";
export type Lang = "th" | "en";

export interface Category {
  id: CategoryId;
  name: string;
  type: CategoryKind;
}

export interface Wallet {
  id: string;
  name: string;
  kind: WalletKind;
}

export interface Member {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  date: string;
  categoryId: CategoryId;
  walletId: string;
  toWalletId?: string;
  memberId?: string;
  payee: string;
  note: string;
  ref?: string;
  source: TxSource;
  slipThumb?: string;
  recurringId?: string;
  debtId?: string;
  goalId?: string;
  createdAt: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  type: MoneyType;
  amount: number;
  categoryId: CategoryId;
  walletId: string;
  memberId?: string;
  frequency: RecurringFreq;
  dayOfMonth: number;
  nextDate: string;
  endDate?: string;
  isSubscription: boolean;
  active: boolean;
}

export interface Debt {
  id: string;
  name: string;
  lender: string;
  total: number;
  remaining: number;
  dueDate?: string;
  note: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string;
  note: string;
}

export interface AutoRule {
  id: string;
  pattern: string;
  categoryId: CategoryId;
  walletId?: string;
}

export interface SlipParse {
  kind: "transfer" | "receipt" | "unknown";
  type: MoneyType;
  amount: number | null;
  date: string | null;
  time: string | null;
  payee: string | null;
  payer: string | null;
  bank: string | null;
  ref: string | null;
  note: string | null;
  categoryHint: string | null;
  confidence: number;
}

export interface LedgerSnapshot {
  version: 2;
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  members: Member[];
  recurring: RecurringItem[];
  debts: Debt[];
  goals: Goal[];
  rules: AutoRule[];
  lang: Lang;
  theme: ThemeMode;
  isDemo: boolean;
  initialized: boolean;
}
