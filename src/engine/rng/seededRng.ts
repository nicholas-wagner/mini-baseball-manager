export interface SeededRng {
  next: () => number;
  int: (min: number, max: number) => number;
  float: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (probability: number) => boolean;
}

/**
 * Mulberry32 deterministic PRNG so every portrait, draft class, and simulated pitch
 * is 100% reproducible under tests and replay playback.
 */
export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return low + Math.floor(next() * (high - low + 1));
  };

  const float = (min: number, max: number): number => {
    return min + next() * (max - min);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    return items[Math.floor(next() * items.length)];
  };

  const chance = (probability: number): boolean => {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return next() < probability;
  };

  return { next, int, float, pick, chance };
}
