import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildDemoTransactions,
  currentMonth,
  DEFAULT_CATEGORIES,
  DEFAULT_WALLETS,
  FALLBACK_CATEGORY_ID,
} from "./defaults";
import type { Category, CategoryKind, LedgerSnapshot, Transaction, Wallet } from "./types";

const STORAGE_KEY = "somut-slip-v1";

type Draft = Omit<Transaction, "id" | "createdAt">;

interface LedgerState {
  isDemo: boolean;
  initialized: boolean;
  selectedMonth: string;
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  setMonth: (month: string) => void;
  addTransaction: (draft: Draft) => string;
  updateTransaction: (id: string, draft: Draft) => void;
  deleteTransaction: (id: string) => void;
  addWallet: (name: string) => void;
  renameWallet: (id: string, name: string) => void;
  removeWallet: (id: string) => void;
  addCategory: (name: string, type: CategoryKind) => boolean;
  updateCategory: (id: string, patch: { name?: string; type?: CategoryKind }) => void;
  removeCategory: (id: string) => void;
  keepDemoData: () => void;
  clearAndStart: () => void;
  restoreDemo: () => void;
  replaceAll: (snap: LedgerSnapshot) => void;
  exportSnapshot: () => LedgerSnapshot;
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stripThumbs(txs: Transaction[]): Transaction[] {
  return txs.map((tx) => {
    if (!tx.slipThumb || tx.slipThumb.length < 80_000) return tx;
    const { slipThumb: _drop, ...rest } = tx;
    return rest;
  });
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      isDemo: true,
      initialized: true,
      selectedMonth: currentMonth(),
      transactions: buildDemoTransactions(),
      wallets: DEFAULT_WALLETS,
      categories: DEFAULT_CATEGORIES,
      setMonth: (month) => set({ selectedMonth: month }),
      addTransaction: (draft) => {
        const id = newId();
        const row: Transaction = {
          ...draft,
          id,
          createdAt: new Date().toISOString(),
        };
        set({ transactions: [row, ...get().transactions], isDemo: false });
        return id;
      },
      updateTransaction: (id, draft) => {
        set({
          isDemo: false,
          transactions: get().transactions.map((tx) =>
            tx.id === id ? { ...tx, ...draft } : tx,
          ),
        });
      },
      deleteTransaction: (id) => {
        set({
          isDemo: false,
          transactions: get().transactions.filter((tx) => tx.id !== id),
        });
      },
      addWallet: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          wallets: [...get().wallets, { id: newId(), name: trimmed }],
        });
      },
      renameWallet: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          wallets: get().wallets.map((w) => (w.id === id ? { ...w, name: trimmed } : w)),
        });
      },
      removeWallet: (id) => {
        const wallets = get().wallets.filter((w) => w.id !== id);
        if (!wallets.length) return;
        const fallback = wallets[0].id;
        set({
          wallets,
          transactions: get().transactions.map((tx) =>
            tx.walletId === id ? { ...tx, walletId: fallback } : tx,
          ),
        });
      },
      addCategory: (name, type) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const exists = get().categories.some((c) => c.name === trimmed);
        if (exists) return false;
        set({
          categories: [...get().categories, { id: `cat-${newId()}`, name: trimmed, type }],
        });
        return true;
      },
      updateCategory: (id, patch) => {
        const name = patch.name?.trim();
        if (patch.name !== undefined && !name) return;
        set({
          categories: get().categories.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...(name ? { name } : {}),
                  ...(patch.type ? { type: patch.type } : {}),
                }
              : c,
          ),
        });
      },
      removeCategory: (id) => {
        if (id === FALLBACK_CATEGORY_ID) return;
        const categories = get().categories.filter((c) => c.id !== id);
        const fallback =
          categories.find((c) => c.id === FALLBACK_CATEGORY_ID)?.id ??
          categories[0]?.id ??
          FALLBACK_CATEGORY_ID;
        if (!categories.some((c) => c.id === FALLBACK_CATEGORY_ID) && fallback === FALLBACK_CATEGORY_ID) {
          categories.push({ id: FALLBACK_CATEGORY_ID, name: "อื่นๆ", type: "both" });
        }
        set({
          categories,
          transactions: get().transactions.map((tx) =>
            tx.categoryId === id ? { ...tx, categoryId: fallback } : tx,
          ),
        });
      },
      keepDemoData: () => set({ isDemo: false }),
      clearAndStart: () =>
        set({
          isDemo: false,
          transactions: [],
          wallets: DEFAULT_WALLETS,
        }),
      restoreDemo: () =>
        set({
          isDemo: true,
          transactions: buildDemoTransactions(),
          wallets: DEFAULT_WALLETS,
          categories: DEFAULT_CATEGORIES,
          selectedMonth: currentMonth(),
        }),
      replaceAll: (snap) => {
        set({
          isDemo: snap.isDemo,
          initialized: true,
          transactions: snap.transactions ?? [],
          wallets: snap.wallets?.length ? snap.wallets : DEFAULT_WALLETS,
          categories: snap.categories?.length ? snap.categories : DEFAULT_CATEGORIES,
        });
      },
      exportSnapshot: () => ({
        version: 1,
        transactions: get().transactions,
        wallets: get().wallets,
        categories: get().categories,
        isDemo: get().isDemo,
        initialized: true,
      }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<LedgerState>;
        return {
          ...currentState,
          ...persisted,
          categories: persisted.categories?.length
            ? persisted.categories
            : DEFAULT_CATEGORIES,
          wallets: persisted.wallets?.length ? persisted.wallets : DEFAULT_WALLETS,
        };
      },
      partialize: (state) => ({
        isDemo: state.isDemo,
        initialized: state.initialized,
        transactions: stripThumbs(state.transactions),
        wallets: state.wallets,
        categories: state.categories,
      }),
    },
  ),
);
