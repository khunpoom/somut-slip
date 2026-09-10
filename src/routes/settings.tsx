import { createFileRoute } from "@tanstack/react-router";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FALLBACK_CATEGORY_ID } from "@/lib/ledger/defaults";
import { formatBaht } from "@/lib/ledger/format";
import { useLedger } from "@/lib/ledger/store";
import type { CategoryKind, LedgerSnapshot } from "@/lib/ledger/types";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const KIND_LABEL: Record<CategoryKind, string> = {
  expense: "รายจ่าย",
  income: "รายรับ",
  both: "ทั้งสอง",
};

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function SettingsPage() {
  const wallets = useLedger((s) => s.wallets);
  const categories = useLedger((s) => s.categories);
  const transactions = useLedger((s) => s.transactions);
  const addWallet = useLedger((s) => s.addWallet);
  const renameWallet = useLedger((s) => s.renameWallet);
  const removeWallet = useLedger((s) => s.removeWallet);
  const addCategory = useLedger((s) => s.addCategory);
  const updateCategory = useLedger((s) => s.updateCategory);
  const removeCategory = useLedger((s) => s.removeCategory);
  const exportSnapshot = useLedger((s) => s.exportSnapshot);
  const replaceAll = useLedger((s) => s.replaceAll);
  const restoreDemo = useLedger((s) => s.restoreDemo);
  const clearAndStart = useLedger((s) => s.clearAndStart);
  const [walletName, setWalletName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<CategoryKind>("expense");
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const snap = exportSnapshot();
    download(
      `somut-slip-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(snap, null, 2),
      "application/json",
    );
    toast.success("ส่งออกไฟล์สำรองแล้ว");
  }

  function exportCsv() {
    const header = ["วันที่", "ประเภท", "ยอด", "หมวด", "ร้านค้า", "กระเป๋า", "บันทึก", "อ้างอิง"];
    const lines = transactions.map((tx) =>
      [
        tx.date,
        tx.type === "income" ? "รายรับ" : "รายจ่าย",
        String(tx.amount),
        categories.find((c) => c.id === tx.categoryId)?.name ?? "",
        tx.payee,
        wallets.find((w) => w.id === tx.walletId)?.name ?? "",
        tx.note,
        tx.ref ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
    download(
      `somut-slip-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${header.join(",")}\n${lines.join("\n")}`,
      "text/csv;charset=utf-8",
    );
    toast.success("ส่งออก CSV แล้ว");
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as LedgerSnapshot;
      if (!Array.isArray(parsed.transactions)) throw new Error("invalid");
      replaceAll({
        version: 1,
        transactions: parsed.transactions,
        wallets: parsed.wallets ?? wallets,
        categories: parsed.categories ?? categories,
        isDemo: Boolean(parsed.isDemo),
        initialized: true,
      });
      toast.success("นำเข้าข้อมูลแล้ว");
    } catch {
      toast.error("ไฟล์สำรองไม่ถูกต้อง");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold">ตั้งค่า</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ข้อมูลอยู่บนเครื่องนี้เท่านั้น สำรองไว้ถ้าจะย้ายเครื่อง
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>หมวดหมู่</CardTitle>
          <CardDescription>เพิ่ม เปลี่ยนชื่อ หรือลบหมวดที่ใช้บันทึกรายการ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                <Input
                  defaultValue={category.name}
                  onBlur={(e) => updateCategory(category.id, { name: e.target.value })}
                  className="h-10 sm:flex-1"
                  aria-label={`ชื่อหมวด ${category.name}`}
                />
                <div className="sm:w-36">
                  <NativeSelect
                    className="h-10"
                    value={category.type}
                    onChange={(e) =>
                      updateCategory(category.id, { type: e.target.value as CategoryKind })
                    }
                    aria-label={`ประเภทหมวด ${category.name}`}
                  >
                    <option value="expense">รายจ่าย</option>
                    <option value="income">รายรับ</option>
                    <option value="both">ทั้งสอง</option>
                  </NativeSelect>
                </div>
                {category.id === FALLBACK_CATEGORY_ID ? (
                  <span className="h-10 px-2 text-xs leading-10 text-muted-foreground">ลบไม่ได้</span>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCategory(category.id)}>
                    ลบ
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!categoryName.trim()) {
                toast.error("กรอกชื่อหมวดก่อน");
                return;
              }
              if (!addCategory(categoryName, categoryKind)) {
                toast.error("มีหมวดชื่อนี้อยู่แล้ว");
                return;
              }
              toast.success(`เพิ่มหมวด${KIND_LABEL[categoryKind]}แล้ว`);
              setCategoryName("");
            }}
          >
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="ชื่อหมวดใหม่ เช่น ค่าขนม"
            />
            <div className="sm:w-36">
              <NativeSelect
                value={categoryKind}
                onChange={(e) => setCategoryKind(e.target.value as CategoryKind)}
              >
                <option value="expense">รายจ่าย</option>
                <option value="income">รายรับ</option>
                <option value="both">ทั้งสอง</option>
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              เพิ่มหมวด
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>กระเป๋าเงิน</CardTitle>
          <CardDescription>แยกเงินสด บัญชีธนาคาร หรือพร้อมเพย์</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {wallets.map((wallet) => (
              <li key={wallet.id} className="flex items-center gap-2 px-3 py-2">
                <Input
                  defaultValue={wallet.name}
                  onBlur={(e) => renameWallet(wallet.id, e.target.value)}
                  className="h-10"
                />
                {wallets.length > 1 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeWallet(wallet.id)}>
                    ลบ
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addWallet(walletName);
              setWalletName("");
            }}
          >
            <Input
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="ชื่อกระเป๋าใหม่"
            />
            <Button type="submit" variant="outline">
              เพิ่ม
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>สำรองข้อมูล</CardTitle>
          <CardDescription>
            มี {transactions.length} รายการ · รวม {formatBaht(transactions.reduce((s, t) => s + t.amount, 0))}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={exportJson}>
            <Download />
            ส่งออก JSON
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download />
            ส่งออก CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => void importJson(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload />
            นำเข้า JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลในสมุด</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={restoreDemo}>
            ใส่ข้อมูลตัวอย่าง
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                ล้างรายการทั้งหมด
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ล้างสมุดทั้งเล่ม?</AlertDialogTitle>
                <AlertDialogDescription>
                  รายการทั้งหมดจะหายจากเครื่องนี้ ส่งออกไฟล์สำรองก่อนถ้ายังต้องการ หมวดหมู่ที่คุณสร้างไว้ยังอยู่
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    clearAndStart();
                    toast.success("ล้างสมุดแล้ว");
                  }}
                >
                  ล้างทั้งหมด
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
