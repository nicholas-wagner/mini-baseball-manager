import type { FieldPosition } from '../handedness/types';
import {
  isPitcherPosition,
  type BattedBallProfile,
  type BattedBallTendency,
  type BattedBallType,
  type PitchType,
  type PlayerSeasonStats,
  type PlayerSpecialistArchetype,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';

export interface BattingSabermetrics {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  iso: number;
  babip: number;
  bbRate: number;
  kRate: number;
  gbRate: number;
  ldRate: number;
  fbRate: number;
  popUpRate: number;
}

export interface PitchingSabermetrics {
  ipDisplay: string;
  era: number;
  whip: number;
  kPer9: number;
  bbPer9: number;
  hrPer9: number;
  strikeRate: number;
  gbRate: number;
  ldRate: number;
  fbRate: number;
  popUpRate: number;
}

export interface FieldingSabermetrics {
  chances: number;
  fpct: number;
  rangeFactorPerGame: number;
}

const TENDENCY_PRESETS: Readonly<Record<BattedBallTendency, BattedBallProfile>> = {
  groundball: { tendency: 'groundball', gbRateBias: 10, ldRateBias: 0, fbRateBias: -8, popUpRateBias: -2 },
  line_drive: { tendency: 'line_drive', gbRateBias: -2, ldRateBias: 7, fbRateBias: -3, popUpRateBias: -2 },
  flyball: { tendency: 'flyball', gbRateBias: -9, ldRateBias: -1, fbRateBias: 8, popUpRateBias: 2 },
  balanced: { tendency: 'balanced', gbRateBias: 0, ldRateBias: 0, fbRateBias: 0, popUpRateBias: 0 },
};

const PITCH_BATTED_BALL_BIAS: Readonly<
  Record<PitchType, { gb: number; ld: number; fb: number; pop: number }>
> = {
  two_seam: { gb: 8, ld: -1, fb: -6, pop: -1 },
  splitter: { gb: 7, ld: -2, fb: -4, pop: -1 },
  changeup: { gb: 4, ld: -1, fb: -2, pop: -1 },
  slider: { gb: 2, ld: -1, fb: -1, pop: 0 },
  cutter: { gb: 2, ld: 0, fb: -3, pop: 1 },
  curveball: { gb: 3, ld: -2, fb: -2, pop: 1 },
  four_seam: { gb: -4, ld: 1, fb: 2, pop: 1 },
  knuckleball: { gb: -2, ld: -2, fb: 1, pop: 3 },
};

function safeDiv(num: number, den: number): number {
  return den > 0 ? num / den : 0;
}

function clampBias(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function pickTendency(
  rng: SeededRng,
  position: FieldPosition,
  specialist: PlayerSpecialistArchetype,
  favoritePitch?: PitchType,
): BattedBallTendency {
  if (isPitcherPosition(position)) {
    if (favoritePitch === 'two_seam' || favoritePitch === 'splitter') return 'groundball';
    if (specialist === 'flame_closer') return 'flyball';
    return rng.pick(['groundball', 'balanced', 'flyball'] as const);
  }
  if (specialist === 'power_slugger') return 'flyball';
  if (specialist === 'contact_technician') return 'line_drive';
  if (specialist === 'speed_smallball') return 'groundball';
  return rng.pick(['groundball', 'line_drive', 'flyball', 'balanced'] as const);
}

/** Rolls a role-calibrated batted-ball tendency profile controlling GB%/LD%/FB%/Pop-Up%. */
export function rollBattedBallProfile(
  rng: SeededRng,
  position: FieldPosition,
  specialist: PlayerSpecialistArchetype,
  favoritePitch?: PitchType,
): BattedBallProfile {
  const tendency = pickTendency(rng, position, specialist, favoritePitch);
  const preset = TENDENCY_PRESETS[tendency];
  return {
    tendency,
    gbRateBias: clampBias(preset.gbRateBias + rng.int(-2, 2), -12, 12),
    ldRateBias: clampBias(preset.ldRateBias + rng.int(-1, 1), -8, 8),
    fbRateBias: clampBias(preset.fbRateBias + rng.int(-2, 2), -12, 12),
    popUpRateBias: clampBias(preset.popUpRateBias + rng.int(-1, 2), -8, 8),
  };
}

/** Samples a batted-ball trajectory type combining batter profile, pitcher profile, and pitch type. */
export function sampleBattedBallType(
  rng: SeededRng,
  batterProfile: BattedBallProfile,
  pitcherProfile: BattedBallProfile,
  pitchType: PitchType,
): BattedBallType {
  const pitchBias = PITCH_BATTED_BALL_BIAS[pitchType];
  const gbW = Math.max(12, 43 + batterProfile.gbRateBias * 0.65 + pitcherProfile.gbRateBias * 0.55 + pitchBias.gb);
  const ldW = Math.max(10, 21 + batterProfile.ldRateBias * 0.7 + pitcherProfile.ldRateBias * 0.4 + pitchBias.ld);
  const fbW = Math.max(12, 28 + batterProfile.fbRateBias * 0.65 + pitcherProfile.fbRateBias * 0.5 + pitchBias.fb);
  const popW = Math.max(3, 8 + batterProfile.popUpRateBias * 0.6 + pitcherProfile.popUpRateBias * 0.5 + pitchBias.pop);

  const total = gbW + ldW + fbW + popW;
  const roll = rng.next() * total;
  if (roll < gbW) return 'ground_ball';
  if (roll < gbW + ldW) return 'line_drive';
  if (roll < gbW + ldW + fbW) return 'fly_ball';
  return 'pop_up';
}

function computeBattedBallRates(stats: PlayerSeasonStats): {
  gbRate: number;
  ldRate: number;
  fbRate: number;
  popUpRate: number;
} {
  const total = stats.groundBalls + stats.lineDrives + stats.flyBalls + stats.popUps;
  return {
    gbRate: safeDiv(stats.groundBalls, total),
    ldRate: safeDiv(stats.lineDrives, total),
    fbRate: safeDiv(stats.flyBalls, total),
    popUpRate: safeDiv(stats.popUps, total),
  };
}

/** Computes canonical batting sabermetrics (AVG, OBP, SLG, OPS, ISO, BABIP, BB%, K%, GB/LD/FB/PopUp%). */
export function computeBattingSabermetrics(stats: PlayerSeasonStats): BattingSabermetrics {
  const singles = Math.max(0, stats.hits - stats.doubles - stats.triples - stats.homeRuns);
  const totalBases = singles + stats.doubles * 2 + stats.triples * 3 + stats.homeRuns * 4;
  const pa = stats.plateAppearances || stats.atBats + stats.walks + stats.sacFlies;

  const avg = safeDiv(stats.hits, stats.atBats);
  const obp = safeDiv(stats.hits + stats.walks, stats.atBats + stats.walks + stats.sacFlies);
  const slg = safeDiv(totalBases, stats.atBats);
  const babipDen = stats.atBats - stats.strikeouts - stats.homeRuns + stats.sacFlies;
  const batted = computeBattedBallRates(stats);

  return {
    avg,
    obp,
    slg,
    ops: obp + slg,
    iso: Math.max(0, slg - avg),
    babip: safeDiv(Math.max(0, stats.hits - stats.homeRuns), babipDen),
    bbRate: safeDiv(stats.walks, pa),
    kRate: safeDiv(stats.strikeouts, pa),
    ...batted,
  };
}

/** Computes canonical pitching sabermetrics (IP, ERA, WHIP, K/9, BB/9, HR/9, Strike%, GB/LD/FB/PopUp%). */
export function computePitchingSabermetrics(stats: PlayerSeasonStats): PitchingSabermetrics {
  const fullInnings = Math.floor(stats.inningsPitchedOuts / 3);
  const remOuts = stats.inningsPitchedOuts % 3;
  const ip = stats.inningsPitchedOuts / 3;
  const batted = computeBattedBallRates(stats);

  return {
    ipDisplay: `${fullInnings}.${remOuts}`,
    era: safeDiv(stats.earnedRuns * 9, ip),
    whip: safeDiv(stats.hitsAllowed + stats.pitchingWalks, ip),
    kPer9: safeDiv(stats.pitchingStrikeouts * 9, ip),
    bbPer9: safeDiv(stats.pitchingWalks * 9, ip),
    hrPer9: safeDiv(stats.homeRunsAllowed * 9, ip),
    strikeRate: safeDiv(stats.strikesThrown, stats.pitchesThrown),
    ...batted,
  };
}

/** Computes canonical fielding sabermetrics (Chances, FPCT, Range Factor per game). */
export function computeFieldingSabermetrics(stats: PlayerSeasonStats): FieldingSabermetrics {
  const chances = stats.putouts + stats.assists + stats.errors;
  const fpct = chances > 0 ? (stats.putouts + stats.assists) / chances : 1;
  return {
    chances,
    fpct,
    rangeFactorPerGame: safeDiv(stats.putouts + stats.assists, stats.games),
  };
}

/** Formats a classic baseball 3-decimal batting/OBP/SLG/FPCT string (e.g., .300 or 1.050). */
export function formatRate3(value: number): string {
  const fixed = value.toFixed(3);
  return fixed.startsWith('0.') ? fixed.slice(1) : fixed;
}
