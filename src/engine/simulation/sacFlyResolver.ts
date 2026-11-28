import type { FieldPosition } from '../handedness/types';
import type { AtBatOutcome, PlayEvent, PlaySoundCue } from '../models/playEvent';
import type { BattedBallType, Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { computeContestLuckDelta, computeEffectiveLuck } from '../rpg/luckFactor';
import type { BaseState } from './gameState';

export type FlyBallDepth = 'shallow' | 'medium' | 'deep';

export interface SacFlyTagUpInput {
  depth: FlyBallDepth;
  runnerSpeed: number;
  outfielderArm: number;
  catcherFielding?: number;
  targetBase?: 'home' | 'third';
  runnerLuck?: number;
  outfielderLuck?: number;
}

export interface SacFlyTagUpOdds {
  attemptProb: number;
  safeProb: number;
  scoreOrAdvancePct: number;
  thrownOutPct: number;
  holdPct: number;
}

export interface AirOutTagUpInput {
  rng: SeededRng;
  batter: Pick<Player, 'name' | 'ratings'>;
  outs: number;
  bases: BaseState;
  battedBallType: BattedBallType;
  outfieldSpot: { pos: Exclude<FieldPosition, 'SP' | 'RP'>; x: number; z: number };
  outfielder: Pick<Player, 'id' | 'name' | 'ratings'>;
  effectiveArm: number;
  catcher?: Pick<Player, 'id' | 'name' | 'ratings'> | null;
  thirdBaseRunner: Pick<Player, 'id' | 'name' | 'ratings'> | null;
  secondBaseRunner: Pick<Player, 'id' | 'name' | 'ratings'> | null;
}

export interface AirOutTagUpResolution {
  kind: 'plate_complete';
  outcome: AtBatOutcome;
  outsAdded: 1 | 2;
  advanceOnOut: 'sac_fly' | 'sac_fly_out_home' | 'tag_up_2b' | 'tag_up_out_3b' | 'none';
  battedBallType: 'fly_ball';
  commentary: string;
  soundCue: PlaySoundCue;
  ballFlight: NonNullable<PlayEvent['ballFlight']>;
  fieldingHighlight: NonNullable<PlayEvent['fieldingHighlight']>;
}

const DEPTH_ATTEMPT_BASE: Readonly<Record<FlyBallDepth, { base: number; speedW: number; armW: number; min: number; max: number }>> = {
  deep: { base: 0.94, speedW: 0.002, armW: 0.002, min: 0.78, max: 0.99 },
  medium: { base: 0.72, speedW: 0.005, armW: 0.0045, min: 0.35, max: 0.94 },
  shallow: { base: 0.34, speedW: 0.006, armW: 0.004, min: 0.14, max: 0.65 },
};

const DEPTH_SAFE_BASE: Readonly<Record<FlyBallDepth, number>> = {
  deep: 0.9,
  medium: 0.68,
  shallow: 0.32,
};

const DEPTH_FLIGHT_SPEC: Readonly<Record<FlyBallDepth, { z: number; apexY: number; durationSec: number; label: string }>> = {
  deep: { z: -35, apexY: 12.5, durationSec: 1.45, label: 'deep' },
  medium: { z: -29, apexY: 10.5, durationSec: 1.25, label: 'medium' },
  shallow: { z: -22, apexY: 8.4, durationSec: 1.05, label: 'shallow' },
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Computes realistic tag-up attempt, safe, and thrown-out probabilities from depth, speed, and arm. */
export function evaluateSacFlyTagUp(input: SacFlyTagUpInput): SacFlyTagUpOdds {
  const attemptCfg = DEPTH_ATTEMPT_BASE[input.depth];
  const speedDelta = input.runnerSpeed - 60;
  const armDelta = input.outfielderArm - 60;
  const attemptProb = clampNumber(
    attemptCfg.base + speedDelta * attemptCfg.speedW - armDelta * attemptCfg.armW,
    attemptCfg.min,
    attemptCfg.max,
  );

  const catcherHandling = ((input.catcherFielding ?? 60) - 60) * 0.0015;
  const thirdBonus = input.targetBase === 'third' ? 0.06 : 0;
  const tagLuckShift =
    input.runnerLuck != null || input.outfielderLuck != null
      ? computeContestLuckDelta(input.runnerLuck ?? 50, input.outfielderLuck ?? 50, 0.02)
      : 0;
  const safeProb = clampNumber(
    DEPTH_SAFE_BASE[input.depth] +
      thirdBonus +
      speedDelta * 0.0065 -
      armDelta * 0.0072 -
      catcherHandling +
      tagLuckShift,
    0.08,
    0.97,
  );

  const scoreOrAdvancePct = Math.round(attemptProb * safeProb * 100);
  const thrownOutPct = Math.round(attemptProb * (1 - safeProb) * 100);
  const holdPct = Math.max(0, 100 - scoreOrAdvancePct - thrownOutPct);
  return { attemptProb, safeProb, scoreOrAdvancePct, thrownOutPct, holdPct };
}

/** Samples whether a caught air ball stays an infield pop-up or carries shallow/medium/deep into the outfield. */
export function sampleAirOutDepth(
  rng: SeededRng,
  battedBallType: BattedBallType,
  batterPower: number,
): FlyBallDepth | 'infield_pop' {
  if (battedBallType === 'pop_up') {
    return rng.next() < 0.24 ? 'shallow' : 'infield_pop';
  }
  if (battedBallType !== 'fly_ball') {
    return 'infield_pop';
  }
  const powerShift = clampNumber((batterPower - 60) * 0.0045, -0.15, 0.18);
  const deepProb = clampNumber(0.38 + powerShift, 0.18, 0.58);
  const mediumProb = 0.37;
  const roll = rng.next();
  if (roll < deepProb) return 'deep';
  if (roll < deepProb + mediumProb) return 'medium';
  return 'shallow';
}

function buildFlightForDepth(
  spotX: number,
  depth: FlyBallDepth,
): NonNullable<PlayEvent['ballFlight']> {
  const spec = DEPTH_FLIGHT_SPEC[depth];
  return {
    style: 'line_drive',
    landingX: spotX,
    landingZ: spec.z,
    apexY: spec.apexY,
    durationSec: spec.durationSec,
  };
}

function resolveThirdBaseTagUp(
  input: AirOutTagUpInput,
  depth: FlyBallDepth,
  runner: Pick<Player, 'id' | 'name' | 'ratings'>,
): AirOutTagUpResolution {
  const odds = evaluateSacFlyTagUp({
    depth,
    runnerSpeed: runner.ratings.speed,
    outfielderArm: input.effectiveArm,
    catcherFielding: input.catcher?.ratings.fielding,
    targetBase: 'home',
    runnerLuck: computeEffectiveLuck(runner),
    outfielderLuck: computeEffectiveLuck(input.outfielder),
  });
  const spec = DEPTH_FLIGHT_SPEC[depth];
  const ballFlight = buildFlightForDepth(input.outfieldSpot.x, depth);
  const fieldingHighlight: NonNullable<PlayEvent['fieldingHighlight']> = {
    fielderId: input.outfielder.id,
    fielderPos: input.outfieldSpot.pos,
    anim: 'field_run',
  };

  if (input.rng.next() >= odds.attemptProb) {
    return {
      kind: 'plate_complete',
      outcome: 'fly_out',
      outsAdded: 1,
      advanceOnOut: 'none',
      battedBallType: 'fly_ball',
      commentary: `${input.batter.name} lifts a ${spec.label} fly to ${input.outfieldSpot.pos} — ${runner.name} holds at third against ${input.outfielder.name}'s arm.`,
      soundCue: 'glove_pop',
      ballFlight,
      fieldingHighlight,
    };
  }

  if (input.rng.next() < odds.safeProb) {
    return {
      kind: 'plate_complete',
      outcome: 'sac_fly',
      outsAdded: 1,
      advanceOnOut: 'sac_fly',
      battedBallType: 'fly_ball',
      commentary: `${spec.label === 'deep' ? 'Deep' : spec.label === 'medium' ? 'Medium' : 'Gutsy shallow'} fly to ${input.outfieldSpot.pos} — ${runner.name} tags from third and beats ${input.outfielder.name}'s throw home on the sac fly!`,
      soundCue: 'glove_pop',
      ballFlight,
      fieldingHighlight,
    };
  }

  return {
    kind: 'plate_complete',
    outcome: 'fly_out',
    outsAdded: 2,
    advanceOnOut: 'sac_fly_out_home',
    battedBallType: 'fly_ball',
    commentary: `OUT AT HOME! ${runner.name} tags on the ${spec.label} fly to ${input.outfieldSpot.pos}, and ${input.outfielder.name} fires a bullet to the plate for the double play!`,
    soundCue: 'double_play_snap',
    ballFlight,
    fieldingHighlight,
  };
}

function resolveSecondBaseTagUp(
  input: AirOutTagUpInput,
  depth: FlyBallDepth,
  runner: Pick<Player, 'id' | 'name' | 'ratings'>,
): AirOutTagUpResolution | null {
  if (depth === 'shallow') return null;
  const odds = evaluateSacFlyTagUp({
    depth,
    runnerSpeed: runner.ratings.speed,
    outfielderArm: input.effectiveArm,
    targetBase: 'third',
  });
  const spec = DEPTH_FLIGHT_SPEC[depth];
  const ballFlight = buildFlightForDepth(input.outfieldSpot.x, depth);
  const fieldingHighlight: NonNullable<PlayEvent['fieldingHighlight']> = {
    fielderId: input.outfielder.id,
    fielderPos: input.outfieldSpot.pos,
    anim: 'field_run',
  };

  if (input.rng.next() >= odds.attemptProb) {
    return null;
  }
  if (input.rng.next() < odds.safeProb) {
    return {
      kind: 'plate_complete',
      outcome: 'fly_out',
      outsAdded: 1,
      advanceOnOut: 'tag_up_2b',
      battedBallType: 'fly_ball',
      commentary: `${input.batter.name} flies out to ${spec.label} ${input.outfieldSpot.pos} — ${runner.name} tags up and slides into third!`,
      soundCue: 'glove_pop',
      ballFlight,
      fieldingHighlight,
    };
  }
  return {
    kind: 'plate_complete',
    outcome: 'fly_out',
    outsAdded: 2,
    advanceOnOut: 'tag_up_out_3b',
    battedBallType: 'fly_ball',
    commentary: `GUNNED DOWN AT THIRD! ${input.outfielder.name} fires a strike from ${input.outfieldSpot.pos} to nail ${runner.name} tagging up for the double play!`,
    soundCue: 'double_play_snap',
    ballFlight,
    fieldingHighlight,
  };
}

/** Resolves sacrifice fly / shallow-OF pop-up tag-ups, holds, and outfield-assist double plays. */
export function resolveAirOutWithTagUp(input: AirOutTagUpInput): AirOutTagUpResolution | null {
  if (input.outs >= 2) return null;
  if (!input.thirdBaseRunner && !input.secondBaseRunner) return null;
  const depth = sampleAirOutDepth(input.rng, input.battedBallType, input.batter.ratings.power);
  if (depth === 'infield_pop') return null;
  if (input.thirdBaseRunner) {
    return resolveThirdBaseTagUp(input, depth, input.thirdBaseRunner);
  }
  return input.secondBaseRunner ? resolveSecondBaseTagUp(input, depth, input.secondBaseRunner) : null;
}
