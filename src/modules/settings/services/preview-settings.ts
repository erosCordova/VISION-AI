export interface PreviewSettings { readonly confidence: number; readonly targetFps: number; readonly overlayAgeMs: number }
export const defaultPreviewSettings: PreviewSettings = { confidence: 0.5, targetFps: 5, overlayAgeMs: 1000 };
export function validatePreviewSettings(input: PreviewSettings): Partial<Record<keyof PreviewSettings, string>> {
  const errors: Partial<Record<keyof PreviewSettings, string>> = {};
  if (!Number.isFinite(input.confidence) || input.confidence < 0.01 || input.confidence > 1) errors.confidence = 'Introduce un valor entre 0.01 y 1.';
  if (!Number.isInteger(input.targetFps) || input.targetFps < 1 || input.targetFps > 30) errors.targetFps = 'Introduce un número entero entre 1 y 30.';
  if (!Number.isInteger(input.overlayAgeMs) || input.overlayAgeMs < 100 || input.overlayAgeMs > 5000) errors.overlayAgeMs = 'Introduce un número entero entre 100 y 5000 ms.';
  return errors;
}
