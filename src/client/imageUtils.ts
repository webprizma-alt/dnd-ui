/**
 * Reads an image File and downscales it via canvas (max side 1024px, JPEG 0.86)
 * so smartphone camera photos upload reliably and quickly over local Wi-Fi.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 1024,
  quality = 0.86
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Не удалось прочитать файл изображения'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });

  // Fallback gracefully if canvas decoding is unavailable
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) {
        resolve(rawDataUrl);
        return;
      }
      const longest = Math.max(w, h);
      const scale = longest > maxDimension ? maxDimension / longest : 1;
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const outputMime = file.type === 'image/png' && scale === 1 && file.size < 900_000
        ? 'image/png'
        : 'image/jpeg';
      resolve(canvas.toDataURL(outputMime, quality));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
