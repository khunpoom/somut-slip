import { tr, type MsgKey } from "@/lib/i18n";
import { useLedger } from "@/lib/ledger/store";

export function useT() {
  const lang = useLedger((s) => s.lang);
  function t(key: MsgKey, vars?: Record<string, string | number>) {
    return tr(lang, key, vars);
  }
  return { t, lang };
}
