import type { FoilPackTierId } from '../events/foilPacks';
import { computeClubStaffPayroll } from '../gm/coaches';
import {
  LEAGUE_TIER_ORDER,
  SOFT_CAP_MULTIPLIER,
  TIER_SALARY_CAPS,
  type Club,
  type ClubLedgerEntry,
  type ClubLedgerLine,
  type LeagueTierId,
} from '../models/club';
import type { Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { simulateGameAttendance } from './attendance';
import { evaluateDistrictBonuses, type DistrictBonusesSummary } from './districtBuilder';
import { getPromoNightById, type PromoNightDefinition, type PromoNightId } from './ledger';
import { PARODY_SPONSORS_CATALOG, TV_CONTRACTS_CATALOG } from './sponsorsTv';

export { SOFT_CAP_MULTIPLIER };

export const GAME_WIN_CASH_BONUS = 1_800;
export const GAME_LOSS_CASH_BONUS = 400;
export const FEAST_COST = 750;
export const FEAST_FATIGUE_CUT = 18;
export const FEAST_MORALE_BOOST = 8;
export const LEDGER_HISTORY_CAP = 12;
export const BAILOUT_CHUNK = 2_500;

const GAMES_PER_SERIES = 3;
const GAMES_PER_SEASON = 21;
const ROAD_GATE_SHARE = 0.25;
const LUXURY_TAX_RATE = 0.15;

const BAILOUT_FLAVORS = [
  'Emergency Sandlot Bake Sale',
  'Local Sponsor Lemonade Rescue',
  '1994 Car-Wash Bailout',
] as const;

export const FOIL_CASH_SHOP: readonly { tier: FoilPackTierId; label: string; cost: number }[] = [
  { tier: 'sandlot_foil', label: 'Bronze Pack', cost: 1_200 },
  { tier: 'rivalry_chrome', label: 'Silver Pack', cost: 2_800 },
  { tier: 'championship_holo', label: 'Gold Collector Pack', cost: 5_500 },
];

export type SalaryCapHealth = 'healthy' | 'tight' | 'luxury_tax' | 'over_max';

export interface SalaryCapSnapshot {
  payroll: number;
  hardCap: number;
  softCapMax: number;
  pctOfCap: number;
  status: SalaryCapHealth;
  luxuryTaxPerSeries: number;
}

export interface SettleGameEconomicsInput {
  season: number;
  gameLabel: string;
  isHomeGame: boolean;
  attendance?: number;
  won?: boolean;
  trophyBonus?: number;
}

export interface SettledGameEconomics {
  club: Club;
  entry: ClubLedgerEntry;
  attendance: number;
  promoHype: number;
}

export interface ContractExtensionOffer {
  yearsAdded: 2;
  salaryPerSeason: number;
  eligible: boolean;
  reason?: string;
}

interface GameQuote {
  entry: ClubLedgerEntry;
  attendance: number;
  promoHype: number;
  promoConsumedId: string | null;
}

function rosterPayroll(roster: readonly Player[]): number {
  return roster.reduce((sum, player) => sum + player.contract.salaryPerSeason, 0);
}

function perGame(seriesAmount: number): number {
  return Math.round(seriesAmount / GAMES_PER_SERIES);
}

function perSeasonGame(annual: number): number {
  return Math.round(annual / GAMES_PER_SEASON);
}

function moneyLine(label: string, amount: number, kind: ClubLedgerLine['kind']): ClubLedgerLine | null {
  if (amount <= 0) return null;
  return { label, amount, kind };
}

function definedLines(lines: readonly (ClubLedgerLine | null)[]): ClubLedgerLine[] {
  return lines.filter((item): item is ClubLedgerLine => item !== null);
}

function sponsorSeriesPayout(club: Club): number {
  const active = new Set(club.economy.activeSponsorIds ?? []);
  return PARODY_SPONSORS_CATALOG.reduce(
    (sum, sponsor) => sum + (active.has(sponsor.id) ? sponsor.seriesPayout : 0),
    0,
  );
}

function tvSeriesPayout(club: Club): number {
  const deal = TV_CONTRACTS_CATALOG.find((item) => item.id === club.economy.tvContractId);
  return deal?.seriesPayout ?? 0;
}

function capHealth(payroll: number, hardCap: number, softCapMax: number): SalaryCapHealth {
  if (payroll > softCapMax) return 'over_max';
  if (payroll > hardCap) return 'luxury_tax';
  if (payroll >= hardCap * 0.9) return 'tight';
  return 'healthy';
}

export function evaluateSalaryCapStatus(club: Pick<Club, 'leagueTier' | 'roster'>): SalaryCapSnapshot {
  const payroll = rosterPayroll(club.roster);
  const hardCap = TIER_SALARY_CAPS[club.leagueTier];
  const softCapMax = Math.round(hardCap * SOFT_CAP_MULTIPLIER);
  const excess = Math.max(0, payroll - hardCap);
  return {
    payroll,
    hardCap,
    softCapMax,
    pctOfCap: hardCap === 0 ? 0 : Math.round((payroll / hardCap) * 100),
    status: capHealth(payroll, hardCap, softCapMax),
    luxuryTaxPerSeries: Math.round(excess * LUXURY_TAX_RATE),
  };
}

function bookedPromo(club: Club, home: boolean): PromoNightDefinition | undefined {
  if (!home || !club.economy.scheduledPromoId) return undefined;
  return getPromoNightById(club.economy.scheduledPromoId as PromoNightId);
}

function clampCrowd(value: number, capacity: number): number {
  return Math.min(Math.max(1, capacity), Math.max(120, value));
}

function simulatedCrowd(
  club: Club,
  input: SettleGameEconomicsInput,
  promo: PromoNightDefinition | undefined,
  districtPct: number,
  capacity: number,
): number {
  const sim = simulateGameAttendance(club, {
    promoNightId: input.isHomeGame ? (promo?.id ?? null) : null,
    districtAttendanceBonusPct: districtPct,
  });
  const scaled = input.isHomeGame ? sim.attendance : Math.round(sim.attendance * 0.65);
  return clampCrowd(scaled, capacity);
}

function resolveCrowd(
  club: Club,
  input: SettleGameEconomicsInput,
  promo: PromoNightDefinition | undefined,
  districtPct: number,
): number {
  const capacity = Math.max(1, club.stadium.capacity);
  if (input.attendance == null) return simulatedCrowd(club, input, promo, districtPct, capacity);
  const boost = promo?.attendanceBoostPct ?? 0;
  const mult = input.isHomeGame ? 1 + boost + districtPct : 1;
  return clampCrowd(Math.round(input.attendance * mult), capacity);
}

function ticketAmount(club: Club, crowd: number, home: boolean): number {
  const share = home ? 1 : ROAD_GATE_SHARE;
  return Math.round(crowd * club.economy.ticketPrice * share);
}

function concessionAmount(
  club: Club,
  crowd: number,
  promo: PromoNightDefinition | undefined,
  district: DistrictBonusesSummary,
): number {
  const qualityScale = 0.85 + club.economy.concessionQuality * 0.18;
  const promoScale = 1 + (promo?.concessionBoostPct ?? 0);
  const stand = Math.round(crowd * club.economy.concessionPrice * 0.42 * qualityScale * promoScale);
  return stand + Math.round(crowd * district.concessionBonusPerFan);
}

function gateLines(
  club: Club,
  crowd: number,
  home: boolean,
  promo: PromoNightDefinition | undefined,
  district: DistrictBonusesSummary,
): ClubLedgerLine[] {
  const tickets = moneyLine('Ticket Sales', ticketAmount(club, crowd, home), 'income');
  if (!home) return definedLines([tickets]);
  const stock = Math.round(crowd * club.economy.concessionQuality * 0.45);
  return definedLines([
    tickets,
    moneyLine('Concession Sales', concessionAmount(club, crowd, promo, district), 'income'),
    moneyLine('Concession Stock', stock, 'expense'),
  ]);
}

function seriesShareLines(club: Club, district: DistrictBonusesSummary): ClubLedgerLine[] {
  return definedLines([
    moneyLine('Sponsor Payouts', perGame(sponsorSeriesPayout(club)), 'income'),
    moneyLine('TV Contract', perGame(tvSeriesPayout(club)), 'income'),
    moneyLine('District Plaza Income', perGame(district.totalSeriesRevenueBonus), 'income'),
    moneyLine('District Upkeep', perGame(district.totalSeriesUpkeep), 'expense'),
  ]);
}

function payrollLines(club: Club): ClubLedgerLine[] {
  const annualRoster = rosterPayroll(club.roster);
  const annualStaff = computeClubStaffPayroll(club.coaches.activeStaff ?? []);
  const luxury = evaluateSalaryCapStatus(club).luxuryTaxPerSeries;
  return definedLines([
    moneyLine('Roster Payroll', perSeasonGame(annualRoster), 'expense'),
    moneyLine('Coaching Staff Payroll', perSeasonGame(annualStaff), 'expense'),
    moneyLine('Luxury Tax', perGame(luxury), 'expense'),
  ]);
}

function bonusLines(won: boolean | undefined, trophy: number): ClubLedgerLine[] {
  const gameBonus =
    won === true
      ? moneyLine('Win Bonus', GAME_WIN_CASH_BONUS, 'income')
      : won === false
        ? moneyLine('Show-Up Bonus', GAME_LOSS_CASH_BONUS, 'income')
        : null;
  return definedLines([gameBonus, moneyLine('Playoff Trophy Bonus', trophy, 'income')]);
}

function sumLines(lines: readonly ClubLedgerLine[]): { revenueTotal: number; expenseTotal: number } {
  let revenueTotal = 0;
  let expenseTotal = 0;
  for (const item of lines) {
    if (item.kind === 'income') revenueTotal += item.amount;
    else expenseTotal += item.amount;
  }
  return { revenueTotal, expenseTotal };
}

function coverWithBakeSale(cash: number, rng: SeededRng): { cash: number; bailoutAmount: number; flavor: string | null } {
  if (cash >= 0) return { cash, bailoutAmount: 0, flavor: null };
  const chunks = Math.ceil(-cash / BAILOUT_CHUNK);
  return {
    cash: cash + chunks * BAILOUT_CHUNK,
    bailoutAmount: chunks * BAILOUT_CHUNK,
    flavor: rng.pick(BAILOUT_FLAVORS),
  };
}

function luxuryPaid(lines: readonly ClubLedgerLine[]): number {
  return lines.reduce((sum, item) => sum + (item.label === 'Luxury Tax' ? item.amount : 0), 0);
}

function quoteGameSettlement(club: Club, input: SettleGameEconomicsInput, rng: SeededRng): GameQuote {
  const promo = bookedPromo(club, input.isHomeGame);
  const district = evaluateDistrictBonuses(club.stadium.districtTiles);
  const attendance = resolveCrowd(club, input, promo, district.attendanceBonusPct);
  const lines = [
    ...gateLines(club, attendance, input.isHomeGame, promo, district),
    ...seriesShareLines(club, district),
    ...payrollLines(club),
    ...bonusLines(input.won, input.trophyBonus ?? 0),
  ];
  const preview = sumLines(lines);
  const bailed = coverWithBakeSale(club.economy.cash + preview.revenueTotal - preview.expenseTotal, rng);
  const bailout = moneyLine(bailed.flavor ?? 'Emergency Bake-Sale Bailout', bailed.bailoutAmount, 'income');
  const finalLines = definedLines([...lines, bailout]);
  const totals = sumLines(finalLines);
  const entry: ClubLedgerEntry = {
    id: `ldg-${input.season}-${input.gameLabel}-${rng.int(1000, 9999)}`,
    season: input.season,
    gameLabel: input.gameLabel,
    revenueTotal: totals.revenueTotal,
    expenseTotal: totals.expenseTotal,
    netDelta: bailed.cash - club.economy.cash,
    lines: finalLines,
    luxuryTaxPaid: luxuryPaid(finalLines),
    promoConsumedId: promo?.id ?? null,
    bailoutTriggered: bailed.bailoutAmount > 0,
    bailoutAmount: bailed.bailoutAmount,
    endingCash: bailed.cash,
  };
  return { entry, attendance, promoHype: promo?.hypeDelta ?? 0, promoConsumedId: promo?.id ?? null };
}

function applyQuote(club: Club, quote: GameQuote): Club {
  const history = [quote.entry, ...(club.economy.recentLedgerEntries ?? [])].slice(0, LEDGER_HISTORY_CAP);
  return {
    ...club,
    economy: {
      ...club.economy,
      cash: quote.entry.endingCash,
      teamHype: Math.max(0, Math.min(100, club.economy.teamHype + quote.promoHype)),
      scheduledPromoId: quote.promoConsumedId ? null : (club.economy.scheduledPromoId ?? null),
      recentLedgerEntries: history,
    },
  };
}

/** Settles one live or simmed game into club cash and an itemized receipt. */
export function settleGameEconomics(
  club: Club,
  input: SettleGameEconomicsInput,
  rng: SeededRng,
): SettledGameEconomics {
  const quote = quoteGameSettlement(club, input, rng);
  return {
    club: applyQuote(club, quote),
    entry: quote.entry,
    attendance: quote.attendance,
    promoHype: quote.promoHype,
  };
}

/** Applies settleGameEconomics across each just-simmed human series game. */
export function settleSeriesGameLogs(
  club: Club,
  games: readonly { isHome: boolean; won: boolean; gameNumber: number }[],
  season: number,
  rng: SeededRng,
): { club: Club; netDelta: number } {
  const startCash = club.economy.cash;
  const next = games.reduce((current, game) => {
    return settleGameEconomics(
      current,
      {
        season,
        gameLabel: `Series Game ${game.gameNumber}`,
        isHomeGame: game.isHome,
        won: game.won,
      },
      rng,
    ).club;
  }, club);
  return { club: next, netDelta: next.economy.cash - startCash };
}

export function schedulePromoNight(
  club: Club,
  promoId: PromoNightId,
): { booked: boolean; reason?: string; club: Club } {
  if (club.economy.scheduledPromoId) {
    return { booked: false, reason: 'A promo is already booked for the next home game.', club };
  }
  const promo = getPromoNightById(promoId);
  if (!promo) return { booked: false, reason: 'Unknown promo night.', club };
  if (club.economy.cash < promo.cost) {
    return { booked: false, reason: `Need $${promo.cost.toLocaleString()} to book ${promo.name}.`, club };
  }
  return {
    booked: true,
    club: {
      ...club,
      economy: {
        ...club.economy,
        cash: club.economy.cash - promo.cost,
        scheduledPromoId: promo.id,
      },
    },
  };
}

export function hostClubhouseFeast(
  club: Club,
  seriesIndex: number,
): { hosted: boolean; reason?: string; club: Club } {
  if (club.economy.spaUsedInSeriesIndex === seriesIndex) {
    return { hosted: false, reason: 'The clubhouse already feasted this series.', club };
  }
  if (club.economy.cash < FEAST_COST) {
    return { hosted: false, reason: `Need $${FEAST_COST.toLocaleString()} for the recovery feast.`, club };
  }
  return {
    hosted: true,
    club: {
      ...club,
      roster: club.roster.map((player) => ({
        ...player,
        fatigue: Math.max(0, player.fatigue - FEAST_FATIGUE_CUT),
        morale: Math.min(100, player.morale + FEAST_MORALE_BOOST),
      })),
      economy: {
        ...club.economy,
        cash: club.economy.cash - FEAST_COST,
        spaUsedInSeriesIndex: seriesIndex,
      },
    },
  };
}

export function purchaseFoilPack(
  club: Club,
  tier: FoilPackTierId,
): { bought: boolean; reason?: string; club: Club; tier?: FoilPackTierId } {
  const offer = FOIL_CASH_SHOP.find((pack) => pack.tier === tier);
  if (!offer) return { bought: false, reason: 'That foil pack is not in the shop.', club };
  if (club.economy.cash < offer.cost) {
    return {
      bought: false,
      reason: `Need $${offer.cost.toLocaleString()} for the ${offer.label}.`,
      club,
    };
  }
  return {
    bought: true,
    tier: offer.tier,
    club: { ...club, economy: { ...club.economy, cash: club.economy.cash - offer.cost } },
  };
}

export function computeContractExtensionOffer(player: Player, leagueTier: LeagueTierId): ContractExtensionOffer {
  const tierLift = 1 + LEAGUE_TIER_ORDER.indexOf(leagueTier) * 0.01;
  const salaryPerSeason = Math.max(250, Math.round(player.contract.salaryPerSeason * tierLift));
  if (player.contract.yearsRemaining > 1) {
    return {
      yearsAdded: 2,
      salaryPerSeason,
      eligible: false,
      reason: 'Only players with 1 year left can be extended in-season.',
    };
  }
  return { yearsAdded: 2, salaryPerSeason, eligible: true };
}

export function extendPlayerContract(
  club: Club,
  playerId: string,
): { extended: boolean; reason?: string; club: Club } {
  const player = club.roster.find((item) => item.id === playerId);
  if (!player) return { extended: false, reason: 'Player is not on the roster.', club };
  const offer = computeContractExtensionOffer(player, club.leagueTier);
  if (!offer.eligible) return { extended: false, reason: offer.reason, club };
  const projected = rosterPayroll(club.roster) - player.contract.salaryPerSeason + offer.salaryPerSeason;
  const softCap = Math.round(TIER_SALARY_CAPS[club.leagueTier] * SOFT_CAP_MULTIPLIER);
  if (projected > softCap) {
    return {
      extended: false,
      reason: `Extension breaks the ${club.leagueTier.toUpperCase()} soft cap ($${projected.toLocaleString()} / $${softCap.toLocaleString()}).`,
      club,
    };
  }
  return {
    extended: true,
    club: {
      ...club,
      roster: club.roster.map((item) =>
        item.id === playerId
          ? {
              ...item,
              contract: {
                ...item.contract,
                yearsRemaining: item.contract.yearsRemaining + offer.yearsAdded,
                salaryPerSeason: offer.salaryPerSeason,
              },
            }
          : item,
      ),
    },
  };
}
