import assert from "node:assert/strict";
import test from "node:test";
import { parseThaiSlipText } from "./slip-text.ts";

test("reads a PromptPay transfer slip", () => {
  const slip = parseThaiSlipText(`
ธนาคารกสิกรไทย
โอนเงินสำเร็จ
จำนวนเงิน 1,250.00 บาท
วันที่ 10 ก.ย. 2569 14:32
ผู้รับเงิน
ร้านกาแฟดอยช้าง
พร้อมเพย์
`);
  assert.equal(slip.amount, 1250);
  assert.equal(slip.date, "2026-09-10");
  assert.equal(slip.time, "14:32");
  assert.equal(slip.payee, "ร้านกาแฟดอยช้าง");
  assert.equal(slip.bank, "พร้อมเพย์");
  assert.equal(slip.type, "expense");
  assert.equal(slip.kind, "transfer");
});

test("reads a TrueMoney bill and ignores the year as amount", () => {
  const slip = parseThaiSlipText(`
TrueMoney Wallet
จ่ายบิลสำเร็จ
ยอดชำระ 99.00
วันที่ 09/09/2026
ผู้รับ AIS
`);
  assert.equal(slip.amount, 99);
  assert.equal(slip.date, "2026-09-09");
  assert.equal(slip.bank, "TrueMoney");
  assert.equal(slip.payee, "AIS");
  assert.equal(slip.categoryHint, "บิลและสาธารณูปโภค");
});

test("marks incoming transfers as income", () => {
  const slip = parseThaiSlipText(`
เงินเข้า
จำนวนเงิน 15,000.00
ผู้โอน บริษัท ABC
วันที่ 1/9/2569
`);
  assert.equal(slip.type, "income");
  assert.equal(slip.amount, 15000);
  assert.equal(slip.date, "2026-09-01");
});
