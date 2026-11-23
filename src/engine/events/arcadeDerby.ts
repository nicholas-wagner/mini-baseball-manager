import type { LeagueTierId } from '../models/club';
import type { SeededRng } from '../rng/seededRng';

export const DERBY_PITCH_COUNT = 5;
export const DERBY_WIN_CASH = 1_200;

export interface DerbySwingInput {
  batterPower: number;
  timingCursor: number; // 0..100 (50 = dead-center sweet spot)
  pitchSpeedMph: number;
  swingStyle: 'normal' | 'power';
  rng: SeededRng;
}

export interface DerbySwingResult {
  outcome: 'home_run' | 'warning_track' | 'out';
  distanceFt: number;
  ratingBadge: string;
  headline: string;
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

/** Resolves a 30-second Arcade Home Run Derby swing from timing cursor accuracy & batter power. */
export function resolveDerbyTimingSwing(input: DerbySwingInput): DerbySwingResult {
  const { batterPower, timingCursor, pitchSpeedMph, swingStyle, rng } = input;
  const clampedCursor = Math.max(0, Math.min(100, timingCursor));
  const offset = Math.abs(clampedCursor - 50);
  const sweetRadius = swingStyle === 'power' ? 11 : 14;
  const barrelRadius = swingStyle === 'power' ? 23 : 27;
  const powerBoost = Math.round((batterPower - 50) * 0.85) + (swingStyle === 'power' ? 18 : 0);
  const veloJuice = Math.round((pitchSpeedMph - 85) * 0.6);

  if (offset <= sweetRadius) {
    const distanceFt = Math.max(415, 425 + powerBoost + veloJuice + rng.int(0, 38));
    return {
      outcome: 'home_run',
      distanceFt,
      ratingBadge: '💥 PERFECT CRUSH!',
      headline: `UPPER-DECK MOONSHOT! ${distanceFt} FT!!`,
    };
  }

  if (offset <= barrelRadius) {
    const distanceFt = Math.max(345, 360 + powerBoost + rng.int(-10, 34));
    if (distanceFt >= 382) {
      return {
        outcome: 'home_run',
        distanceFt,
        ratingBadge: '🚀 SWEET BARREL!',
        headline: `GONE OVER THE WALL! ${distanceFt} FT!`,
      };
    }
    return {
      outcome: 'warning_track',
      distanceFt,
      ratingBadge: '💨 WARNING TRACK!',
      headline: `Deep fly caught at the wall (${distanceFt} ft)!`,
    };
  }

  const timingWord = clampedCursor < 50 ? 'TOO EARLY' : 'TOO LATE';
  const distanceFt = rng.int(110, 245);
  return {
    outcome: 'out',
    distanceFt,
    ratingBadge: `❌ ${timingWord}`,
    headline: `Swung ${timingWord.toLowerCase()} — high pop-up (${distanceFt} ft).`,
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
