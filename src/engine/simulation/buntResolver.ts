import type {
  AtBatOutcome,
  PlayEvent,
  PlayMathBreakdown,
  PlaySoundCue,
} from '../models/playEvent';
import {
  PITCH_TYPE_SHORT_LABELS,
  type PitchType,
  type Player,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import type { PitchTargetIntent } from './pitchMindGames';
import type { DefensiveShiftId } from './winProbability';

export interface BuntOddsInput {
  batter: Pick<Player, 'name' | 'ratings'>;
  pitcher: Pick<Player, 'name' | 'ratings'>;
  pitchType: PitchType;
  pitchQuality: number;
  pitchTarget: PitchTargetIntent;
  defenseShift: DefensiveShiftId;
  charger: Pick<Player, 'id' | 'name' | 'position' | 'ratings'>;
  firstBaseBonus: number;
  extraBuntBonus: number;
  outs: number;
  hasRunners: boolean;
}

export interface BuntOddsBreakdown {
  whiffPct: number;
  foulPct: number;
  popUpPct: number;
  inPlayPct: number;
  buntSinglePct: number;
  sacAdvancePct: number;
  inPlaySingleProb: number;
  buntRating: number;
  buntGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  shiftLabel: string;
}

export interface BuntPitchInput extends BuntOddsInput {
  rng: SeededRng;
  catcher?: Pick<Player, 'id' | 'name' | 'position' | 'ratings'>;
  pitcher: Pick<Player, 'id' | 'name' | 'position' | 'ratings'>;
  pitchSpeedMph: number;
  sideX: number;
  strikes: number;
}

export interface BuntPitchResolution {
  kind: 'pitch_event' | 'plate_complete';
  outcome: AtBatOutcome;
  totalBases?: 1;
  outsAdded: number;
  advanceOnOut?: 'sac_bunt' | 'none';
  commentary: string;
  soundCue: PlaySoundCue;
  pitchThrown: NonNullable<PlayEvent['pitchThrown']>;
  battedBallType?: 'ground_ball' | 'pop_up';
  ballFlight?: PlayEvent['ballFlight'];
  fieldingHighlight?: PlayEvent['fieldingHighlight'];
  mathBreakdown: PlayMathBreakdown;
}

const PITCH_BUNT_DIFFICULTY: Readonly<Record<PitchType, number>> = {
  four_seam: 0.45,
  two_seam: 0.0,
  cutter: 0.35,
  slider: 0.55,
  curveball: 0.5,
  changeup: -0.2,
  splitter: 0.6,
  knuckleball: 0.75,
};

const SHIFT_BUNT_SINGLE_DELTA: Readonly<Record<DefensiveShiftId, number>> = {
  standard: 0,
  infield_in: -0.1,
  no_doubles: 0.1,
  bunt_defense: -0.22,
};

const SHIFT_SHORT_LABELS: Readonly<Record<DefensiveShiftId, string>> = {
  standard: 'Standard',
  infield_in: 'Infield In',
  no_doubles: 'No Doubles',
  bunt_defense: 'Bunt Defense',
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gradeBuntSkill(rating: number): BuntOddsBreakdown['buntGrade'] {
  if (rating >= 85) return 'S';
  if (rating >= 72) return 'A';
  if (rating >= 58) return 'B';
  if (rating >= 44) return 'C';
  return 'D';
}

function computePitchBuntPressure(
  pitchType: PitchType,
  pitchQuality: number,
  pitchTarget: PitchTargetIntent,
): { qualityDiff: number; highHeatRisk: number } {
  const qualityDiff =
    (pitchQuality - 60) / 30 + PITCH_BUNT_DIFFICULTY[pitchType] * 0.45;
  const highHeatRisk = pitchTarget === 'high_heat' ? 0.035 : 0;
  return { qualityDiff, highHeatRisk };
}

/** Computes realistic bunt outcome percentages driven by bunt skill, pitch quality, infield shift, fielding, and speed. */
export function evaluateBuntOdds(input: BuntOddsInput): BuntOddsBreakdown {
  const effBunt = clampNumber(input.batter.ratings.bunt + input.extraBuntBonus, 15, 99);
  const buntDelta = effBunt - 60;
  const { qualityDiff, highHeatRisk } = computePitchBuntPressure(
    input.pitchType,
    input.pitchQuality,
    input.pitchTarget,
  );

  // Neutral baseline: 5% whiff, 20% foul, 15% infield pop-up, 60% in play
  const whiffProb = clampNumber(0.05 - buntDelta * 0.0012 + qualityDiff * 0.028 + highHeatRisk * 0.6, 0.01, 0.18);
  const foulProb = clampNumber(0.20 - buntDelta * 0.0022 + qualityDiff * 0.042, 0.08, 0.35);
  const popUpProb = clampNumber(0.15 - buntDelta * 0.0020 + qualityDiff * 0.036 + highHeatRisk, 0.04, 0.30);

  const whiffPct = Math.round(whiffProb * 100);
  const foulPct = Math.round(foulProb * 100);
  const popUpPct = Math.round(popUpProb * 100);
  const inPlayPct = Math.max(15, 100 - whiffPct - foulPct - popUpPct);

  const defenderComposite =
    (input.charger.ratings.fielding +
      input.charger.ratings.range +
      input.charger.ratings.arm) /
    3;
  const inPlaySingleProb = clampNumber(
    0.26 +
      (input.batter.ratings.speed - 60) * 0.0062 +
      buntDelta * 0.004 +
      input.firstBaseBonus * 0.025 +
      SHIFT_BUNT_SINGLE_DELTA[input.defenseShift] -
      (defenderComposite - 60) * 0.0055,
    0.05,
    0.72,
  );

  const buntSinglePct = Math.round((inPlayPct / 100) * inPlaySingleProb * 100);
  const sacAdvancePct =
    input.hasRunners && input.outs < 2
      ? Math.max(0, inPlayPct - buntSinglePct)
      : 0;

  return {
    whiffPct,
    foulPct,
    popUpPct,
    inPlayPct,
    buntSinglePct,
    sacAdvancePct,
    inPlaySingleProb,
    buntRating: Math.round(effBunt),
    buntGrade: gradeBuntSkill(effBunt),
    shiftLabel: SHIFT_SHORT_LABELS[input.defenseShift],
  };
}

/** Plain-English 1-line bunt preview shown in LiveActionBar when Bunt is selected. */
export function formatBuntPreviewSummary(odds: BuntOddsBreakdown): string {
  const sacBit = odds.sacAdvancePct > 0 ? ` • ${odds.sacAdvancePct}% Sac` : '';
  return `Bunt (${odds.buntGrade} ${odds.buntRating}): ${odds.buntSinglePct}% Hit${sacBit} • ${odds.popUpPct}% Pop • ${odds.foulPct}% Foul • ${odds.whiffPct}% Whiff (${odds.shiftLabel})`;
}

function buildBuntMath(
  odds: BuntOddsBreakdown,
  input: BuntPitchInput,
  roll: number,
  extraTag?: string,
): PlayMathBreakdown {
  const tags = [
    `Bunt (${odds.buntGrade} ${odds.buntRating})`,
    `Pitch: ${PITCH_TYPE_SHORT_LABELS[input.pitchType]}`,
    `Shift: ${odds.shiftLabel}`,
  ];
  if (extraTag) tags.push(extraTag);
  return {
    effContact: odds.buntRating,
    effPower: Math.round(input.batter.ratings.speed),
    effStuff: Math.round(input.pitchQuality),
    effControl: Math.round(input.charger.ratings.fielding),
    zonePct: 100 - odds.whiffPct,
    hitPct: odds.buntSinglePct,
    diceRoll: Math.max(1, Math.min(100, Math.ceil(roll * 100))),
    activeModifiers: tags,
  };
}

function buildBuntWhiffOutcome(
  input: BuntPitchInput,
  odds: BuntOddsBreakdown,
  pitchThrown: NonNullable<PlayEvent['pitchThrown']>,
  roll: number,
): BuntPitchResolution {
  const pitchLabel = PITCH_TYPE_SHORT_LABELS[input.pitchType];
  const isStrikeThree = input.strikes >= 2;
  return {
    kind: isStrikeThree ? 'plate_complete' : 'pitch_event',
    outcome: isStrikeThree ? 'strikeout' : 'swinging_strike',
    outsAdded: isStrikeThree ? 1 : 0,
    advanceOnOut: 'none',
    commentary: isStrikeThree
      ? `${input.batter.name} misses the bunt on a ${input.pitchSpeedMph} mph ${pitchLabel} — strike three!`
      : `${input.batter.name} squares and whiffs over the ${input.pitchSpeedMph} mph ${pitchLabel}!`,
    soundCue: isStrikeThree ? 'strikeout_punch' : 'pitch_whoosh',
    pitchThrown,
    mathBreakdown: buildBuntMath(odds, input, roll, 'Bunt Whiff'),
  };
}

function buildBuntFoulOutcome(
  input: BuntPitchInput,
  odds: BuntOddsBreakdown,
  pitchThrown: NonNullable<PlayEvent['pitchThrown']>,
  roll: number,
): BuntPitchResolution {
  const pitchLabel = PITCH_TYPE_SHORT_LABELS[input.pitchType];
  const isTwoStrikeK = input.strikes >= 2;
  return {
    kind: isTwoStrikeK ? 'plate_complete' : 'pitch_event',
    outcome: isTwoStrikeK ? 'strikeout' : 'foul',
    outsAdded: isTwoStrikeK ? 1 : 0,
    advanceOnOut: 'none',
    commentary: isTwoStrikeK
      ? `${input.batter.name} bunts a ${pitchLabel} foul with two strikes — automatic strikeout!`
      : `${input.batter.name} nudges the ${pitchLabel} foul down the chalk line.`,
    soundCue: isTwoStrikeK ? 'strikeout_punch' : 'foul_clank',
    pitchThrown,
    mathBreakdown: buildBuntMath(odds, input, roll, isTwoStrikeK ? '2-Strike Foul Bunt K' : 'Bunt Foul'),
  };
}

function pickBuntPopUpFielder(
  input: BuntPitchInput,
): Pick<Player, 'id' | 'name' | 'position'> {
  const roll = input.rng.next();
  if (roll < 0.5 && input.catcher) return input.catcher;
  if (roll < 0.95) return input.pitcher;
  return input.charger;
}

function buildBuntPopOutcome(
  input: BuntPitchInput,
  odds: BuntOddsBreakdown,
  pitchThrown: NonNullable<PlayEvent['pitchThrown']>,
  roll: number,
): BuntPitchResolution {
  const pitchLabel = PITCH_TYPE_SHORT_LABELS[input.pitchType];
  const popFielder = pickBuntPopUpFielder(input);
  const posTag = popFielder.position === 'SP' || popFielder.position === 'RP' ? 'P' : popFielder.position;
  return {
    kind: 'plate_complete',
    outcome: 'fly_out',
    outsAdded: 1,
    advanceOnOut: 'none',
    battedBallType: 'pop_up',
    commentary: `${input.batter.name} pops the bunt up off the ${pitchLabel} — ${popFielder.name} (${posTag}) tracks it down for the out!`,
    soundCue: 'glove_pop',
    pitchThrown,
    ballFlight: {
      style: 'ninja_bunt',
      landingX: input.sideX * 1.6,
      landingZ: popFielder.position === 'C' ? -1.8 : -7.6,
      apexY: 6.4,
      durationSec: 1.35,
    },
    fieldingHighlight: {
      fielderId: popFielder.id,
      fielderPos: popFielder.position,
      anim: 'field_run',
    },
    mathBreakdown: buildBuntMath(odds, input, roll, 'Bunt Pop-Up'),
  };
}

function describeBuntInPlay(
  isSingle: boolean,
  canSacrifice: boolean,
  input: BuntPitchInput,
  pitchLabel: string,
): { commentary: string; modifierTag: string } {
  if (isSingle) {
    return {
      commentary: `${input.batter.name} drops a gorgeous bunt off the ${pitchLabel} and beats ${input.charger.name}'s throw!`,
      modifierTag: 'Bunt Single!',
    };
  }
  if (canSacrifice) {
    return {
      commentary: `${input.batter.name} lays down a crisp sacrifice bunt — thrown out by ${input.charger.name} as runners advance!`,
      modifierTag: 'Sacrifice Bunt',
    };
  }
  return {
    commentary: `${input.batter.name} squares to bunt and ${input.charger.name} (${input.charger.position}) fires to first for the out.`,
    modifierTag: 'Charging Throw-Out',
  };
}

function buildBuntInPlayOutcome(
  input: BuntPitchInput,
  odds: BuntOddsBreakdown,
  pitchThrown: NonNullable<PlayEvent['pitchThrown']>,
): BuntPitchResolution {
  const singleRoll = input.rng.next();
  const isSingle = singleRoll < odds.inPlaySingleProb;
  const canSacrifice = !isSingle && input.hasRunners && input.outs < 2;
  const pitchLabel = PITCH_TYPE_SHORT_LABELS[input.pitchType];
  const { commentary, modifierTag } = describeBuntInPlay(isSingle, canSacrifice, input, pitchLabel);

  return {
    kind: 'plate_complete',
    outcome: isSingle ? 'bunt_single' : 'bunt_out',
    totalBases: isSingle ? 1 : undefined,
    outsAdded: isSingle ? 0 : 1,
    advanceOnOut: canSacrifice ? 'sac_bunt' : 'none',
    battedBallType: 'ground_ball',
    commentary,
    soundCue: 'bunt_tap',
    pitchThrown,
    ballFlight: {
      style: 'ninja_bunt',
      landingX: input.sideX * 4.8,
      landingZ: -6.4,
      apexY: 1.3,
      durationSec: 1.0,
    },
    fieldingHighlight: {
      fielderId: input.charger.id,
      fielderPos: input.charger.position,
      anim: isSingle ? 'field_run' : 'field_dive',
    },
    mathBreakdown: buildBuntMath(odds, input, singleRoll, modifierTag),
  };
}

/** Resolves a live bunt attempt into whiff, foul (or 2-strike K), infield pop-up, bunt single, or sacrifice/bunt out. */
export function resolveBuntPitch(input: BuntPitchInput): BuntPitchResolution {
  const odds = evaluateBuntOdds(input);
  const pitchThrown: NonNullable<PlayEvent['pitchThrown']> = {
    pitchType: input.pitchType,
    mph: input.pitchSpeedMph,
    isFavoritePitch: false,
    isWeakPitchForPitcher: false,
    batterAffinity: 'neutral',
  };
  const roll = input.rng.next();
  const rollPct = roll * 100;

  if (rollPct < odds.whiffPct) return buildBuntWhiffOutcome(input, odds, pitchThrown, roll);
  if (rollPct < odds.whiffPct + odds.foulPct) return buildBuntFoulOutcome(input, odds, pitchThrown, roll);
  if (rollPct < odds.whiffPct + odds.foulPct + odds.popUpPct) {
    return buildBuntPopOutcome(input, odds, pitchThrown, roll);
  }
  return buildBuntInPlayOutcome(input, odds, pitchThrown);
}
