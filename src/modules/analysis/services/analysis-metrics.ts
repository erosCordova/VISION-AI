/** Frecuencia de respuestas válidas; no representa FPS de cámara ni del modelo aislado. */
export function inferenceFps(completedAtMs: readonly number[]): number | null {
  if (completedAtMs.length < 2) return null;
  const start = completedAtMs[0];
  const end = completedAtMs[completedAtMs.length - 1];
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  if (!completedAtMs.every((time, index) =>
    Number.isFinite(time) && (index === 0 || time > completedAtMs[index - 1]))) return null;
  return 1000 * (completedAtMs.length - 1) / (end - start);
}

/** Conservar como máximo las últimas veinte respuestas medidas y cinco segundos. */
export function retainRecentFrames(completedAtMs: readonly number[], timeMs: number): number[] {
  if (!Number.isFinite(timeMs) || timeMs < 0) return [];
  return [...completedAtMs.filter(t => t > timeMs - 5000 && t < timeMs), timeMs].slice(-20);
}
