import { createServerFn } from "@tanstack/react-start";
import { parseWithGemini } from "./ocr-gemini";
import { parseJsonObject, SLIP_PROMPT, toSlip } from "./slip-fields";
import type { SlipParse } from "./types";

async function callXai(apiKey: string, imageDataUrl: string) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SLIP_PROMPT },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });
  return res;
}

async function parseWithXai(
  apiKey: string,
  imageDataUrl: string,
): Promise<{ ok: true; slip: SlipParse } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await callXai(apiKey, imageDataUrl);
    if (!res.ok && res.status >= 500) {
      res = await callXai(apiKey, imageDataUrl);
    }
  } catch {
    return { ok: false, error: "เชื่อมต่อตัวอ่านสลิปไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  if (!res.ok) {
    return { ok: false, error: "อ่านสลิปไม่สำเร็จ ลองถ่ายใหม่ให้ชัดขึ้น" };
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content ?? "";
  try {
    return { ok: true, slip: toSlip(parseJsonObject(text)) };
  } catch {
    return { ok: false, error: "อ่านค่าจากสลิปไม่ครบ กรอกมือแล้วแนบรูปได้" };
  }
}

export const parseSlipImage = createServerFn({ method: "POST" })
  .validator((input: { imageDataUrl: string }) => {
    if (!input || typeof input.imageDataUrl !== "string") {
      throw new Error("ไม่มีรูปสลิป");
    }
    const url = input.imageDataUrl;
    if (!url.startsWith("data:image/jpeg") && !url.startsWith("data:image/png")) {
      throw new Error("รองรับเฉพาะไฟล์ JPG หรือ PNG");
    }
    if (url.length > 1_800_000) {
      throw new Error("รูปใหญ่เกินไป กรุณาถ่ายใหม่ให้ชัดขึ้นในระยะใกล้");
    }
    return { imageDataUrl: url };
  })
  .handler(async ({ data }): Promise<{ ok: true; slip: SlipParse } | { ok: false; error: string }> => {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      const gemini = await parseWithGemini(geminiKey, data.imageDataUrl);
      if (gemini.ok) return gemini;
    }

    const xaiKey = process.env.XAI_API_KEY?.trim();
    if (xaiKey) {
      return parseWithXai(xaiKey, data.imageDataUrl);
    }

    return { ok: false, error: "ยังไม่มีคีย์ AI ฝั่งเซิร์ฟเวอร์" };
  });
