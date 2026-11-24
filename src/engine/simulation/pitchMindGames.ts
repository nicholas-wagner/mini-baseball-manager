import type { PitchType } from '../models/player';

export type PitchFamily = 'fastball' | 'offspeed';
export type BatterPitchGuess = 'none' | PitchFamily;
export type PitchTargetIntent = 'attack_zone' | 'paint_corners' | 'high_heat' | 'bury_offspeed';
export type ArcadeTimingGrade = 'perfect' | 'good' | 'late';

export interface ArcadeTimingInput {
  actor: 'batter' | 'pitcher';
  grade: ArcadeTimingGrade;
}

export interface ArcadeTimingEvaluation {
  contactDelta: number;
  powerDelta: number;
  stuffDelta: number;
  controlDelta: number;
  mphBonus: number;
  hitProbBonus: number;
  label: string | null;
}

export interface BatterGuessEvaluation {
  status: 'none' | 'locked_in' | 'fooled';
  contactDelta: number;
  powerDelta: number;
  hitProbBonus: number;
  whiffPenalty: number;
  label: string | null;
}

export interface PitchTargetEvaluation {
  intent: PitchTargetIntent;
  label: string;
  controlDelta: number;
  stuffDelta: number;
  mphBonus: number;
  zoneProbDelta: number;
  chaseRateDelta: number;
  whiffBonus: number;
  hrCarryMultiplier: number;
}

export const PITCH_TARGET_OPTIONS: readonly { id: PitchTargetIntent; label: string; tip: string }[] = [
  { id: 'attack_zone', label: 'Attack Zone', tip: '+Strikes, steady contact' },
  { id: 'paint_corners', label: 'Paint Corners', tip: '+Control & whiffs, tighter margin' },
  { id: 'high_heat', label: 'High Heat', tip: '+2 mph & K upside, HR risk if squared' },
  { id: 'bury_offspeed', label: 'Bury Chase', tip: '+Chase & whiffs out of zone' },
];

export const BATTER_GUESS_OPTIONS: readonly { id: BatterPitchGuess; label: string; tip: string }[] = [
  { id: 'none', label: 'Read & React', tip: 'Balanced — no guess risk' },
  { id: 'fastball', label: 'Sit Fastball', tip: '🎯 +14 CON/+12 PWR if heat; -8 if fooled' },
  { id: 'offspeed', label: 'Sit Offspeed', tip: '🎯 +14 CON/+12 PWR if break; -8 if fooled' },
];

const FASTBALL_TYPES: ReadonlySet<PitchType> = new Set([
  'four_seam',
  'two_seam',
  'cutter',
]);

/** Classifies any pitch from the 8-pitch catalog into Fastball vs Offspeed/Breaking family. */
export function classifyPitchFamily(pitchType: PitchType): PitchFamily {
  return FASTBALL_TYPES.has(pitchType) ? 'fastball' : 'offspeed';
}

/** Evaluates cat-and-mouse batter Guess Pitch reward (Locked In) vs penalty (Fooled). */
export function evaluateBatterGuessEffect(
  guess: BatterPitchGuess,
  thrownPitch: PitchType,
): BatterGuessEvaluation {
  if (guess === 'none') {
    return {
      status: 'none',
      contactDelta: 0,
      powerDelta: 0,
      hitProbBonus: 0,
      whiffPenalty: 0,
      label: null,
    };
  }
  const actual = classifyPitchFamily(thrownPitch);
  if (guess === actual) {
    return {
      status: 'locked_in',
      contactDelta: 14,
      powerDelta: 12,
      hitProbBonus: 0.06,
      whiffPenalty: -0.06,
      label: `Guess: LOCKED IN (${actual.toUpperCase()})!`,
    };
  }
  return {
    status: 'fooled',
    contactDelta: -8,
    powerDelta: -4,
    hitProbBonus: -0.04,
    whiffPenalty: 0.08,
    label: `Guess: Fooled (${actual})`,
  };
}

const TARGET_TEMPLATES: Readonly<Record<PitchTargetIntent, PitchTargetEvaluation>> = {
  attack_zone: {
    intent: 'attack_zone',
    label: 'Target: Attack Zone',
    controlDelta: 2,
    stuffDelta: -1,
    mphBonus: 0,
    zoneProbDelta: 0.06,
    chaseRateDelta: -0.02,
    whiffBonus: -0.02,
    hrCarryMultiplier: 1.0,
  },
  paint_corners: {
    intent: 'paint_corners',
    label: 'Target: Paint Corners',
    controlDelta: 4,
    stuffDelta: 2,
    mphBonus: 0,
    zoneProbDelta: -0.02,
    chaseRateDelta: 0.03,
    whiffBonus: 0.04,
    hrCarryMultiplier: 0.96,
  },
  high_heat: {
    intent: 'high_heat',
    label: 'Target: High Heat',
    controlDelta: -2,
    stuffDelta: 4,
    mphBonus: 2,
    zoneProbDelta: -0.03,
    chaseRateDelta: 0.04,
    whiffBonus: 0.06,
    hrCarryMultiplier: 1.08,
  },
  bury_offspeed: {
    intent: 'bury_offspeed',
    label: 'Target: Bury Chase',
    controlDelta: 0,
    stuffDelta: 3,
    mphBonus: 0,
    zoneProbDelta: -0.06,
    chaseRateDelta: 0.1,
    whiffBonus: 0.06,
    hrCarryMultiplier: 0.94,
  },
};

/** Evaluates pitcher target intent trade-offs (strikes vs whiffs/chase/velo/HR risk). */
export function evaluatePitchTargetEffect(
  intent: PitchTargetIntent | undefined,
  thrownPitch: PitchType,
): PitchTargetEvaluation | null {
  if (!intent) return null;
  const base = TARGET_TEMPLATES[intent];
  const family = classifyPitchFamily(thrownPitch);
  if (intent === 'high_heat' && family !== 'fastball') {
    return { ...base, mphBonus: 0, stuffDelta: 1, whiffBonus: 0.02 };
  }
  if (intent === 'bury_offspeed' && family !== 'offspeed') {
    return { ...base, chaseRateDelta: 0.03, whiffBonus: 0.02 };
  }
  return base;
}

/** Converts a 0–100 sweet-spot timing cursor into a crisp Perfect / Good / Late grade. */
export function evaluateArcadeTimingCursor(cursorPos: number): ArcadeTimingGrade {
  const distance = Math.abs(cursorPos - 50);
  if (distance <= 11) return 'perfect';
  if (distance <= 24) return 'good';
  return 'late';
}

const ZERO_TIMING: ArcadeTimingEvaluation = {
  contactDelta: 0,
  powerDelta: 0,
  stuffDelta: 0,
  controlDelta: 0,
  mphBonus: 0,
  hitProbBonus: 0,
  label: null,
};

const BATTER_TIMING_TABLE: Readonly<Record<ArcadeTimingGrade, ArcadeTimingEvaluation>> = {
  perfect: {
    contactDelta: 12,
    powerDelta: 14,
    stuffDelta: 0,
    controlDelta: 0,
    mphBonus: 0,
    hitProbBonus: 0.07,
    label: 'Arcade Timing: PERFECT SWING!',
  },
  good: {
    contactDelta: 4,
    powerDelta: 4,
    stuffDelta: 0,
    controlDelta: 0,
    mphBonus: 0,
    hitProbBonus: 0.02,
    label: 'Arcade Timing: Good Contact',
  },
  late: {
    contactDelta: -6,
    powerDelta: -4,
    stuffDelta: 0,
    controlDelta: 0,
    mphBonus: 0,
    hitProbBonus: -0.03,
    label: 'Arcade Timing: Off-Balance',
  },
};

const PITCHER_TIMING_TABLE: Readonly<Record<ArcadeTimingGrade, ArcadeTimingEvaluation>> = {
  perfect: {
    contactDelta: 0,
    powerDelta: 0,
    stuffDelta: 8,
    controlDelta: 8,
    mphBonus: 2,
    hitProbBonus: 0,
    label: 'Arcade Timing: PERFECT RELEASE!',
  },
  good: {
    contactDelta: 0,
    powerDelta: 0,
    stuffDelta: 3,
    controlDelta: 3,
    mphBonus: 0,
    hitProbBonus: 0,
    label: 'Arcade Timing: Solid Release',
  },
  late: {
    contactDelta: 0,
    powerDelta: 0,
    stuffDelta: -2,
    controlDelta: -5,
    mphBonus: -1,
    hitProbBonus: 0,
    label: 'Arcade Timing: Missed Spot',
  },
};

/** Evaluates optional interactive Arcade Timing bar bonuses for either batter or pitcher. */
export function evaluateArcadeTimingEffect(
  input?: ArcadeTimingInput,
): ArcadeTimingEvaluation {
  if (!input) return ZERO_TIMING;
  return input.actor === 'batter'
    ? BATTER_TIMING_TABLE[input.grade]
    : PITCHER_TIMING_TABLE[input.grade];
}
