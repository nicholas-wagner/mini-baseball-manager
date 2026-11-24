import type {
  GameLengthInnings,
  PitcherRole,
  PitchType,
  Player,
} from '../models/player';

export type PitcherEnduranceTier = 'fresh' | 'solid' | 'tiring' | 'fatigued' | 'gassed';

export interface PitcherEnduranceEffect {
  enduranceRemaining: number;
  tier: PitcherEnduranceTier;
  mphDrop: number;
  breakDrop: number;
  controlDrop: number;
  gbRateShift: number;
  scoutWarning?: string;
}

const ROLE_DRAIN_SCALE: Readonly<Record<PitcherRole, number>> = {
  starter: 0.92,
  long_reliever: 0.78,
  fireman: 1.04,
  setup_man: 1.24,
  short_reliever: 1.28,
  closer: 1.32,
  loogy: 1.42,
};

interface PitchFatigueProfile {
  maxMphDrop: number;
  maxBreakDrop: number;
  maxControlDrop: number;
  maxGbShift: number;
  warning: string;
}

const PITCH_FATIGUE_PROFILES: Readonly<Record<PitchType, PitchFatigueProfile>> = {
  four_seam: {
    maxMphDrop: 7,
    maxBreakDrop: 10,
    maxControlDrop: 8,
    maxGbShift: -2,
    warning: 'Fastball velocity dropping — pitches flattening out!',
  },
  two_seam: {
    maxMphDrop: 6,
    maxBreakDrop: 12,
    maxControlDrop: 8,
    maxGbShift: -12,
    warning: 'Sinker losing drop — staying belt-high!',
  },
  cutter: {
    maxMphDrop: 5,
    maxBreakDrop: 10,
    maxControlDrop: 8,
    maxGbShift: -4,
    warning: 'Cutter losing late bite — call the bullpen!',
  },
  slider: {
    maxMphDrop: 4,
    maxBreakDrop: 15,
    maxControlDrop: 11,
    maxGbShift: -3,
    warning: 'Slider sweeping flat — hanging break & control risk!',
  },
  curveball: {
    maxMphDrop: 3,
    maxBreakDrop: 15,
    maxControlDrop: 11,
    maxGbShift: -4,
    warning: 'Curveball hanging high & losing command!',
  },
  changeup: {
    maxMphDrop: 3,
    maxBreakDrop: 10,
    maxControlDrop: 9,
    maxGbShift: -5,
    warning: 'Changeup losing arm-speed fade & command!',
  },
  splitter: {
    maxMphDrop: 4,
    maxBreakDrop: 13,
    maxControlDrop: 10,
    maxGbShift: -9,
    warning: 'Splitter losing late bottom-out drop!',
  },
  knuckleball: {
    maxMphDrop: 1,
    maxBreakDrop: 6,
    maxControlDrop: 6,
    maxGbShift: -2,
    warning: 'Knuckleball floating flat!',
  },
};

/** Converts 0..100 mound fatigue into intuitive 100..0 endurance percentage remaining. */
export function fatigueToEndurance(fatigue: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - fatigue)));
}

/** Computes endurance drained by one pitch based on stamina, role, leverage stress, and game length. */
export function computePitchEnduranceDrain(
  pitcher: Pick<Player, 'position' | 'pitcherRole' | 'ratings'>,
  leverageIndex: number,
  regulationInnings: GameLengthInnings = 9,
): number {
  const role: PitcherRole =
    pitcher.pitcherRole ?? (pitcher.position === 'SP' ? 'starter' : 'short_reliever');
  const staminaFactor = Math.max(0.54, (128 - pitcher.ratings.stamina) / 56);
  const stressFactor = leverageIndex >= 1.6 ? 1.22 : 1.0;
  const paceScale = 9 / regulationInnings;
  return Number((1.18 * staminaFactor * ROLE_DRAIN_SCALE[role] * stressFactor * paceScale).toFixed(3));
}

function classifyEnduranceTier(endurance: number): PitcherEnduranceTier {
  if (endurance >= 75) return 'fresh';
  if (endurance >= 55) return 'solid';
  if (endurance >= 36) return 'tiring';
  if (endurance >= 18) return 'fatigued';
  return 'gassed';
}

/** Evaluates pitch-specific velocity, sink/drop, break, control, and GB% degradation from endurance. */
export function evaluatePitcherEnduranceEffect(
  enduranceRemaining: number,
  pitchType: PitchType,
): PitcherEnduranceEffect {
  const clamped = Math.max(0, Math.min(100, Math.round(enduranceRemaining)));
  const tier = classifyEnduranceTier(clamped);
  if (clamped >= 70) {
    return {
      enduranceRemaining: clamped,
      tier,
      mphDrop: 0,
      breakDrop: 0,
      controlDrop: 0,
      gbRateShift: 0,
    };
  }

  const wear = (70 - clamped) / 70; // 0..1 smooth fatigue curve
  const profile = PITCH_FATIGUE_PROFILES[pitchType];
  return {
    enduranceRemaining: clamped,
    tier,
    mphDrop: -Math.round(profile.maxMphDrop * wear),
    breakDrop: -Math.round(profile.maxBreakDrop * wear),
    controlDrop: -Math.round(profile.maxControlDrop * wear),
    gbRateShift: Math.round(profile.maxGbShift * wear),
    scoutWarning: clamped <= 35 ? profile.warning : undefined,
  };
}

/** Computes post-game fatigue remaining after rest (overworked pitchers stay partially tired next game). */
export function computePostGamePitcherRecovery(
  currentFatigue: number,
  pitchedInGame: boolean,
): number {
  const recovery = pitchedInGame ? Math.round(currentFatigue * 0.35) : Math.round(currentFatigue * 0.65 + 15);
  return Math.max(0, Math.min(100, Math.round(currentFatigue - recovery)));
}
