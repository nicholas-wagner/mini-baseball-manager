import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  computePitchEnduranceDrain,
  computePostGamePitcherRecovery,
  evaluatePitcherEnduranceEffect,
  fatigueToEndurance,
} from './pitcherEndurance';

describe('Pitcher Endurance & Pitch-Specific Effectiveness Drop-Off (TASK-061)', () => {
  it('drains endurance faster for low-stamina/short-role arms, high-leverage stress pitches, and 5-inning blitz scaling', () => {
    const sp = createPlayer(createSeededRng(101), { position: 'SP', tier: 'aa' });
    const highStaminaSp = { ...sp, pitcherRole: 'starter' as const, ratings: { ...sp.ratings, stamina: 88 } };
    const lowStaminaRp = { ...sp, position: 'RP' as const, pitcherRole: 'closer' as const, ratings: { ...sp.ratings, stamina: 38 } };

    const normalDrainSp = computePitchEnduranceDrain(highStaminaSp, 1.0, 9);
    const stressDrainSp = computePitchEnduranceDrain(highStaminaSp, 2.3, 9);
    const blitzDrainSp = computePitchEnduranceDrain(highStaminaSp, 1.0, 5);
    const closerDrain = computePitchEnduranceDrain(lowStaminaRp, 1.0, 9);

    expect(stressDrainSp).toBeGreaterThan(normalDrainSp);
    expect(blitzDrainSp).toBeGreaterThan(normalDrainSp);
    expect(closerDrain).toBeGreaterThan(normalDrainSp);
    expect(fatigueToEndurance(20)).toBe(80);
    expect(fatigueToEndurance(120)).toBe(0);
  });

  it('degrades fastball velocity, sinker drop/GB%, and breaking ball break/control as endurance falls', () => {
    const freshFb = evaluatePitcherEnduranceEffect(92, 'four_seam');
    const tiredFb = evaluatePitcherEnduranceEffect(28, 'four_seam');
    const gassedFb = evaluatePitcherEnduranceEffect(8, 'four_seam');

    expect(freshFb.tier).toBe('fresh');
    expect(freshFb.mphDrop).toBe(0);
    expect(freshFb.breakDrop).toBe(0);
    expect(freshFb.scoutWarning).toBeUndefined();

    expect(tiredFb.tier).toBe('fatigued');
    expect(tiredFb.mphDrop).toBeLessThanOrEqual(-3);
    expect(tiredFb.scoutWarning).toBeTruthy();

    expect(gassedFb.tier).toBe('gassed');
    expect(gassedFb.mphDrop).toBeLessThan(tiredFb.mphDrop);

    // Sinker loses downward drop AND groundball rate when tired!
    const tiredSinker = evaluatePitcherEnduranceEffect(22, 'two_seam');
    expect(tiredSinker.mphDrop).toBeLessThan(0);
    expect(tiredSinker.breakDrop).toBeLessThanOrEqual(-6);
    expect(tiredSinker.gbRateShift).toBeLessThan(0);
    expect(tiredSinker.scoutWarning).toMatch(/sinker/i);

    // Slider / Curveball suffer heavy hanging-break & control drop when tired
    const tiredSlider = evaluatePitcherEnduranceEffect(22, 'slider');
    expect(tiredSlider.breakDrop).toBeLessThanOrEqual(-8);
    expect(tiredSlider.controlDrop).toBeLessThanOrEqual(-5);

    // Knuckleball degrades gentler than max-effort fastball velocity
    const tiredKnuckle = evaluatePitcherEnduranceEffect(22, 'knuckleball');
    expect(Math.abs(tiredKnuckle.mphDrop)).toBeLessThan(Math.abs(tiredFb.mphDrop));
  });

  it('recovers pitcher fatigue cleanly between games while keeping overworked arms partially tired', () => {
    expect(computePostGamePitcherRecovery(95, true)).toBeGreaterThan(20);
    expect(computePostGamePitcherRecovery(40, true)).toBeLessThan(40);
    expect(computePostGamePitcherRecovery(50, false)).toBeLessThan(computePostGamePitcherRecovery(50, true));
    expect(computePostGamePitcherRecovery(10, false)).toBe(0);
  });
});
