import type { LeagueTierId } from '../models/club';
import type { SeededRng } from '../rng/seededRng';

export const DERBY_PITCH_COUNT = 5;
export const DERBY_WIN_CASH = 1_200;
export const DERBY_HR_MIN_FT = 375;
export const DERBY_HR_MAX_FT = 465;

export type DerbyTimingGrade = 'perfect' | 'sweet' | 'warning_track' | 'miss';
export type DerbyHotStreakTier = 'none' | 'warm' | 'hot' | 'on_fire' | 'blazing';

export interface DerbySwingInput {
  batterPower: number;
  timingCursor: number; // 0..100 (50 = dead-center sweet spot)
  pitchSpeedMph: number;
  swingStyle: 'normal' | 'power';
  /** Consecutive home runs entering this pitch (defaults to 0). */
  currentStreak?: number;
  rng: SeededRng;
}

export interface DerbySwingResult {
  outcome: 'home_run' | 'warning_track' | 'out';
  timingGrade: DerbyTimingGrade;
  distanceFt: number;
  /** Deterministic 375–465 FT estimate for home runs; null on non-HR swings. */
  estimatedHrDistanceFt: number | null;
  streakCount: number;
  comboMultiplier: number;
  comboBadge: string | null;
  pointsEarned: number;
  ratingBadge: string;
  headline: string;
}

export interface DerbyHotStreakState {
  currentStreak: number;
  bestStreak: number;
  comboMultiplier: number;
  comboBadge: string | null;
  tier: DerbyHotStreakTier;
  totalPoints: number;
}

export interface DerbyRivalTarget {
  rivalName: string;
  targetHomeRuns: number;
}

const DERBY_RIVAL_NAMES: readonly string[] = [
  'Buster "Boom" Kowalski',
  'Mina "Comet" Sato',
  'Diego "Thunder" Morales',
  'Chloe "Crusher" Vance',
  'Toby "Moonshot" Briggs',
  'Hana "Rocket" Cho',
];

const TIER_TARGET_RANGE: Readonly<Record<LeagueTierId, { min: number; max: number }>> = {
  rookie: { min: 1, max: 3 },
  low_a: { min: 2, max: 3 },
  high_a: { min: 2, max: 3 },
  aa: { min: 2, max: 4 },
  aaa: { min: 2, max: 4 },
  majors: { min: 2, max: 4 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Returns the crisp comic pop badge for an active consecutive-HR hot streak. */
export function getDerbyComboBadge(streakCount: number): string | null {
  if (streakCount >= 5) return '👑 5x LEGENDARY!';
  if (streakCount === 4) return '💥 4x UNSTOPPABLE!';
  if (streakCount === 3) return '⚡ 3x ON FIRE!';
  if (streakCount === 2) return '🔥 2x STREAK!';
  return null;
}

function getDerbyStreakTier(streakCount: number): DerbyHotStreakTier {
  if (streakCount >= 4) return 'blazing';
  if (streakCount === 3) return 'on_fire';
  if (streakCount === 2) return 'hot';
  if (streakCount === 1) return 'warm';
  return 'none';
}

/** Deterministically estimates HR distance in feet (375–465 FT) from timing grade & batter power. */
export function estimateDerbyHrDistanceFt(
  timingGrade: 'perfect' | 'sweet',
  batterPower: number,
  pitchSpeedMph: number,
  swingStyle: 'normal' | 'power',
  rng: SeededRng,
): number {
  const power = clamp(batterPower, 20, 99);
  const powerDelta = Math.round((power - 50) * 0.45);
  const veloDelta = Math.round((pitchSpeedMph - 85) * 0.45);
  const styleBonus = swingStyle === 'power' ? 10 : 0;

  if (timingGrade === 'perfect') {
    const raw = 422 + powerDelta + veloDelta + styleBonus + rng.int(0, 16);
    return clamp(raw, 415, DERBY_HR_MAX_FT);
  }
  const raw = 384 + powerDelta + veloDelta + styleBonus + rng.int(-6, 14);
  return clamp(raw, DERBY_HR_MIN_FT, 438);
}

function buildHomeRunResult(
  timingGrade: 'perfect' | 'sweet',
  distanceFt: number,
  currentStreak: number,
): DerbySwingResult {
  const streakCount = Math.max(0, currentStreak) + 1;
  const comboMultiplier = Math.min(5, streakCount);
  const comboBadge = getDerbyComboBadge(streakCount);
  const pointsEarned = Math.round(distanceFt / 4) * comboMultiplier;
  const isPerfect = timingGrade === 'perfect';

  return {
    outcome: 'home_run',
    timingGrade,
    distanceFt,
    estimatedHrDistanceFt: distanceFt,
    streakCount,
    comboMultiplier,
    comboBadge,
    pointsEarned,
    ratingBadge: isPerfect ? '💥 PERFECT CRUSH!' : '🚀 SWEET BARREL!',
    headline: isPerfect
      ? `UPPER-DECK MOONSHOT! ${distanceFt} FT!!`
      : `GONE OVER THE WALL! ${distanceFt} FT!`,
  };
}

/** Resolves a 30-second Arcade Home Run Derby swing from timing cursor accuracy & batter power. */
export function resolveDerbyTimingSwing(input: DerbySwingInput): DerbySwingResult {
  const { batterPower, timingCursor, pitchSpeedMph, swingStyle, currentStreak = 0, rng } = input;
  const clampedCursor = clamp(timingCursor, 0, 100);
  const offset = Math.abs(clampedCursor - 50);
  const sweetRadius = swingStyle === 'power' ? 11 : 14;
  const barrelRadius = swingStyle === 'power' ? 23 : 27;

  if (offset <= sweetRadius) {
    const distanceFt = estimateDerbyHrDistanceFt('perfect', batterPower, pitchSpeedMph, swingStyle, rng);
    return buildHomeRunResult('perfect', distanceFt, currentStreak);
  }

  if (offset <= barrelRadius) {
    const powerBoost = Math.round((batterPower - 50) * 0.85) + (swingStyle === 'power' ? 18 : 0);
    const rawCarry = 360 + powerBoost + rng.int(-10, 34);
    if (rawCarry >= 382) {
      const distanceFt = estimateDerbyHrDistanceFt('sweet', batterPower, pitchSpeedMph, swingStyle, rng);
      return buildHomeRunResult('sweet', distanceFt, currentStreak);
    }
    const distanceFt = clamp(rawCarry, 340, 374);
    return {
      outcome: 'warning_track',
      timingGrade: 'warning_track',
      distanceFt,
      estimatedHrDistanceFt: null,
      streakCount: 0,
      comboMultiplier: 1,
      comboBadge: null,
      pointsEarned: 25,
      ratingBadge: '💨 WARNING TRACK!',
      headline: `Deep fly caught at the wall (${distanceFt} ft)!`,
    };
  }

  const timingWord = clampedCursor < 50 ? 'TOO EARLY' : 'TOO LATE';
  const distanceFt = rng.int(110, 245);
  return {
    outcome: 'out',
    timingGrade: 'miss',
    distanceFt,
    estimatedHrDistanceFt: null,
    streakCount: 0,
    comboMultiplier: 1,
    comboBadge: null,
    pointsEarned: 0,
    ratingBadge: `❌ ${timingWord}`,
    headline: `Swung ${timingWord.toLowerCase()} — high pop-up (${distanceFt} ft).`,
  };
}

/** Evaluates live consecutive-HR hot streak, combo multiplier, and total derby points across swings. */
export function evaluateDerbyHotStreak(
  swings: readonly Pick<DerbySwingResult, 'outcome' | 'pointsEarned'>[],
): DerbyHotStreakState {
  let currentStreak = 0;
  let bestStreak = 0;
  let totalPoints = 0;

  for (const swing of swings) {
    totalPoints += swing.pointsEarned;
    if (swing.outcome === 'home_run') {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const comboMultiplier = currentStreak >= 2 ? Math.min(5, currentStreak) : 1;
  return {
    currentStreak,
    bestStreak,
    comboMultiplier,
    comboBadge: getDerbyComboBadge(currentStreak),
    tier: getDerbyStreakTier(currentStreak),
    totalPoints,
  };
}

/** Deterministically picks a fun rival Derby slugger & 5-pitch HR target scaled by league tier. */
export function rollDerbyRivalTarget(rng: SeededRng, tier: LeagueTierId): DerbyRivalTarget {
  const range = TIER_TARGET_RANGE[tier];
  return {
    rivalName: rng.pick(DERBY_RIVAL_NAMES),
    targetHomeRuns: rng.int(range.min, range.max),
  };
}
