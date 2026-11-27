import { LEDGER_HISTORY_CAP } from '../economy/clubLedgerSettlement';
import type { Club, ClubLedgerEntry } from '../models/club';
import { isPitcherPosition, type Player, type PlayerRatings } from '../models/player';
import { evolveSpecialistArchetype } from './specialistsAndPositions';
import { enforceRatingBudget } from './trainingCompromises';

export type HitterPowerUpStatKey = 'contact' | 'power' | 'speed' | 'fielding' | 'arm';
export type PitcherPowerUpStatKey = 'velocity' | 'movement' | 'control' | 'stamina' | 'clutch';
export type PowerUpStatKey = HitterPowerUpStatKey | PitcherPowerUpStatKey;

export const HITTER_POWER_UP_STATS: readonly HitterPowerUpStatKey[] = [
  'contact',
  'power',
  'speed',
  'fielding',
  'arm',
];

export const PITCHER_POWER_UP_STATS: readonly PitcherPowerUpStatKey[] = [
  'velocity',
  'movement',
  'control',
  'stamina',
  'clutch',
];

export const POWER_UP_STAT_LABELS: Readonly<Record<PowerUpStatKey, string>> = {
  contact: 'Contact',
  power: 'Power',
  speed: 'Speed',
  fielding: 'Fielding',
  arm: 'Arm',
  velocity: 'Velocity',
  movement: 'Movement',
  control: 'Control',
  stamina: 'Stamina',
  clutch: 'Clutch',
};

const RATING_BUDGET_TRIM_NOTE = 'At Rating Budget — will trim -1 from lowest secondary tool';

export interface PowerUpEvaluation {
  allowed: boolean;
  reason?: string;
  budgetNote?: string;
  cost: number;
  currentValue: number;
  capValue: number;
  nextValue: number;
  willTrimSecondary: boolean;
}

export interface PowerUpPurchaseResult {
  purchased: boolean;
  reason?: string;
  cost: number;
  club: Club;
  updatedPlayer?: Player;
  summary: string;
}

/** Returns role-appropriate trainable attributes for Power-Up Camp. */
export function getPowerUpStatOptions(
  player: Pick<Player, 'position'>,
): readonly PowerUpStatKey[] {
  return isPitcherPosition(player.position) ? PITCHER_POWER_UP_STATS : HITTER_POWER_UP_STATS;
}

/** Escalating Baseball Stars cash pricing per +1 attribute point. */
export function getPowerUpPointCost(currentRating: number): number {
  if (currentRating < 60) return 350;
  if (currentRating < 70) return 600;
  if (currentRating < 80) return 1_100;
  if (currentRating < 90) return 2_100;
  return 3_800;
}

function simulateBudgetedUpgrade(
  player: Player,
  stat: PowerUpStatKey,
  nextValue: number,
): { budgeted: PlayerRatings; willTrimSecondary: boolean } {
  const incremented: PlayerRatings = { ...player.ratings, [stat]: nextValue };
  const protectedKey = stat === 'clutch' ? undefined : stat;
  const budgeted = enforceRatingBudget(
    incremented,
    player.position,
    player.totalRatingBudget,
    protectedKey,
  );
  const willTrimSecondary = (Object.keys(incremented) as (keyof PlayerRatings)[]).some(
    (key) => key !== stat && budgeted[key] < incremented[key],
  );
  return { budgeted, willTrimSecondary };
}

function disallowEval(
  reason: string,
  cost = 0,
  currentValue = 0,
  capValue = 0,
  nextValue = currentValue,
  willTrimSecondary = false,
): PowerUpEvaluation {
  return { allowed: false, reason, cost, currentValue, capValue, nextValue, willTrimSecondary };
}

/** Previews eligibility, cash cost, stat cap, and rating-budget trim for a +1 Power-Up Camp buy. */
export function evaluatePowerUpPurchase(
  club: Club,
  playerId: string,
  stat: PowerUpStatKey,
): PowerUpEvaluation {
  const player = club.roster.find((item) => item.id === playerId);
  if (!player) return disallowEval('Player not found on active roster.');

  const allowedStats = getPowerUpStatOptions(player);
  if (!allowedStats.includes(stat)) {
    const roleMsg = isPitcherPosition(player.position)
      ? 'Pitchers can only train pitching attributes in Power-Up Camp.'
      : 'Position players can only train batting & fielding attributes in Power-Up Camp.';
    return disallowEval(roleMsg);
  }

  const currentValue = player.ratings[stat];
  const capValue = Math.min(99, player.statCaps[stat]);
  const cost = getPowerUpPointCost(currentValue);
  const nextValue = Math.min(capValue, currentValue + 1);

  if (currentValue >= capValue || currentValue >= 99) {
    return disallowEval(
      `${POWER_UP_STAT_LABELS[stat]} is already maxed at ${capValue}.`,
      cost,
      currentValue,
      capValue,
      currentValue,
    );
  }

  const { willTrimSecondary } = simulateBudgetedUpgrade(player, stat, nextValue);
  if (club.economy.cash < cost) {
    return disallowEval(
      `Need $${cost.toLocaleString()} for +1 ${POWER_UP_STAT_LABELS[stat]}.`,
      cost,
      currentValue,
      capValue,
      nextValue,
      willTrimSecondary,
    );
  }

  return {
    allowed: true,
    budgetNote: willTrimSecondary ? RATING_BUDGET_TRIM_NOTE : undefined,
    cost,
    currentValue,
    capValue,
    nextValue,
    willTrimSecondary,
  };
}

function buildPowerUpLedgerEntry(
  player: Player,
  stat: PowerUpStatKey,
  cost: number,
  nextValue: number,
  endingCash: number,
  meta?: { seasonNumber: number; seriesIndex: number },
): ClubLedgerEntry {
  const season = meta?.seasonNumber ?? 1;
  const series = meta?.seriesIndex ?? 0;
  const statLabel = POWER_UP_STAT_LABELS[stat];
  const lineLabel = `Power-Up Camp: ${player.name} (+1 ${statLabel})`;
  return {
    id: `powerup-s${season}-sr${series}-${player.id}-${stat}-${nextValue}`,
    season,
    gameLabel: `Power-Up Camp · ${player.name} (+1 ${statLabel})`,
    revenueTotal: 0,
    expenseTotal: cost,
    netDelta: -cost,
    lines: [{ label: lineLabel, amount: cost, kind: 'expense' }],
    luxuryTaxPaid: 0,
    promoConsumedId: null,
    bailoutTriggered: false,
    bailoutAmount: 0,
    endingCash,
  };
}

/** Spends club cash for a permanent +1 stat upgrade inside statCaps and totalRatingBudget. */
export function applyPowerUpPurchase(
  club: Club,
  playerId: string,
  stat: PowerUpStatKey,
  meta?: { seasonNumber: number; seriesIndex: number },
): PowerUpPurchaseResult {
  const check = evaluatePowerUpPurchase(club, playerId, stat);
  if (!check.allowed) {
    const reason = check.reason ?? 'Power-Up Camp purchase unavailable.';
    return { purchased: false, reason, cost: check.cost, club, summary: reason };
  }

  const player = club.roster.find((item) => item.id === playerId)!;
  const { budgeted } = simulateBudgetedUpgrade(player, stat, check.nextValue);
  const updatedPlayer: Player = {
    ...player,
    ratings: budgeted,
    specialistArchetype: evolveSpecialistArchetype({
      position: player.position,
      specialistArchetype: player.specialistArchetype,
      ratings: budgeted,
    }),
  };

  const endingCash = club.economy.cash - check.cost;
  const entry = buildPowerUpLedgerEntry(player, stat, check.cost, check.nextValue, endingCash, meta);
  const history = [entry, ...(club.economy.recentLedgerEntries ?? [])].slice(0, LEDGER_HISTORY_CAP);
  const updatedClub: Club = {
    ...club,
    roster: club.roster.map((item) => (item.id === playerId ? updatedPlayer : item)),
    economy: {
      ...club.economy,
      cash: endingCash,
      recentLedgerEntries: history,
    },
  };

  return {
    purchased: true,
    cost: check.cost,
    club: updatedClub,
    updatedPlayer,
    summary: `+1 ${POWER_UP_STAT_LABELS[stat]} for ${player.name} (-$${check.cost.toLocaleString()})!`,
  };
}
