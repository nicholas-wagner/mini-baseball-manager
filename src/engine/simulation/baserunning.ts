import { getPositionalHandednessBonus } from '../handedness/handedness';
import { getActiveHealthRatingPenalties } from '../health/healthEngine';
import type { AiArchetype } from '../models/club';
import type { PlayEvent, PlaySoundCue, TacticalCall } from '../models/playEvent';
import type { Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { getFormStatModifiers } from '../rpg/formTracker';
import { evaluatePlayerRelicBonuses } from '../rpg/relics';
import {
  evaluateCapstoneGameplayProfile,
  evaluateHeritageGameplayProfile,
} from '../rpg/specialPowerEffects';
import type { BaseState } from './gameState';

export type StealPlayType = 'steal_2b' | 'steal_3b' | 'double_steal' | 'steal_home';

export type StealDefenseCall = 'normal' | 'hold_runner' | 'pitchout';

export interface StealMatchupContext {
  playType: StealPlayType;
  runner: Player;
  pitcher: Player;
  catcher: Player;
  pitcherFatigue?: number;
  catcherPopTimeBonus?: number;
  defenseCall?: StealDefenseCall;
}

export interface StealOptionPreview {
  playType: StealPlayType;
  label: string;
  runnerId: string;
  runnerName: string;
  runnerSpeed: number;
  successProbability: number;
  successPct: number;
  riskTier: 'green' | 'amber' | 'red';
}

export interface StealPlayResolution {
  playType: StealPlayType;
  success: boolean;
  basesAfter: BaseState;
  runsScoredIds: string[];
  stolenBaseRunnerIds: string[];
  caughtStealingRunnerId: string | null;
  outsAdded: 0 | 1;
  commentary: string;
  soundCue: PlaySoundCue;
  fieldingHighlight: NonNullable<PlayEvent['fieldingHighlight']>;
}

const BASE_STEAL_DIFFICULTY: Readonly<Record<StealPlayType, number>> = {
  steal_2b: 0,
  steal_3b: -0.08,
  double_steal: -0.05,
  steal_home: -0.44,
};

const HOLD_SCALE_BY_PLAY: Readonly<Record<StealPlayType, number>> = {
  steal_2b: 1.0,
  double_steal: 0.85,
  steal_3b: 0.45,
  steal_home: 0.35,
};

const DEFENSE_CALL_PENALTY: Readonly<Record<StealDefenseCall, number>> = {
  normal: 0,
  hold_runner: -0.08,
  pitchout: -0.32,
};

function clampProb(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Computes effective live baserunning speed combining base Speed, relics, powers, form, health, and fatigue. */
export function computeEffectiveStealSpeed(runner: Player): number {
  const health = getActiveHealthRatingPenalties(runner);
  const relics = evaluatePlayerRelicBonuses(runner);
  const form = getFormStatModifiers(runner.formState);
  const heritage = evaluateHeritageGameplayProfile(runner, 1.0);
  const capstones = evaluateCapstoneGameplayProfile(runner, 1.0);
  const specialistJump = runner.specialistArchetype === 'speed_smallball' ? 6 : 0;
  const fatiguePenalty = Math.floor((runner.fatigue * heritage.enduranceDrainScale) / 22);
  const raw =
    runner.ratings.speed +
    health.speed +
    relics.speed +
    heritage.stealSpeedDelta +
    capstones.stealSpeedDelta +
    Math.round(form.contactDelta * 0.4) +
    specialistJump -
    fatiguePenalty;
  return Math.max(20, Math.min(108, raw));
}

/**
 * Computes base-stealing success probability driven primarily by runner Speed
 * against catcher Arm/Fielding, Bullpen Coach pop-time, LHP runner-hold, and target base.
 */
export function computeStealSuccessProbability(ctx: StealMatchupContext): number {
  const effSpeed = computeEffectiveStealSpeed(ctx.runner);
  const speedCurve =
    effSpeed >= 60
      ? (effSpeed - 60) * 0.0078
      : (effSpeed - 60) * 0.0115;

  const catcherHeritage = evaluateHeritageGameplayProfile(ctx.catcher, 1.0);
  const catcherCapstones = evaluateCapstoneGameplayProfile(ctx.catcher, 1.0);
  const catcherArm =
    ctx.catcher.ratings.arm + catcherHeritage.defenderArmDelta + catcherCapstones.defenderArmDelta;
  const catcherFld =
    ctx.catcher.ratings.fielding +
    catcherHeritage.defenderFieldingDelta +
    catcherCapstones.defenderFieldingDelta;
  const catcherThrowSkill =
    catcherArm * 0.72 +
    catcherFld * 0.28 +
    (ctx.catcherPopTimeBonus ?? 0) * 2.5;
  const catcherEdge = (catcherThrowSkill - 60) * 0.0055;

  const holdBonus =
    getPositionalHandednessBonus(ctx.pitcher.position, ctx.pitcher.throws).pickoffHoldBonus *
    HOLD_SCALE_BY_PLAY[ctx.playType];
  const fatigueJump = Math.min(0.06, (ctx.pitcherFatigue ?? 0) * 0.0007);
  const veloPenalty = (ctx.pitcher.ratings.velocity - 65) * 0.0014;
  const defenseMod = DEFENSE_CALL_PENALTY[ctx.defenseCall ?? 'normal'];

  const raw =
    0.62 +
    speedCurve -
    catcherEdge -
    holdBonus * 0.014 +
    fatigueJump -
    veloPenalty +
    BASE_STEAL_DIFFICULTY[ctx.playType] +
    defenseMod;

  const minFloor = ctx.playType === 'steal_home' ? 0.06 : 0.14;
  const maxCeil = ctx.playType === 'steal_home' ? 0.48 : 0.91;
  return Number(clampProb(raw, minFloor, maxCeil).toFixed(3));
}

function toRiskTier(prob: number): 'green' | 'amber' | 'red' {
  if (prob >= 0.7) return 'green';
  if (prob >= 0.5) return 'amber';
  return 'red';
}

function buildOption(
  playType: StealPlayType,
  label: string,
  runner: Player,
  pitcher: Player,
  catcher: Player,
  pitcherFatigue: number,
  catcherPopTimeBonus: number,
): StealOptionPreview {
  const prob = computeStealSuccessProbability({
    playType,
    runner,
    pitcher,
    catcher,
    pitcherFatigue,
    catcherPopTimeBonus,
  });
  return {
    playType,
    label,
    runnerId: runner.id,
    runnerName: runner.name,
    runnerSpeed: runner.ratings.speed,
    successProbability: prob,
    successPct: Math.round(prob * 100),
    riskTier: toRiskTier(prob),
  };
}

function getRunnerAt(
  id: string | null,
  playersById: Readonly<Record<string, Player>>,
): Player | null {
  return id ? (playersById[id] ?? null) : null;
}

function collectEligibleCandidates(
  [r1, r2, r3]: BaseState,
  playersById: Readonly<Record<string, Player>>,
): { playType: StealPlayType; label: string; runner: Player }[] {
  const list: { playType: StealPlayType; label: string; runner: Player }[] = [];
  const p1 = getRunnerAt(r1, playersById);
  const p2 = getRunnerAt(r2, playersById);
  const p3 = getRunnerAt(r3, playersById);

  if (p1 && !r2) list.push({ playType: 'steal_2b', label: 'Steal 2B', runner: p1 });
  if (p2 && !r3) {
    list.push({
      playType: r1 ? 'double_steal' : 'steal_3b',
      label: r1 ? 'Double Steal' : 'Steal 3B',
      runner: p2,
    });
  }
  if (p3) list.push({ playType: 'steal_home', label: 'Steal Home', runner: p3 });
  return list;
}

/** Lists all legal steal attempts for the current base occupancy along with live speed-driven odds. */
export function getEligibleStealPlays(
  bases: BaseState,
  playersById: Readonly<Record<string, Player>>,
  pitcher: Player,
  catcher: Player,
  pitcherFatigue = 0,
  catcherPopTimeBonus = 0,
): StealOptionPreview[] {
  return collectEligibleCandidates(bases, playersById).map((cand) =>
    buildOption(
      cand.playType,
      cand.label,
      cand.runner,
      pitcher,
      catcher,
      pitcherFatigue,
      catcherPopTimeBonus,
    ),
  );
}

/** Picks the primary default steal play when a generic `'steal'` tactical call is triggered. */
export function resolveDefaultStealPlay(bases: BaseState): StealPlayType | null {
  const [r1, r2, r3] = bases;
  if (r1 && !r2) return 'steal_2b';
  if (r1 && r2 && !r3) return 'double_steal';
  if (r2 && !r3) return 'steal_3b';
  if (r3) return 'steal_home';
  return null;
}

/** Returns true when a specific steal play is legal for the current base occupancy. */
export function isStealPlayLegal(playType: StealPlayType, bases: BaseState): boolean {
  const [r1, r2, r3] = bases;
  if (playType === 'steal_2b') return Boolean(r1 && !r2);
  if (playType === 'steal_3b') return Boolean(r2 && !r3);
  if (playType === 'double_steal') return Boolean(r1 && r2 && !r3);
  return Boolean(r3);
}

/** Returns true when a Ball-4 walk forces the stealing runner(s) safely ahead with no throw-out risk. */
export function isStealForcedByWalk(playType: StealPlayType, bases: BaseState): boolean {
  if (playType === 'steal_2b' || playType === 'double_steal') return true;
  if (playType === 'steal_3b') return Boolean(bases[0]);
  return Boolean(bases[0] && bases[1]);
}

const STEAL_PLAY_TO_CALL_MAP: Readonly<Record<StealPlayType, TacticalCall>> = {
  steal_2b: 'steal',
  steal_3b: 'steal_3b',
  double_steal: 'double_steal',
  steal_home: 'steal_home',
};

/** Maps a canonical StealPlayType to its legacy TacticalCall identifier. */
export function stealPlayToTacticalCall(playType: StealPlayType): TacticalCall {
  return STEAL_PLAY_TO_CALL_MAP[playType];
}

/** Resolves a StealPlayType from a legacy steal TacticalCall, or null for non-steal calls. */
export function tacticalCallToStealPlay(call: TacticalCall, bases: BaseState): StealPlayType | null {
  if (call === 'steal') return resolveDefaultStealPlay(bases);
  if (call === 'steal_3b' || call === 'double_steal' || call === 'steal_home') {
    return isStealPlayLegal(call, bases) ? call : null;
  }
  return null;
}

function getLeadRunnerId(playType: StealPlayType, bases: BaseState): string | null {
  if (playType === 'steal_2b') return bases[0];
  if (playType === 'steal_3b' || playType === 'double_steal') return bases[1];
  return bases[2];
}

type StealOutcomePartial = Omit<StealPlayResolution, 'playType' | 'success' | 'fieldingHighlight'>;
type StealOutcomeBuilder = (
  bases: BaseState,
  success: boolean,
  leadRunner: Player,
  catcher: Player,
) => StealOutcomePartial;

function buildSteal2bOutcome(
  [r1, r2, r3]: BaseState,
  success: boolean,
  leadRunner: Player,
  catcher: Player,
): StealOutcomePartial {
  if (success) {
    return {
      basesAfter: [null, r1, r3],
      runsScoredIds: [],
      stolenBaseRunnerIds: r1 ? [r1] : [],
      caughtStealingRunnerId: null,
      outsAdded: 0,
      commentary: `${leadRunner.name} (SPD ${leadRunner.ratings.speed}) swipes second base with a dusty slide!`,
      soundCue: 'steal_burst',
    };
  }
  return {
    basesAfter: [null, r2, r3],
    runsScoredIds: [],
    stolenBaseRunnerIds: [],
    caughtStealingRunnerId: r1,
    outsAdded: 1,
    commentary: `${catcher.name} fires a laser to gun down ${leadRunner.name} trying to steal second!`,
    soundCue: 'glove_pop',
  };
}

function buildDoubleStealOutcome(
  [r1, r2, r3]: BaseState,
  success: boolean,
  leadRunner: Player,
  catcher: Player,
): StealOutcomePartial {
  if (success) {
    const runners = [r2, r1].filter((id): id is string => Boolean(id));
    return {
      basesAfter: [null, r1, r2],
      runsScoredIds: [],
      stolenBaseRunnerIds: runners,
      caughtStealingRunnerId: null,
      outsAdded: 0,
      commentary: `DOUBLE STEAL! ${leadRunner.name} leads the dash to third as both runners slide in safe!`,
      soundCue: 'ump_safe_call',
    };
  }
  return {
    basesAfter: [null, r1, r3],
    runsScoredIds: [],
    stolenBaseRunnerIds: [],
    caughtStealingRunnerId: r2,
    outsAdded: 1,
    commentary: `${catcher.name} cuts down ${leadRunner.name} at third to spoil the double steal!`,
    soundCue: 'glove_pop',
  };
}

function buildSteal3bOutcome(
  [r1, r2, r3]: BaseState,
  success: boolean,
  leadRunner: Player,
  catcher: Player,
): StealOutcomePartial {
  if (success) {
    return {
      basesAfter: [r1, null, r2],
      runsScoredIds: [],
      stolenBaseRunnerIds: r2 ? [r2] : [],
      caughtStealingRunnerId: null,
      outsAdded: 0,
      commentary: `${leadRunner.name} gets a blazing jump and steals third base cleanly!`,
      soundCue: 'steal_burst',
    };
  }
  return {
    basesAfter: [r1, null, r3],
    runsScoredIds: [],
    stolenBaseRunnerIds: [],
    caughtStealingRunnerId: r2,
    outsAdded: 1,
    commentary: `${catcher.name} snaps a bullet to third — ${leadRunner.name} is OUT!`,
    soundCue: 'glove_pop',
  };
}

function buildStealHomeOutcome(
  [r1, r2, r3]: BaseState,
  success: boolean,
  leadRunner: Player,
  catcher: Player,
): StealOutcomePartial {
  if (success) {
    return {
      basesAfter: [r1, r2, null],
      runsScoredIds: r3 ? [r3] : [],
      stolenBaseRunnerIds: r3 ? [r3] : [],
      caughtStealingRunnerId: null,
      outsAdded: 0,
      commentary: `UNBELIEVABLE! ${leadRunner.name} STEALS HOME with a head-first slide across the dish!`,
      soundCue: 'stadium_airhorn',
    };
  }
  return {
    basesAfter: [r1, r2, null],
    runsScoredIds: [],
    stolenBaseRunnerIds: [],
    caughtStealingRunnerId: r3,
    outsAdded: 1,
    commentary: `${catcher.name} blocks the plate and tags out ${leadRunner.name} trying to steal home!`,
    soundCue: 'glove_pop',
  };
}

const STEAL_OUTCOME_BUILDERS: Readonly<Record<StealPlayType, StealOutcomeBuilder>> = {
  steal_2b: buildSteal2bOutcome,
  double_steal: buildDoubleStealOutcome,
  steal_3b: buildSteal3bOutcome,
  steal_home: buildStealHomeOutcome,
};

function buildStealOutcomeState(
  playType: StealPlayType,
  bases: BaseState,
  success: boolean,
  leadRunner: Player,
  catcher: Player,
): StealOutcomePartial {
  return STEAL_OUTCOME_BUILDERS[playType](bases, success, leadRunner, catcher);
}

/** Resolves any legal steal attempt deterministically from seeded RNG and player ratings. */
export function resolveBaseStealPlay(
  rng: SeededRng,
  playType: StealPlayType,
  bases: BaseState,
  playersById: Readonly<Record<string, Player>>,
  pitcher: Player,
  catcher: Player,
  opts?: {
    pitcherFatigue?: number;
    catcherPopTimeBonus?: number;
    defenseCall?: StealDefenseCall;
  },
): StealPlayResolution | null {
  const leadId = getLeadRunnerId(playType, bases);
  if (!leadId || !playersById[leadId]) return null;
  const leadRunner = playersById[leadId];
  const prob = computeStealSuccessProbability({
    playType,
    runner: leadRunner,
    pitcher,
    catcher,
    pitcherFatigue: opts?.pitcherFatigue,
    catcherPopTimeBonus: opts?.catcherPopTimeBonus,
    defenseCall: opts?.defenseCall,
  });
  const success = rng.chance(prob);
  const outcome = buildStealOutcomeState(playType, bases, success, leadRunner, catcher);
  return {
    playType,
    success,
    ...outcome,
    fieldingHighlight: {
      fielderId: catcher.id,
      fielderPos: 'C',
      anim: success ? 'field_run' : 'field_dive',
    },
  };
}

export interface AiStealDecisionInput {
  bases: BaseState;
  playersById: Readonly<Record<string, Player>>;
  pitcher: Player;
  catcher: Player;
  outs: number;
  scoreDiff: number;
  aiArchetype: AiArchetype;
  pitcherFatigue: number;
  catcherPopTimeBonus: number;
}

/** Decides whether an AI offense autonomously attempts a speed-driven steal before a pitch. */
export function shouldAiAttemptSteal(
  rng: SeededRng,
  input: AiStealDecisionInput,
): StealPlayType | null {
  if (input.outs >= 2 && Math.abs(input.scoreDiff) > 3) return null;
  if (input.scoreDiff >= 5 || input.scoreDiff <= -5) return null;

  const options = getEligibleStealPlays(
    input.bases,
    input.playersById,
    input.pitcher,
    input.catcher,
    input.pitcherFatigue,
    input.catcherPopTimeBonus,
  ).filter((o) => o.playType !== 'steal_home');

  if (options.length === 0) return null;
  const best = options[0];
  const minOdds = input.aiArchetype === 'speed_demons' ? 0.56 : 0.64;
  if (best.successProbability < minOdds) return null;

  const speedDrive = Math.max(0, (best.runnerSpeed - 55) * 0.0042);
  const archetypeBoost = input.aiArchetype === 'speed_demons' ? 0.11 : 0.03;
  const attemptChance = clampProb(speedDrive + archetypeBoost, 0.02, 0.28);
  return rng.chance(attemptChance) ? best.playType : null;
}

/** Computes official Stolen Base Percentage (SB%) rounded to 1 decimal place. */
export function computeStealSuccessRate(stolenBases: number, caughtStealing: number): number {
  const attempts = stolenBases + caughtStealing;
  if (attempts <= 0) return 0;
  return Number(((stolenBases / attempts) * 100).toFixed(1));
}
