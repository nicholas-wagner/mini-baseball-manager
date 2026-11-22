import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  computeSituationLeverage,
  evaluateClubhouseMentalAura,
  evaluatePressureAndLuckModifiers,
  rollMentalAndPressureProfile,
} from './mentalAndLeverage';

describe('Luck, Mental Traits, Pressure Risers/Wilters & Leverage Engine (TASK-057)', () => {
  it('rolls non-contradictory mentalTraits and aligned pressureProfile deterministically', () => {
    const rngA = createSeededRng(4242);
    const rngB = createSeededRng(4242);
    expect(rollMentalAndPressureProfile(rngA, 'clutch_captain', 'all_star')).toEqual(
      rollMentalAndPressureProfile(rngB, 'clutch_captain', 'all_star'),
    );

    const seenProfiles = new Set<string>();
    const seenTraits = new Set<string>();
    const rng = createSeededRng(777);
    for (let i = 0; i < 120; i += 1) {
      const rolled = rollMentalAndPressureProfile(
        rng,
        i % 3 === 0 ? 'clutch_captain' : i % 3 === 1 ? 'showboat' : 'prankster',
        i % 5 === 0 ? 'all_star' : 'average',
      );
      expect(rolled.mentalTraits.length).toBeGreaterThanOrEqual(1);
      expect(rolled.mentalTraits.length).toBeLessThanOrEqual(2);
      // Never pairs ice_veins/pressure_riser with pressure_wilt
      const hasRiser =
        rolled.mentalTraits.includes('ice_veins') ||
        rolled.mentalTraits.includes('pressure_riser');
      const hasWilt = rolled.mentalTraits.includes('pressure_wilt');
      expect(hasRiser && hasWilt).toBe(false);
      seenProfiles.add(rolled.pressureProfile);
      for (const trait of rolled.mentalTraits) seenTraits.add(trait);
    }
    expect(seenProfiles.has('ice_veins')).toBe(true);
    expect(seenProfiles.has('clutch_riser')).toBe(true);
    expect(seenProfiles.has('steady')).toBe(true);
    expect(seenProfiles.has('pressure_wilt')).toBe(true);
    expect(seenTraits.has('clubhouse_glue')).toBe(true);
    expect(seenTraits.has('high_energy')).toBe(true);
  });

  it('computes realistic Leverage Index across blowouts, neutral spots, critical moments, and game stakes', () => {
    const blowout = computeSituationLeverage({
      inning: 8,
      outs: 2,
      bases: [null, null, null],
      scoreDiff: 7,
      gamePressureLevel: 'regular',
    });
    const neutral = computeSituationLeverage({
      inning: 2,
      outs: 0,
      bases: [null, null, null],
      scoreDiff: 0,
      gamePressureLevel: 'regular',
    });
    const critical = computeSituationLeverage({
      inning: 9,
      outs: 2,
      bases: ['r1', 'r2', 'r3'],
      scoreDiff: 0,
      gamePressureLevel: 'regular',
    });
    const playoffCritical = computeSituationLeverage({
      inning: 9,
      outs: 2,
      bases: ['r1', 'r2', 'r3'],
      scoreDiff: 0,
      gamePressureLevel: 'elimination_championship',
    });

    expect(blowout.leverageIndex).toBeLessThan(0.7);
    expect(blowout.tier).toBe('low');
    expect(neutral.leverageIndex).toBeGreaterThanOrEqual(0.8);
    expect(neutral.leverageIndex).toBeLessThan(1.5);
    expect(critical.leverageIndex).toBeGreaterThanOrEqual(2.2);
    expect(critical.tier).toBe('critical');
    expect(playoffCritical.leverageIndex).toBeGreaterThan(critical.leverageIndex);
  });

  it('boosts ice_veins/clutch_riser and penalizes pressure_wilt under high leverage, while luck applies a subtle nudge', () => {
    const base = createPlayer(createSeededRng(501), { position: 'SS', tier: 'aa' });
    const icePlayer = {
      ...base,
      pressureProfile: 'ice_veins' as const,
      mentalTraits: ['ice_veins' as const],
      ratings: { ...base.ratings, clutch: 84, luck: 92 },
    };
    const wiltPlayer = {
      ...base,
      pressureProfile: 'pressure_wilt' as const,
      mentalTraits: ['pressure_wilt' as const],
      ratings: { ...base.ratings, clutch: 45, luck: 12 },
    };

    // Low leverage: pressure swing stays neutral (0)
    const lowIce = evaluatePressureAndLuckModifiers(icePlayer, 0.7);
    const lowWilt = evaluatePressureAndLuckModifiers(wiltPlayer, 0.7);
    expect(lowIce.pressureRatingDelta).toBe(0);
    expect(lowWilt.pressureRatingDelta).toBe(0);

    // Subtle universal luck nudge is small (<= 0.03) but favors higher luck
    expect(lowIce.luckHitProbDelta).toBeGreaterThan(lowWilt.luckHitProbDelta);
    expect(Math.abs(lowIce.luckHitProbDelta)).toBeLessThanOrEqual(0.03);
    expect(lowIce.luckZoneProbDelta).toBeGreaterThan(lowWilt.luckZoneProbDelta);

    // High leverage: ice_veins surges while pressure_wilt shrinks
    const highIce = evaluatePressureAndLuckModifiers(icePlayer, 2.3);
    const highWilt = evaluatePressureAndLuckModifiers(wiltPlayer, 2.3);
    expect(highIce.pressureRatingDelta).toBeGreaterThanOrEqual(5);
    expect(highWilt.pressureRatingDelta).toBeLessThanOrEqual(-5);
  });

  it('computes clubhouse morale and hype aura bonuses from clubhouse_glue and high_energy teammates', () => {
    const base = createPlayer(createSeededRng(601), { position: '2B', tier: 'aa' });
    const roster = [
      { ...base, id: 'p1', mentalTraits: ['clubhouse_glue' as const] },
      { ...base, id: 'p2', mentalTraits: ['clubhouse_glue' as const, 'high_energy' as const] },
      { ...base, id: 'p3', mentalTraits: ['high_energy' as const] },
      { ...base, id: 'p4', mentalTraits: ['steady_hand' as const] },
    ];
    const aura = evaluateClubhouseMentalAura(roster);
    expect(aura.clubhouseGlueCount).toBe(2);
    expect(aura.highEnergyCount).toBe(2);
    expect(aura.moraleRecoveryBonus).toBeGreaterThan(0);
    expect(aura.hypeGainMultiplier).toBeGreaterThan(1.0);
    expect(aura.hypeGainMultiplier).toBeLessThanOrEqual(1.35);
  });
});
