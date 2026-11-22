import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng/seededRng';
import {
  evaluatePlatoonMatchup,
  getPositionalHandednessBonus,
  resolveEffectiveBatSide,
  rollBatsHand,
  rollThrowsHand,
} from './handedness';
import type { FieldPosition } from './types';

describe('Lefty / Righty / Switch Handedness & Platoon System', () => {
  it('matches exact batting distribution: 50% R, 40% L, 10% S across 10,000 rolls', () => {
    const rng = createSeededRng(199501);
    const counts = { R: 0, L: 0, S: 0 };
    const n = 10_000;

    for (let i = 0; i < n; i += 1) {
      counts[rollBatsHand(rng)] += 1;
    }

    expect(counts.R / n).toBeGreaterThan(0.48);
    expect(counts.R / n).toBeLessThan(0.52);
    expect(counts.L / n).toBeGreaterThan(0.38);
    expect(counts.L / n).toBeLessThan(0.42);
    expect(counts.S / n).toBeGreaterThan(0.085);
    expect(counts.S / n).toBeLessThan(0.115);
  });

  it('matches exact position-specific throwing handedness probabilities across 10,000 rolls', () => {
    const expectedLeftRates: Record<FieldPosition, number> = {
      SP: 0.35,
      RP: 0.5,
      LF: 0.5,
      CF: 0.5,
      RF: 0.5,
      '1B': 0.8,
      C: 0.2,
      '2B': 0,
      '3B': 0,
      SS: 0,
    };

    const n = 10_000;
    for (const [pos, expected] of Object.entries(expectedLeftRates) as [FieldPosition, number][]) {
      const rng = createSeededRng(7000 + pos.charCodeAt(0));
      let leftCount = 0;
      for (let i = 0; i < n; i += 1) {
        if (rollThrowsHand(rng, pos) === 'L') leftCount += 1;
      }

      if (expected === 0) {
        expect(leftCount).toBe(0);
      } else {
        const rate = leftCount / n;
        expect(rate).toBeGreaterThan(expected - 0.022);
        expect(rate).toBeLessThan(expected + 0.022);
      }
    }
  });

  it('resolves switch hitters to the opposite box and awards correct platoon edges', () => {
    expect(resolveEffectiveBatSide('S', 'R')).toBe('L');
    expect(resolveEffectiveBatSide('S', 'L')).toBe('R');
    expect(resolveEffectiveBatSide('L', 'R')).toBe('L');
    expect(resolveEffectiveBatSide('R', 'L')).toBe('R');

    const switchVsRight = evaluatePlatoonMatchup('S', 'R');
    expect(switchVsRight.advantage).toBe('batter');
    expect(switchVsRight.isSwitchHitterEdge).toBe(true);
    expect(switchVsRight.batterContactDelta).toBeGreaterThan(0);
    expect(switchVsRight.firstBaseStepBonus).toBeGreaterThan(0);
    expect(switchVsRight.label).toBe('Switch-Hitter Platoon Edge');

    const rightVsLeft = evaluatePlatoonMatchup('R', 'L');
    expect(rightVsLeft.advantage).toBe('batter');
    expect(rightVsLeft.isSwitchHitterEdge).toBe(false);
    expect(rightVsLeft.firstBaseStepBonus).toBe(0);
    expect(rightVsLeft.label).toBe('Batter Platoon Edge');

    const leftOnLeft = evaluatePlatoonMatchup('L', 'L');
    expect(leftOnLeft.advantage).toBe('pitcher');
    expect(leftOnLeft.pitcherBreakDelta).toBeGreaterThan(0);
    expect(leftOnLeft.batterContactDelta).toBeLessThan(0);
    expect(leftOnLeft.label).toBe('Lefty-on-Lefty Pitcher Edge');

    const rightOnRight = evaluatePlatoonMatchup('R', 'R');
    expect(rightOnRight.advantage).toBe('pitcher');
    expect(rightOnRight.firstBaseStepBonus).toBe(0);
    expect(rightOnRight.label).toBe('Righty-on-Righty Pitcher Edge');
  });

  it('grants LHP runner-hold bonus and Lefty 1B scoop bonus', () => {
    expect(getPositionalHandednessBonus('SP', 'L').pickoffHoldBonus).toBeGreaterThan(0);
    expect(getPositionalHandednessBonus('RP', 'L').pickoffHoldBonus).toBeGreaterThan(0);
    expect(getPositionalHandednessBonus('SP', 'R').pickoffHoldBonus).toBe(0);

    expect(getPositionalHandednessBonus('1B', 'L').firstBaseScoopBonus).toBeGreaterThan(0);
    expect(getPositionalHandednessBonus('1B', 'R').firstBaseScoopBonus).toBe(0);
  });
});
