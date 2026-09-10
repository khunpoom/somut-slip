import { useEffect } from "react";
import { useLedger } from "@/lib/ledger/store";

function resolveDark(theme: "paper" | "night" | "system") {
  if (theme === "night") return true;
  if (theme === "paper") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: "paper" | "night" | "system") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveDark(theme));
}

export function PrefsSync() {
  const theme = useLedger((s) => s.theme);
  const lang = useLedger((s) => s.lang);
  const ensureRecurringPosted = useLedger((s) => s.ensureRecurringPosted);

  useEffect(() => {
    applyTheme(theme);
    document.documentElement.lang = lang === "en" ? "en" : "th";
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, lang]);

  useEffect(() => {
    ensureRecurringPosted();
  }, [ensureRecurringPosted]);

  return null;
}
