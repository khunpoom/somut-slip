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
            {editing ? "แก้ไขรายการ" : slip ? "อ่านสลิป" : "รายการใหม่"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing
              ? "ปรับยอด หมวด หรือรูปสลิปได้"
              : "กรอกมือ หรือให้ระบบอ่านยอดจากรูปสลิป"}
          </p>
        </div>
        {editing ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="ลบรายการ">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ลบรายการนี้?</AlertDialogTitle>
                <AlertDialogDescription>
                  ลบแล้วกู้คืนไม่ได้ เว้นแต่คุณมีไฟล์สำรอง
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    deleteTransaction(editing.id);
                    toast.success("ลบรายการแล้ว");
                    void navigate({ to: "/transactions" });
                  }}
                >
                  ลบ
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
