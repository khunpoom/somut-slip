import { addDaysIso, addMonthsIso } from "./defaults";
import type { AutoRule, RecurringFreq, RecurringItem } from "./types";

export function matchRule(rules: AutoRule[], payee: string) {
  const p = payee.trim().toLowerCase();
  if (!p) return undefined;
  return rules.find((r) => {
    const pat = r.pattern.trim().toLowerCase();
    return pat.length > 0 && p.includes(pat);
  });
}

export function nextRecurringDate(fromIso: string, freq: RecurringFreq, dayOfMonth: number) {
  if (freq === "weekly") return addDaysIso(fromIso, 7);
  if (freq === "yearly") return addMonthsIso(fromIso, 12, dayOfMonth);
  return addMonthsIso(fromIso, 1, dayOfMonth);
}

export function dueRecurringDates(item: RecurringItem, today: string) {
  if (!item.active) return [] as string[];
  const dates: string[] = [];
  let cursor = item.nextDate;
  let guard = 0;
  while (cursor <= today && guard < 36) {
    if (!item.endDate || cursor <= item.endDate) dates.push(cursor);
    cursor = nextRecurringDate(cursor, item.frequency, item.dayOfMonth);
    guard += 1;
  }
  return dates;
}

export function monthlySubscriptionTotal(items: RecurringItem[]) {
  return items.reduce((sum, item) => {
    if (!item.active || !item.isSubscription || item.type !== "expense") return sum;
    if (item.frequency === "monthly") return sum + item.amount;
    if (item.frequency === "yearly") return sum + item.amount / 12;
    if (item.frequency === "weekly") return sum + (item.amount * 52) / 12;
    return sum;
  }, 0);
}
