import { describe, expect, it } from 'vitest';
import {
  LEAGUE_TIER_ORDER,
  MAX_ACTIVE_ROSTER_SIZE,
  MIN_ACTIVE_ROSTER_SIZE,
  type LeagueTierId,
} from '../models/club';
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

function sampleAges(tier: LeagueTierId, count: number): number[] {
  return Array.from({ length: count }, (_, index) =>
    createPlayer(createSeededRng(8_000 + LEAGUE_TIER_ORDER.indexOf(tier) * 1_000 + index), {
      position: index % 2 === 0 ? 'CF' : 'SP',
      tier,
    }).age,
  );
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

describe('TASK-110 league-tier age curves', () => {
  it('keeps Rookie players mostly 18–19 and Majors players mostly 25–35', () => {
    const rookieAges = sampleAges('rookie', 360);
    const majorAges = sampleAges('majors', 360);
    const rookieMedian = median(rookieAges);
    const over25 = rookieAges.filter((age) => age > 25).length / rookieAges.length;
    const peak = majorAges.filter((age) => age >= 25 && age <= 35).length / majorAges.length;
    const prodigies = majorAges.filter((age) => age <= 19).length / majorAges.length;
    const legends = majorAges.filter((age) => age >= 40).length / majorAges.length;

    expect(rookieMedian).toBeGreaterThanOrEqual(18);
    expect(rookieMedian).toBeLessThanOrEqual(19);
    expect(over25).toBeLessThan(0.05);
    expect(peak).toBeGreaterThanOrEqual(0.7);
    expect(prodigies).toBeLessThan(0.04);
    expect(legends).toBeLessThan(0.04);
  });

  it('climbs mean age from Rookie through Low-A, High-A, AA, AAA, and Majors', () => {
    const means = LEAGUE_TIER_ORDER.map((tier) => mean(sampleAges(tier, 360)));
    for (let index = 1; index < means.length; index += 1) {
      expect(means[index]).toBeGreaterThan(means[index - 1]);
    }
  });
});
