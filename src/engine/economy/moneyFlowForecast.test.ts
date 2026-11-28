import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { buildClubMoneyFlowSummary } from './moneyFlowForecast';
import { computeSeriesLedger, evaluateFanPricingMood } from './ledger';
import { PARODY_SPONSORS_CATALOG, TV_CONTRACTS_CATALOG } from './sponsorsTv';

describe('Transparent Money Flow & Economy Breakdown (TASK-143)', () => {
  it('breaks down per-series and per-season income vs expenses clearly and generates actionable CFO tips', () => {
    const club = createClub(createSeededRng(1431), {
      id: 'money-club',
      city: 'Ledger',
      name: 'Hustlers',
      mascot: 'Coin',
      colors: { primary: '#1B4332', secondary: '#181B2C', accent: '#FFD166', monogram: 'LH' },
      leagueTier: 'aa',
      isHuman: true,
    });

    const summary = buildClubMoneyFlowSummary(club);
    expect(summary.incomeLines.length).toBeGreaterThanOrEqual(5);
    expect(summary.expenseLines.length).toBeGreaterThanOrEqual(3);
    expect(summary.netPerSeries).toBe(summary.totalIncomePerSeries - summary.totalExpensePerSeries);
    expect(summary.netPerSeason).toBe(summary.totalIncomePerSeason - summary.totalExpensePerSeason);
    expect(summary.cfoTips.length).toBeGreaterThanOrEqual(1);
    expect(summary.cfoTips.some((t) => /TV|Sponsor/i.test(t))).toBe(true);
  });

  it('includes TV deals, outfield sponsors, luxury tax penalties, deficit warnings, and healthy cash-flow tips', () => {
    const baseClub = createClub(createSeededRng(1432), {
      id: 'money-club-2',
      city: 'Mint',
      name: 'Barons',
      mascot: 'Vault',
      colors: { primary: '#1B4332', secondary: '#181B2C', accent: '#FFD166', monogram: 'MB' },
      leagueTier: 'aa',
      isHuman: true,
    });

    // Healthy club with TV contract + 1 sponsor (singular label) + high attendance
    const healthy = buildClubMoneyFlowSummary({
      ...baseClub,
      economy: {
        ...baseClub.economy,
        tvContractId: TV_CONTRACTS_CATALOG[0].id,
        activeSponsorIds: [PARODY_SPONSORS_CATALOG[0].id],
        ticketPrice: 18,
      },
      stadium: { ...baseClub.stadium, seatingTier: 3 },
    });
    expect(healthy.incomeLines.find((l) => l.id === 'tv')?.perSeries).toBeGreaterThan(0);
    expect(healthy.incomeLines.find((l) => l.id === 'sponsors')?.detail).toBe('1 active sponsor');
    expect(healthy.cfoTips.some((t) => /Healthy cash flow/i.test(t))).toBe(true);

    // Over-cap deficit club triggers Luxury Tax line item + deficit tip
    const overpaidRoster = baseClub.roster.map((p) => ({
      ...p,
      contract: { ...p.contract, salaryPerSeason: 85_000 },
    }));
    const overCap = buildClubMoneyFlowSummary({
      ...baseClub,
      roster: overpaidRoster,
      economy: {
        ...baseClub.economy,
        tvContractId: TV_CONTRACTS_CATALOG[0].id,
        activeSponsorIds: [PARODY_SPONSORS_CATALOG[0].id, PARODY_SPONSORS_CATALOG[1].id],
        ticketPrice: 4,
      },
    });
    expect(overCap.expenseLines.some((l) => l.id === 'luxury_tax')).toBe(true);
    expect(overCap.netPerSeries).toBeLessThan(0);
    expect(overCap.cfoTips.some((t) => /Luxury Tax/i.test(t))).toBe(true);
    expect(overCap.cfoTips.some((t) => /cash-flow positive/i.test(t))).toBe(true);

    // Fan pricing moods across all 4 price bands + Series Ledger with promo/tv/sponsors/district
    expect(evaluateFanPricingMood(4, 'rookie').mood).toBe('ecstatic');
    expect(evaluateFanPricingMood(9, 'rookie').mood).toBe('happy');
    expect(evaluateFanPricingMood(12, 'rookie').mood).toBe('grumpy');
    expect(evaluateFanPricingMood(20, 'rookie').mood).toBe('furious');

    const ledgerWithPromo = computeSeriesLedger(baseClub, {
      homeGames: 3,
      avgAttendance: 1200,
      promoNightId: 'bobblehead_night',
      sponsorSeriesBonus: 1500,
      tvSeriesRevenue: 2000,
      districtRevenueBonus: 600,
      districtUpkeepCost: 300,
    });
    expect(ledgerWithPromo.ticketRevenue).toBeGreaterThan(0);
    expect(ledgerWithPromo.sponsorRevenue).toBe(2100);
    expect(ledgerWithPromo.tvRevenue).toBe(2000);
    const ledgerPlain = computeSeriesLedger(baseClub, { homeGames: 2, avgAttendance: 800 });
    expect(ledgerPlain.ticketRevenue).toBeGreaterThan(0);
  });
});
