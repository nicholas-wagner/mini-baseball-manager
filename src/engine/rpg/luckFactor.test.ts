import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  computeContestLuckDelta,
  computeEffectiveLuck,
  getCenteredLuck,
  luckMicroDelta,
  luckScaleMultiplier,
} from './luckFactor';

describe('Universal Subtle Luck Engine (TASK-139)', () => {
  it('combines base luck with equipped relic +LUCK bonuses and clamps to 1..99', () => {
    const club = createClub(createSeededRng(1391), {
      id: 'luck-club',
      isHuman: true,
      city: 'Shamrock',
      name: 'Clovers',
      mascot: 'Fox',
      colors: { primary: '#2FB356', secondary: '#181B2C', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
    });
    const base = { ...club.roster[0], ratings: { ...club.roster[0].ratings, luck: 50 }, equippedRelicIds: [] };
    const withStirrups = { ...base, equippedRelicIds: ['lucky_neon_stirrups'] }; // +5 luck
    const cappedHigh = { ...base, ratings: { ...base.ratings, luck: 97 }, equippedRelicIds: ['lucky_neon_stirrups'] };

    expect(computeEffectiveLuck(base)).toBe(50);
    expect(computeEffectiveLuck(withStirrups)).toBe(55);
    expect(computeEffectiveLuck(base, 8)).toBe(58);
    expect(computeEffectiveLuck(cappedHigh)).toBe(99);
  });

  it('keeps micro deltas and multipliers strictly subtle while rewarding higher luck', () => {
    expect(getCenteredLuck(50)).toBe(0);
    expect(getCenteredLuck(99)).toBeCloseTo(0.98, 2);
    expect(getCenteredLuck(1)).toBeCloseTo(-0.98, 2);

    const highDelta = luckMicroDelta(95, 0.02);
    const lowDelta = luckMicroDelta(10, 0.02);
    expect(highDelta).toBeGreaterThan(0.015);
    expect(highDelta).toBeLessThanOrEqual(0.02);
    expect(lowDelta).toBeLessThan(-0.014);
    expect(Math.abs(lowDelta)).toBeLessThanOrEqual(0.02);

    // Negative maxSwing shrinks risk (e.g., injury prevention / error reduction)
    expect(luckScaleMultiplier(95, -0.045)).toBeLessThan(0.97);
    expect(luckScaleMultiplier(10, -0.045)).toBeGreaterThan(1.03);

    // Contest delta favors lucky actor over unlucky opponent, tightly capped
    const edge = computeContestLuckDelta(95, 10, 0.02);
    expect(edge).toBeGreaterThan(0.02);
    expect(edge).toBeLessThanOrEqual(0.025);
  });
});
