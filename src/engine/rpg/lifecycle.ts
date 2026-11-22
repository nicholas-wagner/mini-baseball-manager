import {
  computePlayerOverall,
  isPitcherPosition,
  type Player,
  type PlayerRatings,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';

export type CareerArcStage =
  | 'rookie_development'
  | 'prime_peak'
  | 'crafty_veteran'
  | 'late_decline';

export type LegendCoachRole =
  | 'pitching_coach'
  | 'hitting_coach'
  | 'bench_coach'
  | 'fielding_coach'
  | 'bullpen_coach';

export interface RetiredLegendCoachCandidate {
  formerPlayerId: string;
  name: string;
  portraitSeed: number;
  clubLegendOf: string;
  recommendedRole: LegendCoachRole;
  startingTier: 2 | 3 | 4 | 5;
  specialtyId: string;
  seasonsPlayed: number;
  careerOvrPeak: number;
}

export interface CareerArcOptions {
  mentorshipGrowthBonus?: number;
  declineReductionFactor?: number; // 0..0.50 (e.g., from Strength & Durability Athletic Trainer)
}

export interface CareerArcResult {
  player: Player;
  stage: CareerArcStage;
  ovrDelta: number;
  ratingDeltas: Partial<Record<keyof PlayerRatings, number>>;
  summary: string;
}

export interface ClubMentorshipAura {
  mentorCount: number;
  rookieXpBonusPct: number; // 0..0.30
  offseasonGrowthBonus: number; // 0..1.5
  mentorNames: readonly string[];
}

export interface RetirementEvaluation {
  retires: boolean;
  probability: number;
  coachCandidate: RetiredLegendCoachCandidate | null;
}

const PITCHER_DEV_KEYS: readonly (keyof PlayerRatings)[] = [
  'velocity',
  'movement',
  'control',
  'stamina',
  'clutch',
];

const HITTER_DEV_KEYS: readonly (keyof PlayerRatings)[] = [
  'contact',
  'power',
  'gapPower',
  'eye',
  'speed',
  'fielding',
  'range',
  'arm',
];

const PHYSICAL_DECLINE_KEYS_PITCHER: readonly (keyof PlayerRatings)[] = [
  'velocity',
  'stamina',
  'movement',
  'speed',
  'fielding',
];

const PHYSICAL_DECLINE_KEYS_HITTER: readonly (keyof PlayerRatings)[] = [
  'speed',
  'range',
  'power',
  'arm',
  'fielding',
  'gapPower',
];

const MENTAL_SAVVY_KEYS: readonly (keyof PlayerRatings)[] = ['eye', 'control', 'clutch'];

const MIN_RATING_FLOOR = 25;

function clampRating(value: number, cap: number): number {
  return Math.max(MIN_RATING_FLOOR, Math.min(cap, Math.round(value)));
}

/** Classifies a player's biological age into the 4 canonical baseball career stages. */
export function getCareerStage(age: number): CareerArcStage {
  if (age <= 24) return 'rookie_development';
  if (age <= 30) return 'prime_peak';
  if (age <= 34) return 'crafty_veteran';
  return 'late_decline';
}

/** Returns offseason retirement probability scaled by age and late-career decline. */
export function getRetirementProbability(age: number, overall: number): number {
  if (age >= 40) return 1.0;
  if (age === 39) return 0.8;
  if (age === 38) return 0.55;
  if (age === 37) return 0.35;
  if (age === 36) return 0.18;
  if (age === 35) return overall < 50 ? 0.16 : 0.08;
  if (age === 34 && overall < 45) return 0.08;
  return 0;
}

function updateXpMultiplierForStage(stage: CareerArcStage, current: number): number {
  if (stage === 'rookie_development') return Math.max(1.1, Math.min(1.4, current));
  if (stage === 'prime_peak') return Math.min(current, 0.9);
  if (stage === 'crafty_veteran') return Math.min(current, 0.55);
  return 0.25;
}

function applyRookieGrowth(
  rng: SeededRng,
  player: Player,
  mentorshipBonus: number,
): { nextRatings: PlayerRatings; deltas: Partial<Record<keyof PlayerRatings, number>> } {
  const keys = isPitcherPosition(player.position) ? PITCHER_DEV_KEYS : HITTER_DEV_KEYS;
  const nextRatings: PlayerRatings = { ...player.ratings };
  const deltas: Partial<Record<keyof PlayerRatings, number>> = {};

  for (const key of keys) {
    const cap = player.statCaps[key];
    const headroom = cap - nextRatings[key];
    if (headroom <= 0) continue;
    const baseGain = rng.int(1, Math.min(4, Math.max(1, Math.ceil(headroom / 5))));
    const bonus = mentorshipBonus > 0 && rng.chance(Math.min(0.65, mentorshipBonus * 0.45)) ? 1 : 0;
    const updated = clampRating(nextRatings[key] + baseGain + bonus, cap);
    const delta = updated - nextRatings[key];
    if (delta !== 0) {
      nextRatings[key] = updated;
      deltas[key] = delta;
    }
  }
  return { nextRatings, deltas };
}

function applyPrimePolish(
  rng: SeededRng,
  player: Player,
): { nextRatings: PlayerRatings; deltas: Partial<Record<keyof PlayerRatings, number>> } {
  const keys = isPitcherPosition(player.position) ? PITCHER_DEV_KEYS : HITTER_DEV_KEYS;
  const nextRatings: PlayerRatings = { ...player.ratings };
  const deltas: Partial<Record<keyof PlayerRatings, number>> = {};

  for (const key of keys) {
    const cap = player.statCaps[key];
    if (nextRatings[key] < cap && rng.chance(0.4)) {
      nextRatings[key] = clampRating(nextRatings[key] + 1, cap);
      deltas[key] = 1;
    }
  }
  return { nextRatings, deltas };
}

function applyVeteranSavvySeason(
  rng: SeededRng,
  player: Player,
): { nextRatings: PlayerRatings; deltas: Partial<Record<keyof PlayerRatings, number>> } {
  const nextRatings: PlayerRatings = { ...player.ratings };
  const deltas: Partial<Record<keyof PlayerRatings, number>> = {};
  const physKeys = isPitcherPosition(player.position)
    ? PHYSICAL_DECLINE_KEYS_PITCHER.slice(0, 2)
    : PHYSICAL_DECLINE_KEYS_HITTER.slice(0, 2);

  for (const key of physKeys) {
    if (rng.chance(0.45)) {
      const updated = Math.max(MIN_RATING_FLOOR, nextRatings[key] - 1);
      if (updated !== nextRatings[key]) {
        deltas[key] = updated - nextRatings[key];
        nextRatings[key] = updated;
      }
    }
  }

  for (const key of MENTAL_SAVVY_KEYS) {
    const cap = Math.min(99, player.statCaps[key] + 2);
    if (nextRatings[key] < cap && rng.chance(0.5)) {
      nextRatings[key] = nextRatings[key] + 1;
      deltas[key] = 1;
    }
  }
  return { nextRatings, deltas };
}

function applyLateDeclineSeason(
  rng: SeededRng,
  player: Player,
  declineReductionFactor: number,
): { nextRatings: PlayerRatings; deltas: Partial<Record<keyof PlayerRatings, number>> } {
  const nextRatings: PlayerRatings = { ...player.ratings };
  const deltas: Partial<Record<keyof PlayerRatings, number>> = {};
  const ageExcess = Math.max(0, player.age - 35);
  const mitigation = Math.max(0.5, 1 - Math.max(0, Math.min(0.5, declineReductionFactor)));
  const physKeys = isPitcherPosition(player.position)
    ? PHYSICAL_DECLINE_KEYS_PITCHER
    : PHYSICAL_DECLINE_KEYS_HITTER;

  for (const key of physKeys) {
    const rawDrop = rng.int(1, 2 + Math.min(2, Math.floor(ageExcess / 2)));
    const scaledDrop = Math.max(1, Math.round(rawDrop * mitigation));
    const updated = Math.max(MIN_RATING_FLOOR, nextRatings[key] - scaledDrop);
    if (updated !== nextRatings[key]) {
      deltas[key] = updated - nextRatings[key];
      nextRatings[key] = updated;
    }
  }

  for (const key of MENTAL_SAVVY_KEYS) {
    if (rng.chance(0.28 * mitigation)) {
      const updated = Math.max(MIN_RATING_FLOOR, nextRatings[key] - 1);
      if (updated !== nextRatings[key]) {
        deltas[key] = updated - nextRatings[key];
        nextRatings[key] = updated;
      }
    }
  }
  return { nextRatings, deltas };
}

/** Applies one full offseason of career progression or late-career aging decline. */
export function applyOffseasonCareerArc(
  rng: SeededRng,
  player: Player,
  options: CareerArcOptions = {},
): CareerArcResult {
  const stage = getCareerStage(player.age);
  const ovrBefore = computePlayerOverall(player);
  const mentorship = options.mentorshipGrowthBonus ?? 0;
  const declineMitigation = options.declineReductionFactor ?? 0;

  let outcome: { nextRatings: PlayerRatings; deltas: Partial<Record<keyof PlayerRatings, number>> };
  if (stage === 'rookie_development') {
    outcome = applyRookieGrowth(rng, player, mentorship);
  } else if (stage === 'prime_peak') {
    outcome = applyPrimePolish(rng, player);
  } else if (stage === 'crafty_veteran') {
    outcome = applyVeteranSavvySeason(rng, player);
  } else {
    outcome = applyLateDeclineSeason(rng, player, declineMitigation);
  }

  const updatedPlayer: Player = {
    ...player,
    ratings: outcome.nextRatings,
    xpGrowthMultiplier: updateXpMultiplierForStage(stage, player.xpGrowthMultiplier),
  };
  const ovrDelta = computePlayerOverall(updatedPlayer) - ovrBefore;
  const sign = ovrDelta >= 0 ? `+${ovrDelta}` : `${ovrDelta}`;

  return {
    player: updatedPlayer,
    stage,
    ovrDelta,
    ratingDeltas: outcome.deltas,
    summary: `${player.name} (${stage.replace('_', ' ')}): ${sign} OVR`,
  };
}

/** Evaluates clubhouse veteran mentorship XP & offseason development aura for rookies (age <= 24). */
export function evaluateClubMentorshipAura(roster: readonly Player[]): ClubMentorshipAura {
  const mentors = roster.filter(
    (p) => p.age >= 31 || p.careerService.experienceTier === 'cagey_veteran',
  );
  if (mentors.length === 0) {
    return { mentorCount: 0, rookieXpBonusPct: 0, offseasonGrowthBonus: 0, mentorNames: [] };
  }

  const leaderWeight = mentors.reduce((sum, m) => {
    const glueBoost =
      m.mentalTraits.includes('clubhouse_glue') || m.mentalTraits.includes('steady_hand') ? 1.4 : 1;
    return sum + glueBoost;
  }, 0);

  return {
    mentorCount: mentors.length,
    rookieXpBonusPct: Math.min(0.3, Number((leaderWeight * 0.06).toFixed(3))),
    offseasonGrowthBonus: Math.min(1.5, Number((leaderWeight * 0.35).toFixed(2))),
    mentorNames: mentors.map((m) => m.name),
  };
}

function pickLegendCoachRole(player: Player): { role: LegendCoachRole; specialtyId: string } {
  if (isPitcherPosition(player.position)) {
    return {
      role: 'pitching_coach',
      specialtyId: player.ratings.velocity >= player.ratings.control ? 'gas_lab' : 'command_tactician',
    };
  }
  if (player.position === 'C') {
    return { role: 'bullpen_coach', specialtyId: 'battery_whisperer' };
  }
  if (player.ratings.fielding >= 78 && player.ratings.fielding >= player.ratings.power) {
    return { role: 'fielding_coach', specialtyId: 'sure_handed_fundamentalist' };
  }
  if (player.ratings.power >= 72 || player.ratings.contact >= 74) {
    return {
      role: 'hitting_coach',
      specialtyId: player.ratings.power >= player.ratings.contact ? 'launch_angle_guru' : 'small_ball_craftsman',
    };
  }
  return { role: 'bench_coach', specialtyId: 'players_skipper' };
}

function computeLegendCoachTier(player: Player, ovr: number): 2 | 3 | 4 | 5 {
  if (ovr >= 82 || player.careerService.seasonsPlayed >= 12) return 5;
  if (ovr >= 74 || player.careerService.seasonsPlayed >= 9) return 4;
  if (ovr >= 66 || player.careerService.seasonsPlayed >= 7) return 3;
  return 2;
}

/** Evaluates whether a veteran retires and whether an accomplished legend enters the hireable Coach pool. */
export function evaluateRetirementAndCoachTransition(
  rng: SeededRng,
  player: Player,
  clubName: string,
  forcedByCareerInjury = false,
): RetirementEvaluation {
  const ovr = computePlayerOverall(player);
  const probability = forcedByCareerInjury ? 1 : getRetirementProbability(player.age, ovr);
  const retires = forcedByCareerInjury || rng.chance(probability);
  if (!retires) {
    return { retires: false, probability, coachCandidate: null };
  }

  const eligibleForCoaching =
    player.careerService.seasonsPlayed >= 5 || player.level >= 4 || ovr >= 70;
  if (!eligibleForCoaching) {
    return { retires: true, probability, coachCandidate: null };
  }

  const { role, specialtyId } = pickLegendCoachRole(player);
  return {
    retires: true,
    probability,
    coachCandidate: {
      formerPlayerId: player.id,
      name: player.name,
      portraitSeed: player.traits.seed,
      clubLegendOf: clubName,
      recommendedRole: role,
      startingTier: computeLegendCoachTier(player, ovr),
      specialtyId,
      seasonsPlayed: player.careerService.seasonsPlayed,
      careerOvrPeak: ovr,
    },
  };
}
