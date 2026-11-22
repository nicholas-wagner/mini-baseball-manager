import type { Club, LeagueTierId } from '../models/club';
import { computeClubStaffPayroll } from '../gm/coaches';
import { computeClubPayroll } from '../gm/offseasonEngine';

export type PromoNightId =
  | 'bobblehead_night'
  | 'dollar_dog_day'
  | 'fireworks_friday'
  | 'throwback_90s_night'
  | 'kids_run_bases';

export type FanPricingMood = 'ecstatic' | 'happy' | 'grumpy' | 'furious';

export interface PromoNightDefinition {
  id: PromoNightId;
  name: string;
  cost: number;
  attendanceBoostPct: number;
  hypeDelta: number;
  concessionBoostPct: number;
  description: string;
}

export interface SeriesLedgerInput {
  homeGames: number;
  avgAttendance: number;
  promoNightId?: PromoNightId | null;
  sponsorSeriesBonus?: number;
  tvSeriesRevenue?: number;
  districtRevenueBonus?: number;
  districtUpkeepCost?: number;
}

export interface SeriesLedgerStatement {
  ticketRevenue: number;
  concessionRevenue: number;
  sponsorRevenue: number;
  tvRevenue: number;
  operatingExpenses: number;
  netProfit: number;
}

export const PROMO_NIGHT_CATALOG: readonly PromoNightDefinition[] = [
  {
    id: 'bobblehead_night',
    name: 'Chibi Bobblehead Night',
    cost: 650,
    attendanceBoostPct: 0.24,
    hypeDelta: 6,
    concessionBoostPct: 0.08,
    description: 'First 1,000 fans get a wobbly 90s bobblehead!',
  },
  {
    id: 'dollar_dog_day',
    name: 'Dollar Dog Day',
    cost: 400,
    attendanceBoostPct: 0.18,
    hypeDelta: 4,
    concessionBoostPct: 0.22,
    description: 'Packed bleachers and nonstop ballpark mustard.',
  },
  {
    id: 'fireworks_friday',
    name: 'Fireworks Friday',
    cost: 900,
    attendanceBoostPct: 0.28,
    hypeDelta: 8,
    concessionBoostPct: 0.12,
    description: 'Post-game sky booms ignite weekend sellouts!',
  },
  {
    id: 'throwback_90s_night',
    name: '1994 Throwback Neon Night',
    cost: 550,
    attendanceBoostPct: 0.16,
    hypeDelta: 7,
    concessionBoostPct: 0.14,
    description: 'Pinstripes, boomboxes, and bonus merch sales.',
  },
  {
    id: 'kids_run_bases',
    name: 'Kids Run the Bases Sunday',
    cost: 250,
    attendanceBoostPct: 0.14,
    hypeDelta: 5,
    concessionBoostPct: 0.1,
    description: 'Family favorite that builds lifelong fan loyalty.',
  },
];

const FAIR_PRICE_BENCHMARKS: Readonly<Record<LeagueTierId, number>> = {
  rookie: 9,
  low_a: 12,
  high_a: 15,
  aa: 19,
  aaa: 25,
  majors: 34,
};

export function getPromoNightById(id: PromoNightId): PromoNightDefinition | undefined {
  return PROMO_NIGHT_CATALOG.find((p) => p.id === id);
}

/** Evaluates Sim-City fan mood face for current ticket pricing relative to league tier. */
export function evaluateFanPricingMood(
  ticketPrice: number,
  tier: LeagueTierId,
): { mood: FanPricingMood; label: string } {
  const ratio = ticketPrice / FAIR_PRICE_BENCHMARKS[tier];
  if (ratio <= 0.92) return { mood: 'ecstatic', label: 'Bargain Sandlot Deal!' };
  if (ratio <= 1.15) return { mood: 'happy', label: 'Fair Ballpark Value' };
  if (ratio <= 1.45) return { mood: 'grumpy', label: 'Fans Grumbling at Prices' };
  return { mood: 'furious', label: 'Way Too Steep — Empty Seats!' };
}

function computeOperatingExpenses(
  club: Club,
  totalFans: number,
  promoCost: number,
  districtUpkeepCost: number,
): number {
  const seriesRosterPayroll = Math.round(computeClubPayroll(club.roster) / 7);
  const seriesStaffPayroll = Math.round(computeClubStaffPayroll(club.coaches.activeStaff ?? []) / 7);
  const concessionStockCost = Math.round(totalFans * club.economy.concessionQuality * 0.45);
  return seriesRosterPayroll + seriesStaffPayroll + concessionStockCost + promoCost + districtUpkeepCost;
}

/** Computes a complete 3-game home series P&L financial statement for the club ledger. */
export function computeSeriesLedger(
  club: Club,
  input: SeriesLedgerInput,
): SeriesLedgerStatement {
  const games = Math.max(0, input.homeGames);
  const totalFans = Math.round(games * Math.max(0, input.avgAttendance));
  const promo = input.promoNightId ? getPromoNightById(input.promoNightId) : undefined;

  const ticketRevenue = Math.round(totalFans * club.economy.ticketPrice);
  const qualityScale = 0.85 + club.economy.concessionQuality * 0.18;
  const promoConcScale = 1 + (promo?.concessionBoostPct ?? 0);
  const concessionRevenue = Math.round(
    totalFans * club.economy.concessionPrice * 0.42 * qualityScale * promoConcScale,
  );
  const sponsorRevenue = Math.round((input.sponsorSeriesBonus ?? 0) + (input.districtRevenueBonus ?? 0));
  const tvRevenue = Math.round(input.tvSeriesRevenue ?? 0);
  const operatingExpenses = computeOperatingExpenses(
    club,
    totalFans,
    promo?.cost ?? 0,
    input.districtUpkeepCost ?? 0,
  );

  return {
    ticketRevenue,
    concessionRevenue,
    sponsorRevenue,
    tvRevenue,
    operatingExpenses,
    netProfit: ticketRevenue + concessionRevenue + sponsorRevenue + tvRevenue - operatingExpenses,
  };
}
