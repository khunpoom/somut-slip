import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TransactionForm } from "@/components/ledger/tx-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-hook";
import { useLedger } from "@/lib/ledger/store";

type NewSearch = {
  id?: string;
  slip?: boolean;
};

export const Route = createFileRoute("/new")({
  validateSearch: (search: Record<string, unknown>): NewSearch => ({
    id: typeof search.id === "string" ? search.id : undefined,
    slip: search.slip === true || search.slip === "true",
  }),
  component: NewPage,
});

function NewPage() {
  const { t } = useT();
  const { id, slip } = Route.useSearch();
  const navigate = useNavigate();
  const transactions = useLedger((s) => s.transactions);
  const deleteTransaction = useLedger((s) => s.deleteTransaction);
  const editing = id ? transactions.find((tx) => tx.id === id) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {editing ? t("editTx") : slip ? t("slipTitle") : t("newTx")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing ? t("editTxHint") : t("newTxHint")}
          </p>
        </div>
        {editing ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label={t("delete")}>
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteTxQ")}</AlertDialogTitle>
                <AlertDialogDescription>{t("deleteTxHint")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    deleteTransaction(editing.id);
                    toast.success(t("deletedTx"));
                    void navigate({ to: "/transactions" });
                  }}
                >
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      <TransactionForm editing={editing} startWithSlip={Boolean(slip) && !editing} />
    </div>
  );
}
