import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildDemoDebts,
  buildDemoGoals,
  buildDemoRecurring,
  buildDemoRules,
  buildDemoTransactions,
  currentMonth,
  DEFAULT_CATEGORIES,
  DEFAULT_MEMBERS,
  DEFAULT_WALLETS,
  FALLBACK_CATEGORY_ID,
  normalizeWallet,
  todayIso,
  TRANSFER_CATEGORY_ID,
} from "./defaults";
import { dueRecurringDates, nextRecurringDate } from "./rules";
import type {
  AutoRule,
  Category,
  CategoryKind,
  Debt,
  Goal,
  Lang,
  LedgerSnapshot,
  Member,
  RecurringItem,
  ThemeMode,
  Transaction,
  Wallet,
  WalletKind,
} from "./types";

const STORAGE_KEY = "somut-slip-v1";

export type Draft = Omit<Transaction, "id" | "createdAt">;

interface LedgerState {
  isDemo: boolean;
  initialized: boolean;
  selectedMonth: string;
  lang: Lang;
  theme: ThemeMode;
  geminiKey: string;
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  members: Member[];
  recurring: RecurringItem[];
  debts: Debt[];
  goals: Goal[];
  rules: AutoRule[];
  setMonth: (month: string) => void;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeMode) => void;
  setGeminiKey: (key: string) => void;
  addTransaction: (draft: Draft) => string;
  updateTransaction: (id: string, draft: Draft) => void;
  deleteTransaction: (id: string) => void;
  addWallet: (name: string, kind: WalletKind) => void;
  updateWallet: (id: string, patch: { name?: string; kind?: WalletKind }) => void;
  removeWallet: (id: string) => void;
  addCategory: (name: string, type: CategoryKind) => boolean;
  updateCategory: (id: string, patch: { name?: string; type?: CategoryKind }) => void;
  removeCategory: (id: string) => void;
  addMember: (name: string) => boolean;
  updateMember: (id: string, name: string) => void;
  removeMember: (id: string) => void;
  addRecurring: (item: Omit<RecurringItem, "id">) => void;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  addDebt: (item: Omit<Debt, "id">) => void;
  updateDebt: (id: string, patch: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  payDebt: (id: string, amount: number, walletId: string, date: string) => void;
  addGoal: (item: Omit<Goal, "id">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  contributeGoal: (id: string, amount: number, walletId: string, date: string) => void;
  addRule: (pattern: string, categoryId: string, walletId?: string) => boolean;
  updateRule: (id: string, patch: Partial<AutoRule>) => void;
  removeRule: (id: string) => void;
  ensureRecurringPosted: () => number;
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

function ensureCategories(list: Category[] | undefined) {
  const base = list?.length ? [...list] : [...DEFAULT_CATEGORIES];
  if (!base.some((c) => c.id === FALLBACK_CATEGORY_ID)) {
    base.push({ id: FALLBACK_CATEGORY_ID, name: "อื่นๆ", type: "both" });
  }
  if (!base.some((c) => c.id === TRANSFER_CATEGORY_ID)) {
    base.push({ id: TRANSFER_CATEGORY_ID, name: "โอนภายใน", type: "both" });
  }
  return base;
}

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      isDemo: true,
      initialized: true,
      selectedMonth: currentMonth(),
      lang: "th",
      theme: "paper",
      geminiKey: "",
      transactions: buildDemoTransactions(),
      wallets: DEFAULT_WALLETS,
      categories: DEFAULT_CATEGORIES,
      members: DEFAULT_MEMBERS,
      recurring: buildDemoRecurring(),
      debts: buildDemoDebts(),
      goals: buildDemoGoals(),
      rules: buildDemoRules(),
      setMonth: (month) => set({ selectedMonth: month }),
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setGeminiKey: (key) => set({ geminiKey: key.trim() }),
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
          transactions: get().transactions.map((tx) => (tx.id === id ? { ...tx, ...draft } : tx)),
        });
      },
      deleteTransaction: (id) => {
        set({
          isDemo: false,
          transactions: get().transactions.filter((tx) => tx.id !== id),
        });
      },
      addWallet: (name, kind) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          wallets: [...get().wallets, { id: newId(), name: trimmed, kind }],
        });
      },
      updateWallet: (id, patch) => {
        const name = patch.name?.trim();
        if (patch.name !== undefined && !name) return;
        set({
          wallets: get().wallets.map((w) =>
            w.id === id
              ? { ...w, ...(name ? { name } : {}), ...(patch.kind ? { kind: patch.kind } : {}) }
              : w,
          ),
        });
      },
      removeWallet: (id) => {
        const wallets = get().wallets.filter((w) => w.id !== id);
        if (!wallets.length) return;
        const fallback = wallets[0].id;
        set({
          wallets,
          transactions: get().transactions.map((tx) => ({
            ...tx,
            walletId: tx.walletId === id ? fallback : tx.walletId,
            toWalletId: tx.toWalletId === id ? fallback : tx.toWalletId,
          })),
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
        if (id === FALLBACK_CATEGORY_ID || id === TRANSFER_CATEGORY_ID) return;
        const categories = get().categories.filter((c) => c.id !== id);
        const fallback =
          categories.find((c) => c.id === FALLBACK_CATEGORY_ID)?.id ?? FALLBACK_CATEGORY_ID;
        set({
          categories: ensureCategories(categories),
          transactions: get().transactions.map((tx) =>
            tx.categoryId === id ? { ...tx, categoryId: fallback } : tx,
          ),
        });
      },
      addMember: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        set({ members: [...get().members, { id: `mem-${newId()}`, name: trimmed }] });
        return true;
      },
      updateMember: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          members: get().members.map((m) => (m.id === id ? { ...m, name: trimmed } : m)),
        });
      },
      removeMember: (id) => {
        if (get().members.length <= 1) return;
        set({
          members: get().members.filter((m) => m.id !== id),
          transactions: get().transactions.map((tx) =>
            tx.memberId === id ? { ...tx, memberId: undefined } : tx,
          ),
        });
      },
      addRecurring: (item) => {
        set({ recurring: [...get().recurring, { ...item, id: `rec-${newId()}` }] });
      },
      updateRecurring: (id, patch) => {
        set({
          recurring: get().recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        });
      },
      removeRecurring: (id) => {
        set({ recurring: get().recurring.filter((r) => r.id !== id) });
      },
      addDebt: (item) => {
        set({ debts: [...get().debts, { ...item, id: `debt-${newId()}` }] });
      },
      updateDebt: (id, patch) => {
        set({ debts: get().debts.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
      },
      removeDebt: (id) => {
        set({ debts: get().debts.filter((d) => d.id !== id) });
      },
      payDebt: (id, amount, walletId, date) => {
        const debt = get().debts.find((d) => d.id === id);
        if (!debt || amount <= 0) return;
        const paid = Math.min(amount, debt.remaining);
        const row: Transaction = {
          id: newId(),
          type: "expense",
          amount: paid,
          date,
          categoryId: FALLBACK_CATEGORY_ID,
          walletId,
          payee: debt.name,
          note: debt.lender,
          source: "manual",
          debtId: id,
          createdAt: new Date().toISOString(),
        };
        set({
          isDemo: false,
          transactions: [row, ...get().transactions],
          debts: get().debts.map((d) =>
            d.id === id ? { ...d, remaining: Math.max(0, d.remaining - paid) } : d,
          ),
        });
      },
      addGoal: (item) => {
        set({ goals: [...get().goals, { ...item, id: `goal-${newId()}` }] });
      },
      updateGoal: (id, patch) => {
        set({ goals: get().goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
      },
      removeGoal: (id) => {
        set({ goals: get().goals.filter((g) => g.id !== id) });
      },
      contributeGoal: (id, amount, walletId, date) => {
        const goal = get().goals.find((g) => g.id === id);
        if (!goal || amount <= 0) return;
        const row: Transaction = {
          id: newId(),
          type: "transfer",
          amount,
          date,
          categoryId: TRANSFER_CATEGORY_ID,
          walletId,
          payee: goal.name,
          note: "",
          source: "manual",
          goalId: id,
          createdAt: new Date().toISOString(),
        };
        set({
          isDemo: false,
          transactions: [row, ...get().transactions],
          goals: get().goals.map((g) => (g.id === id ? { ...g, saved: g.saved + amount } : g)),
        });
      },
      addRule: (pattern, categoryId, walletId) => {
        const trimmed = pattern.trim();
        if (!trimmed) return false;
        set({
          rules: [
            ...get().rules,
            { id: `rule-${newId()}`, pattern: trimmed, categoryId, walletId },
          ],
        });
        return true;
      },
      updateRule: (id, patch) => {
        set({
          rules: get().rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        });
      },
      removeRule: (id) => {
        set({ rules: get().rules.filter((r) => r.id !== id) });
      },
      ensureRecurringPosted: () => {
        const today = todayIso();
        const extra: Transaction[] = [];
        const existing = get().transactions;
        const nextItems = get().recurring.map((item) => {
          const dates = dueRecurringDates(item, today).filter(
            (date) =>
              !existing.some((tx) => tx.recurringId === item.id && tx.date === date) &&
              !extra.some((tx) => tx.recurringId === item.id && tx.date === date),
          );
          if (!dates.length) return item;
          for (const date of dates) {
            extra.push({
              id: newId(),
              type: item.type,
              amount: item.amount,
              date,
              categoryId: item.categoryId,
              walletId: item.walletId,
              memberId: item.memberId,
              payee: item.name,
              note: item.isSubscription ? "subscription" : "",
              source: "recurring",
              recurringId: item.id,
              createdAt: new Date().toISOString(),
            });
          }
          const last = dates[dates.length - 1];
          return {
            ...item,
            nextDate: nextRecurringDate(last, item.frequency, item.dayOfMonth),
          };
        });
        if (!extra.length) return 0;
        set({
          recurring: nextItems,
          transactions: [...extra, ...get().transactions],
        });
        return extra.length;
      },
      keepDemoData: () => set({ isDemo: false }),
      clearAndStart: () =>
        set({
          isDemo: false,
          transactions: [],
          wallets: DEFAULT_WALLETS,
          members: DEFAULT_MEMBERS.slice(0, 1),
          recurring: [],
          debts: [],
          goals: [],
        }),
      restoreDemo: () =>
        set({
          isDemo: true,
          transactions: buildDemoTransactions(),
          wallets: DEFAULT_WALLETS,
          categories: DEFAULT_CATEGORIES,
          members: DEFAULT_MEMBERS,
          recurring: buildDemoRecurring(),
          debts: buildDemoDebts(),
          goals: buildDemoGoals(),
          rules: buildDemoRules(),
          selectedMonth: currentMonth(),
        }),
      replaceAll: (snap) => {
        set({
          isDemo: snap.isDemo,
          initialized: true,
          transactions: snap.transactions ?? [],
          wallets: (snap.wallets?.length ? snap.wallets : DEFAULT_WALLETS).map(normalizeWallet),
          categories: ensureCategories(snap.categories),
          members: snap.members?.length ? snap.members : DEFAULT_MEMBERS.slice(0, 1),
          recurring: snap.recurring ?? [],
          debts: snap.debts ?? [],
          goals: snap.goals ?? [],
          rules: snap.rules ?? [],
          lang: snap.lang === "en" ? "en" : "th",
          theme: snap.theme === "night" || snap.theme === "system" ? snap.theme : "paper",
        });
      },
      exportSnapshot: () => ({
        version: 2,
        transactions: get().transactions,
        wallets: get().wallets,
        categories: get().categories,
        members: get().members,
        recurring: get().recurring,
        debts: get().debts,
        goals: get().goals,
        rules: get().rules,
        lang: get().lang,
        theme: get().theme,
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
          lang: persisted.lang === "en" ? "en" : currentState.lang,
          theme:
            persisted.theme === "night" || persisted.theme === "system" || persisted.theme === "paper"
              ? persisted.theme
              : currentState.theme,
          geminiKey: typeof persisted.geminiKey === "string" ? persisted.geminiKey : currentState.geminiKey,
          categories: ensureCategories(persisted.categories),
          wallets: (persisted.wallets?.length ? persisted.wallets : DEFAULT_WALLETS).map(
            normalizeWallet,
          ),
          members: persisted.members?.length ? persisted.members : DEFAULT_MEMBERS,
          recurring: persisted.recurring ?? currentState.recurring,
          debts: persisted.debts ?? currentState.debts,
          goals: persisted.goals ?? currentState.goals,
          rules: persisted.rules ?? currentState.rules,
        };
      },
      partialize: (state) => ({
        isDemo: state.isDemo,
        initialized: state.initialized,
        lang: state.lang,
        theme: state.theme,
        geminiKey: state.geminiKey,
        transactions: stripThumbs(state.transactions),
        wallets: state.wallets,
        categories: state.categories,
        members: state.members,
        recurring: state.recurring,
        debts: state.debts,
        goals: state.goals,
        rules: state.rules,
      }),
    },
  ),
);
