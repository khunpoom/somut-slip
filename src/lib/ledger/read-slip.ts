import { parseWithGemini } from "./ocr-gemini";
import { parseWithTesseract } from "./ocr-local";
import { parseSlipImage } from "./parse-slip";
import type { SlipParse } from "./types";

export type SlipEngine = "gemini" | "cloud" | "local";

export type ReadSlipResult =
  | { ok: true; slip: SlipParse; engine: SlipEngine }
  | { ok: false; error: string };

export async function readSlip(imageDataUrl: string, geminiKey?: string): Promise<ReadSlipResult> {
  const key = geminiKey?.trim();
  if (key) {
    const gemini = await parseWithGemini(key, imageDataUrl);
    if (gemini.ok) return { ok: true, slip: gemini.slip, engine: "gemini" };
  }

  try {
    const cloud = await parseSlipImage({ data: { imageDataUrl } });
    if (cloud.ok) return { ok: true, slip: cloud.slip, engine: "cloud" };
  } catch {
    // Fall through to on-device OCR.
  }

  const local = await parseWithTesseract(imageDataUrl);
  if (local.ok) return { ok: true, slip: local.slip, engine: "local" };
  return { ok: false, error: local.error };
}
