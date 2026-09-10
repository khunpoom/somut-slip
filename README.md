# สมุดสลิป / Somut Slip

สมุดรายรับรายจ่ายส่วนตัว อ่านยอดจากสลิปโอนเงิน / พร้อมเพย์ / ใบเสร็จ แล้วบันทึกในเครื่อง

โปรเจกต์เล่น ๆ จากไอเดียยามว่าง **เขียนด้วย Grok**

A hobby ledger from an idle idea, **written with Grok**.

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
- Slip OCR (optional xAI key)
- JSON / CSV backup

Data stays in the browser. Nothing is uploaded to a central database.

## Run

```bash
npm install
npm run dev
```

Default port is `8080`.

```bash
npm run typecheck
npm run build
```

Slip reading uses `XAI_API_KEY` on the server. Without a key, you can still enter entries by hand.

## Windows opener

- `public/somut-slip.bat` — double-click if Node is installed; it starts the app and opens the browser
- `desktop/launcher.c` — compile a `.exe` on Windows or with MinGW:

```bash
x86_64-w64-mingw32-gcc -O2 -mwindows desktop/launcher.c -lshell32 -o public/SomutSlip.exe
```

- Electron window (optional): `npx electron desktop/main.mjs` while `npm run dev` is running

## Privacy

Family sharing is **same-device only**. Export JSON if you want to copy the book to another machine.
