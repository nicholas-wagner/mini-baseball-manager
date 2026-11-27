import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { validateSalaryCapRoom } from '../gm/offseasonEngine';
import { TIER_SALARY_CAPS, type Club } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import {
  evaluateSalaryCapStatus,
  extendPlayerContract,
  hostClubhouseFeast,
  purchaseFoilPack,
  schedulePromoNight,
  settleGameEconomics,
  settleSeriesGameLogs,
  SOFT_CAP_MULTIPLIER,
} from './clubLedgerSettlement';
import { buildDistrictBuilding } from './districtBuilder';
import { signParodySponsor, signTvContract } from './sponsorsTv';

const CLUB_OPTS = {
  id: 'club-ledger',
  city: 'Sandlot',
  name: 'Comets',
  mascot: 'Rocket Dog',
  colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
  leagueTier: 'rookie' as const,
  isHuman: true,
};

function rookieClub(seed = 108): Club {
  return createClub(createSeededRng(seed), CLUB_OPTS);
}

describe('TASK-108 club ledger settlement', () => {
  it('settles a home game into itemized cash, receipts, and a higher win than a loss', () => {
    const base = rookieClub();
    const sponsored = signTvContract(
      signParodySponsor(base, 'turbo_fizz').club,
      'tv_public_access',
    ).club;
    const withPlaza = buildDistrictBuilding(sponsored, 'north-1', 'nacho_cantina').club;
    const rng = createSeededRng(10801);

    const win = settleGameEconomics(
      withPlaza,
      {
        season: 1,
        gameLabel: 'Home vs Harbor Hawks',
        isHomeGame: true,
        attendance: 900,
        won: true,
      },
      rng,
    );
    const loss = settleGameEconomics(
      withPlaza,
      {
        season: 1,
        gameLabel: 'Home vs Harbor Hawks',
        isHomeGame: true,
        attendance: 900,
        won: false,
      },
      createSeededRng(10801),
    );

    expect(win.entry.revenueTotal).toBeGreaterThan(win.entry.expenseTotal);
    expect(win.entry.netDelta).toBe(win.entry.endingCash - withPlaza.economy.cash);
    expect(win.club.economy.cash).toBe(win.entry.endingCash);
    expect(win.entry.netDelta).toBeGreaterThan(loss.entry.netDelta);
    expect(win.club.economy.recentLedgerEntries?.[0]?.id).toBe(win.entry.id);
    expect(win.entry.lines.some((line) => line.label === 'Ticket Sales' && line.kind === 'income')).toBe(true);
    expect(win.entry.lines.some((line) => line.label === 'Concession Sales' && line.amount > 0)).toBe(true);
    expect(win.entry.lines.some((line) => line.label === 'Sponsor Payouts' && line.amount > 0)).toBe(true);
    expect(win.entry.lines.some((line) => line.label === 'TV Contract' && line.amount > 0)).toBe(true);
    expect(win.entry.lines.some((line) => line.label === 'District Plaza Income' && line.amount > 0)).toBe(true);
    expect(win.entry.lines.some((line) => line.label === 'Roster Payroll' && line.kind === 'expense')).toBe(true);
    expect(win.entry.lines.some((line) => line.label === 'Win Bonus')).toBe(true);
    expect(loss.entry.lines.some((line) => line.label === 'Win Bonus')).toBe(false);

    const bare = settleGameEconomics(
      base,
      { season: 1, gameLabel: 'Home', isHomeGame: true, attendance: 900, won: true },
      createSeededRng(10801),
    );
    expect(win.entry.lines.find((line) => line.label === 'Sponsor Payouts')!.amount).toBeGreaterThan(0);
    expect(bare.entry.revenueTotal).toBeLessThan(win.entry.revenueTotal);
  });

  it('consumes a prepaid promo on the next home game and leaves it booked on the road', () => {
    const booked = schedulePromoNight(rookieClub(109), 'bobblehead_night');
    expect(booked.booked).toBe(true);
    expect(booked.club.economy.scheduledPromoId).toBe('bobblehead_night');
    expect(booked.club.economy.cash).toBe(rookieClub(109).economy.cash - 650);

    const home = settleGameEconomics(
      booked.club,
      { season: 1, gameLabel: 'Bobblehead Home', isHomeGame: true, attendance: 700, won: true },
      createSeededRng(10901),
    );
    const plain = settleGameEconomics(
      { ...booked.club, economy: { ...booked.club.economy, scheduledPromoId: null } },
      { season: 1, gameLabel: 'Plain Home', isHomeGame: true, attendance: 700, won: true },
      createSeededRng(10901),
    );

    expect(home.entry.promoConsumedId).toBe('bobblehead_night');
    expect(home.club.economy.scheduledPromoId).toBeNull();
    expect(home.attendance).toBeGreaterThan(plain.attendance);
    expect(home.entry.lines.some((line) => line.label.includes('Bobblehead') && line.kind === 'expense')).toBe(false);
    expect(home.club.economy.teamHype).toBeGreaterThan(booked.club.economy.teamHype);

    const road = settleGameEconomics(
      booked.club,
      { season: 1, gameLabel: 'Road', isHomeGame: false, attendance: 700, won: false },
      createSeededRng(10902),
    );
    expect(road.entry.promoConsumedId).toBeNull();
    expect(road.club.economy.scheduledPromoId).toBe('bobblehead_night');
    expect(road.entry.netDelta).not.toBe(0);
  });

  it('charges 15% luxury tax between the hard cap and the 115% soft cap, and blocks extensions past it', () => {
    const club = rookieClub(110);
    const hardCap = TIER_SALARY_CAPS.rookie;
    expect(SOFT_CAP_MULTIPLIER).toBe(1.15);
    const inflated = {
      ...club,
      roster: club.roster.map((player) => ({
        ...player,
        contract: {
          ...player.contract,
          salaryPerSeason: 900,
          yearsRemaining: 1,
        },
      })),
    };
    const status = evaluateSalaryCapStatus(inflated);
    expect(status.hardCap).toBe(hardCap);
    expect(status.softCapMax).toBe(Math.round(hardCap * 1.15));
    expect(status.status).toBe('luxury_tax');
    expect(status.luxuryTaxPerSeries).toBe(Math.round((status.payroll - hardCap) * 0.15));

    const settled = settleGameEconomics(
      inflated,
      { season: 2, gameLabel: 'Tax Game', isHomeGame: true, attendance: 400, won: false },
      createSeededRng(11001),
    );
    expect(settled.entry.luxuryTaxPaid).toBeGreaterThan(0);
    expect(settled.entry.lines.some((line) => line.label === 'Luxury Tax')).toBe(true);

    const softRoom = validateSalaryCapRoom(inflated, 200, inflated.roster[0].contract.salaryPerSeason, 'soft');
    expect(softRoom.allowed).toBe(true);
    expect(softRoom.cap).toBe(hardCap);
    const blocked = validateSalaryCapRoom(inflated, hardCap, 0, 'soft');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/salary cap/i);

    const extended = extendPlayerContract(inflated, inflated.roster[1].id);
    expect(extended.extended).toBe(true);
    const years = extended.club.roster[1].contract.yearsRemaining;
    expect(years).toBe(inflated.roster[1].contract.yearsRemaining + 2);

    const overSoft = {
      ...club,
      roster: club.roster.map((player) => ({
        ...player,
        contract: { ...player.contract, salaryPerSeason: 2_000, yearsRemaining: 1 },
      })),
    };
    const refused = extendPlayerContract(overSoft, overSoft.roster[0].id);
    expect(refused.extended).toBe(false);
    expect(refused.club).toBe(overSoft);
  });

  it('prints a bake-sale bailout until cash is no longer negative and keeps 12 receipts', () => {
    const broke = {
      ...rookieClub(111),
      roster: [],
      economy: {
        ...rookieClub(111).economy,
        cash: -10_000,
        ticketPrice: 0,
        concessionPrice: 0,
      },
    };
    const rescued = settleGameEconomics(
      broke,
      { season: 1, gameLabel: 'Bake Sale', isHomeGame: false, attendance: 0, won: undefined },
      createSeededRng(11101),
    );
    expect(rescued.entry.bailoutTriggered).toBe(true);
    expect(rescued.entry.bailoutAmount).toBe(10_000);
    expect(rescued.entry.endingCash).toBeGreaterThanOrEqual(0);
    expect(rescued.club.economy.cash).toBeGreaterThanOrEqual(0);
    expect(rescued.entry.lines.some((line) => line.kind === 'income' && line.amount === 10_000)).toBe(true);

    let club = rookieClub(112);
    for (let game = 0; game < 13; game += 1) {
      club = settleGameEconomics(
        club,
        { season: 1, gameLabel: `G${game}`, isHomeGame: true, attendance: 200, won: game % 2 === 0 },
        createSeededRng(11200 + game),
      ).club;
    }
    expect(club.economy.recentLedgerEntries).toHaveLength(12);
    expect(club.economy.recentLedgerEntries?.[0]?.gameLabel).toBe('G12');
  });

  it('hosts one feast per series and sells a foil pack only when the club can afford it', () => {
    const club = {
      ...rookieClub(113),
      roster: rookieClub(113).roster.map((player) => ({ ...player, fatigue: 40, morale: 50 })),
    };
    const feast = hostClubhouseFeast(club, 2);
    expect(feast.hosted).toBe(true);
    expect(feast.club.economy.cash).toBe(club.economy.cash - 750);
    expect(feast.club.economy.spaUsedInSeriesIndex).toBe(2);
    expect(feast.club.roster[0].fatigue).toBe(22);
    expect(feast.club.roster[0].morale).toBe(58);
    expect(hostClubhouseFeast(feast.club, 2).hosted).toBe(false);

    const pack = purchaseFoilPack(feast.club, 'sandlot_foil');
    expect(pack.bought).toBe(true);
    expect(pack.tier).toBe('sandlot_foil');
    expect(pack.club.economy.cash).toBe(feast.club.economy.cash - 1_200);
    const poor = purchaseFoilPack({ ...pack.club, economy: { ...pack.club.economy, cash: 100 } }, 'championship_holo');
    expect(poor.bought).toBe(false);
  });

  it('folds a simmed series of home and road games into one running cash balance', () => {
    const club = rookieClub(114);
    const series = settleSeriesGameLogs(
      club,
      [
        { isHome: true, won: true, gameNumber: 1 },
        { isHome: false, won: false, gameNumber: 2 },
        { isHome: true, won: true, gameNumber: 3 },
      ],
      1,
      createSeededRng(11401),
    );
    expect(series.club.economy.recentLedgerEntries).toHaveLength(3);
    expect(series.netDelta).toBe(series.club.economy.cash - club.economy.cash);
    expect(series.club.economy.recentLedgerEntries?.[0]?.gameLabel).toBe('Series Game 3');
  });
});
