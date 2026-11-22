/**
 * Mobile WebGL 60 FPS Performance Guardrails & Accessibility Helpers (TASK-051).
 * 100% pure TypeScript so every budget and colorblind symbol can be unit-tested in Node/jsdom.
 */

export const MOBILE_WEBGL_BUDGET = {
  maxPixelRatio: 2,
  reducedMotionPixelRatio: 1.5,
  maxSpriteCacheEntries: 48,
  liveGameTargetFps: 60,
  menuTargetFps: 30,
  reducedMotionTargetFps: 24,
} as const;

/** Caps WebGL devicePixelRatio to protect mobile GPU fill-rate & thermal headroom. */
export function computeClampedPixelRatio(
  devicePixelRatio: number,
  reducedMotion = false,
): number {
  const safe = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cap = reducedMotion
    ? MOBILE_WEBGL_BUDGET.reducedMotionPixelRatio
    : MOBILE_WEBGL_BUDGET.maxPixelRatio;
  return Math.min(cap, Math.max(1, safe));
}

/** Returns true when a RAF frame should be skipped to hit menu or reduced-motion FPS caps. */
export function shouldThrottleAnimationFrame(
  elapsedSinceLastRenderMs: number,
  mode: 'live_game' | 'menu',
  reducedMotion = false,
): boolean {
  const targetFps = reducedMotion
    ? MOBILE_WEBGL_BUDGET.reducedMotionTargetFps
    : mode === 'menu'
      ? MOBILE_WEBGL_BUDGET.menuTargetFps
      : MOBILE_WEBGL_BUDGET.liveGameTargetFps;
  const minIntervalMs = 1000 / targetFps;
  return elapsedSinceLastRenderMs < minIntervalMs * 0.92;
}

export interface AccessibleStatGrade {
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  symbol: '★' | '▲' | '●' | '◆' | '■';
  label: string;
  colorHex: string;
}

/** Maps any 1..99 rating to a colorblind-safe letter grade + distinct geometric shape symbol. */
export function getAccessibleStatGrade(rating: number): AccessibleStatGrade {
  if (rating >= 88) return { grade: 'S', symbol: '★', label: 'Elite', colorHex: '#7209B7' };
  if (rating >= 76) return { grade: 'A', symbol: '▲', label: 'Star', colorHex: '#2FB356' };
  if (rating >= 64) return { grade: 'B', symbol: '●', label: 'Solid', colorHex: '#0096C7' };
  if (rating >= 50) return { grade: 'C', symbol: '◆', label: 'Average', colorHex: '#D97706' };
  return { grade: 'D', symbol: '■', label: 'Raw', colorHex: '#E63946' };
}

/** Trims an LRU texture/sprite cache map cleanly so mobile WebGL RAM stays within budget. */
export function evictOverflowCacheKeys<T>(
  cache: Map<string, T>,
  onEvict?: (value: T) => void,
  maxEntries: number = MOBILE_WEBGL_BUDGET.maxSpriteCacheEntries,
): number {
  let evicted = 0;
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const item = cache.get(oldestKey);
    cache.delete(oldestKey);
    if (item !== undefined && onEvict) onEvict(item);
    evicted += 1;
  }
  return evicted;
}
