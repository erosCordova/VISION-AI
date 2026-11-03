import { describe, expect, it } from 'vitest';
import { forEachMaskSegment, isValidMask } from '../../src/modules/live/mask-rle';

describe('Pintado de máscaras binarias', () => {
  const mask = { encoding: 'binary-rle-row-v1' as const, width: 2, height: 2, counts: [0, 1, 1, 2] };
  it('valida y distribuye por filas sin invertir coordenadas', () => {
    const segments: number[][] = [];
    forEachMaskSegment(mask, (x, y, n) => segments.push([x, y, n]));
    expect(segments).toEqual([[0, 0, 1], [0, 1, 2]]);
  });
  it('puede dibujar una máscara vacía sin segmentos', () => {
    const segments: number[][] = [];
    forEachMaskSegment({ encoding: 'binary-rle-row-v1', width: 3, height: 2, counts: [6] }, (...args) => segments.push(args));
    expect(segments).toEqual([]);
  });
  it.each([[0, 0], [4, 0], [0, 4, 1], [2, -1], [0, 1, 0, 3]])('rechaza un RLE mal formado: %j', (...counts) => {
    expect(isValidMask({ ...mask, counts })).toBe(false);
  });
  it('no permite una expansión con dimensiones erróneas', () => {
    expect(() => forEachMaskSegment({ ...mask, width: 1 }, () => {})).toThrow();
  });
});
