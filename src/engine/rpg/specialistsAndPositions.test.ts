import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  applySpecialistRatingShape,
  crossTrainPosition,
  evaluatePositionAssignment,
  evolveSpecialistArchetype,
  getEligiblePositions,
  rollPositionalEligibility,
  rollSpecialistArchetype,
} from './specialistsAndPositions';

describe('TASK-053 — Player Specialists, Positional Eligibility & Cross-Training', () => {
  it('rolls distinct specialist archetypes and shapes asymmetric rating profiles', () => {
    const baseRatings = {
      contact: 65,
      power: 65,
      eye: 65,
      bunt: 60,
      velocity: 65,
      movement: 65,
      control: 65,
      stamina: 65,
      speed: 65,
      fielding: 65,
      arm: 65,
      clutch: 65,
      popularity: 60,
      potential: 75,
    };

    const wizardRatings = applySpecialistRatingShape(baseRatings, 'defensive_wizard', 'SS');
    expect(wizardRatings.fielding).toBeGreaterThan(wizardRatings.power);
    expect(wizardRatings.arm).toBeGreaterThan(wizardRatings.power);

    const sluggerRatings = applySpecialistRatingShape(baseRatings, 'power_slugger', '1B');
    expect(sluggerRatings.power).toBeGreaterThan(sluggerRatings.fielding);
    expect(sluggerRatings.power).toBeGreaterThan(sluggerRatings.speed);

    const closerRatings = applySpecialistRatingShape(baseRatings, 'flame_closer', 'RP');
    expect(closerRatings.velocity).toBeGreaterThan(closerRatings.stamina);

    // Seeded rolls produce variety across hitters and pitchers
    const seen = new Set<string>();
    const rng = createSeededRng(199401);
    for (let i = 0; i < 60; i += 1) {
      seen.add(rollSpecialistArchetype(rng, i % 4 === 0 ? 'RP' : '2B', 'above_average'));
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);

    expect(
      evolveSpecialistArchetype({
        position: '1B',
        specialistArchetype: 'balanced_regular',
        ratings: { ...baseRatings, power: 86, fielding: 58 },
      }),
    ).toBe('power_slugger');

    expect(
      evolveSpecialistArchetype({
        position: 'SS',
        specialistArchetype: 'balanced_regular',
        ratings: { ...baseRatings, fielding: 88, arm: 84, power: 55 },
      }),
    ).toBe('defensive_wizard');
  });

  it('enforces throwing handedness bounds on infield flexibility profiles (never LHP at 2B/3B/SS)', () => {
    for (let i = 0; i < 40; i += 1) {
      const lefty1B = rollPositionalEligibility(
        createSeededRng(300 + i),
        '1B',
        'L',
        'super_utility',
      );
      expect(lefty1B.positionProficiency['2B']).toBeUndefined();
      expect(lefty1B.positionProficiency['3B']).toBeUndefined();
      expect(lefty1B.positionProficiency['SS']).toBeUndefined();
      expect(lefty1B.favoritePosition).toBe('1B');
    }

    const rightyUtility = rollPositionalEligibility(
      createSeededRng(77),
      'SS',
      'R',
      'super_utility',
    );
    expect(rightyUtility.flexibilityProfile).toBe('infield_utility');
    expect(getEligiblePositions(rightyUtility)).toEqual(
      expect.arrayContaining(['1B', '2B', '3B', 'SS']),
    );
  });

  it('awards Favorite Position Boost at favoritePosition and applies Out-of-Position penalty below 50 proficiency', () => {
    const hitter = createPlayer(createSeededRng(909), { position: 'SS', tier: 'aa' });
    const favEval = evaluatePositionAssignment(hitter, hitter.favoritePosition);
    expect(favEval.isFavorite).toBe(true);
    expect(favEval.isOutOfPosition).toBe(false);
    expect(favEval.fieldingDelta).toBe(5);
    expect(favEval.clutchDelta).toBe(3);
    expect(favEval.errorMultiplier).toBeLessThan(1);

    const dhEval = evaluatePositionAssignment(hitter, 'DH');
    expect(dhEval.isOutOfPosition).toBe(false);
    expect(dhEval.fieldingDelta).toBe(0);

    const oopEval = evaluatePositionAssignment(
      { position: '1B', favoritePosition: '1B', positionProficiency: { '1B': 90 } },
      'SS',
    );
    expect(oopEval.isFavorite).toBe(false);
    expect(oopEval.isOutOfPosition).toBe(true);
    expect(oopEval.fieldingDelta).toBeLessThan(0);
    expect(oopEval.errorMultiplier).toBeGreaterThan(2);
  });

  it('cross-trains a new position while applying rust decay to existing positions and shifting favorite at 95+', () => {
    const baseSs = createPlayer(createSeededRng(1200), { position: 'SS', tier: 'aa' });
    const ssPlayer = {
      ...baseSs,
      throws: 'R' as const,
      favoritePosition: 'SS' as const,
      positionProficiency: { SS: 90, '2B': 68 },
      fatigue: 10,
    };

    const firstSession = crossTrainPosition(createSeededRng(1201), ssPlayer, '3B');
    expect(firstSession.trained).toBe(true);
    expect(firstSession.player.positionProficiency['3B']).toBeGreaterThanOrEqual(45);
    expect(firstSession.player.positionProficiency.SS!).toBeLessThan(90);
    expect(firstSession.player.fatigue).toBeGreaterThan(ssPlayer.fatigue);
    expect(firstSession.rustApplied).toBeGreaterThanOrEqual(4);

    // Repeated training up to 95+ allows favoritePosition shift
    let current = firstSession.player;
    for (let k = 0; k < 4; k += 1) {
      current = crossTrainPosition(createSeededRng(1300 + k), current, '3B').player;
    }
    expect(current.positionProficiency['3B']!).toBeGreaterThanOrEqual(95);
    expect(current.favoritePosition).toBe('3B');

    // Lefty cannot cross-train to SS
    const leftyOf = createPlayer(createSeededRng(1500), { position: '1B', tier: 'rookie' });
    const illegal = crossTrainPosition(createSeededRng(1501), { ...leftyOf, throws: 'L' }, 'SS');
    expect(illegal.trained).toBe(false);
    expect(illegal.reason).toMatch(/left-handed/i);
  });
});
