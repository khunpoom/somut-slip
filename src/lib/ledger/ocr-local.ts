import { parseThaiSlipText } from "./slip-text";
import type { SlipParse } from "./types";

type TessWorker = {
  recognize: (image: string) => Promise<{ data: { text: string } }>;
};

let workerPromise: Promise<TessWorker> | null = null;

async function getWorker(): Promise<TessWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("tha+eng", 1, {
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/tesseract-core.wasm.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0",
      }) as Promise<TessWorker>;
    })();
  }
  return workerPromise;
}

export async function parseWithTesseract(
  imageDataUrl: string,
): Promise<{ ok: true; slip: SlipParse } | { ok: false; error: string }> {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(imageDataUrl);
    const slip = parseThaiSlipText(data.text ?? "");
    if (!slip.amount && !slip.payee && !slip.date) {
      return { ok: false, error: "อ่านตัวอักษรจากสลิปไม่ครบ ลองถ่ายใหม่ให้ชัดขึ้น หรือกรอกมือ" };
    }
    return { ok: true, slip };
  } catch {
    workerPromise = null;
    return { ok: false, error: "อ่านสลิปในเครื่องไม่สำเร็จ ลองถ่ายใหม่หรือกรอกมือ" };
  }
}
