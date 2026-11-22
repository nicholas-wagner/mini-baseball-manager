import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { simulateGameAttendance } from './attendance';
import {
  buildDistrictBuilding,
  DISTRICT_BUILDINGS_CATALOG,
  evaluateDistrictBonuses,
} from './districtBuilder';
import {
  computeSeriesLedger,
  evaluateFanPricingMood,
  PROMO_NIGHT_CATALOG,
} from './ledger';
import {
  getAvailableTvContracts,
  PARODY_SPONSORS_CATALOG,
  signParodySponsor,
  signTvContract,
} from './sponsorsTv';

describe('Milestone 5 — Sim-City Ballpark Economy, Sponsors/TV & District Grid (TASK-029..032)', () => {
  it('simulates dynamic attendance responding to Ticket Fairness, Win Streaks, Popularity, Promo Nights & Rivalry Surge (TASK-029)', () => {
    const club = createClub(createSeededRng(2901), {
      id: 'c-econ',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Rocket Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'high_a',
      isHuman: true,
    });

    const fairBase = simulateGameAttendance(club, {
      rivalryAttendanceSurgePct: 0,
      promoNightId: null,
    });
    const overpriced = simulateGameAttendance(
      { ...club, economy: { ...club.economy, ticketPrice: 48 } },
      { rivalryAttendanceSurgePct: 0, promoNightId: null },
    );
    const hotPromoRivalry = simulateGameAttendance(
      { ...club, streak: 6, economy: { ...club.economy, teamHype: 88 } },
      { rivalryAttendanceSurgePct: 0.3, promoNightId: 'bobblehead_night' },
    );

    expect(fairBase.attendance).toBeGreaterThan(overpriced.attendance);
    expect(hotPromoRivalry.attendance).toBeGreaterThan(fairBase.attendance);
    expect(hotPromoRivalry.attendance).toBeLessThanOrEqual(club.stadium.capacity);
    expect(hotPromoRivalry.crowdFillRatio).toBeGreaterThan(0.7);
  });

  it('computes Sim-City fan pricing mood faces, Promo Night boosts & Series P&L Ledger (TASK-030)', () => {
    expect(PROMO_NIGHT_CATALOG.length).toBeGreaterThanOrEqual(4);
    expect(evaluateFanPricingMood(8, 'rookie').mood).toBe('ecstatic');
    expect(evaluateFanPricingMood(36, 'rookie').mood).toBe('furious');

    const club = createClub(createSeededRng(3001), {
      id: 'c-led',
      city: 'Harbor',
      name: 'Hawks',
      mascot: 'Hawk',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'HH' },
      leagueTier: 'aa',
      isHuman: true,
    });

    const pnl = computeSeriesLedger(club, {
      homeGames: 3,
      avgAttendance: 5200,
      promoNightId: 'dollar_dog_day',
      sponsorSeriesBonus: 1200,
      tvSeriesRevenue: 2400,
    });
    expect(pnl.ticketRevenue).toBeGreaterThan(0);
    expect(pnl.concessionRevenue).toBeGreaterThan(0);
    expect(pnl.netProfit).toBe(
      pnl.ticketRevenue + pnl.concessionRevenue + pnl.sponsorRevenue + pnl.tvRevenue - pnl.operatingExpenses,
    );
  });

  it('negotiates 90s Parody Sponsors & Tier-Gated TV Contracts (TASK-031)', () => {
    expect(PARODY_SPONSORS_CATALOG.length).toBeGreaterThanOrEqual(6);
    const rookieClub = createClub(createSeededRng(3101), {
      id: 'c-spon',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });

    const rookieTv = getAvailableTvContracts('rookie');
    const majorsTv = getAvailableTvContracts('majors');
    expect(majorsTv.length).toBeGreaterThan(rookieTv.length);

    const signedTv = signTvContract(rookieClub, rookieTv[0].id);
    expect(signedTv.signed).toBe(true);
    expect(signedTv.club.economy.tvContractId).toBe(rookieTv[0].id);

    // National Primetime TV blocked in Rookie Ball
    const blockedTv = signTvContract(rookieClub, 'tv_national_primetime');
    expect(blockedTv.signed).toBe(false);

    const sponsor = PARODY_SPONSORS_CATALOG[0];
    const signedSpon = signParodySponsor(signedTv.club, sponsor.id);
    expect(signedSpon.signed).toBe(true);
    expect(signedSpon.club.economy.activeSponsorIds).toContain(sponsor.id);
  });

  it('builds Sim-City Ballpark District buildings with adjacency synergies and upkeep (TASK-032)', () => {
    expect(DISTRICT_BUILDINGS_CATALOG.length).toBeGreaterThanOrEqual(8);
    const baseClub = createClub(createSeededRng(3201), {
      id: 'c-dist',
      city: 'Metro',
      name: 'Knights',
      mascot: 'Knight',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'MK' },
      leagueTier: 'aa',
      isHuman: true,
    });

    const b1 = buildDistrictBuilding(baseClub, 'north-1', 'nacho_cantina');
    expect(b1.built).toBe(true);
    const b2 = buildDistrictBuilding(b1.club, 'north-2', 'bobblehead_megastore');
    expect(b2.built).toBe(true);

    const bonuses = evaluateDistrictBonuses(b2.club.stadium.districtTiles);
    expect(bonuses.concessionBonusPerFan).toBeGreaterThan(0);
    expect(bonuses.adjacencySynergyCount).toBeGreaterThanOrEqual(1);
    expect(bonuses.totalSeriesRevenueBonus).toBeGreaterThan(0);
  });
});
