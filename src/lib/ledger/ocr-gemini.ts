import { parseJsonObject, SLIP_PROMPT, splitDataUrl, toSlip } from "./slip-fields";
import type { SlipParse } from "./types";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

export async function parseWithGemini(
  apiKey: string,
  imageDataUrl: string,
): Promise<{ ok: true; slip: SlipParse } | { ok: false; error: string }> {
  const { mime, base64 } = splitDataUrl(imageDataUrl);
  let lastStatus = 0;

  for (const model of GEMINI_MODELS) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: SLIP_PROMPT },
                  { inlineData: { mimeType: mime, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 500,
              responseMimeType: "application/json",
            },
          }),
        },
      );
    } catch {
      return { ok: false, error: "เชื่อมต่อตัวอ่านสลิปไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }

    lastStatus = res.status;
    if (res.status === 404 || res.status === 400) continue;
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: "คีย์ Gemini ใช้ไม่ได้ ตรวจในตั้งค่าอีกครั้ง" };
      }
      continue;
    }

    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    try {
      return { ok: true, slip: toSlip(parseJsonObject(text)) };
    } catch {
      return { ok: false, error: "อ่านค่าจากสลิปไม่ครบ กรอกมือแล้วแนบรูปได้" };
    }
  }

  if (lastStatus === 401 || lastStatus === 403) {
    return { ok: false, error: "คีย์ Gemini ใช้ไม่ได้ ตรวจในตั้งค่าอีกครั้ง" };
  }
  return { ok: false, error: "อ่านสลิปด้วย Gemini ไม่สำเร็จ" };
}
