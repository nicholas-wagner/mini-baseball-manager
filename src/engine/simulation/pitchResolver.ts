import {
  evaluateParkHitMultipliers,
  type BallparkPresetId,
} from '../ballparks/stadiumCatalog';
import {
  evaluateGameplanEffects,
  type SeriesGameplanId,
} from '../gm/gmSeasonPulse';
import type { ClubStaffBonuses } from '../gm/coaches';
import { evaluatePlatoonMatchup } from '../handedness/handedness';
import type { FieldPosition } from '../handedness/types';
import { getActiveHealthRatingPenalties } from '../health/healthEngine';
import type { NemesisMatchupEvaluation } from '../league/nemesisTracker';
import type {
  AtBatOutcome,
  PlayEvent,
  PlayMathBreakdown,
  PlaySoundCue,
  TacticalCall,
} from '../models/playEvent';
import {
  PITCH_TYPE_SHORT_LABELS,
  type BattedBallType,
  type PitchType,
  type Player,
  type PlayerRatings,
} from '../models/player';
import { getNationalityById } from '../nationalities/pickNationality';
import type { SeededRng } from '../rng/seededRng';
import { evaluateVeteranSavvyEdge } from '../rpg/careerExperience';
import type { ClubhouseChemistryReport } from '../rpg/chemistry';
import {
  evaluateCoEdPlayerTraitEffect,
  type CoEdClubhouseSynergy,
} from '../rpg/coEdArchetypes';
import { getFormStatModifiers } from '../rpg/formTracker';
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
import { evaluatePlayerRelicBonuses } from '../rpg/relics';
import {
  evaluateActivePowerSurge,
  evaluateCapstoneGameplayProfile,
  evaluateHeritageGameplayProfile,
  getActivatablePowersForPlayer,
  ZERO_ACTIVE_SURGE_NUMBERS,
  type ActivePowerSurge,
  type CapstoneGameplayProfile,
  type HeritageGameplayProfile,
} from '../rpg/specialPowerEffects';
import { evaluatePositionAssignment } from '../rpg/specialistsAndPositions';
import type { BaseState } from './gameState';
import {
  resolveBaseStealPlay,
  resolveDefaultStealPlay,
  type StealDefenseCall,
  type StealPlayResolution,
  type StealPlayType,
} from './baserunning';
import { resolveBuntPitch } from './buntResolver';
import {
  evaluateArcadeTimingEffect,
  evaluateBatterGuessEffect,
  evaluatePitchTargetEffect,
  type ArcadeTimingInput,
  type BatterPitchGuess,
  type PitchTargetIntent,
} from './pitchMindGames';
import { sampleBattedBallType } from './sabermetrics';
import type { WeatherSimulationImpact } from './weather';
import {
  DEFENSIVE_SHIFTS,
  type DefensiveShiftId,
  type DefensiveShiftMeta,
} from './winProbability';

const SHIFTS_BY_ID: Readonly<Record<DefensiveShiftId, DefensiveShiftMeta>> = Object.fromEntries(
  DEFENSIVE_SHIFTS.map((s) => [s.id, s]),
) as Record<DefensiveShiftId, DefensiveShiftMeta>;

const NEUTRAL_WEATHER: WeatherSimulationImpact = {
  hrCarryMultiplier: 1,
  pitcherControlPenalty: 0,
  fielderErrorMultiplier: 1,
  skyColorHex: '#8ECAE6',
  hudLabel: 'Clear',
};

export interface PitchResolution {
  kind: 'pitch_event' | 'plate_complete' | 'steal_attempt';
  outcome: AtBatOutcome;
  totalBases?: 1 | 2 | 3 | 4;
  outsAdded: number;
  runnerId?: string;
  advanceOnOut?: 'sac_fly' | 'double_play' | 'sac_bunt' | 'none';
  stealSuccess?: boolean;
  stealResolution?: StealPlayResolution;
  commentary: string;
  soundCue: PlaySoundCue;
  ballFlight?: PlayEvent['ballFlight'];
  fieldingHighlight?: PlayEvent['fieldingHighlight'];
  specialPowerTriggered?: PlayEvent['specialPowerTriggered'];
  pitchThrown?: PlayEvent['pitchThrown'];
  mathBreakdown?: PlayMathBreakdown;
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
  steal_3b: { contactMod: 0, powerMod: 0, swingMod: 0, chaseMod: 0 },
  double_steal: { contactMod: 0, powerMod: 0, swingMod: 0, chaseMod: 0 },
  steal_home: { contactMod: 0, powerMod: 0, swingMod: 0, chaseMod: 0 },
  pitchout: { contactMod: 0, powerMod: 0, swingMod: -0.5, chaseMod: -0.5 },
  hold_runner: { contactMod: 0, powerMod: 0, swingMod: 0, chaseMod: 0 },
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

function resolveStealPlayTypeFromCall(
  call: TacticalCall,
  bases: BaseState,
): StealPlayType | null {
  if (call === 'steal') return resolveDefaultStealPlay(bases);
  if (call === 'steal_3b' || call === 'double_steal' || call === 'steal_home') return call;
  return null;
}

function resolveStealAttempt(
  ctx: PitchResolverContext,
  playType: StealPlayType,
): PitchResolution | null {
  const playersMap: Record<string, Player> = ctx.battingPlayersById
    ? { ...ctx.battingPlayersById }
    : {};
  if (ctx.firstBaseRunner) {
    playersMap[ctx.firstBaseRunner.id] = ctx.firstBaseRunner;
  }
  const result = resolveBaseStealPlay(
    ctx.rng,
    playType,
    ctx.bases,
    playersMap,
    ctx.pitcher,
    ctx.catcher,
    {
      pitcherFatigue: ctx.pitcherFatigue,
      catcherPopTimeBonus: ctx.catcherPopTimeBonus,
      defenseCall: ctx.stealDefenseCall,
    },
  );
  if (!result) return null;
  return {
    kind: 'steal_attempt',
    outcome: 'ball',
    outsAdded: result.outsAdded,
    runnerId: result.stolenBaseRunnerIds[0] ?? result.caughtStealingRunnerId ?? undefined,
    stealSuccess: result.success,
    stealResolution: result,
    commentary: result.commentary,
    soundCue: result.soundCue,
    fieldingHighlight: result.fieldingHighlight,
  };
}

function pickBuntCharger(ctx: PitchResolverContext): Player {
  return ctx.rng.pick([ctx.defender, ctx.catcher, ctx.pitcher]);
}

function resolveHitType(
  rng: SeededRng,
  batter: Player,
  effPower: number,
  defender: Player,
  battedBallType: BattedBallType,
  parkHrMult: number,
  parkXbhMult: number,
  effSpeed: number,
  effGapPower: number,
): PitchResolution {
  const hrMult = battedBallType === 'fly_ball' ? 1.55 : battedBallType === 'line_drive' ? 0.9 : 0.08;
  const gapBonus = (effGapPower - 60) * 0.0024;
  const hrChance = clampProb((0.11 + (effPower - 60) * 0.0038) * hrMult * parkHrMult, 0.01, 0.56);
  const tripleChance = clampProb(
    (0.045 + (effSpeed - 65) * 0.0022 + gapBonus * 0.4) * parkXbhMult,
    0.015,
    0.16,
  );
  const doubleChance = clampProb(
    (0.22 + (effPower - 60) * 0.0018 + gapBonus + (battedBallType === 'line_drive' ? 0.08 : 0)) *
      parkXbhMult,
    0.12,
    0.44,
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
      soundCue: 'wall_thud',
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
    return buildDoubleResolution(
      batter.name,
      ofSpot.x,
      battedBallType,
      roll < hrChance + tripleChance + doubleChance * 0.35,
    );
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

function buildDoubleResolution(
  batterName: string,
  spotX: number,
  battedBallType: BattedBallType,
  offWall: boolean,
): PitchResolution {
  return {
    kind: 'plate_complete',
    outcome: 'double',
    totalBases: 2,
    outsAdded: 0,
    battedBallType,
    commentary: offWall
      ? `Off the wall! ${batterName} rattles a stand-up double!`
      : `${batterName} laces a gap double!`,
    soundCue: offWall ? 'wall_thud' : 'bat_crack',
    ballFlight: {
      style: 'line_drive',
      landingX: spotX * 0.85,
      landingZ: -29,
      apexY: 5.2,
      durationSec: 1.1,
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
  const brokenBat =
    (battedBallType === 'ground_ball' || battedBallType === 'pop_up') && rng.chance(0.22);
  return {
    kind: 'plate_complete',
    outcome: preset.outcome,
    outsAdded: 1,
    advanceOnOut: 'none',
    battedBallType,
    commentary: brokenBat
      ? `Shattered bat! ${batter.name} ${preset.suffix}`
      : `${batter.name} ${preset.suffix}`,
    soundCue: brokenBat ? 'broken_bat' : 'glove_pop',
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
  powers: PowerBundle,
): PitchResolution {
  const posEval = evaluatePositionAssignment(defender, defenderPos);
  const effectiveFielding =
    defender.ratings.fielding +
    posEval.fieldingDelta +
    powers.defenderHeritage.defenderFieldingDelta +
    powers.defenderCaps.defenderFieldingDelta +
    powers.defenderRelics.fielding +
    powers.fieldingStaff.fieldingGloveBonus +
    powers.fieldingChem.fielding;
  const errScale =
    posEval.errorMultiplier *
    luckErrorMultiplier *
    powers.defenderHeritage.errorMultiplier *
    powers.defenderCaps.errorMultiplier *
    powers.weather.fielderErrorMultiplier;
  const errorProb = clampProb(
    (0.055 - (effectiveFielding - 60) * 0.0006) * errScale,
    0.006,
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

  const effectiveArm =
    defender.ratings.arm +
    powers.defenderHeritage.defenderArmDelta +
    powers.defenderCaps.defenderArmDelta +
    powers.defenderRelics.arm;
  const armSuppress = (effectiveArm - 65) * 0.0025;
  const sacChance = battedBallType === 'fly_ball' ? clampProb(0.34 - armSuppress, 0.1, 0.48) : 0.08;
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
  requestedPowerId?: string;
  battingCoEdSynergy?: CoEdClubhouseSynergy;
  fieldingCoEdSynergy?: CoEdClubhouseSynergy;
  battingStaffBonuses?: ClubStaffBonuses;
  fieldingStaffBonuses?: ClubStaffBonuses;
  battingChemistryBonuses?: ClubhouseChemistryReport['totalTeamRatingBonus'];
  fieldingChemistryBonuses?: ClubhouseChemistryReport['totalTeamRatingBonus'];
  ballparkId?: BallparkPresetId;
  defensiveShift?: DefensiveShiftId;
  weatherImpact?: WeatherSimulationImpact;
  pitchTarget?: PitchTargetIntent;
  batterGuess?: BatterPitchGuess;
  nemesisBonus?: NemesisMatchupEvaluation;
  arcadeTiming?: ArcadeTimingInput;
  battingGameplan?: SeriesGameplanId;
  fieldingGameplan?: SeriesGameplanId;
  battingPlayersById?: Readonly<Record<string, Player>>;
  catcherPopTimeBonus?: number;
  stealDefenseCall?: StealDefenseCall;
}

const ZERO_STAFF: ClubStaffBonuses = {
  pitchingVeloBonus: 0,
  pitchingMovementBonus: 0,
  pitchingControlBonus: 0,
  pitcherEnduranceDrainScale: 1,
  battingContactBonus: 0,
  battingPowerBonus: 0,
  battingEyeBonus: 0,
  slumpBusterBonus: 0,
  highLiComposureBonus: 0,
  managerPowerCooldownBonus: 0,
  moraleAura: 0,
  fieldingGloveBonus: 0,
  crossTrainRustReduction: 0,
  bullpenWarmupBonus: 0,
  catcherFramingZoneBonus: 0,
  catcherPopTimeBonus: 0,
  relieverFatigueReduction: 0,
  relicBonusMultiplier: 1,
  blisterPreventionBonus: 0,
  vintageRelicFindChance: 0,
};

const ZERO_CHEM: ClubhouseChemistryReport['totalTeamRatingBonus'] = {
  contact: 0,
  power: 0,
  speed: 0,
  fielding: 0,
  control: 0,
  clutch: 0,
};

const BATTED_BALL_BABIP_SHIFT: Readonly<Record<BattedBallType, number>> = {
  line_drive: 0.16,
  ground_ball: -0.02,
  fly_ball: -0.03,
  pop_up: -0.22,
};

function maybeRobHomeRunWithLeap(
  rng: SeededRng,
  hit: PitchResolution,
  defender: Player,
  defenderCaps: CapstoneGameplayProfile,
): PitchResolution {
  if (hit.outcome !== 'home_run' || defenderCaps.hrRobberyChance <= 0) return hit;
  if (!rng.chance(defenderCaps.hrRobberyChance)) return hit;
  const spot = rng.pick(OUTFIELD_SPOTS);
  return {
    kind: 'plate_complete',
    outcome: 'fly_out',
    outsAdded: 1,
    advanceOnOut: 'none',
    battedBallType: 'fly_ball',
    commentary: `ROBBERY AT THE WALL! ${defender.name} scales the fence with SKY-HIGH LEAP to steal a home run!`,
    soundCue: 'spring_boing',
    ballFlight: { style: 'line_drive', landingX: spot.x, landingZ: -38, apexY: 13.5, durationSec: 1.5 },
    fieldingHighlight: { fielderId: defender.id, fielderPos: spot.pos, anim: 'field_high_jump' },
    specialPowerTriggered: {
      actor: 'fielder',
      powerId: 'sky_high_leap',
      calloutText: 'SKY-HIGH LEAP! HR ROBBED!',
      vfxColor: '#00E5FF',
    },
  };
}

interface MindGameModifiers {
  contactDelta: number;
  powerDelta: number;
  stuffDelta: number;
  controlDelta: number;
  mphBonus: number;
  zoneProbDelta: number;
  chaseRateDelta: number;
  whiffBonus: number;
  hitProbBonus: number;
  hrCarryMultiplier: number;
  tags: string[];
}

const ZERO_TARGET_EFFECT = {
  stuffDelta: 0,
  controlDelta: 0,
  mphBonus: 0,
  zoneProbDelta: 0,
  chaseRateDelta: 0,
  whiffBonus: 0,
  hrCarryMultiplier: 1,
  label: '',
};

const ZERO_NEMESIS_DELTA = {
  batterContactDelta: 0,
  batterPowerDelta: 0,
  pitcherStuffDelta: 0,
  pitcherControlDelta: 0,
  badgeText: '',
};

function computeMindGameAndNemesis(
  ctx: PitchResolverContext,
  pitchType: PitchType,
): MindGameModifiers {
  const guess = evaluateBatterGuessEffect(ctx.batterGuess ?? 'none', pitchType);
  const target = evaluatePitchTargetEffect(ctx.pitchTarget, pitchType) ?? ZERO_TARGET_EFFECT;
  const nem = ctx.nemesisBonus ?? ZERO_NEMESIS_DELTA;
  const timing = evaluateArcadeTimingEffect(ctx.arcadeTiming);
  const batPlan = evaluateGameplanEffects(ctx.battingGameplan);
  const fldPlan = evaluateGameplanEffects(ctx.fieldingGameplan);
  const tags = [
    guess.label,
    target.label,
    timing.label,
    nem.badgeText,
    batPlan.label,
    fldPlan.label,
  ].filter((t): t is string => Boolean(t));

  return {
    contactDelta:
      guess.contactDelta + timing.contactDelta + nem.batterContactDelta + batPlan.batterContactDelta,
    powerDelta:
      guess.powerDelta + timing.powerDelta + nem.batterPowerDelta + batPlan.batterPowerDelta,
    stuffDelta:
      target.stuffDelta + timing.stuffDelta + nem.pitcherStuffDelta + fldPlan.pitcherStuffDelta,
    controlDelta:
      target.controlDelta +
      timing.controlDelta +
      nem.pitcherControlDelta +
      fldPlan.pitcherControlDelta,
    mphBonus: target.mphBonus + timing.mphBonus,
    zoneProbDelta: target.zoneProbDelta,
    chaseRateDelta: target.chaseRateDelta,
    whiffBonus: target.whiffBonus + guess.whiffPenalty + batPlan.whiffBonus + fldPlan.whiffBonus,
    hitProbBonus: guess.hitProbBonus + timing.hitProbBonus,
    hrCarryMultiplier: target.hrCarryMultiplier * batPlan.hrCarryMultiplier,
    tags,
  };
}

interface PowerBundle {
  batterHeritage: HeritageGameplayProfile;
  pitcherHeritage: HeritageGameplayProfile;
  defenderHeritage: HeritageGameplayProfile;
  batterCaps: CapstoneGameplayProfile;
  pitcherCaps: CapstoneGameplayProfile;
  defenderCaps: CapstoneGameplayProfile;
  batterRelics: Record<keyof PlayerRatings, number>;
  pitcherRelics: Record<keyof PlayerRatings, number>;
  defenderRelics: Record<keyof PlayerRatings, number>;
  battingStaff: ClubStaffBonuses;
  fieldingStaff: ClubStaffBonuses;
  battingChem: ClubhouseChemistryReport['totalTeamRatingBonus'];
  fieldingChem: ClubhouseChemistryReport['totalTeamRatingBonus'];
  shift: DefensiveShiftMeta;
  weather: WeatherSimulationImpact;
  mindGames: MindGameModifiers;
  batterSurge: ActivePowerSurge | null;
  pitcherSurge: ActivePowerSurge | null;
}

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
  powers: PowerBundle,
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
  const effectiveSide = evaluatePlatoonMatchup(ctx.batter.bats, ctx.pitcher.throws).effectiveBatSide;
  const parkFx = evaluateParkHitMultipliers(ctx.ballparkId, effectiveSide);
  const effSpeed = ctx.batter.ratings.speed + powers.batterRelics.speed + powers.battingChem.speed;
  const effGapPower = ctx.batter.ratings.gapPower + powers.batterRelics.gapPower;
  const gbSpeedBonus =
    battedBallType === 'ground_ball'
      ? parkFx.groundballHitBonus + (effSpeed - 60) * 0.0022 - powers.shift.groundballOutBonus
      : 0;
  const bSurge = powers.batterSurge ?? ZERO_ACTIVE_SURGE_NUMBERS;
  const defenderRange =
    ctx.defender.ratings.range +
    powers.defenderHeritage.defenderRangeDelta +
    powers.defenderCaps.defenderRangeDelta +
    powers.defenderRelics.range;
  const rangeSuppress = (defenderRange - 62) * 0.0018;
  const hitProb = clampProb(
    0.295 +
      (effContact - effStuff) * 0.0044 +
      firstBaseStepBonus * 0.008 +
      luckHitShift +
      bSurge.hitProbBonus +
      powers.mindGames.hitProbBonus +
      BATTED_BALL_BABIP_SHIFT[battedBallType] +
      gbSpeedBonus -
      rangeSuppress,
    0.04,
    0.78,
  );
  if (ctx.rng.chance(hitProb)) {
    const hrMult =
      parkFx.hrMultiplier *
      powers.weather.hrCarryMultiplier *
      powers.mindGames.hrCarryMultiplier *
      powers.batterHeritage.hrCarryMultiplier *
      powers.batterCaps.hrCarryMultiplier *
      bSurge.hrCarryMultiplier;
    const shiftXbhScale = Math.max(0.55, 1 - powers.shift.xbhSuppressBonus * 3.0);
    const xbhMult =
      parkFx.xbhMultiplier *
      shiftXbhScale *
      powers.batterHeritage.xbhStretchMultiplier *
      bSurge.xbhStretchMultiplier;
    const rawHit = resolveHitType(
      ctx.rng,
      ctx.batter,
      effPower,
      ctx.defender,
      battedBallType,
      hrMult,
      xbhMult,
      effSpeed,
      effGapPower,
    );
    const hit = maybeRobHomeRunWithLeap(ctx.rng, rawHit, ctx.defender, powers.defenderCaps);
    if (hit.outcome !== 'fly_out' && ctx.canBatterTriggerSpecial && !powers.batterSurge) {
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
    powers,
  );
}

function resolveCalledStrikeOrOut(strikes: number, batterName: string): PitchResolution {
  const isK = strikes >= 2;
  return {
    kind: isK ? 'plate_complete' : 'pitch_event',
    outcome: isK ? 'strikeout' : 'called_strike',
    outsAdded: isK ? 1 : 0,
    commentary: isK ? `${batterName} is caught looking for strike three!` : 'Painted the corner for a called strike.',
    soundCue: isK ? 'ump_strike_call' : 'glove_pop',
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
    soundCue: isWalk ? 'walk_ball_four' : 'glove_pop',
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
  powers: PowerBundle,
): PitchResolution {
  const whiffPenalty =
    powers.pitcherHeritage.pitcherWhiffBonus +
    powers.pitcherCaps.pitcherWhiffBonus +
    powers.mindGames.whiffBonus +
    (powers.pitcherSurge?.whiffBonus ?? 0);
  const contactProb = inZone
    ? clampProb(0.76 + (effContact - effStuff) * 0.0048 - whiffPenalty, 0.34, 0.95)
    : clampProb(0.48 + (effContact - effStuff) * 0.0032 - whiffPenalty, 0.16, 0.76);

  if (!ctx.rng.chance(contactProb)) {
    const whiff = resolveSwingingStrikeOrOut(ctx.strikes, ctx.batter.name);
    if (whiff.outcome === 'strikeout' && ctx.canPitcherTriggerSpecial && !powers.pitcherSurge) {
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
    powers,
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

function resolveRequestedPowerSurges(ctx: PitchResolverContext): {
  batterSurge: ActivePowerSurge | null;
  pitcherSurge: ActivePowerSurge | null;
} {
  if (!ctx.requestedPowerId) {
    return { batterSurge: null, pitcherSurge: null };
  }
  const batOpts = getActivatablePowersForPlayer(ctx.batter, 'batter');
  if (ctx.canBatterTriggerSpecial && batOpts.some((p) => p.id === ctx.requestedPowerId)) {
    return {
      batterSurge: evaluateActivePowerSurge(ctx.requestedPowerId, 'batter', ctx.batter),
      pitcherSurge: null,
    };
  }
  const pitOpts = getActivatablePowersForPlayer(ctx.pitcher, 'pitcher');
  if (ctx.canPitcherTriggerSpecial && pitOpts.some((p) => p.id === ctx.requestedPowerId)) {
    return {
      batterSurge: null,
      pitcherSurge: evaluateActivePowerSurge(ctx.requestedPowerId, 'pitcher', ctx.pitcher),
    };
  }
  return { batterSurge: null, pitcherSurge: null };
}

const ZERO_MIND_GAMES: MindGameModifiers = {
  contactDelta: 0,
  powerDelta: 0,
  stuffDelta: 0,
  controlDelta: 0,
  mphBonus: 0,
  zoneProbDelta: 0,
  chaseRateDelta: 0,
  whiffBonus: 0,
  hitProbBonus: 0,
  hrCarryMultiplier: 1,
  tags: [],
};

function buildPowerBundle(ctx: PitchResolverContext): PowerBundle {
  const battingStaff = ctx.battingStaffBonuses ?? ZERO_STAFF;
  const fieldingStaff = ctx.fieldingStaffBonuses ?? ZERO_STAFF;
  const battingChem = ctx.battingChemistryBonuses ?? ZERO_CHEM;
  const fieldingChem = ctx.fieldingChemistryBonuses ?? ZERO_CHEM;
  const { batterSurge, pitcherSurge } = resolveRequestedPowerSurges(ctx);

  return {
    batterHeritage: evaluateHeritageGameplayProfile(ctx.batter, ctx.leverageIndex),
    pitcherHeritage: evaluateHeritageGameplayProfile(ctx.pitcher, ctx.leverageIndex),
    defenderHeritage: evaluateHeritageGameplayProfile(ctx.defender, ctx.leverageIndex),
    batterCaps: evaluateCapstoneGameplayProfile(ctx.batter, ctx.leverageIndex),
    pitcherCaps: evaluateCapstoneGameplayProfile(ctx.pitcher, ctx.leverageIndex),
    defenderCaps: evaluateCapstoneGameplayProfile(ctx.defender, ctx.leverageIndex),
    batterRelics: evaluatePlayerRelicBonuses(ctx.batter, battingStaff.relicBonusMultiplier),
    pitcherRelics: evaluatePlayerRelicBonuses(ctx.pitcher, fieldingStaff.relicBonusMultiplier),
    defenderRelics: evaluatePlayerRelicBonuses(ctx.defender, fieldingStaff.relicBonusMultiplier),
    battingStaff,
    fieldingStaff,
    battingChem,
    fieldingChem,
    shift: SHIFTS_BY_ID[ctx.defensiveShift ?? 'standard'],
    weather: ctx.weatherImpact ?? NEUTRAL_WEATHER,
    mindGames: ZERO_MIND_GAMES,
    batterSurge,
    pitcherSurge,
  };
}

function decorateActivePowerOutcome(
  res: PitchResolution,
  powers: PowerBundle,
): PitchResolution {
  const surge = powers.batterSurge ?? powers.pitcherSurge;
  if (!surge || res.specialPowerTriggered) return res;
  return {
    ...res,
    commentary: `⚡ ${surge.calloutText} — ${res.commentary}`,
    soundCue: surge.soundCue,
    ballFlight: res.ballFlight ? { ...res.ballFlight, style: surge.ballStyle } : res.ballFlight,
    specialPowerTriggered: {
      actor: surge.actor,
      powerId: surge.powerId,
      calloutText: surge.calloutText,
      vfxColor: surge.vfxColor,
    },
  };
}

function computeEffectiveMatchupNumbers(
  ctx: PitchResolverContext,
  pitchType: PitchType,
  pitchMatchup: PitchMatchupEvaluation,
  enduranceFx: ReturnType<typeof evaluatePitcherEnduranceEffect>,
  platoon: ReturnType<typeof evaluatePlatoonMatchup>,
  powers: PowerBundle,
) {
  const bSurge = powers.batterSurge ?? ZERO_ACTIVE_SURGE_NUMBERS;
  const pSurge = powers.pitcherSurge ?? ZERO_ACTIVE_SURGE_NUMBERS;
  const mod = TACTICAL_CONFIG[ctx.tacticalCall];
  const batterForm = getFormStatModifiers(ctx.batter.formState);
  const pitcherForm = getFormStatModifiers(ctx.pitcher.formState);
  const batterMental = evaluatePressureAndLuckModifiers(ctx.batter, ctx.leverageIndex);
  const pitcherMental = evaluatePressureAndLuckModifiers(ctx.pitcher, ctx.leverageIndex);
  const defenderMental = evaluatePressureAndLuckModifiers(ctx.defender, ctx.leverageIndex);
  const batterSavvy = evaluateVeteranSavvyEdge(ctx.batter.careerService.experienceTier, ctx.leverageIndex);
  const pitcherSavvy = evaluateVeteranSavvyEdge(ctx.pitcher.careerService.experienceTier, ctx.leverageIndex);
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
    powers.batterCaps.batterContactDelta +
    powers.batterHeritage.batterContactDelta +
    powers.batterRelics.contact +
    powers.battingStaff.battingContactBonus +
    powers.battingChem.contact +
    powers.mindGames.contactDelta +
    bSurge.contactDelta +
    coEd.contactDelta;
  const effPower =
    ctx.batter.ratings.power +
    batterHealth.power +
    platoon.batterPowerDelta +
    mod.powerMod +
    batterForm.powerDelta +
    pitchMatchup.batterPowerDelta +
    batterMental.pressureRatingDelta +
    powers.batterCaps.batterPowerDelta +
    powers.batterHeritage.batterPowerDelta +
    powers.batterRelics.power +
    powers.battingStaff.battingPowerBonus +
    powers.battingChem.power +
    powers.mindGames.powerDelta +
    bSurge.powerDelta +
    coEd.powerDelta;
  const effEye =
    ctx.batter.ratings.eye +
    batterHealth.eye +
    batterSavvy.eyeDelta +
    powers.batterHeritage.batterEyeDelta +
    powers.batterCaps.batterEyeDelta +
    powers.batterRelics.eye +
    powers.battingStaff.battingEyeBonus +
    bSurge.eyeDelta +
    coEd.eyeDelta;
  const effStuff =
    (ctx.pitcher.ratings.velocity +
      pitcherHealth.velocity +
      powers.pitcherRelics.velocity +
      powers.fieldingStaff.pitchingVeloBonus +
      ctx.pitcher.ratings.movement +
      pitcherHealth.movement +
      powers.pitcherRelics.movement +
      powers.fieldingStaff.pitchingMovementBonus) *
      0.5 +
    platoon.pitcherBreakDelta +
    pitcherForm.stuffDelta +
    pitchMatchup.pitcherStuffDelta +
    pitcherMental.pressureRatingDelta +
    pitcherSavvy.composureDelta +
    pitcherRoleEval.stuffDelta +
    powers.pitcherCaps.pitcherStuffDelta +
    powers.pitcherHeritage.pitcherStuffDelta +
    powers.mindGames.stuffDelta +
    pSurge.stuffDelta +
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
    powers.pitcherCaps.pitcherControlDelta +
    powers.pitcherHeritage.pitcherControlDelta +
    powers.pitcherRelics.control +
    powers.fieldingStaff.pitchingControlBonus +
    powers.fieldingChem.control +
    powers.weather.pitcherControlPenalty +
    powers.mindGames.controlDelta +
    pSurge.controlDelta +
    coEd.controlDelta +
    enduranceFx.controlDrop;

  const luckZoneShift =
    pitcherMental.luckZoneProbDelta -
    batterMental.luckZoneProbDelta * 0.5 +
    powers.pitcherHeritage.luckZoneProbDelta +
    powers.fieldingStaff.catcherFramingZoneBonus +
    powers.mindGames.zoneProbDelta +
    pSurge.luckZoneProbDelta;
  const luckHitShift =
    batterMental.luckHitProbDelta -
    pitcherMental.luckHitProbDelta * 0.5 +
    powers.batterHeritage.luckHitProbDelta +
    bSurge.luckHitProbDelta;
  const powerChaseShift =
    powers.pitcherCaps.chaseRateDelta +
    powers.batterCaps.chaseRateDelta +
    powers.mindGames.chaseRateDelta +
    pSurge.chaseRateDelta +
    bSurge.chaseRateDelta;

  return {
    effContact,
    effPower,
    effEye,
    effStuff,
    effControl,
    luckZoneShift,
    luckHitShift,
    defenderLuckErrMult: defenderMental.luckErrorMultiplier,
    swingMod: mod.swingMod,
    chaseShift: mod.chaseMod + pitchMatchup.chaseRateDelta + coEd.chaseRateDelta + powerChaseShift,
    mphBoost: powers.pitcherCaps.mphBonus + powers.mindGames.mphBonus + pSurge.mphBonus,
  };
}

function resolvePrePitchTacticalAction(
  ctx: PitchResolverContext,
): PitchResolution | null {
  if (ctx.tacticalCall === 'intentional_walk') {
    return {
      kind: 'plate_complete',
      outcome: 'walk',
      outsAdded: 0,
      commentary: `Pitching coach flashes four fingers — ${ctx.batter.name} takes first intentionally.`,
      soundCue: 'ui_pop',
    };
  }
  const stealPlay = resolveStealPlayTypeFromCall(ctx.tacticalCall, ctx.bases);
  return stealPlay ? resolveStealAttempt(ctx, stealPlay) : null;
}

function collectActiveModifierTags(powers: PowerBundle): string[] {
  const tags: string[] = [powers.batterHeritage.summaryTag, powers.pitcherHeritage.summaryTag];
  if (powers.shift.id !== 'standard') {
    tags.push(`Shift: ${powers.shift.shortLabel}`);
  }
  if (powers.weather.hrCarryMultiplier !== 1) {
    tags.push(`Wind HR ${powers.weather.hrCarryMultiplier.toFixed(2)}x`);
  }
  if (powers.weather.pitcherControlPenalty < 0) {
    tags.push(`Drizzle Grip ${powers.weather.pitcherControlPenalty}`);
  }
  if (powers.batterSurge) tags.push(`⚡ ${powers.batterSurge.calloutText}`);
  if (powers.pitcherSurge) tags.push(`⚡ ${powers.pitcherSurge.calloutText}`);
  tags.push(...powers.mindGames.tags);
  return tags;
}

function buildPitchMathBreakdown(
  rng: SeededRng,
  stats: ReturnType<typeof computeEffectiveMatchupNumbers>,
  zoneProb: number,
  powers: PowerBundle,
): PlayMathBreakdown {
  const hitEstimate = clampProb(0.295 + (stats.effContact - stats.effStuff) * 0.0044, 0.05, 0.72);
  const hrEstimate = clampProb(
    (0.11 + (stats.effPower - 60) * 0.0038) * powers.weather.hrCarryMultiplier,
    0.01,
    0.52,
  );
  return {
    effContact: Math.round(stats.effContact),
    effPower: Math.round(stats.effPower),
    effStuff: Math.round(stats.effStuff),
    effControl: Math.round(stats.effControl),
    zonePct: Math.round(zoneProb * 100),
    hitPct: Math.round(hitEstimate * 100),
    hrPct: Math.round(hrEstimate * 100),
    diceRoll: rng.int(1, 100),
    activeModifiers: collectActiveModifierTags(powers),
  };
}

function resolveBuntCall(
  ctx: PitchResolverContext,
  pitchType: PitchType,
  adjustedMatchup: PitchMatchupEvaluation,
  pitchQuality: number,
  platoon: ReturnType<typeof evaluatePlatoonMatchup>,
  fullPowers: PowerBundle,
): PitchResolution {
  const buntExtra =
    fullPowers.batterCaps.buntBonus +
    fullPowers.batterRelics.bunt +
    (fullPowers.batterSurge?.buntBonus ?? 0);
  return attachPitchTelemetry(
    decorateActivePowerOutcome(
      resolveBuntPitch({
        rng: ctx.rng,
        batter: ctx.batter,
        pitcher: ctx.pitcher,
        catcher: ctx.catcher,
        pitchType,
        pitchSpeedMph: adjustedMatchup.mph,
        pitchQuality,
        pitchTarget: ctx.pitchTarget ?? 'attack_zone',
        defenseShift: ctx.defensiveShift ?? 'standard',
        charger: pickBuntCharger(ctx),
        firstBaseBonus: platoon.firstBaseStepBonus,
        sideX: platoon.effectiveBatSide === 'L' ? 1 : -1,
        extraBuntBonus: buntExtra,
        strikes: ctx.strikes,
        outs: ctx.outs,
        hasRunners: ctx.bases.some(Boolean),
      }),
      fullPowers,
    ),
    adjustedMatchup,
  );
}

/** Resolves a single baseball pitch or tactical action cleanly from seeded state. */
export function resolveSinglePitch(ctx: PitchResolverContext): PitchResolution {
  const powers = buildPowerBundle(ctx);
  const platoon = evaluatePlatoonMatchup(ctx.batter.bats, ctx.pitcher.throws);
  const prePitch = resolvePrePitchTacticalAction(ctx);
  if (prePitch) return prePitch;

  const pitchType = selectPitchForCount(
    ctx.rng,
    ctx.pitcher,
    ctx.batter,
    ctx.balls,
    ctx.strikes,
    ctx.atBatPitchHistory,
    ctx.requestedPitchType,
  );
  const fullPowers: PowerBundle = { ...powers, mindGames: computeMindGameAndNemesis(ctx, pitchType) };
  const repeatCount = countTrailingPitchRepeats(ctx.atBatPitchHistory, pitchType);
  const pitchMatchup = evaluatePitchMatchup(ctx.pitcher, ctx.batter, pitchType, repeatCount);
  const enduranceFx = evaluatePitcherEnduranceEffect(fatigueToEndurance(ctx.pitcherFatigue), pitchType);
  const stats = computeEffectiveMatchupNumbers(ctx, pitchType, pitchMatchup, enduranceFx, platoon, fullPowers);
  const adjustedMatchup: PitchMatchupEvaluation = {
    ...pitchMatchup,
    mph: Math.max(58, pitchMatchup.mph + enduranceFx.mphDrop + stats.mphBoost),
  };

  if (ctx.tacticalCall === 'bunt') {
    return resolveBuntCall(ctx, pitchType, adjustedMatchup, stats.effStuff, platoon, fullPowers);
  }

  const zoneProb = clampProb(0.55 + (stats.effControl - stats.effEye) * 0.0025 + stats.luckZoneShift, 0.38, 0.76);
  const inZone = ctx.rng.chance(zoneProb);
  const swingProb = inZone
    ? clampProb(0.67 + stats.swingMod, 0.52, 0.86)
    : clampProb(0.26 - (stats.effEye - 65) * 0.002 + stats.chaseShift, 0.08, 0.54);

  const rawResult = !ctx.rng.chance(swingProb)
    ? inZone
      ? resolveCalledStrikeOrOut(ctx.strikes, ctx.batter.name)
      : resolveBallOrWalk(ctx.balls, ctx.batter.name)
    : evaluateSwingResult(
        ctx,
        inZone,
        stats.effContact,
        stats.effPower,
        stats.effStuff,
        platoon.firstBaseStepBonus,
        stats.luckHitShift,
        stats.defenderLuckErrMult,
        pitchType,
        enduranceFx.gbRateShift,
        fullPowers,
      );

  const decorated = decorateActivePowerOutcome(rawResult, fullPowers);
  decorated.mathBreakdown = buildPitchMathBreakdown(ctx.rng, stats, zoneProb, fullPowers);
  return attachPitchTelemetry(decorated, adjustedMatchup);
}
