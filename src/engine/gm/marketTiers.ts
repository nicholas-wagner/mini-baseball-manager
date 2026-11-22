import type { FieldPosition } from '../handedness/types';
import {
  MAX_ACTIVE_ROSTER_SIZE,
  MIN_ACTIVE_ROSTER_SIZE,
  type LeagueTierId,
} from '../models/club';
import {
  isPitcherPosition,
  type Player,
  type PlayerContract,
  type PlayerMarketTier,
  type PlayerRatings,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { createPlayer } from './rosterFactory';

export interface MarketTierSpec {
  ageRange: readonly [number, number];
  ovrOffset: number;
  xpGrowthMultiplier: number;
  salaryMultiplier: number;
  capBonusMin: number;
  capBonusMax: number;
  clubWeight: number;
  faWeight: number;
}

export const MARKET_TIER_SPECS: Readonly<Record<PlayerMarketTier, MarketTierSpec>> = {
  rookie: {
    ageRange: [18, 21],
    ovrOffset: -6,
    xpGrowthMultiplier: 1.35,
    salaryMultiplier: 0.45,
    capBonusMin: 18,
    capBonusMax: 38,
    clubWeight: 18,
    faWeight: 22,
  },
  all_star: {
    ageRange: [24, 29],
    ovrOffset: 13,
    xpGrowthMultiplier: 0.85,
    salaryMultiplier: 2.8,
    capBonusMin: 4,
    capBonusMax: 8,
    clubWeight: 3,
    faWeight: 7,
  },
  veteran: {
    ageRange: [31, 38],
    ovrOffset: 3,
    xpGrowthMultiplier: 0.3,
    salaryMultiplier: 0.85,
    capBonusMin: 0,
    capBonusMax: 3,
    clubWeight: 14,
    faWeight: 20,
  },
  above_average: {
    ageRange: [23, 29],
    ovrOffset: 6,
    xpGrowthMultiplier: 0.95,
    salaryMultiplier: 1.35,
    capBonusMin: 5,
    capBonusMax: 12,
    clubWeight: 20,
    faWeight: 18,
  },
  average: {
    ageRange: [22, 30],
    ovrOffset: 0,
    xpGrowthMultiplier: 0.85,
    salaryMultiplier: 0.95,
    capBonusMin: 4,
    capBonusMax: 10,
    clubWeight: 35,
    faWeight: 20,
  },
  below_average: {
    ageRange: [20, 32],
    ovrOffset: -7,
    xpGrowthMultiplier: 0.75,
    salaryMultiplier: 0.4,
    capBonusMin: 2,
    capBonusMax: 7,
    clubWeight: 10,
    faWeight: 13,
  },
};

const TIER_ORDER: readonly PlayerMarketTier[] = [
  'rookie',
  'all_star',
  'veteran',
  'above_average',
  'average',
  'below_average',
];

function rollWeightedMarketTier(rng: SeededRng, useFaWeights: boolean): PlayerMarketTier {
  const total = TIER_ORDER.reduce(
    (sum, t) => sum + (useFaWeights ? MARKET_TIER_SPECS[t].faWeight : MARKET_TIER_SPECS[t].clubWeight),
    0,
  );
  const roll = rng.next() * total;
  let cursor = 0;
  for (const tier of TIER_ORDER) {
    cursor += useFaWeights ? MARKET_TIER_SPECS[tier].faWeight : MARKET_TIER_SPECS[tier].clubWeight;
    if (roll < cursor) return tier;
  }
  return 'average';
}

export function rollClubStarterMarketTier(rng: SeededRng): PlayerMarketTier {
  return rollWeightedMarketTier(rng, false);
}

export function rollFreeAgentMarketTier(rng: SeededRng): PlayerMarketTier {
  return rollWeightedMarketTier(rng, true);
}

/** Generates per-tool statCaps with wild boom-or-bust upside on rookies vs minimal headroom on veterans. */
export function rollStatCapsForMarketTier(
  rng: SeededRng,
  ratings: PlayerRatings,
  tier: PlayerMarketTier,
  position: FieldPosition,
): PlayerRatings {
  const spec = MARKET_TIER_SPECS[tier];
  const isPitcher = isPitcherPosition(position);
  const capTool = (val: number, active: boolean): number => {
    const headroom = active ? rng.int(spec.capBonusMin, spec.capBonusMax) : rng.int(1, 5);
    return Math.min(99, val + headroom);
  };

  return {
    contact: capTool(ratings.contact, !isPitcher),
    power: capTool(ratings.power, !isPitcher),
    eye: capTool(ratings.eye, !isPitcher),
    bunt: capTool(ratings.bunt, true),
    velocity: capTool(ratings.velocity, isPitcher),
    movement: capTool(ratings.movement, isPitcher),
    control: capTool(ratings.control, isPitcher),
    stamina: capTool(ratings.stamina, isPitcher),
    speed: capTool(ratings.speed, true),
    fielding: capTool(ratings.fielding, true),
    arm: capTool(ratings.arm, true),
    clutch: capTool(ratings.clutch, true),
    luck: capTool(ratings.luck, true),
    popularity: capTool(ratings.popularity, true),
    potential: 99,
  };
}

/** Computes realistic market-tier contract terms scaled by league tier and OVR. */
export function computeMarketContract(
  rng: SeededRng,
  marketTier: PlayerMarketTier,
  salaryBase: number,
  overall: number,
): PlayerContract {
  const spec = MARKET_TIER_SPECS[marketTier];
  const salaryPerSeason = Math.max(
    250,
    Math.round(salaryBase * spec.salaryMultiplier * Math.max(0.65, overall / 62)),
  );
  const yearsRemaining =
    marketTier === 'veteran' ? rng.int(1, 2) : marketTier === 'rookie' ? rng.int(2, 4) : rng.int(1, 3);
  const signingBonus = Math.max(120, Math.round(salaryPerSeason * 0.22));
  return { salaryPerSeason, yearsRemaining, signingBonus };
}

const MARKET_POSITIONS: readonly FieldPosition[] = [
  'SP',
  'RP',
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
];

/** Generates a deterministic mixed-tier free-agent wire balancing rookies, veterans, and rare all-stars. */
export function generateMarketPool(
  rng: SeededRng,
  leagueTier: LeagueTierId,
  count = 12,
): Player[] {
  return Array.from({ length: count }, (_, idx) =>
    createPlayer(rng, {
      position: MARKET_POSITIONS[idx % MARKET_POSITIONS.length],
      tier: leagueTier,
      marketTier: rollFreeAgentMarketTier(rng),
      idPrefix: 'fa',
    }),
  );
}

/** Enforces MAX_ACTIVE_ROSTER_SIZE = 20 and duplicate-ID checks before signing/drafting. */
export function validateRosterAddition(
  roster: readonly Player[],
  incomingPlayerId: string,
): { allowed: boolean; reason?: string } {
  if (roster.some((p) => p.id === incomingPlayerId)) {
    return { allowed: false, reason: 'Player is already on active roster.' };
  }
  if (roster.length >= MAX_ACTIVE_ROSTER_SIZE) {
    return {
      allowed: false,
      reason: `Active roster is full (${roster.length}/${MAX_ACTIVE_ROSTER_SIZE}). Release a player first.`,
    };
  }
  return { allowed: true };
}

/** Enforces MIN_ACTIVE_ROSTER_SIZE = 15 and minimum pitcher depth before releasing a player. */
export function validateRosterRelease(
  roster: readonly Player[],
  releasePlayerId: string,
): { allowed: boolean; reason?: string } {
  const target = roster.find((p) => p.id === releasePlayerId);
  if (!target) {
    return { allowed: false, reason: 'Player is not on active roster.' };
  }
  if (roster.length <= MIN_ACTIVE_ROSTER_SIZE) {
    return {
      allowed: false,
      reason: `Cannot drop below ${MIN_ACTIVE_ROSTER_SIZE} active players.`,
    };
  }
  const spCount = roster.filter((p) => p.position === 'SP').length;
  if (target.position === 'SP' && spCount <= 3) {
    return { allowed: false, reason: 'Clubs must retain at least 3 starting pitchers.' };
  }
  const rpCount = roster.filter((p) => p.position === 'RP').length;
  if (target.position === 'RP' && rpCount <= 2) {
    return { allowed: false, reason: 'Clubs must retain at least 2 relief pitchers.' };
  }
  return { allowed: true };
}
