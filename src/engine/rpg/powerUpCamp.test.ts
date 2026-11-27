import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import type { Club } from '../models/club';
import { isPitcherPosition, type Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { computeCoreRatingSum } from './trainingCompromises';
import {
  applyPowerUpPurchase,
  evaluatePowerUpPurchase,
  getPowerUpPointCost,
  getPowerUpStatOptions,
  POWER_UP_STAT_LABELS,
} from './powerUpCamp';

function makeTestClub(seed = 1150, cash = 15_000): Club {
  const club = createClub(createSeededRng(seed), {
    id: `club-camp-${seed}`,
    isHuman: true,
    city: 'Star',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'aa',
  });
  return {
    ...club,
    economy: { ...club.economy, cash },
  };
}

describe('TASK-115 — Baseball Stars Pay-Cash Power-Up Camp', () => {
  it('exposes role-appropriate trainable stats and escalating cash tiers', () => {
    const club = makeTestClub(1151);
    const hitter = club.roster.find((p) => !isPitcherPosition(p.position))!;
    const pitcher = club.roster.find((p) => isPitcherPosition(p.position))!;

    expect(getPowerUpStatOptions(hitter)).toEqual(['contact', 'power', 'speed', 'fielding', 'arm']);
    expect(getPowerUpStatOptions(pitcher)).toEqual(['velocity', 'movement', 'control', 'stamina', 'clutch']);
    expect(POWER_UP_STAT_LABELS.power).toBe('Power');
    expect(POWER_UP_STAT_LABELS.velocity).toBe('Velocity');

    expect(getPowerUpPointCost(45)).toBe(350);
    expect(getPowerUpPointCost(59)).toBe(350);
    expect(getPowerUpPointCost(60)).toBe(600);
    expect(getPowerUpPointCost(69)).toBe(600);
    expect(getPowerUpPointCost(70)).toBe(1_100);
    expect(getPowerUpPointCost(79)).toBe(1_100);
    expect(getPowerUpPointCost(80)).toBe(2_100);
    expect(getPowerUpPointCost(89)).toBe(2_100);
    expect(getPowerUpPointCost(90)).toBe(3_800);
    expect(getPowerUpPointCost(98)).toBe(3_800);
  });

  it('rejects unknown players, wrong-role stats, maxed stats, and insufficient cash', () => {
    const base = makeTestClub(1152, 500);
    const hitter = base.roster.find((p) => !isPitcherPosition(p.position))!;
    const pitcher = base.roster.find((p) => isPitcherPosition(p.position))!;

    const missing = evaluatePowerUpPurchase(base, 'nobody', 'power');
    expect(missing.allowed).toBe(false);
    expect(missing.reason).toMatch(/not found/i);

    const wrongHitterStat = evaluatePowerUpPurchase(base, hitter.id, 'velocity');
    expect(wrongHitterStat.allowed).toBe(false);
    expect(wrongHitterStat.reason).toMatch(/position|batting|hitter/i);

    const wrongPitcherStat = evaluatePowerUpPurchase(base, pitcher.id, 'power');
    expect(wrongPitcherStat.allowed).toBe(false);
    expect(wrongPitcherStat.reason).toMatch(/pitcher/i);

    // Maxed at statCap
    const maxedClub: Club = {
      ...base,
      economy: { ...base.economy, cash: 50_000 },
      roster: base.roster.map((p) =>
        p.id === hitter.id
          ? {
              ...p,
              ratings: { ...p.ratings, power: 82 },
              statCaps: { ...p.statCaps, power: 82 },
            }
          : p,
      ),
    };
    const maxedEval = evaluatePowerUpPurchase(maxedClub, hitter.id, 'power');
    expect(maxedEval.allowed).toBe(false);
    expect(maxedEval.currentValue).toBe(82);
    expect(maxedEval.capValue).toBe(82);
    expect(maxedEval.reason).toMatch(/maxed|cap/i);

    // Insufficient cash for a 75-rated stat ($1,100)
    const poorClub: Club = {
      ...base,
      economy: { ...base.economy, cash: 800 },
      roster: base.roster.map((p) =>
        p.id === hitter.id
          ? {
              ...p,
              ratings: { ...p.ratings, power: 75 },
              statCaps: { ...p.statCaps, power: 92 },
            }
          : p,
      ),
    };
    const poorEval = evaluatePowerUpPurchase(poorClub, hitter.id, 'power');
    expect(poorEval.allowed).toBe(false);
    expect(poorEval.cost).toBe(1_100);
    expect(poorEval.reason).toMatch(/1,100/);

    const failedPurchase = applyPowerUpPurchase(poorClub, hitter.id, 'power');
    expect(failedPurchase.purchased).toBe(false);
    expect(failedPurchase.club).toBe(poorClub);
  });

  it('deducts cash, increments attribute, records a ledger entry, evolves archetype, and enforces totalRatingBudget trimming', () => {
    const base = makeTestClub(1153, 12_000);
    const hitter = base.roster.find((p) => !isPitcherPosition(p.position))!;

    // Set hitter right below statCap and with headroom in totalRatingBudget first
    const groomedHitter: Player = {
      ...hitter,
      specialistArchetype: 'balanced_regular',
      ratings: { ...hitter.ratings, power: 81, fielding: 62, contact: 70 },
      statCaps: { ...hitter.statCaps, power: 92 },
      totalRatingBudget: computeCoreRatingSum({
        position: hitter.position,
        ratings: { ...hitter.ratings, power: 81, fielding: 62, contact: 70 },
      }) + 5,
    };
    const clubWithHeadroom: Club = {
      ...base,
      roster: base.roster.map((p) => (p.id === hitter.id ? groomedHitter : p)),
    };

    const preview = evaluatePowerUpPurchase(clubWithHeadroom, hitter.id, 'power');
    expect(preview.allowed).toBe(true);
    expect(preview.cost).toBe(2_100);
    expect(preview.currentValue).toBe(81);
    expect(preview.nextValue).toBe(82);
    expect(preview.willTrimSecondary).toBe(false);

    const res = applyPowerUpPurchase(clubWithHeadroom, hitter.id, 'power', {
      seasonNumber: 2,
      seriesIndex: 4,
    });
    expect(res.purchased).toBe(true);
    expect(res.cost).toBe(2_100);
    expect(res.club.economy.cash).toBe(12_000 - 2_100);
    expect(res.updatedPlayer?.ratings.power).toBe(82);
    expect(res.updatedPlayer?.specialistArchetype).toBe('power_slugger');
    expect(res.summary).toContain('+1 Power');
    expect(res.summary).toContain(hitter.name);
    expect(res.summary).toContain('$2,100');

    // Original club stays immutable
    expect(clubWithHeadroom.economy.cash).toBe(12_000);
    expect(clubWithHeadroom.roster.find((p) => p.id === hitter.id)!.ratings.power).toBe(81);

    // Itemized ClubLedgerEntry recorded newest-first
    const latestReceipt = res.club.economy.recentLedgerEntries?.[0];
    expect(latestReceipt).toBeDefined();
    expect(latestReceipt?.season).toBe(2);
    expect(latestReceipt?.expenseTotal).toBe(2_100);
    expect(latestReceipt?.netDelta).toBe(-2_100);
    expect(latestReceipt?.endingCash).toBe(9_900);
    expect(latestReceipt?.lines[0]?.kind).toBe('expense');

    // Now test at exact totalRatingBudget ceiling: buying +1 trims -1 from a secondary tool!
    const cappedHitter: Player = {
      ...res.updatedPlayer!,
      totalRatingBudget: computeCoreRatingSum(res.updatedPlayer!),
    };
    const cappedClub: Club = {
      ...res.club,
      roster: res.club.roster.map((p) => (p.id === hitter.id ? cappedHitter : p)),
    };

    const cappedPreview = evaluatePowerUpPurchase(cappedClub, hitter.id, 'power');
    expect(cappedPreview.allowed).toBe(true);
    expect(cappedPreview.willTrimSecondary).toBe(true);

    const trimmedRes = applyPowerUpPurchase(cappedClub, hitter.id, 'power', {
      seasonNumber: 2,
      seriesIndex: 4,
    });
    expect(trimmedRes.purchased).toBe(true);
    expect(trimmedRes.updatedPlayer!.ratings.power).toBe(83);
    expect(computeCoreRatingSum(trimmedRes.updatedPlayer!)).toBeLessThanOrEqual(
      cappedHitter.totalRatingBudget,
    );
  });

  it('supports pitcher power-ups including clutch without breaking core rating sum', () => {
    const base = makeTestClub(1154, 10_000);
    const pitcher = base.roster.find((p) => isPitcherPosition(p.position))!;
    const targetPitcher: Player = {
      ...pitcher,
      ratings: { ...pitcher.ratings, velocity: 65, clutch: 58 },
      statCaps: { ...pitcher.statCaps, velocity: 90, clutch: 88 },
      totalRatingBudget: computeCoreRatingSum(pitcher) + 10,
    };
    const club: Club = {
      ...base,
      roster: base.roster.map((p) => (p.id === pitcher.id ? targetPitcher : p)),
    };

    const veloRes = applyPowerUpPurchase(club, pitcher.id, 'velocity');
    expect(veloRes.purchased).toBe(true);
    expect(veloRes.cost).toBe(600);
    expect(veloRes.updatedPlayer?.ratings.velocity).toBe(66);

    const clutchRes = applyPowerUpPurchase(veloRes.club, pitcher.id, 'clutch');
    expect(clutchRes.purchased).toBe(true);
    expect(clutchRes.cost).toBe(350);
    expect(clutchRes.updatedPlayer?.ratings.clutch).toBe(59);
  });
});
