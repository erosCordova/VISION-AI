import type { Origin } from '../core/domain/model';
import { DomainError } from '../core/domain/errors';
export interface AppConfig { readonly origin: Origin; readonly apiBaseUrl: string | null }
export function parseConfig(env: Record<string, unknown>): AppConfig {
  const origin = env.VITE_VISION_MODE ?? 'demo';
  if (origin !== 'demo' && origin !== 'real') throw new DomainError('INVALID_CONFIGURATION');
  const raw = env.VITE_VISION_API_BASE_URL;
  if (raw !== undefined && typeof raw !== 'string') throw new DomainError('INVALID_CONFIGURATION');
  let url: URL | null = null;
  if (typeof raw === 'string' && raw.trim()) {
    try { url = new URL(raw); } catch { throw new DomainError('INVALID_CONFIGURATION'); }
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password || url.search || url.hash) throw new DomainError('INVALID_CONFIGURATION');
  }
  if (origin === 'real' && !url) throw new DomainError('INVALID_CONFIGURATION');
  return Object.freeze({ origin, apiBaseUrl: url?.href.replace(/\/$/, '') ?? null });
}
