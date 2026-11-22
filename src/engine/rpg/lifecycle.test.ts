import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { computePlayerOverall } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  applyOffseasonCareerArc,
  evaluateClubMentorshipAura,
  evaluateRetirementAndCoachTransition,
  getCareerStage,
  getRetirementProbability,
} from './lifecycle';

describe('Full Multi-Season Player Career Arc & Lifecycle (TASK-041)', () => {
  it('classifies players accurately across all four career stages', () => {
    expect(getCareerStage(19)).toBe('rookie_development');
    expect(getCareerStage(24)).toBe('rookie_development');
    expect(getCareerStage(25)).toBe('prime_peak');
    expect(getCareerStage(30)).toBe('prime_peak');
    expect(getCareerStage(31)).toBe('crafty_veteran');
    expect(getCareerStage(34)).toBe('crafty_veteran');
    expect(getCareerStage(35)).toBe('late_decline');
    expect(getCareerStage(39)).toBe('late_decline');
  });

  it('grows a rookie toward statCaps, peaks in prime, and diminishes physical tools at 35+ while preserving mental craft', () => {
    const rng = createSeededRng(4101);
    const base = createPlayer(rng, { position: 'CF', tier: 'rookie', marketTier: 'rookie' });
    let player = {
      ...base,
      age: 19,
      ratings: {
        ...base.ratings,
        contact: 52,
        power: 50,
        speed: 62,
        eye: 50,
        fielding: 56,
        range: 58,
      },
      statCaps: {
        ...base.statCaps,
        contact: 86,
        power: 84,
        speed: 88,
        eye: 82,
        fielding: 84,
        range: 86,
      },
    };

    const startOvr = computePlayerOverall(player);
    // Ages 19 -> 26 (development into prime)
    for (let yr = 0; yr < 7; yr += 1) {
      const res = applyOffseasonCareerArc(rng, { ...player, age: player.age + 1 }, { mentorshipGrowthBonus: 0.5 });
      player = res.player;
    }
    const primeOvr = computePlayerOverall(player);
    const primeSpeed = player.ratings.speed;
    const primePower = player.ratings.power;
    expect(primeOvr).toBeGreaterThan(startOvr + 4);
    expect(player.ratings.contact).toBeLessThanOrEqual(player.statCaps.contact);

    // Fast-forward to age 35 -> 39 (late-career decline)
    player = { ...player, age: 34 };
    const preDeclineEye = player.ratings.eye;
    for (let yr = 0; yr < 5; yr += 1) {
      const res = applyOffseasonCareerArc(rng, { ...player, age: player.age + 1 });
      player = res.player;
    }

    const speedDrop = primeSpeed - player.ratings.speed;
    const powerDrop = primePower - player.ratings.power;
    const eyeDrop = preDeclineEye - player.ratings.eye;
    expect(speedDrop).toBeGreaterThan(3);
    expect(powerDrop).toBeGreaterThanOrEqual(2);
    // Mental craft (eye) declines significantly slower than raw speed
    expect(eyeDrop).toBeLessThan(speedDrop);
  });

  it('softens 35+ physical decline when an Athletic Trainer durability reduction factor is applied', () => {
    const base = createPlayer(createSeededRng(4102), { position: 'SP', tier: 'majors', marketTier: 'veteran' });
    const agingAce = {
      ...base,
      age: 37,
      ratings: { ...base.ratings, velocity: 84, stamina: 80, control: 82 },
    };

    const noTrainer = applyOffseasonCareerArc(createSeededRng(990), agingAce, {
      declineReductionFactor: 0,
    });
    const eliteTrainer = applyOffseasonCareerArc(createSeededRng(990), agingAce, {
      declineReductionFactor: 0.45,
    });

    const dropWithout = agingAce.ratings.velocity - noTrainer.player.ratings.velocity;
    const dropWith = agingAce.ratings.velocity - eliteTrainer.player.ratings.velocity;
    expect(dropWith).toBeLessThanOrEqual(dropWithout);
    expect(eliteTrainer.player.ratings.velocity + eliteTrainer.player.ratings.stamina).toBeGreaterThanOrEqual(
      noTrainer.player.ratings.velocity + noTrainer.player.ratings.stamina,
    );
  });

  it('computes veteran mentorship XP and growth aura for clubs carrying seasoned veterans', () => {
    const rng = createSeededRng(4103);
    const youngSquad = [
      { ...createPlayer(rng, { position: 'SS', tier: 'rookie', marketTier: 'rookie' }), age: 20 },
      { ...createPlayer(rng, { position: 'CF', tier: 'rookie', marketTier: 'rookie' }), age: 21 },
    ];
    const vetSquad = [
      ...youngSquad,
      {
        ...createPlayer(rng, { position: 'C', tier: 'aa', marketTier: 'veteran' }),
        age: 34,
        mentalTraits: ['clubhouse_glue' as const],
      },
      {
        ...createPlayer(rng, { position: 'SP', tier: 'aa', marketTier: 'veteran' }),
        age: 35,
        mentalTraits: ['steady_hand' as const],
      },
    ];

    const noMentors = evaluateClubMentorshipAura(youngSquad);
    const withMentors = evaluateClubMentorshipAura(vetSquad);
    expect(noMentors.mentorCount).toBe(0);
    expect(noMentors.rookieXpBonusPct).toBe(0);
    expect(withMentors.mentorCount).toBe(2);
    expect(withMentors.rookieXpBonusPct).toBeGreaterThan(0.1);
    expect(withMentors.offseasonGrowthBonus).toBeGreaterThan(0);
  });

  it('retires aged veterans and converts accomplished legends into hireable coach candidates', () => {
    expect(getRetirementProbability(26, 70)).toBe(0);
    expect(getRetirementProbability(40, 60)).toBe(1);

    const rng = createSeededRng(4104);
    const legendCatcher = {
      ...createPlayer(rng, { position: 'C', tier: 'majors', marketTier: 'all_star' }),
      age: 40,
      level: 6,
      careerService: {
        seasonsPlayed: 11,
        careerPlayoffGames: 14,
        experienceScore: 95,
        experienceTier: 'cagey_veteran' as const,
      },
    };
    const outcome = evaluateRetirementAndCoachTransition(rng, legendCatcher, 'Sandlot Comets');
    expect(outcome.retires).toBe(true);
    expect(outcome.coachCandidate).not.toBeNull();
    expect(outcome.coachCandidate?.formerPlayerId).toBe(legendCatcher.id);
    expect(outcome.coachCandidate?.recommendedRole).toBe('bullpen_coach');
    expect(outcome.coachCandidate?.startingTier).toBeGreaterThanOrEqual(3);
  });
});
