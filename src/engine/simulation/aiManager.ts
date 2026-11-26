import type { NemesisMatchupEvaluation } from '../league/nemesisTracker';
import type { TacticalCall } from '../models/playEvent';
import type { PitchType } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { getActivatablePowersForPlayer } from '../rpg/specialPowerEffects';
import { shouldAiAttemptSteal } from './baserunning';
import {
  getBattingSide,
  getCurrentBatter,
  getCurrentPitcher,
  getDefenderAtPosition,
  getFieldingSide,
  type GameSessionState,
} from './gameState';
import type {
  ArcadeTimingGrade,
  ArcadeTimingInput,
  BatterPitchGuess,
  PitchingMode,
  PitchTargetIntent,
} from './pitchMindGames';
import { getCatcherCall } from './catcherCalls';
import type { BullpenMode } from './bullpenManager';
import type { WeatherSimulationImpact } from './weather';
import type { DefensiveShiftId } from './winProbability';

export interface StepPitchOptions {
  thirdBaseCall?: 'send' | 'hold' | 'coach';
  requestedPitchType?: PitchType;
  requestedPowerId?: string;
  defensiveShift?: DefensiveShiftId;
  weatherImpact?: WeatherSimulationImpact;
  pitchTarget?: PitchTargetIntent;
  batterGuess?: BatterPitchGuess;
  nemesisBonus?: NemesisMatchupEvaluation;
  arcadeTiming?: ArcadeTimingInput;
  stealDefenseCall?: 'normal' | 'hold_runner' | 'pitchout';
  /** Controls human-team automatic pitching changes ('auto' | 'semi_auto' | 'manual'). AI clubs always auto-manage. */
  bullpenMode?: BullpenMode;
  /** Optional small Pro-mode control bonus (+2 CTL) when bringing in a reliever warmed up to HOT. */
  relieverWarmupControlBonus?: number;
  /** When true in a human-vs-AI game, guarantees the AI side ignores human calls and decides independently. */
  enforceSideOwnership?: boolean;
}

export interface HumanLiveSelections {
  tacticalCall: TacticalCall;
  pitchingMode?: PitchingMode;
  bullpenMode?: BullpenMode;
  shakeOffCount?: number;
  pitchTarget: PitchTargetIntent;
  selectedPitchType: PitchType | null;
  defensiveShift: DefensiveShiftId;
  batterGuess: BatterPitchGuess;
  armedPowerId: string | null;
  arcadeTimingGrade?: ArcadeTimingGrade;
  relieverWarmupControlBonus?: number;
}

const OFFENSIVE_CALLS: ReadonlySet<TacticalCall> = new Set([
  'contact',
  'power',
  'bunt',
  'steal',
  'steal_3b',
  'double_steal',
  'steal_home',
]);

const DEFENSIVE_CALLS: ReadonlySet<TacticalCall> = new Set([
  'pitchout',
  'hold_runner',
  'intentional_walk',
]);

export function isOffensiveTacticalCall(call: TacticalCall): boolean {
  return OFFENSIVE_CALLS.has(call);
}

export function isDefensiveTacticalCall(call: TacticalCall): boolean {
  return DEFENSIVE_CALLS.has(call);
}

function isBuntDefenseSpot(session: GameSessionState, isClose: boolean): boolean {
  const hasEarlyRunner = Boolean(session.bases[0] || session.bases[1]) && !session.bases[2];
  if (!hasEarlyRunner || session.outs >= 2 || !isClose) return false;
  const batter = getCurrentBatter(session);
  return batter.ratings.bunt >= 65 && batter.ratings.power <= 60;
}

function isNoDoublesSpot(
  session: GameSessionState,
  scoreDiff: number,
  isLate: boolean,
): boolean {
  if (!isLate || scoreDiff < 1 || scoreDiff > 2 || session.outs >= 2 || session.bases[2]) {
    return false;
  }
  return getCurrentBatter(session).ratings.power >= 68;
}

/** Independently picks the AI defense's infield/outfield alignment from game situation. */
export function chooseAiDefensiveShift(session: GameSessionState): DefensiveShiftId {
  const batting = getBattingSide(session);
  const fielding = getFieldingSide(session);
  const scoreDiff = fielding.score - batting.score;
  const isClose = Math.abs(scoreDiff) <= 2;
  const isLate = session.inning >= Math.max(1, session.regulationInnings - 1);

  if (session.bases[2] && session.outs < 2 && (isClose || isLate)) {
    return 'infield_in';
  }
  if (isBuntDefenseSpot(session, isClose)) {
    return 'bunt_defense';
  }
  if (isNoDoublesSpot(session, scoreDiff, isLate)) {
    return 'no_doubles';
  }
  return 'standard';
}

function pickTwoStrikeTarget(balls: number, roll: number): PitchTargetIntent {
  if (balls <= 1) {
    if (roll < 0.4) return 'bury_offspeed';
    return roll < 0.75 ? 'high_heat' : 'paint_corners';
  }
  if (roll < 0.45) return 'paint_corners';
  return roll < 0.75 ? 'high_heat' : 'attack_zone';
}

const EARLY_COUNT_WEIGHTS: Readonly<
  Record<string, readonly [number, PitchTargetIntent][]>
> = {
  ace_factory: [
    [0.5, 'paint_corners'],
    [0.8, 'bury_offspeed'],
    [1.0, 'attack_zone'],
  ],
  defense_first: [
    [0.5, 'paint_corners'],
    [0.8, 'bury_offspeed'],
    [1.0, 'attack_zone'],
  ],
  mashers: [
    [0.45, 'high_heat'],
    [0.75, 'attack_zone'],
    [1.0, 'paint_corners'],
  ],
  default: [
    [0.35, 'attack_zone'],
    [0.62, 'paint_corners'],
    [0.82, 'high_heat'],
    [1.0, 'bury_offspeed'],
  ],
};

function pickEarlyCountTarget(archetype: string, roll: number): PitchTargetIntent {
  const table = EARLY_COUNT_WEIGHTS[archetype] ?? EARLY_COUNT_WEIGHTS.default;
  const hit = table.find(([cutoff]) => roll < cutoff);
  return hit ? hit[1] : 'bury_offspeed';
}

/** Independently picks the AI pitcher's target intent from count and club archetype. */
export function chooseAiPitchTarget(
  rng: SeededRng,
  session: GameSessionState,
): PitchTargetIntent {
  const fielding = getFieldingSide(session);
  const roll = rng.next();

  if (session.balls >= 2 && session.balls > session.strikes) {
    return roll < 0.76 ? 'attack_zone' : 'paint_corners';
  }
  if (session.strikes === 2) {
    return pickTwoStrikeTarget(session.balls, roll);
  }
  return pickEarlyCountTarget(fielding.aiArchetype, roll);
}

function shouldAiSacBunt(rng: SeededRng, session: GameSessionState): boolean {
  if (session.outs >= 2 || session.strikes >= 2) return false;
  const hasSacRunner = Boolean(session.bases[0] || session.bases[1]) && !session.bases[2];
  if (!hasSacRunner) return false;
  const batting = getBattingSide(session);
  const fielding = getFieldingSide(session);
  if (Math.abs(batting.score - fielding.score) > 2) return false;
  const batter = getCurrentBatter(session);
  if (batter.ratings.bunt < 66 || batter.ratings.power > 58) return false;
  const chance = batting.aiArchetype === 'speed_demons' ? 0.22 : 0.1;
  return rng.chance(chance);
}

function isPowerSwingSpot(session: GameSessionState): boolean {
  if (session.balls < 2 || session.strikes > 1) return false;
  const batting = getBattingSide(session);
  return getCurrentBatter(session).ratings.power >= 70 || batting.aiArchetype === 'mashers';
}

function pickAiSwingApproach(rng: SeededRng, session: GameSessionState): TacticalCall {
  if (session.strikes === 2) {
    return rng.chance(0.55) ? 'contact' : 'normal';
  }
  if (isPowerSwingSpot(session)) {
    return rng.chance(0.45) ? 'power' : 'normal';
  }
  const batting = getBattingSide(session);
  if (batting.aiArchetype === 'speed_demons' && getCurrentBatter(session).ratings.contact >= 65) {
    return rng.chance(0.32) ? 'contact' : 'normal';
  }
  return 'normal';
}

/** Independently picks the AI batter's tactical approach (steal, rare sac bunt, contact/power/normal). */
export function chooseAiBattingCall(
  rng: SeededRng,
  session: GameSessionState,
): TacticalCall {
  const batting = getBattingSide(session);
  const fielding = getFieldingSide(session);
  const aiSteal = shouldAiAttemptSteal(rng, {
    bases: session.bases,
    playersById: batting.playersById,
    pitcher: getCurrentPitcher(session),
    catcher: getDefenderAtPosition(fielding, 'C'),
    outs: session.outs,
    scoreDiff: batting.score - fielding.score,
    aiArchetype: batting.aiArchetype,
    pitcherFatigue: fielding.pitcherFatigue,
    catcherPopTimeBonus: fielding.catcherPopTimeBonus,
  });
  if (aiSteal) return aiSteal === 'steal_2b' ? 'steal' : aiSteal;
  if (shouldAiSacBunt(rng, session)) return 'bunt';
  return pickAiSwingApproach(rng, session);
}

function resolveHumanBattingInputs(
  session: GameSessionState,
  human: HumanLiveSelections,
  rng: SeededRng,
  extra?: { weatherImpact?: WeatherSimulationImpact; nemesisBonus?: NemesisMatchupEvaluation },
): { tacticalCall: TacticalCall; options: StepPitchOptions } {
  const batter = getCurrentBatter(session);
  const ownsPower = Boolean(
    human.armedPowerId &&
      getActivatablePowersForPlayer(batter, 'batter').some((p) => p.id === human.armedPowerId),
  );
  return {
    tacticalCall: isOffensiveTacticalCall(human.tacticalCall) ? human.tacticalCall : 'normal',
    options: {
      defensiveShift: chooseAiDefensiveShift(session),
      pitchTarget: chooseAiPitchTarget(rng, session),
      requestedPitchType: undefined,
      batterGuess: human.batterGuess,
      requestedPowerId: ownsPower ? (human.armedPowerId ?? undefined) : undefined,
      weatherImpact: extra?.weatherImpact,
      nemesisBonus: extra?.nemesisBonus,
      arcadeTiming: human.arcadeTimingGrade
        ? { actor: 'batter', grade: human.arcadeTimingGrade }
        : undefined,
      stealDefenseCall: 'normal',
      bullpenMode: human.bullpenMode,
      enforceSideOwnership: true,
    },
  };
}

function resolveOwnedPitchType(
  session: GameSessionState,
  selectedPitchType: PitchType | null,
): PitchType | undefined {
  if (!selectedPitchType) return undefined;
  const pitcher = getCurrentPitcher(session);
  const owns = pitcher.pitchArsenal?.repertoire.some((s) => s.pitchType === selectedPitchType);
  return owns ? selectedPitchType : undefined;
}

function resolveOwnedPitcherPower(
  session: GameSessionState,
  armedPowerId: string | null,
): string | undefined {
  if (!armedPowerId) return undefined;
  const pitcher = getCurrentPitcher(session);
  const owns = getActivatablePowersForPlayer(pitcher, 'pitcher').some((p) => p.id === armedPowerId);
  return owns ? armedPowerId : undefined;
}

function resolveHumanPitchPlan(
  session: GameSessionState,
  human: HumanLiveSelections,
): { pitchTarget: PitchTargetIntent; requestedPitchType?: PitchType } {
  if (human.pitchingMode === 'simple') {
    const catcherCall = getCatcherCall(session, human.shakeOffCount ?? 0);
    return {
      pitchTarget: catcherCall.target,
      requestedPitchType: catcherCall.pitchType,
    };
  }
  if (human.pitchingMode === 'normal') {
    return {
      pitchTarget: human.pitchTarget,
      requestedPitchType: undefined,
    };
  }
  return {
    pitchTarget: human.pitchTarget,
    requestedPitchType: resolveOwnedPitchType(session, human.selectedPitchType),
  };
}

function resolveHumanPitchingInputs(
  session: GameSessionState,
  human: HumanLiveSelections,
  rng: SeededRng,
  extra?: { weatherImpact?: WeatherSimulationImpact; nemesisBonus?: NemesisMatchupEvaluation },
): { tacticalCall: TacticalCall; options: StepPitchOptions } {
  const isPrePitchDefense =
    human.tacticalCall === 'intentional_walk' || human.tacticalCall === 'pitchout';
  const stealDefenseCall =
    human.tacticalCall === 'hold_runner' || human.tacticalCall === 'pitchout'
      ? human.tacticalCall
      : 'normal';
  const pitchPlan = resolveHumanPitchPlan(session, human);

  return {
    tacticalCall: isPrePitchDefense ? human.tacticalCall : chooseAiBattingCall(rng, session),
    options: {
      defensiveShift: human.defensiveShift,
      pitchTarget: pitchPlan.pitchTarget,
      requestedPitchType: pitchPlan.requestedPitchType,
      batterGuess: 'none',
      requestedPowerId: resolveOwnedPitcherPower(session, human.armedPowerId),
      weatherImpact: extra?.weatherImpact,
      nemesisBonus: extra?.nemesisBonus,
      arcadeTiming: human.arcadeTimingGrade
        ? { actor: 'pitcher', grade: human.arcadeTimingGrade }
        : undefined,
      stealDefenseCall,
      bullpenMode: human.bullpenMode,
      relieverWarmupControlBonus: human.relieverWarmupControlBonus,
      enforceSideOwnership: true,
    },
  };
}

/** Strictly scopes human UI selections to the side the human currently owns while the AI acts independently. */
export function resolveIsolatedStepInputs(
  session: GameSessionState,
  human: HumanLiveSelections,
  rng: SeededRng,
  extra?: { weatherImpact?: WeatherSimulationImpact; nemesisBonus?: NemesisMatchupEvaluation },
): { tacticalCall: TacticalCall; options: StepPitchOptions } {
  const batting = getBattingSide(session);
  if (batting.isHuman) {
    return resolveHumanBattingInputs(session, human, rng, extra);
  }
  return resolveHumanPitchingInputs(session, human, rng, extra);
}
