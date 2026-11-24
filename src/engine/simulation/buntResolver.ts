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
  catcher?: Pick<Player, 'id' | 'name' | 'position' | 'ratings'>;
  leadRunner?: Pick<Player, 'id' | 'name' | 'ratings'> | null;
  thirdBaseRunner?: Pick<Player, 'id' | 'name' | 'ratings'> | null;
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
  squeezeScorePct: number;
  inPlaySingleProb: number;
  inPlaySacProb: number;
  inPlaySqueezeProb: number;
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
  advanceOnOut?: 'sac_bunt' | 'bunt_fc_lead_out' | 'none';
  commentary: string;
  soundCue: PlaySoundCue;
  pitchThrown: NonNullable<PlayEvent['pitchThrown']>;
  battedBallType?: 'ground_ball' | 'pop_up';
  ballFlight?: PlayEvent['ballFlight'];
  fieldingHighlight?: PlayEvent['fieldingHighlight'];
  mathBreakdown: PlayMathBreakdown;
}

const PITCH_BUNT_PROFILE: Readonly<
  Record<PitchType, { whiff: number; popUp: number; foul: number }>
> = {
  four_seam: { whiff: 0.004, popUp: 0.016, foul: 0.018 },
  two_seam: { whiff: 0.0, popUp: 0.0, foul: 0.0 },
  cutter: { whiff: 0.005, popUp: 0.012, foul: 0.014 },
  slider: { whiff: 0.012, popUp: 0.01, foul: 0.02 },
  curveball: { whiff: 0.01, popUp: 0.014, foul: 0.018 },
  changeup: { whiff: -0.004, popUp: -0.009, foul: -0.012 },
  splitter: { whiff: 0.014, popUp: 0.008, foul: 0.018 },
  knuckleball: { whiff: 0.018, popUp: 0.02, foul: 0.028 },
};

const SHIFT_BUNT_SINGLE_MULT: Readonly<Record<DefensiveShiftId, number>> = {
  standard: 1.0,
  infield_in: 0.42,
  no_doubles: 1.32,
  bunt_defense: 0.25,
};

const SHIFT_SAC_PENALTY: Readonly<Record<DefensiveShiftId, number>> = {
  standard: 0,
  infield_in: -0.1,
  no_doubles: 0.05,
  bunt_defense: -0.18,
};

const SHIFT_SQUEEZE_DELTA: Readonly<Record<DefensiveShiftId, number>> = {
  standard: 0,
  infield_in: -0.22,
  no_doubles: 0.1,
  bunt_defense: -0.28,
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

function computePitchBuntPressure(input: BuntOddsInput): {
  whiffPressure: number;
  popUpPressure: number;
  foulPressure: number;
} {
  const pitchProfile = PITCH_BUNT_PROFILE[input.pitchType];
  const veloDelta = (input.pitcher.ratings.velocity - 60) / 40;
  const moveDelta = (input.pitcher.ratings.movement - 60) / 40;
  const ctrlDelta = (input.pitcher.ratings.control - 60) / 40;
  const liveQualityDelta = (input.pitchQuality - 60) / 40;
  const highHeat = input.pitchTarget === 'high_heat' ? 1 : 0;

  return {
    whiffPressure:
      pitchProfile.whiff +
      veloDelta * 0.006 +
      moveDelta * 0.008 +
      liveQualityDelta * 0.007 +
      highHeat * 0.006,
    popUpPressure:
      pitchProfile.popUp +
      veloDelta * 0.014 +
      moveDelta * 0.009 +
      ctrlDelta * 0.006 +
      liveQualityDelta * 0.011 +
      highHeat * 0.018,
    foulPressure:
      pitchProfile.foul +
      veloDelta * 0.018 +
      moveDelta * 0.016 +
      ctrlDelta * 0.008 +
      liveQualityDelta * 0.018 +
      highHeat * 0.012,
  };
}

function computeInPlayBuntSuccessProbs(
  input: BuntOddsInput,
  buntDelta: number,
): { inPlaySingleProb: number; inPlaySacProb: number; inPlaySqueezeProb: number } {
  const defenderComposite =
    (input.charger.ratings.fielding +
      input.charger.ratings.range +
      input.charger.ratings.arm) /
    3;
  const speedDelta = input.batter.ratings.speed - 60;
  const fastBurst = Math.max(0, input.batter.ratings.speed - 65) * 0.006;
  const rawSingle = clampNumber(
    0.11 +
      speedDelta * 0.0045 +
      fastBurst +
      buntDelta * 0.0032 +
      input.firstBaseBonus * 0.022 -
      (defenderComposite - 60) * 0.0042,
    0.02,
    0.64,
  );
  const inPlaySingleProb = clampNumber(
    rawSingle * SHIFT_BUNT_SINGLE_MULT[input.defenseShift],
    0.01,
    0.66,
  );

  const leadSpeed = input.leadRunner?.ratings.speed ?? 60;
  const inPlaySacProb = clampNumber(
    0.84 +
      buntDelta * 0.004 +
      (leadSpeed - 60) * 0.003 +
      SHIFT_SAC_PENALTY[input.defenseShift] -
      (defenderComposite - 60) * 0.0035,
    0.42,
    0.96,
  );

  const thirdSpeed = input.thirdBaseRunner?.ratings.speed ?? 60;
  const catcherGlove = input.catcher
    ? (input.catcher.ratings.fielding + input.catcher.ratings.arm) * 0.5
    : 60;
  const squeezeDefense = defenderComposite * 0.7 + catcherGlove * 0.3;
  const fastSqueezeBurst = Math.max(0, thirdSpeed - 70) * 0.0065;
  const inPlaySqueezeProb = clampNumber(
    0.34 +
      (thirdSpeed - 60) * 0.0085 +
      fastSqueezeBurst +
      buntDelta * 0.0038 +
      SHIFT_SQUEEZE_DELTA[input.defenseShift] -
      (squeezeDefense - 60) * 0.0048,
    0.08,
    0.86,
  );

  return { inPlaySingleProb, inPlaySacProb, inPlaySqueezeProb };
}

/** Computes realistic bunt outcome percentages driven by batter skills, pitch type, pitcher attributes, infield shift, fielding, and runner speed. */
export function evaluateBuntOdds(input: BuntOddsInput): BuntOddsBreakdown {
  const effBunt = clampNumber(input.batter.ratings.bunt + input.extraBuntBonus, 15, 99);
  const buntDelta = effBunt - 60;
  const eyeDelta = input.batter.ratings.eye - 60;
  const contactDelta = input.batter.ratings.contact - 60;
  const { whiffPressure, popUpPressure, foulPressure } = computePitchBuntPressure(input);

  const batterWhiffEdge = buntDelta * 0.00055 + eyeDelta * 0.00025;
  const batterPopUpEdge = buntDelta * 0.00105 + contactDelta * 0.00045;
  const batterFoulEdge = buntDelta * 0.002 + contactDelta * 0.0006;

  // Neutral baseline: 2% whiff, 20% foul, 5% infield pop-up, 73% in play
  const whiffProb = clampNumber(0.02 - batterWhiffEdge + whiffPressure, 0.005, 0.1);
  const foulProb = clampNumber(0.2 - batterFoulEdge + foulPressure, 0.08, 0.34);
  const popUpProb = clampNumber(0.05 - batterPopUpEdge + popUpPressure, 0.01, 0.16);

  const whiffPct = Math.round(whiffProb * 100);
  const foulPct = Math.round(foulProb * 100);
  const popUpPct = Math.round(popUpProb * 100);
  const inPlayPct = Math.max(15, 100 - whiffPct - foulPct - popUpPct);

  const { inPlaySingleProb, inPlaySacProb, inPlaySqueezeProb } = computeInPlayBuntSuccessProbs(
    input,
    buntDelta,
  );

  const buntSinglePct = Math.round((inPlayPct / 100) * inPlaySingleProb * 100);
  const inPlayOutPct = Math.max(0, inPlayPct - buntSinglePct);
  const hasThird = Boolean(input.thirdBaseRunner) && input.outs < 2;
  const hasSacOpp = input.hasRunners && input.outs < 2;
  const squeezeScorePct = hasThird
    ? Math.min(inPlayPct, buntSinglePct + Math.round(inPlayOutPct * inPlaySqueezeProb))
    : 0;
  const sacAdvancePct = hasSacOpp
    ? Math.round(inPlayOutPct * (hasThird ? inPlaySqueezeProb : inPlaySacProb))
    : 0;

  return {
    whiffPct,
    foulPct,
    popUpPct,
    inPlayPct,
    buntSinglePct,
    sacAdvancePct,
    squeezeScorePct,
    inPlaySingleProb,
    inPlaySacProb,
    inPlaySqueezeProb,
    buntRating: Math.round(effBunt),
    buntGrade: gradeBuntSkill(effBunt),
    shiftLabel: SHIFT_SHORT_LABELS[input.defenseShift],
  };
}

/** Plain-English 1-line bunt preview shown in LiveActionBar when Bunt is selected. */
export function formatBuntPreviewSummary(odds: BuntOddsBreakdown): string {
  const runnerBit =
    odds.squeezeScorePct > 0
      ? ` • ${odds.squeezeScorePct}% Squeeze Home`
      : odds.sacAdvancePct > 0
        ? ` • ${odds.sacAdvancePct}% Sac Advance`
        : '';
  return `Bunt (${odds.buntGrade} ${odds.buntRating}): ${odds.buntSinglePct}% Hit${runnerBit} • ${odds.popUpPct}% Pop • ${odds.foulPct}% Foul • ${odds.whiffPct}% Whiff (${odds.shiftLabel})`;
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

function resolveBuntOutAdvance(
  input: BuntPitchInput,
  odds: BuntOddsBreakdown,
  pitchLabel: string,
): { advanceOnOut: 'sac_bunt' | 'bunt_fc_lead_out' | 'none'; commentary: string; modifierTag: string } {
  if (input.thirdBaseRunner && input.outs < 2) {
    const squeezedHome = input.rng.next() < odds.inPlaySqueezeProb;
    if (squeezedHome) {
      return {
        advanceOnOut: 'sac_bunt',
        commentary: `SQUEEZE PLAY! ${input.batter.name} deadens the ${pitchLabel} and ${input.thirdBaseRunner.name} slides home safely!`,
        modifierTag: 'Squeeze Play RBI!',
      };
    }
    return {
      advanceOnOut: 'bunt_fc_lead_out',
      commentary: `${input.charger.name} charges the bunt and fires HOME — ${input.thirdBaseRunner.name} is gunned down at the plate!`,
      modifierTag: 'Squeeze Out at Home',
    };
  }
  if (input.hasRunners && input.outs < 2) {
    const advanced = input.rng.next() < odds.inPlaySacProb;
    if (advanced) {
      return {
        advanceOnOut: 'sac_bunt',
        commentary: `${input.batter.name} lays down a crisp sacrifice bunt — thrown out by ${input.charger.name} as runners advance!`,
        modifierTag: 'Sacrifice Bunt',
      };
    }
    return {
      advanceOnOut: 'bunt_fc_lead_out',
      commentary: `${input.charger.name} charges hard on the bunt and fires ahead to cut down the lead runner!`,
      modifierTag: 'Lead Runner Out (FC)',
    };
  }
  return {
    advanceOnOut: 'none',
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
  const pitchLabel = PITCH_TYPE_SHORT_LABELS[input.pitchType];
  const outInfo = isSingle
    ? {
        advanceOnOut: 'none' as const,
        commentary: `${input.batter.name} drops a gorgeous bunt off the ${pitchLabel} and beats ${input.charger.name}'s throw!`,
        modifierTag: 'Bunt Single!',
      }
    : resolveBuntOutAdvance(input, odds, pitchLabel);

  return {
    kind: 'plate_complete',
    outcome: isSingle ? 'bunt_single' : 'bunt_out',
    totalBases: isSingle ? 1 : undefined,
    outsAdded: isSingle ? 0 : 1,
    advanceOnOut: outInfo.advanceOnOut,
    battedBallType: 'ground_ball',
    commentary: outInfo.commentary,
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
    mathBreakdown: buildBuntMath(odds, input, singleRoll, outInfo.modifierTag),
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
