export type TxType = "income" | "expense";
export type TxSource = "manual" | "slip";
export type CategoryKind = TxType | "both";
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  type: CategoryKind;
}

export interface Wallet {
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
  payee: string;
  note: string;
  ref?: string;
  source: TxSource;
  slipThumb?: string;
  createdAt: string;
}

export interface SlipParse {
  kind: "transfer" | "receipt" | "unknown";
  type: TxType;
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
  version: 1;
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  isDemo: boolean;
  initialized: boolean;
}
