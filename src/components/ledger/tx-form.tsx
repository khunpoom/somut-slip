import { useNavigate } from "@tanstack/react-router";
import { Camera, LoaderCircle, ScanLine, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { categoriesForType, pickCategoryId, todayIso } from "@/lib/ledger/defaults";
import { parseBahtInput } from "@/lib/ledger/format";
import { prepareSlipImage } from "@/lib/ledger/image";
import { parseSlipImage } from "@/lib/ledger/parse-slip";
import { useLedger } from "@/lib/ledger/store";
import type { CategoryId, Transaction, TxType } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

type FormState = {
  type: TxType;
  amount: string;
  date: string;
  categoryId: CategoryId;
  walletId: string;
  payee: string;
  note: string;
  ref: string;
  source: "manual" | "slip";
  slipThumb?: string;
};

function emptyForm(type: TxType, walletId: string, categoryId: string): FormState {
  return {
    type,
    amount: "",
    date: todayIso(),
    categoryId,
    walletId,
    payee: "",
    note: "",
    ref: "",
    source: "manual",
  };
}

function fromTx(tx: Transaction): FormState {
  return {
    type: tx.type,
    amount: String(tx.amount),
    date: tx.date,
    categoryId: tx.categoryId,
    walletId: tx.walletId,
    payee: tx.payee,
    note: tx.note,
    ref: tx.ref ?? "",
    source: tx.source,
    slipThumb: tx.slipThumb,
  };
}

export function TransactionForm({
  editing,
  startWithSlip = false,
  defaultType = "expense",
}: {
  editing?: Transaction;
  startWithSlip?: boolean;
  defaultType?: TxType;
}) {
  const navigate = useNavigate();
  const wallets = useLedger((s) => s.wallets);
  const allCategories = useLedger((s) => s.categories);
  const addTransaction = useLedger((s) => s.addTransaction);
  const updateTransaction = useLedger((s) => s.updateTransaction);
  const defaultWallet = wallets[0]?.id ?? "cash";

  const [form, setForm] = useState<FormState>(() =>
    editing
      ? fromTx(editing)
      : emptyForm(defaultType, defaultWallet, pickCategoryId(allCategories, defaultType)),
  );
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(editing?.slipThumb);
  const [slipOpen, setSlipOpen] = useState(startWithSlip && !editing);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setForm(fromTx(editing));
  }, [editing]);

  const categories = useMemo(
    () => categoriesForType(allCategories, form.type),
    [allCategories, form.type],
  );

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    try {
      const prepared = await prepareSlipImage(file);
      setPreview(prepared.thumb);
      const result = await parseSlipImage({ data: { imageDataUrl: prepared.dataUrl } });
      if (!result.ok) {
        patch({ source: "slip", slipThumb: prepared.thumb });
        toast.error(result.error);
        return;
      }
      const slip = result.slip;
      const nextType = slip.type;
      const categoryId = pickCategoryId(allCategories, nextType, slip.categoryHint);
      const noteBits = [slip.bank, slip.time ? `เวลา ${slip.time}` : null].filter(Boolean);
      patch({
        type: nextType,
        amount: slip.amount != null ? String(slip.amount) : "",
        date: slip.date ?? todayIso(),
        categoryId,
        payee: slip.payee ?? "",
        note: [slip.note, ...noteBits].filter(Boolean).join(" · "),
        ref: slip.ref ?? "",
        source: "slip",
        slipThumb: prepared.thumb,
      });
      const conf = Math.round(slip.confidence * 100);
      if (slip.amount == null) {
        toast.message("อ่านสลิปได้บางส่วน — กรอกยอดให้ครบ");
      } else {
        toast.success(`อ่านสลิปแล้ว${conf ? ` (มั่นใจ ${conf}%)` : ""} — ตรวจก่อนบันทึก`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อ่านรูปไม่สำเร็จ");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseBahtInput(form.amount);
    if (amount == null || amount <= 0) {
      toast.error("กรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    if (!form.date) {
      toast.error("เลือกวันที่");
      return;
    }
    const draft = {
      type: form.type,
      amount,
      date: form.date,
      categoryId: form.categoryId,
      walletId: form.walletId || defaultWallet,
      payee: form.payee.trim() || (form.type === "income" ? "รายรับ" : "รายจ่าย"),
      note: form.note.trim(),
      ref: form.ref.trim() || undefined,
      source: form.source,
      slipThumb: form.slipThumb,
    };
    if (editing) {
      updateTransaction(editing.id, draft);
      toast.success("แก้ไขรายการแล้ว");
    } else {
      addTransaction(draft);
      toast.success("บันทึกรายการแล้ว");
    }
    void navigate({ to: "/" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
        {(["expense", "income"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              const keep = categoriesForType(allCategories, type).some(
                (c) => c.id === form.categoryId,
              );
              patch({
                type,
                categoryId: keep ? form.categoryId : pickCategoryId(allCategories, type),
              });
            }}
            className={cn(
              "h-11 rounded-md text-sm font-medium transition-colors",
              form.type === type
                ? type === "income"
                  ? "bg-income text-income-foreground"
                  : "bg-expense text-expense-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {type === "income" ? "รายรับ" : "รายจ่าย"}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">จำนวนเงิน</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-2xl text-muted-foreground">
                ฿
              </span>
              <Input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={form.amount}
                onChange={(e) => patch({ amount: e.target.value })}
                className="h-16 pl-12 font-display text-3xl font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">วันที่</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">หมวด</Label>
              <NativeSelect
                id="category"
                value={form.categoryId}
                onChange={(e) => patch({ categoryId: e.target.value as CategoryId })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payee">{form.type === "income" ? "แหล่งที่มา" : "ร้านค้า / ผู้รับ"}</Label>
              <Input
                id="payee"
                value={form.payee}
                placeholder={form.type === "income" ? "เช่น เงินเดือน" : "เช่น 7-Eleven"}
                onChange={(e) => patch({ payee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet">กระเป๋า</Label>
              <NativeSelect
                id="wallet"
                value={form.walletId}
                onChange={(e) => patch({ walletId: e.target.value })}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">บันทึก</Label>
            <Textarea
              id="note"
              rows={2}
              value={form.note}
              placeholder="รายละเอียดเพิ่มเติม"
              onChange={(e) => patch({ note: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">อ่านจากสลิป</p>
              <p className="text-sm text-muted-foreground">ถ่ายหรืออัปโหลดสลิปโอนเงิน / ใบเสร็จ</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setSlipOpen((v) => !v)}>
              <ScanLine />
              {slipOpen ? "ซ่อน" : "เปิด"}
            </Button>
          </div>

          {slipOpen ? (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={reading}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void onFile(e.dataTransfer.files?.[0]);
                }}
                className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/50 px-4 py-6 text-center transition-colors hover:bg-muted"
              >
                {reading ? (
                  <>
                    <LoaderCircle className="size-6 animate-spin text-primary" />
                    <p className="text-sm font-medium">กำลังอ่านสลิป…</p>
                  </>
                ) : preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="สลิปที่อัปโหลด"
                      className="max-h-48 rounded-md object-contain"
                    />
                    <span className="mt-2 block text-sm text-muted-foreground">แตะเพื่อเปลี่ยนรูป</span>
                  </div>
                ) : (
                  <>
                    <Camera className="size-6 text-primary" />
                    <p className="text-sm font-medium">วางรูปที่นี่ หรือถ่ายสลิป</p>
                    <p className="text-xs text-muted-foreground">รองรับสลิปธนาคาร พร้อมเพย์ และใบเสร็จร้าน</p>
                  </>
                )}
              </button>
              {preview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreview(undefined);
                    patch({ slipThumb: undefined, source: "manual" });
                  }}
                >
                  <X />
                  ลบรูป
                </Button>
              ) : null}
            </div>
          ) : preview ? (
            <img src={preview} alt="สลิป" className="max-h-28 rounded-md object-contain" />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => void navigate({ to: "/" })}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={reading}>
          {editing ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
        </Button>
      </div>
    </form>
  );
}
