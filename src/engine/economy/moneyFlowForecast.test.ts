import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { buildClubMoneyFlowSummary } from './moneyFlowForecast';

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
});
