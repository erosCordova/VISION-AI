import type { BoundingBox } from './model';
import { validateBox } from './validation';
import { DomainError } from './errors';
export function toViewportBox(box: BoundingBox, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): BoundingBox {
  validateBox(box);
  if ([imageWidth, imageHeight, viewportWidth, viewportHeight].some(n => !Number.isSafeInteger(n) || n <= 0)) throw new DomainError('INVALID_INPUT');
  const scale = Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  return { x: (viewportWidth - width) / 2 + box.x * width, y: (viewportHeight - height) / 2 + box.y * height,
    width: box.width * width, height: box.height * height };
}
