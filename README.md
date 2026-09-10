# สมุดสลิป / Somut Slip

สมุดรายรับรายจ่ายส่วนตัว อ่านยอดจากสลิปโอนเงิน / พร้อมเพย์ / ใบเสร็จ แล้วบันทึกในเครื่อง

โปรเจกต์เล่น ๆ จากไอเดียยามว่าง **เขียนด้วย Grok**

A hobby ledger from an idle idea, **written with Grok**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/khunpoom/somut-slip)

## Features

- Income, expense, and **internal transfers** (transfers are not counted as income)
- Cash, bank, credit card, e-Wallet (PromptPay, TrueMoney, …)
- Custom categories
- **Quick add** on the home screen
- Recurring bills / subscriptions
- Debts and savings goals
- Auto-category rules (payee contains → category)
- Search and filters
- Household members on this device (not cloud-synced)
- Thai / English, paper / night / system theme
- Slip OCR on-device (free) + optional Gemini key
- JSON / CSV backup

Data stays in the visitor's browser. Nothing is uploaded to a central database.

## Slip reading

Works without any paid API:

1. **On-device OCR (default)** — Tesseract reads Thai/English on this device. No key.
2. **Gemini (optional, free)** — paste a key from [Google AI Studio](https://aistudio.google.com/apikey) in Settings for better accuracy. The key stays in the browser and is not exported with backups.
3. **Server keys (optional)** — `GEMINI_API_KEY` or `XAI_API_KEY` on Vercel if you want cloud reading without each visitor pasting a key. Don't set a shared key on a public site; visitors would spend your quota.

## Deploy on Vercel

ได้ — โปรเจกต์นี้เป็น TanStack Start + Nitro ที่ build แบบ Vercel อยู่แล้ว

1. เปิด [vercel.com/new](https://vercel.com/new) แล้ว Import repo `khunpoom/somut-slip`
2. Framework ควรเป็น **TanStack Start** (มี `vercel.json` บังคับไว้แล้ว)
3. ไม่ต้องใส่ API key — อ่านสลิปในเครื่องได้เลย
4. ไม่ต้องใส่ `DATABASE_URL` ข้อมูลรายการอยู่บนเครื่องผู้ใช้แต่ละคน

หรือกดปุ่ม Deploy ด้านบน

หลัง deploy ทุกคนเปิดลิงก์ได้ แต่สมุดของแต่ละคนแยกกันในเบราว์เซอร์ตัวเอง

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

## Windows opener

- `public/somut-slip.bat` — double-click if Node is installed; it starts the app and opens the browser
- `desktop/launcher.c` — compile a `.exe` on Windows or with MinGW:

```bash
x86_64-w64-mingw32-gcc -O2 -mwindows desktop/launcher.c -lshell32 -o public/SomutSlip.exe
```

- Electron window (optional): `npx electron desktop/main.mjs` while `npm run dev` is running

## Privacy

Family sharing is **same-device only**. Export JSON if you want to copy the book to another machine.
