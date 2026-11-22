export type HapticPatternKind = 'tap' | 'hit' | 'home_run' | 'strikeout';

const HAPTIC_PATTERNS: Readonly<Record<HapticPatternKind, number | number[]>> = {
  tap: 12,
  hit: [18, 24, 22],
  home_run: [30, 35, 50, 35, 70],
  strikeout: [25, 20, 35],
};

/** Fires subtle Android tactile haptics via navigator.vibrate when supported. */
export function triggerHapticPulse(kind: HapticPatternKind): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  return Boolean(navigator.vibrate(HAPTIC_PATTERNS[kind]));
}

export interface WakeLockHandle {
  active: boolean;
  release: () => Promise<void>;
}

/** Requests an optional Screen Wake Lock during live 3D games so Android screens stay awake. */
export async function requestGameWakeLock(): Promise<WakeLockHandle> {
  if (typeof navigator === 'undefined') {
    return { active: false, release: async () => undefined };
  }
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
  };
  if (!nav.wakeLock) {
    return { active: false, release: async () => undefined };
  }
  try {
    const sentinel = await nav.wakeLock.request('screen');
    return { active: true, release: () => sentinel.release() };
  } catch {
    return { active: false, release: async () => undefined };
  }
}
