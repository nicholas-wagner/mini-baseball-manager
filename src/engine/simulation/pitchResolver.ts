import {
  evaluatePlatoonMatchup,
  getPositionalHandednessBonus,
} from '../handedness/handedness';
import type { FieldPosition } from '../handedness/types';
import { getActiveHealthRatingPenalties } from '../health/healthEngine';
import type {
  AtBatOutcome,
  PlayEvent,
  PlaySoundCue,
  TacticalCall,
} from '../models/playEvent';
import {
  PITCH_TYPE_SHORT_LABELS,
  type BattedBallType,
  type PitchType,
  type Player,
} from '../models/player';
import { getNationalityById } from '../nationalities/pickNationality';
import type { SeededRng } from '../rng/seededRng';
import { evaluateVeteranSavvyEdge } from '../rpg/careerExperience';
import {
  evaluateCoEdPlayerTraitEffect,
  type CoEdClubhouseSynergy,
} from '../rpg/coEdArchetypes';
import { getFormStatModifiers } from '../rpg/formTracker';
import { evaluateHeritageCombatBonuses } from '../rpg/heritageTrees';
import { evaluatePressureAndLuckModifiers } from '../rpg/mentalAndLeverage';
import {
  evaluatePitchMatchup,
  selectPitchForCount,
  type PitchMatchupEvaluation,
} from '../rpg/pitchArsenals';
import {
  evaluatePitcherEnduranceEffect,
  fatigueToEndurance,
} from '../rpg/pitcherEndurance';
import { evaluatePitcherRoleSituation } from '../rpg/pitcherRoles';
import { computeSkillTreeCombatBonuses } from '../rpg/skillTrees';
import { evaluatePositionAssignment } from '../rpg/specialistsAndPositions';
import type { BaseState } from './gameState';
import { sampleBattedBallType } from './sabermetrics';

export interface PitchResolution {
  kind: 'pitch_event' | 'plate_complete' | 'steal_attempt';
  outcome: AtBatOutcome;
  totalBases?: 1 | 2 | 3 | 4;
  outsAdded: number;
  runnerId?: string;
  advanceOnOut?: 'sac_fly' | 'double_play' | 'none';
  stealSuccess?: boolean;
  commentary: string;
  soundCue: PlaySoundCue;
  ballFlight?: PlayEvent['ballFlight'];
  fieldingHighlight?: PlayEvent['fieldingHighlight'];
  specialPowerTriggered?: PlayEvent['specialPowerTriggered'];
  pitchThrown?: PlayEvent['pitchThrown'];
  battedBallType?: BattedBallType;
}

interface TacticalModifiers {
  contactMod: number;
  powerMod: number;
  swingMod: number;
  chaseMod: number;
}

const TACTICAL_CONFIG: Readonly<Record<TacticalCall, TacticalModifiers>> = {
  normal: { contactMod: 0, powerMod: 0, swingMod: 0, chaseMod: 0 },
  contact: { contactMod: 9, powerMod: -10, swingMod: 0.06, chaseMod: -0.05 },
  power: { contactMod: -8, powerMod: 12, swingMod: 0.08, chaseMod: 0.06 },
  bunt: { contactMod: 4, powerMod: -20, swingMod: 0, chaseMod: 0 },
  steal: { contactMod: 0, powerMod: 0, swingMod: 0, chaseMod: 0 },
  intentional_walk: { contactMod: 0, powerMod: 0, swingMod: 0, chaseMod: 0 },
};

const OUTFIELD_SPOTS: readonly {
  pos: Exclude<FieldPosition, 'SP' | 'RP'>;
  x: number;
  z: number;
}[] = [
  { pos: 'LF', x: -15, z: -27 },
  { pos: 'CF', x: 0, z: -32 },
  { pos: 'RF', x: 15, z: -27 },
];

const INFIELD_SPOTS: readonly {
  pos: Exclude<FieldPosition, 'SP' | 'RP'>;
  x: number;
  z: number;
}[] = [
  { pos: '3B', x: -8.6, z: -11.2 },
  { pos: 'SS', x: -4.5, z: -17.2 },
  { pos: '2B', x: 4.5, z: -17.2 },
  { pos: '1B', x: 8.6, z: -11.2 },
];

function clampProb(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildHeritagePowerTrigger(
  player: Player,
  actor: 'pitcher' | 'batter',
): PlayEvent['specialPowerTriggered'] {
  const heritage = getNationalityById(player.nationalityId).heritageAbility;
  return {
    actor,
    powerId: heritage.id,
    calloutText: `${heritage.calloutText} (${heritage.name})`,
    vfxColor: heritage.vfxColor,
  };
}

function resolveStealAttempt(
  rng: SeededRng,
  runner: Player,
  pitcher: Player,
  catcher: Player,
): PitchResolution {
  const holdBonus = getPositionalHandednessBonus(pitcher.position, pitcher.throws).pickoffHoldBonus;
  const stealProb = clampProb(
    0.6 + (runner.ratings.speed - catcher.ratings.arm) * 0.0055 - holdBonus * 0.015,
    0.22,
    0.88,
  );
  const success = rng.chance(stealProb);
  return {
    kind: 'steal_attempt',
    outcome: 'ball',
    outsAdded: success ? 0 : 1,
    runnerId: runner.id,
    stealSuccess: success,
    commentary: success
      ? `${runner.name} swipes second base with a dusty slide!`
      : `${catcher.name} fires a laser to nail ${runner.name} trying to steal!`,
    soundCue: success ? 'dirt_slide' : 'glove_pop',
    fieldingHighlight: {
      fielderId: catcher.id,
      fielderPos: 'C',
      anim: success ? 'field_run' : 'field_dive',
    },
  };
}

function resolveBuntAttempt(
  rng: SeededRng,
  batter: Player,
  pitcher: Player,
  firstBaseBonus: number,
  sideX: number,
): PitchResolution {
  const buntScore = batter.ratings.bunt + firstBaseBonus * 2 - pitcher.ratings.fielding * 0.25;
  const hitProb = clampProb(0.24 + (buntScore - 55) * 0.006, 0.14, 0.56);
  const isSingle = rng.chance(hitProb);

  return {
    kind: 'plate_complete',
    outcome: isSingle ? 'bunt_single' : 'bunt_out',
    totalBases: isSingle ? 1 : undefined,
    outsAdded: isSingle ? 0 : 1,
    advanceOnOut: 'none',
    commentary: isSingle
      ? `${batter.name} lays down a sneaky bunt and beats the throw!`
      : `${batter.name} squares to bunt and is thrown out at first.`,
    soundCue: 'bunt_tap',
    ballFlight: {
      style: 'ninja_bunt',
      landingX: sideX * 4.8,
      landingZ: -6.4,
      apexY: 1.3,
      durationSec: 1.0,
    },
  };
}

function resolveHitType(
  rng: SeededRng,
  batter: Player,
  effPower: number,
  defender: Player,
  battedBallType: BattedBallType,
): PitchResolution {
  const hrMult = battedBallType === 'fly_ball' ? 1.55 : battedBallType === 'line_drive' ? 0.9 : 0.08;
  const gapBonus = (batter.ratings.gapPower - 60) * 0.0024;
  const hrChance = clampProb((0.11 + (effPower - 60) * 0.0038) * hrMult, 0.01, 0.42);
  const tripleChance = clampProb(0.045 + (batter.ratings.speed - 65) * 0.002 + gapBonus * 0.4, 0.015, 0.12);
  const doubleChance = clampProb(
    0.22 + (effPower - 60) * 0.0018 + gapBonus + (battedBallType === 'line_drive' ? 0.08 : 0),
    0.12,
    0.38,
  );
  const roll = rng.next();
  const ofSpot = rng.pick(OUTFIELD_SPOTS);

  if (roll < hrChance) {
    return {
      kind: 'plate_complete',
      outcome: 'home_run',
      totalBases: 4,
      outsAdded: 0,
      battedBallType: 'fly_ball',
      commentary: `MOONSHOT! ${batter.name} blasts one out to deep ${ofSpot.pos}!`,
      soundCue: 'bomb_crack',
      ballFlight: {
        style: 'moonshot_hr',
        landingX: ofSpot.x * 1.15,
        landingZ: -46,
        apexY: 18,
        durationSec: 1.85,
      },
      fieldingHighlight: {
        fielderId: defender.id,
        fielderPos: ofSpot.pos,
        anim: 'field_high_jump',
      },
    };
  }

  if (roll < hrChance + tripleChance) {
    return {
      kind: 'plate_complete',
      outcome: 'triple',
      totalBases: 3,
      outsAdded: 0,
      battedBallType,
      commentary: `Off the wall! ${batter.name} motors all the way to third!`,
      soundCue: 'bat_crack',
      ballFlight: {
        style: 'line_drive',
        landingX: ofSpot.x * 1.1,
        landingZ: -36,
        apexY: 6.5,
        durationSec: 1.25,
      },
    };
  }

  if (roll < hrChance + tripleChance + doubleChance) {
    return {
      kind: 'plate_complete',
      outcome: 'double',
      totalBases: 2,
      outsAdded: 0,
      battedBallType,
      commentary: `${batter.name} laces a gap double!`,
      soundCue: 'bat_crack',
      ballFlight: {
        style: 'line_drive',
        landingX: ofSpot.x * 0.85,
        landingZ: -29,
        apexY: 5.2,
        durationSec: 1.1,
      },
    };
  }

  return {
    kind: 'plate_complete',
    outcome: 'single',
    totalBases: 1,
    outsAdded: 0,
    battedBallType,
    commentary: `${batter.name} pokes a clean base hit into the outfield!`,
    soundCue: 'bat_crack',
    ballFlight: {
      style: 'line_drive',
      landingX: ofSpot.x * 0.6,
      landingZ: -21,
      apexY: 3.4,
      durationSec: 0.9,
    },
  };
}

interface SimpleOutPreset {
  outcome: AtBatOutcome;
  suffix: string;
  outfield: boolean;
  apexY: number;
  durationSec: number;
  anim: 'field_run' | 'field_dive';
}

const SIMPLE_OUT_PRESETS: Readonly<Record<BattedBallType, SimpleOutPreset>> = {
  pop_up: {
    outcome: 'fly_out',
    suffix: 'skies a shallow pop-up in the infield.',
    outfield: false,
    apexY: 14,
    durationSec: 1.25,
    anim: 'field_run',
  },
  fly_ball: {
    outcome: 'fly_out',
    suffix: 'lifts a routine fly ball for an out.',
    outfield: true,
    apexY: 10,
    durationSec: 1.25,
    anim: 'field_run',
  },
  line_drive: {
    outcome: 'line_out',
    suffix: 'rockets a line drive right into a glove!',
    outfield: false,
    apexY: 2.3,
    durationSec: 0.78,
    anim: 'field_dive',
  },
  ground_ball: {
    outcome: 'ground_out',
    suffix: 'grounds out cleanly.',
    outfield: false,
    apexY: 2.3,
    durationSec: 0.78,
    anim: 'field_run',
  },
};

function buildSimpleOut(
  rng: SeededRng,
  batter: Player,
  defender: Player,
  battedBallType: BattedBallType,
): PitchResolution {
  const preset = SIMPLE_OUT_PRESETS[battedBallType];
  const spot = preset.outfield ? rng.pick(OUTFIELD_SPOTS) : rng.pick(INFIELD_SPOTS);
  return {
    kind: 'plate_complete',
    outcome: preset.outcome,
    outsAdded: 1,
    advanceOnOut: 'none',
    battedBallType,
    commentary: `${batter.name} ${preset.suffix}`,
    soundCue: 'glove_pop',
    ballFlight: {
      style: 'line_drive',
      landingX: spot.x,
      landingZ: spot.z,
      apexY: preset.apexY,
      durationSec: preset.durationSec,
    },
    fieldingHighlight: {
      fielderId: defender.id,
      fielderPos: spot.pos,
      anim: preset.anim,
    },
  };
}

function resolveOutOrError(
  rng: SeededRng,
  batter: Player,
  outs: number,
  bases: BaseState,
  defender: Player,
  defenderPos: Exclude<FieldPosition, 'SP' | 'RP'>,
  luckErrorMultiplier: number,
  battedBallType: BattedBallType,
): PitchResolution {
  const posEval = evaluatePositionAssignment(defender, defenderPos);
  const effectiveFielding = defender.ratings.fielding + posEval.fieldingDelta;
  const errorProb = clampProb(
    (0.055 - (effectiveFielding - 60) * 0.0006) * posEval.errorMultiplier * luckErrorMultiplier,
    0.012,
    0.16,
  );
  if (rng.chance(errorProb)) {
    const inf = rng.pick(INFIELD_SPOTS);
    return {
      kind: 'plate_complete',
      outcome: 'fielding_error',
      totalBases: 1,
      outsAdded: 0,
      battedBallType,
      commentary: `Booted it! ${batter.name} reaches on an infield error.`,
      soundCue: 'error_bonk',
      ballFlight: { style: 'line_drive', landingX: inf.x, landingZ: inf.z, apexY: 2.0, durationSec: 0.8 },
      fieldingHighlight: { fielderId: defender.id, fielderPos: inf.pos, anim: 'field_dive' },
    };
  }

  const dpChance = battedBallType === 'ground_ball' ? 0.36 : 0.1;
  if (outs < 2 && bases[0] !== null && rng.chance(dpChance)) {
    const dpSpot = rng.pick(INFIELD_SPOTS);
    return {
      kind: 'plate_complete',
      outcome: 'double_play',
      outsAdded: 2,
      advanceOnOut: 'double_play',
      battedBallType: 'ground_ball',
      commentary: `Around the horn! ${batter.name} grounds into a 6-4-3 double play.`,
      soundCue: 'double_play_snap',
      ballFlight: { style: 'line_drive', landingX: dpSpot.x, landingZ: dpSpot.z, apexY: 1.8, durationSec: 0.78 },
      fieldingHighlight: { fielderId: defender.id, fielderPos: dpSpot.pos, anim: 'field_run' },
    };
  }

  const armSuppress = (defender.ratings.arm - 65) * 0.0025;
  const sacChance = battedBallType === 'fly_ball' ? clampProb(0.34 - armSuppress, 0.14, 0.48) : 0.08;
  if (outs < 2 && bases[2] !== null && rng.chance(sacChance)) {
    const ofSpot = rng.pick(OUTFIELD_SPOTS);
    return {
      kind: 'plate_complete',
      outcome: 'sac_fly',
      outsAdded: 1,
      advanceOnOut: 'sac_fly',
      battedBallType: 'fly_ball',
      commentary: `Deep fly ball — caught, and the runner tags from third on a sac fly!`,
      soundCue: 'glove_pop',
      ballFlight: { style: 'line_drive', landingX: ofSpot.x, landingZ: ofSpot.z, apexY: 11.5, durationSec: 1.4 },
      fieldingHighlight: { fielderId: defender.id, fielderPos: ofSpot.pos, anim: 'field_run' },
    };
  }

  return buildSimpleOut(rng, batter, defender, battedBallType);
}

export interface PitchResolverContext {
  rng: SeededRng;
  batter: Player;
  pitcher: Player;
  catcher: Player;
  defender: Player;
  defenderPos: Exclude<FieldPosition, 'SP' | 'RP'>;
  firstBaseRunner: Player | null;
  balls: number;
  strikes: number;
  outs: number;
  inning: number;
  pitchingLead: number;
  bases: BaseState;
  pitcherFatigue: number;
  battingHype: number;
  fieldingHype: number;
  canBatterTriggerSpecial: boolean;
  canPitcherTriggerSpecial: boolean;
  leverageIndex: number;
  tacticalCall: TacticalCall;
  atBatPitchHistory: readonly PitchType[];
  requestedPitchType?: PitchType;
  battingCoEdSynergy?: CoEdClubhouseSynergy;
  fieldingCoEdSynergy?: CoEdClubhouseSynergy;
}

const BATTED_BALL_BABIP_SHIFT: Readonly<Record<BattedBallType, number>> = {
  line_drive: 0.16,
  ground_ball: -0.02,
  fly_ball: -0.03,
  pop_up: -0.22,
};

function resolveContactResult(
  ctx: PitchResolverContext,
  effContact: number,
  effPower: number,
  effStuff: number,
  firstBaseStepBonus: number,
  luckHitShift: number,
  defenderLuckErrMult: number,
  pitchType: PitchType,
  gbRateShift: number,
): PitchResolution {
  const fatiguedPitcherProfile = {
    ...ctx.pitcher.battedBallProfile,
    gbRateBias: Math.max(-16, ctx.pitcher.battedBallProfile.gbRateBias + gbRateShift),
  };
  const battedBallType = sampleBattedBallType(
    ctx.rng,
    ctx.batter.battedBallProfile,
    fatiguedPitcherProfile,
    pitchType,
  );
  const rangeSuppress = (ctx.defender.ratings.range - 62) * 0.0018;
  const hitProb = clampProb(
    0.295 +
      (effContact - effStuff) * 0.0044 +
      firstBaseStepBonus * 0.008 +
      luckHitShift +
      BATTED_BALL_BABIP_SHIFT[battedBallType] -
      rangeSuppress,
    0.04,
    0.66,
  );
  if (ctx.rng.chance(hitProb)) {
    const hit = resolveHitType(ctx.rng, ctx.batter, effPower, ctx.defender, battedBallType);
    if (ctx.canBatterTriggerSpecial) {
      hit.specialPowerTriggered = buildHeritagePowerTrigger(ctx.batter, 'batter');
    }
    return hit;
  }
  return resolveOutOrError(
    ctx.rng,
    ctx.batter,
    ctx.outs,
    ctx.bases,
    ctx.defender,
    ctx.defenderPos,
    defenderLuckErrMult,
    battedBallType,
  );
}

function resolveCalledStrikeOrOut(strikes: number, batterName: string): PitchResolution {
  const isK = strikes >= 2;
  return {
    kind: isK ? 'plate_complete' : 'pitch_event',
    outcome: isK ? 'strikeout' : 'called_strike',
    outsAdded: isK ? 1 : 0,
    commentary: isK ? `${batterName} is caught looking for strike three!` : 'Painted the corner for a called strike.',
    soundCue: isK ? 'strikeout_punch' : 'glove_pop',
  };
}

function resolveSwingingStrikeOrOut(strikes: number, batterName: string): PitchResolution {
  const isK = strikes >= 2;
  return {
    kind: isK ? 'plate_complete' : 'pitch_event',
    outcome: isK ? 'strikeout' : 'swinging_strike',
    outsAdded: isK ? 1 : 0,
    commentary: isK ? `${batterName} whiffs on strike three!` : 'Big swing and a miss!',
    soundCue: isK ? 'strikeout_punch' : 'pitch_whoosh',
  };
}

function resolveBallOrWalk(balls: number, batterName: string): PitchResolution {
  const isWalk = balls >= 3;
  return {
    kind: isWalk ? 'plate_complete' : 'pitch_event',
    outcome: isWalk ? 'walk' : 'ball',
    outsAdded: 0,
    commentary: isWalk ? `${batterName} draws a patient four-ball walk.` : 'Outside the zone for a ball.',
    soundCue: 'glove_pop',
  };
}

function evaluateSwingResult(
  ctx: PitchResolverContext,
  inZone: boolean,
  effContact: number,
  effPower: number,
  effStuff: number,
  firstBaseStepBonus: number,
  luckHitShift: number,
  defenderLuckErrMult: number,
  pitchType: PitchType,
  gbRateShift: number,
): PitchResolution {
  const contactProb = inZone
    ? clampProb(0.76 + (effContact - effStuff) * 0.0048, 0.48, 0.94)
    : clampProb(0.48 + (effContact - effStuff) * 0.0032, 0.25, 0.74);

  if (!ctx.rng.chance(contactProb)) {
    const whiff = resolveSwingingStrikeOrOut(ctx.strikes, ctx.batter.name);
    if (whiff.outcome === 'strikeout' && ctx.canPitcherTriggerSpecial) {
      whiff.specialPowerTriggered = buildHeritagePowerTrigger(ctx.pitcher, 'pitcher');
    }
    return whiff;
  }

  const foulRate = inZone ? 0.31 : 0.62;
  if (ctx.rng.chance(foulRate)) {
    return {
      kind: 'pitch_event',
      outcome: 'foul',
      outsAdded: 0,
      commentary: `${ctx.batter.name} fouls one back into the screen.`,
      soundCue: 'foul_clank',
    };
  }

  return resolveContactResult(
    ctx,
    effContact,
    effPower,
    effStuff,
    firstBaseStepBonus,
    luckHitShift,
    defenderLuckErrMult,
    pitchType,
    gbRateShift,
  );
}

function countTrailingPitchRepeats(
  history: readonly PitchType[],
  pitchType: PitchType,
): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i] !== pitchType) break;
    count += 1;
  }
  return count;
}

function attachPitchTelemetry(
  res: PitchResolution,
  matchup: PitchMatchupEvaluation,
): PitchResolution {
  const pitchTag = `${matchup.mph} mph ${PITCH_TYPE_SHORT_LABELS[matchup.pitchType]}`;
  return {
    ...res,
    commentary: `${pitchTag} — ${res.commentary}`,
    pitchThrown: {
      pitchType: matchup.pitchType,
      mph: matchup.mph,
      isFavoritePitch: matchup.isFavoritePitch,
      isWeakPitchForPitcher: matchup.isWeakPitchForPitcher,
      batterAffinity: matchup.batterAffinity,
    },
  };
}

const ZERO_SYNERGY_DELTAS = {
  contactDelta: 0,
  powerDelta: 0,
  eyeDelta: 0,
  velocityDelta: 0,
  movementDelta: 0,
  controlDelta: 0,
};

function computeCoEdPitchDeltas(ctx: PitchResolverContext, pitchType: PitchType) {
  const hasRisp = Boolean(ctx.bases[1] || ctx.bases[2]);
  const batterFx = evaluateCoEdPlayerTraitEffect(ctx.batter, {
    leverageIndex: ctx.leverageIndex,
    hasRisp,
  });
  const pitcherFx = evaluateCoEdPlayerTraitEffect(ctx.pitcher, {
    leverageIndex: ctx.leverageIndex,
    hasRisp,
    pitchType,
  });
  const batSyn = ctx.battingCoEdSynergy ?? ZERO_SYNERGY_DELTAS;
  const fldSyn = ctx.fieldingCoEdSynergy ?? ZERO_SYNERGY_DELTAS;
  return {
    contactDelta: batterFx.contactDelta + batSyn.contactDelta,
    powerDelta: batterFx.powerDelta + batSyn.powerDelta,
    eyeDelta: batterFx.eyeDelta + batSyn.eyeDelta,
    stuffDelta: pitcherFx.movementDelta + (fldSyn.velocityDelta + fldSyn.movementDelta) * 0.5,
    controlDelta: pitcherFx.controlDelta + fldSyn.controlDelta,
    chaseRateDelta: batterFx.chaseRateDelta,
    breakingHangScale: pitcherFx.breakingHangScale,
  };
}

/** Resolves a single baseball pitch or tactical action cleanly from seeded state. */
export function resolveSinglePitch(ctx: PitchResolverContext): PitchResolution {
  if (ctx.tacticalCall === 'intentional_walk') {
    return {
      kind: 'plate_complete',
      outcome: 'walk',
      outsAdded: 0,
      commentary: `Pitching coach flashes four fingers — ${ctx.batter.name} takes first intentionally.`,
      soundCue: 'ui_pop',
    };
  }
  if (ctx.tacticalCall === 'steal' && ctx.firstBaseRunner) {
    return resolveStealAttempt(ctx.rng, ctx.firstBaseRunner, ctx.pitcher, ctx.catcher);
  }

  const platoon = evaluatePlatoonMatchup(ctx.batter.bats, ctx.pitcher.throws);
  if (ctx.tacticalCall === 'bunt') {
    const boxSide = platoon.effectiveBatSide === 'L' ? 1 : -1;
    return resolveBuntAttempt(ctx.rng, ctx.batter, ctx.pitcher, platoon.firstBaseStepBonus, boxSide);
  }

  const pitchType = selectPitchForCount(
    ctx.rng,
    ctx.pitcher,
    ctx.batter,
    ctx.balls,
    ctx.strikes,
    ctx.atBatPitchHistory,
    ctx.requestedPitchType,
  );
  const repeatCount = countTrailingPitchRepeats(ctx.atBatPitchHistory, pitchType);
  const pitchMatchup = evaluatePitchMatchup(ctx.pitcher, ctx.batter, pitchType, repeatCount);
  const enduranceFx = evaluatePitcherEnduranceEffect(
    fatigueToEndurance(ctx.pitcherFatigue),
    pitchType,
  );
  const adjustedMatchup: PitchMatchupEvaluation = {
    ...pitchMatchup,
    mph: Math.max(58, pitchMatchup.mph + enduranceFx.mphDrop),
  };

  const mod = TACTICAL_CONFIG[ctx.tacticalCall];
  const batterForm = getFormStatModifiers(ctx.batter.formState);
  const pitcherForm = getFormStatModifiers(ctx.pitcher.formState);
  const batterMental = evaluatePressureAndLuckModifiers(ctx.batter, ctx.leverageIndex);
  const pitcherMental = evaluatePressureAndLuckModifiers(ctx.pitcher, ctx.leverageIndex);
  const defenderMental = evaluatePressureAndLuckModifiers(ctx.defender, ctx.leverageIndex);
  const batterSavvy = evaluateVeteranSavvyEdge(ctx.batter.careerService.experienceTier, ctx.leverageIndex);
  const pitcherSavvy = evaluateVeteranSavvyEdge(ctx.pitcher.careerService.experienceTier, ctx.leverageIndex);
  const batterSkills = computeSkillTreeCombatBonuses(ctx.batter);
  const pitcherSkills = computeSkillTreeCombatBonuses(ctx.pitcher);
  const batterHeritage = evaluateHeritageCombatBonuses(ctx.batter, ctx.leverageIndex);
  const pitcherHeritage = evaluateHeritageCombatBonuses(ctx.pitcher, ctx.leverageIndex);
  const coEd = computeCoEdPitchDeltas(ctx, pitchType);
  const batterHealth = getActiveHealthRatingPenalties(ctx.batter);
  const pitcherHealth = getActiveHealthRatingPenalties(ctx.pitcher);
  const pitcherPosEval = evaluatePositionAssignment(ctx.pitcher, ctx.pitcher.position);
  const pitcherRoleEval = evaluatePitcherRoleSituation(ctx.pitcher, {
    inning: ctx.inning,
    lead: ctx.pitchingLead,
    hasRunnersOn: ctx.bases.some((b) => b !== null),
    leverageIndex: ctx.leverageIndex,
    batterEffectiveSide: platoon.effectiveBatSide,
  });

  const effContact =
    ctx.batter.ratings.contact +
    batterHealth.contact +
    platoon.batterContactDelta +
    mod.contactMod +
    batterForm.contactDelta +
    pitchMatchup.batterContactDelta +
    batterMental.pressureRatingDelta +
    batterSavvy.composureDelta +
    batterSkills.battingContactDelta +
    batterHeritage.passiveBonus +
    batterHeritage.clutchBonus +
    coEd.contactDelta;
  const effPower =
    ctx.batter.ratings.power +
    batterHealth.power +
    platoon.batterPowerDelta +
    mod.powerMod +
    batterForm.powerDelta +
    pitchMatchup.batterPowerDelta +
    batterMental.pressureRatingDelta +
    batterSkills.battingPowerDelta +
    batterHeritage.clutchBonus +
    coEd.powerDelta;
  const effEye = ctx.batter.ratings.eye + batterHealth.eye + batterSavvy.eyeDelta + coEd.eyeDelta;
  const effStuff =
    (ctx.pitcher.ratings.velocity +
      pitcherHealth.velocity +
      ctx.pitcher.ratings.movement +
      pitcherHealth.movement) *
      0.5 +
    platoon.pitcherBreakDelta +
    pitcherForm.stuffDelta +
    pitchMatchup.pitcherStuffDelta +
    pitcherMental.pressureRatingDelta +
    pitcherSavvy.composureDelta +
    pitcherRoleEval.stuffDelta +
    pitcherSkills.pitchingStuffDelta +
    pitcherHeritage.passiveBonus +
    pitcherHeritage.clutchBonus +
    coEd.stuffDelta +
    Math.round(enduranceFx.breakDrop * coEd.breakingHangScale) +
    enduranceFx.mphDrop;
  const effControl =
    ctx.pitcher.ratings.control +
    pitcherHealth.control +
    pitcherForm.controlDelta +
    pitcherPosEval.controlDelta +
    pitchMatchup.pitcherControlDelta +
    pitcherMental.pressureRatingDelta +
    pitcherSavvy.controlDelta +
    pitcherRoleEval.controlDelta +
    pitcherSkills.pitchingControlDelta +
    coEd.controlDelta +
    enduranceFx.controlDrop;

  const luckZoneShift = pitcherMental.luckZoneProbDelta - batterMental.luckZoneProbDelta * 0.5;
  const luckHitShift = batterMental.luckHitProbDelta - pitcherMental.luckHitProbDelta * 0.5;
  const zoneProb = clampProb(
    0.55 + (effControl - effEye) * 0.0025 + luckZoneShift,
    0.40,
    0.72,
  );
  const inZone = ctx.rng.chance(zoneProb);
  const swingProb = inZone
    ? clampProb(0.67 + mod.swingMod, 0.52, 0.85)
    : clampProb(
        0.26 - (effEye - 65) * 0.002 + mod.chaseMod + pitchMatchup.chaseRateDelta + coEd.chaseRateDelta,
        0.10,
        0.48,
      );

  const rawResult = !ctx.rng.chance(swingProb)
    ? inZone
      ? resolveCalledStrikeOrOut(ctx.strikes, ctx.batter.name)
      : resolveBallOrWalk(ctx.balls, ctx.batter.name)
    : evaluateSwingResult(
        ctx,
        inZone,
        effContact,
        effPower,
        effStuff,
        platoon.firstBaseStepBonus,
        luckHitShift,
        defenderMental.luckErrorMultiplier,
        pitchType,
        enduranceFx.gbRateShift,
      );

  return attachPitchTelemetry(rawResult, adjustedMatchup);
}
