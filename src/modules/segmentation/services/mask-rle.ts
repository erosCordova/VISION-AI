/** RLE binario propio: empieza en cero y avanza por filas. No es COCO RLE. */
export interface BinaryMask {
  readonly encoding: 'binary-rle-row-v1';
  readonly width: number;
  readonly height: number;
  readonly counts: readonly number[];
}

export function isValidMask(mask: BinaryMask): boolean {
  const { width, height, counts } = mask;
  if (mask.encoding !== 'binary-rle-row-v1'
    || !Number.isSafeInteger(width) || width <= 0
    || !Number.isSafeInteger(height) || height <= 0
    || width * height > 20_000_000
    || !Array.isArray(counts) || counts.length === 0 || counts.length > width * height + 1) return false;
  let total = 0;
  for (let i = 0; i < counts.length; i++) {
    const count = counts[i];
    if (!Number.isSafeInteger(count) || count < 0 || (i > 0 && count === 0)) return false;
    total += count;
    if (total > width * height) return false;
  }
  return total === width * height;
}

/** Entrega segmentos horizontales positivos sin expandir la máscara a un arreglo gigante. */
export function forEachMaskSegment(mask: BinaryMask, draw: (x: number, y: number, width: number) => void): void {
  if (!isValidMask(mask)) throw new Error('Máscara RLE no válida');
  let offset = 0;
  mask.counts.forEach((count, i) => {
    if (i % 2 === 1) {
      let cursor = offset;
      let remaining = count;
      while (remaining > 0) {
        const x = cursor % mask.width;
        const y = Math.floor(cursor / mask.width);
        const runWidth = Math.min(remaining, mask.width - x);
        draw(x, y, runWidth);
        cursor += runWidth;
        remaining -= runWidth;
      }
    }
    offset += count;
  });
}
