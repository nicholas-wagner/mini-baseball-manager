import { describe, expect, it } from 'vitest';
import { createSeededRng } from './seededRng';

describe('createSeededRng', () => {
  it('produces identical sequences for the same seed', () => {
    const a = createSeededRng(1994);
    const b = createSeededRng(1994);

    const seqA = Array.from({ length: 12 }, () => a.next());
    const seqB = Array.from({ length: 12 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(101);
    const b = createSeededRng(202);
    expect(a.next()).not.toBe(b.next());
  });

  it('bounds int() inclusively within [min, max]', () => {
    const rng = createSeededRng(42);
    for (let i = 0; i < 100; i += 1) {
      const value = rng.int(3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('picks valid elements and handles edge chance probabilities', () => {
    const rng = createSeededRng(777);
    const items = ['fastball', 'knuckle', 'slider'] as const;
    for (let i = 0; i < 20; i += 1) {
      expect(items).toContain(rng.pick(items));
    }
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
    expect(() => rng.pick([])).toThrow(/empty array/i);
  });
});
