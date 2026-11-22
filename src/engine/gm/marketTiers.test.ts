import { describe, expect, it } from 'vitest';
import { MAX_ACTIVE_ROSTER_SIZE, MIN_ACTIVE_ROSTER_SIZE } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import { createClub, createPlayer } from './rosterFactory';
import {
  generateMarketPool,
  MARKET_TIER_SPECS,
  validateRosterAddition,
  validateRosterRelease,
} from './marketTiers';

describe('TASK-054 — Active Roster Cap (20) & 6 Player Market Tiers', () => {
  it('enforces MAX_ACTIVE_ROSTER_SIZE = 20 and validates additions/releases cleanly', () => {
    expect(MAX_ACTIVE_ROSTER_SIZE).toBe(20);
    expect(MIN_ACTIVE_ROSTER_SIZE).toBe(15);

    const club = createClub(createSeededRng(700), {
      id: 'club-cap-test',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Comet',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    expect(club.roster).toHaveLength(18);

    const incoming = createPlayer(createSeededRng(701), {
      position: 'CF',
      tier: 'rookie',
      marketTier: 'rookie',
    });
    expect(validateRosterAddition(club.roster, incoming.id).allowed).toBe(true);

    const full20 = [
      ...club.roster,
      createPlayer(createSeededRng(702), { position: 'LF', tier: 'rookie' }),
      createPlayer(createSeededRng(703), { position: '1B', tier: 'rookie' }),
    ];
    expect(full20).toHaveLength(20);
    const overCap = validateRosterAddition(full20, incoming.id);
    expect(overCap.allowed).toBe(false);
    expect(overCap.reason).toMatch(/20/);

    // Cannot release down to 14 or strip down below 3 SP
    const sp = club.roster.find((p) => p.position === 'SP')!;
    expect(validateRosterRelease(club.roster, sp.id).allowed).toBe(false);
    const extraBench = club.roster.find((p) => p.position !== 'SP' && p.position !== 'RP')!;
    expect(validateRosterRelease(club.roster, extraBench.id).allowed).toBe(true);
  });

  it('models relative pros and cons across rookie, all_star, veteran, above_average, average, and below_average tiers', () => {
    const sampleTier = (marketTier: keyof typeof MARKET_TIER_SPECS, baseSeed: number) => {
      const players = Array.from({ length: 18 }, (_, i) =>
        createPlayer(createSeededRng(baseSeed + i * 13), {
          position: i % 3 === 0 ? 'SP' : 'CF',
          tier: 'aa',
          marketTier,
        }),
      );
      const avgSalary =
        players.reduce((s, p) => s + p.contract.salaryPerSeason, 0) / players.length;
      const avgAge = players.reduce((s, p) => s + p.age, 0) / players.length;
      const avgContactPlusVelocity =
        players.reduce((s, p) => s + p.ratings.contact + p.ratings.velocity, 0) / players.length;
      const avgHeadroom =
        players.reduce(
          (s, p) =>
            s +
            (p.position === 'SP'
              ? p.statCaps.velocity - p.ratings.velocity
              : p.statCaps.contact - p.ratings.contact),
          0,
        ) / players.length;
      return { players, avgSalary, avgAge, avgContactPlusVelocity, avgHeadroom };
    };

    const rookies = sampleTier('rookie', 1000);
    const allStars = sampleTier('all_star', 2000);
    const veterans = sampleTier('veteran', 3000);
    const aboveAvg = sampleTier('above_average', 4000);
    const average = sampleTier('average', 5000);
    const belowAvg = sampleTier('below_average', 6000);

    expect(rookies.avgAge).toBeLessThan(veterans.avgAge);
    expect(rookies.players[0].xpGrowthMultiplier).toBeGreaterThan(1.2);
    expect(veterans.players[0].xpGrowthMultiplier).toBeLessThan(0.4);
    expect(rookies.avgHeadroom).toBeGreaterThan(veterans.avgHeadroom);

    expect(allStars.avgSalary).toBeGreaterThan(aboveAvg.avgSalary);
    expect(aboveAvg.avgSalary).toBeGreaterThan(average.avgSalary);
    expect(veterans.avgSalary).toBeLessThan(allStars.avgSalary);
    expect(veterans.avgContactPlusVelocity).toBeGreaterThan(rookies.avgContactPlusVelocity);
    expect(belowAvg.avgSalary).toBeLessThan(average.avgSalary);
    expect(belowAvg.players.some((p) => p.specialistArchetype !== 'balanced_regular')).toBe(true);
  });

  it('generates deterministic mixed free-agent market pools', () => {
    const poolA = generateMarketPool(createSeededRng(999), 'rookie', 12);
    const poolB = generateMarketPool(createSeededRng(999), 'rookie', 12);
    expect(poolA).toEqual(poolB);
    expect(poolA).toHaveLength(12);
  });
});
