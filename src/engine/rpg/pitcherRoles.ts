import type { ThrowsHand } from '../handedness/types';
import {
  computePlayerOverall,
  type PitcherRole,
  type Player,
  type PlayerRatings,
  type PlayerSpecialistArchetype,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';

export interface PitcherSituationContext {
  inning: number;
  regulationInnings?: number;
  lead: number; // fieldingScore - battingScore
  hasRunnersOn: boolean;
  leverageIndex: number;
  batterEffectiveSide: 'L' | 'R';
}

export interface PitcherRoleEvaluation {
  role: PitcherRole;
  roleFit: 'ideal' | 'neutral' | 'misused';
  stuffDelta: number;
  controlDelta: number;
  fatiguePerPitchMultiplier: number;
}

const RHP_BULLPEN_ROLES: readonly PitcherRole[] = [
  'long_reliever',
  'short_reliever',
  'setup_man',
  'closer',
  'fireman',
];

const LHP_BULLPEN_ROLES: readonly PitcherRole[] = [
  'long_reliever',
  'short_reliever',
  'loogy',
  'setup_man',
  'closer',
  'fireman',
];

const ROLE_FATIGUE_MULTIPLIER: Readonly<Record<PitcherRole, number>> = {
  starter: 0.88,
  long_reliever: 0.72,
  short_reliever: 1.22,
  loogy: 1.32,
  setup_man: 1.18,
  closer: 1.24,
  fireman: 0.96,
};

function clampRating(value: number): number {
  return Math.max(20, Math.min(99, Math.round(value)));
}

interface SpecialistRoleHint {
  chance: number;
  primary: PitcherRole;
  secondary: PitcherRole;
  primaryChance: number;
  requiresLefty?: boolean;
}

const SPECIALIST_ROLE_HINTS: Partial<Record<PlayerSpecialistArchetype, SpecialistRoleHint>> = {
  flame_closer: { chance: 0.55, primary: 'closer', secondary: 'setup_man', primaryChance: 0.65 },
  southpaw_specialist: {
    chance: 0.65,
    primary: 'loogy',
    secondary: 'fireman',
    primaryChance: 0.7,
    requiresLefty: true,
  },
  crafty_tactician: {
    chance: 0.45,
    primary: 'long_reliever',
    secondary: 'fireman',
    primaryChance: 0.55,
  },
};

/** Rolls a specialized pitcher role strictly enforcing starter for SP and LHP-only for LOOGY. */
export function rollPitcherRole(
  rng: SeededRng,
  position: 'SP' | 'RP',
  throwsHand: ThrowsHand,
  specialist: PlayerSpecialistArchetype,
): PitcherRole {
  if (position === 'SP') return 'starter';

  const hint = SPECIALIST_ROLE_HINTS[specialist];
  const hintEligible = hint && (!hint.requiresLefty || throwsHand === 'L');
  if (hintEligible && rng.chance(hint.chance)) {
    return rng.chance(hint.primaryChance) ? hint.primary : hint.secondary;
  }

  const pool = throwsHand === 'L' ? LHP_BULLPEN_ROLES : RHP_BULLPEN_ROLES;
  return rng.pick(pool);
}

const ROLE_RATING_SHAPES: Readonly<
  Record<PitcherRole, Partial<Pick<PlayerRatings, 'velocity' | 'movement' | 'control' | 'stamina' | 'clutch'>>>
> = {
  starter: { stamina: 4 },
  long_reliever: { stamina: 14, control: 2, velocity: -2 },
  short_reliever: { velocity: 3, movement: 2, stamina: -4 },
  loogy: { movement: 6, velocity: 2, stamina: -10 },
  setup_man: { velocity: 3, movement: 3, clutch: 3, stamina: -4 },
  closer: { velocity: 4, movement: 3, clutch: 6, stamina: -8 },
  fireman: { movement: 3, control: 2, clutch: 5, stamina: 4 },
};

/** Applies subtle role-calibrated stamina, stuff, and clutch adjustments. */
export function applyPitcherRoleShape(
  ratings: PlayerRatings,
  role: PitcherRole,
): PlayerRatings {
  const delta = ROLE_RATING_SHAPES[role];
  return {
    ...ratings,
    velocity: clampRating(ratings.velocity + (delta.velocity ?? 0)),
    movement: clampRating(ratings.movement + (delta.movement ?? 0)),
    control: clampRating(ratings.control + (delta.control ?? 0)),
    stamina: clampRating(ratings.stamina + (delta.stamina ?? 0)),
    clutch: clampRating(ratings.clutch + (delta.clutch ?? 0)),
  };
}

function getRegulationInnings(ctx: PitcherSituationContext): number {
  return Math.max(5, ctx.regulationInnings ?? 9);
}

function isSaveInning(ctx: PitcherSituationContext): boolean {
  return ctx.inning >= getRegulationInnings(ctx);
}

function isSetupInning(ctx: PitcherSituationContext): boolean {
  const reg = getRegulationInnings(ctx);
  const setupStart = reg <= 5 ? 4 : reg - 2;
  return ctx.inning >= setupStart && ctx.inning <= reg - 1;
}

function isFiremanInning(ctx: PitcherSituationContext): boolean {
  const reg = getRegulationInnings(ctx);
  return ctx.inning >= Math.max(3, reg - 4);
}

function isEarlyBridgeInning(ctx: PitcherSituationContext): boolean {
  const reg = getRegulationInnings(ctx);
  return ctx.inning <= Math.max(2, reg - 3);
}

function evalCloser(ctx: PitcherSituationContext): Omit<PitcherRoleEvaluation, 'role' | 'fatiguePerPitchMultiplier'> {
  const isSaveSpot = isSaveInning(ctx) && ctx.lead >= 1 && ctx.lead <= 3;
  if (isSaveSpot) return { roleFit: 'ideal', stuffDelta: 5, controlDelta: 4 };
  if (Math.abs(ctx.lead) >= 5 && ctx.leverageIndex < 0.8) {
    return { roleFit: 'misused', stuffDelta: -1, controlDelta: -3 };
  }
  return { roleFit: 'neutral', stuffDelta: 0, controlDelta: 0 };
}

function evalSetup(ctx: PitcherSituationContext): Omit<PitcherRoleEvaluation, 'role' | 'fatiguePerPitchMultiplier'> {
  if (isSetupInning(ctx) && Math.abs(ctx.lead) <= 3) {
    return { roleFit: 'ideal', stuffDelta: 4, controlDelta: 3 };
  }
  return { roleFit: 'neutral', stuffDelta: 0, controlDelta: 0 };
}

function evalFireman(ctx: PitcherSituationContext): Omit<PitcherRoleEvaluation, 'role' | 'fatiguePerPitchMultiplier'> {
  if (ctx.leverageIndex >= 1.55 || (ctx.hasRunnersOn && isFiremanInning(ctx))) {
    return { roleFit: 'ideal', stuffDelta: 6, controlDelta: 3 };
  }
  return { roleFit: 'neutral', stuffDelta: 0, controlDelta: 0 };
}

function evalLoogy(ctx: PitcherSituationContext): Omit<PitcherRoleEvaluation, 'role' | 'fatiguePerPitchMultiplier'> {
  if (ctx.batterEffectiveSide === 'L') {
    return { roleFit: 'ideal', stuffDelta: 7, controlDelta: 4 };
  }
  return { roleFit: 'misused', stuffDelta: -1, controlDelta: -2 };
}

function evalLongReliever(ctx: PitcherSituationContext): Omit<PitcherRoleEvaluation, 'role' | 'fatiguePerPitchMultiplier'> {
  if (isEarlyBridgeInning(ctx) || Math.abs(ctx.lead) >= 4) {
    return { roleFit: 'ideal', stuffDelta: 2, controlDelta: 3 };
  }
  return { roleFit: 'neutral', stuffDelta: 0, controlDelta: 0 };
}

const ROLE_EVALUATORS: Readonly<
  Record<
    PitcherRole,
    (ctx: PitcherSituationContext) => Omit<PitcherRoleEvaluation, 'role' | 'fatiguePerPitchMultiplier'>
  >
> = {
  starter: () => ({ roleFit: 'neutral', stuffDelta: 0, controlDelta: 0 }),
  long_reliever: evalLongReliever,
  short_reliever: () => ({ roleFit: 'neutral', stuffDelta: 2, controlDelta: 1 }),
  loogy: evalLoogy,
  setup_man: evalSetup,
  closer: evalCloser,
  fireman: evalFireman,
};

/** Evaluates live game-situation fit and fatigue scaling for the active pitcher's role. */
export function evaluatePitcherRoleSituation(
  pitcher: Pick<Player, 'position' | 'pitcherRole'>,
  ctx: PitcherSituationContext,
): PitcherRoleEvaluation {
  const role: PitcherRole =
    pitcher.pitcherRole ?? (pitcher.position === 'SP' ? 'starter' : 'short_reliever');
  const evaluated = ROLE_EVALUATORS[role](ctx);
  return {
    role,
    ...evaluated,
    fatiguePerPitchMultiplier: ROLE_FATIGUE_MULTIPLIER[role],
  };
}

const BULLPEN_SITUATION_BONUS: Readonly<
  Record<PitcherRole, (ctx: PitcherSituationContext) => number>
> = {
  starter: () => 0,
  short_reliever: () => 4,
  closer: (ctx) => (isSaveInning(ctx) && ctx.lead >= 1 && ctx.lead <= 3 ? 45 : 0),
  fireman: (ctx) => (ctx.leverageIndex >= 1.8 && ctx.hasRunnersOn ? 42 : 0),
  loogy: (ctx) => (ctx.batterEffectiveSide === 'L' && ctx.leverageIndex >= 1.1 ? 36 : 0),
  setup_man: (ctx) => (isSetupInning(ctx) && Math.abs(ctx.lead) <= 3 ? 32 : 0),
  long_reliever: (ctx) => (isEarlyBridgeInning(ctx) || Math.abs(ctx.lead) >= 4 ? 38 : 0),
};

export function scoreBullpenCandidate(
  reliever: Player,
  ctx: PitcherSituationContext,
): number {
  const role = reliever.pitcherRole ?? 'short_reliever';
  const fit = evaluatePitcherRoleSituation(reliever, ctx);
  const qualityEdge = computePlayerOverall(reliever) * 0.25 - reliever.fatigue * 0.18;
  return fit.stuffDelta * 3 + fit.controlDelta * 2 + BULLPEN_SITUATION_BONUS[role](ctx) + qualityEdge;
}

/** Chooses the best-fitting available reliever from the bullpen for the live game situation. */
export function selectBestBullpenReliever(
  availableRelievers: readonly Player[],
  ctx: PitcherSituationContext,
): Player | null {
  if (availableRelievers.length === 0) return null;
  let best = availableRelievers[0];
  let bestScore = scoreBullpenCandidate(best, ctx);
  for (let i = 1; i < availableRelievers.length; i += 1) {
    const candidate = availableRelievers[i];
    const score = scoreBullpenCandidate(candidate, ctx);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}
