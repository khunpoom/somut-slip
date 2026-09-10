const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

async function toBitmap(file: Blob) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("อ่านรูปไม่ได้"));
        el.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("ไม่สามารถประมวลผลรูปได้");
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("แปลงรูปไม่สำเร็จ"))),
          "image/jpeg",
          0.92,
        );
      });
      return await createImageBitmap(blob);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function drawJpeg(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<string> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("ไม่สามารถประมวลผลรูปได้"));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return Promise.resolve(canvas.toDataURL("image/jpeg", quality));
}

export async function prepareSlipImage(file: File) {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new Error("กรุณาเลือกรูปสลิปหรือใบเสร็จ");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("ไฟล์ใหญ่เกิน 8MB");
  }
  const bitmap = await toBitmap(file);
  try {
    const [dataUrl, thumb] = await Promise.all([
      drawJpeg(bitmap, 1280, 0.74),
      drawJpeg(bitmap, 280, 0.55),
    ]);
    if (dataUrl.length > 1_600_000) {
      const smaller = await drawJpeg(bitmap, 960, 0.62);
      return { dataUrl: smaller, thumb };
    }
    return { dataUrl, thumb };
  } finally {
    bitmap.close();
  }
}
