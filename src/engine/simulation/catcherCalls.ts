import {
  PITCH_TYPE_LABELS,
  PITCH_TYPE_SHORT_LABELS,
  type PitchSlot,
  type PitchType,
  type Player,
} from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { getCurrentBatter, getCurrentPitcher, type GameSessionState } from './gameState';
import {
  classifyPitchFamily,
  formatPitchTargetLabel,
  type PitchTargetIntent,
} from './pitchMindGames';

export interface CatcherPitchCall {
  pitchType: PitchType;
  target: PitchTargetIntent;
  targetLabel: string;
  pitchShortLabel: string;
  pitchLabel: string;
  reason: string;
}

interface PlannedSpot {
  target: PitchTargetIntent;
  reason: string;
}

function getRepertoireSlots(pitcher: Player): readonly PitchSlot[] {
  const slots = pitcher.pitchArsenal?.repertoire;
  if (slots && slots.length > 0) return slots;
  return [{ pitchType: 'four_seam', mastery: 62 }];
}

function countTrailingRepeats(history: readonly PitchType[], pitchType: PitchType): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i] !== pitchType) break;
    count += 1;
  }
  return count;
}

const TARGET_FIT_SCORES: Readonly<
  Record<PitchTargetIntent, Readonly<Record<PitchType, number>>>
> = {
  attack_zone: {
    four_seam: 12,
    two_seam: 12,
    cutter: 12,
    changeup: 4,
    slider: -4,
    curveball: -4,
    splitter: -4,
    knuckleball: -4,
  },
  paint_corners: {
    four_seam: 4,
    two_seam: 8,
    cutter: 8,
    changeup: 8,
    slider: 4,
    curveball: 4,
    splitter: 4,
    knuckleball: 2,
  },
  bury_offspeed: {
    four_seam: -10,
    two_seam: -6,
    cutter: -10,
    changeup: 16,
    slider: 16,
    curveball: 16,
    splitter: 16,
    knuckleball: 16,
  },
  high_heat: {
    four_seam: 20,
    two_seam: 12,
    cutter: 14,
    changeup: -20,
    slider: -20,
    curveball: -20,
    splitter: -20,
    knuckleball: -20,
  },
};

function targetFitScore(pitchType: PitchType, target: PitchTargetIntent): number {
  return TARGET_FIT_SCORES[target][pitchType];
}

function scoreSlotForCatcher(
  slot: PitchSlot,
  pitcher: Player,
  batter: Player,
  target: PitchTargetIntent,
  history: readonly PitchType[],
  usedPitches: ReadonlySet<PitchType>,
): number {
  const arsenal = pitcher.pitchArsenal;
  const repeats = countTrailingRepeats(history, slot.pitchType);
  let score = slot.mastery * 0.6 + targetFitScore(slot.pitchType, target);
  if (slot.pitchType === arsenal?.favoritePitch) score += 9;
  if (slot.pitchType === arsenal?.weakestPitch) score -= 8;
  if (slot.pitchType === batter.batterPitchProfile.weakPitch) score += 14;
  if (slot.pitchType === batter.batterPitchProfile.favoritePitch) score -= 12;
  if (repeats >= 2) score -= 45;
  else if (repeats === 1) score -= 8;
  if (usedPitches.has(slot.pitchType)) score -= 24;
  return score;
}

function pickPitchForSpot(
  slots: readonly PitchSlot[],
  pitcher: Player,
  batter: Player,
  target: PitchTargetIntent,
  history: readonly PitchType[],
  usedPitches: ReadonlySet<PitchType>,
): PitchType | null {
  const eligible =
    target === 'high_heat'
      ? slots.filter((slot) => classifyPitchFamily(slot.pitchType) === 'fastball')
      : slots;
  if (eligible.length === 0) return null;

  let best = eligible[0];
  let bestScore = scoreSlotForCatcher(best, pitcher, batter, target, history, usedPitches);
  for (let i = 1; i < eligible.length; i += 1) {
    const candidate = eligible[i];
    const score = scoreSlotForCatcher(candidate, pitcher, batter, target, history, usedPitches);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best.pitchType;
}

function buildBehindCountPlan(balls: number): PlannedSpot[] {
  const leadReason = balls >= 3 ? '3-ball count · throw a strike' : 'Behind in count · attack zone';
  return [
    { target: 'attack_zone', reason: leadReason },
    { target: 'paint_corners', reason: 'Nibble the corner' },
    { target: 'attack_zone', reason: 'Change speeds for a strike' },
  ];
}

function buildFullCountPlan(hasFastball: boolean): PlannedSpot[] {
  return [
    { target: 'paint_corners', reason: 'Full count · paint the black' },
    { target: 'attack_zone', reason: 'Full count · challenge hitter' },
    hasFastball
      ? { target: 'high_heat', reason: 'Full count · elevate heat' }
      : { target: 'paint_corners', reason: 'Change speeds on the edge' },
  ];
}

function buildEvenTwoStrikePlan(hasFastball: boolean, velocity: number): PlannedSpot[] {
  return [
    { target: 'paint_corners', reason: '2-2 · freeze on the corner' },
    { target: 'bury_offspeed', reason: '2-2 · chase pitch low' },
    hasFastball && velocity >= 58
      ? { target: 'high_heat', reason: '2-2 · climb the ladder' }
      : { target: 'attack_zone', reason: 'Challenge the zone' },
  ];
}

function buildTwoStrikePlan(
  balls: number,
  hasFastball: boolean,
  velocity: number,
  roll: number,
): PlannedSpot[] {
  if (balls >= 3) return buildFullCountPlan(hasFastball);
  if (balls === 2) return buildEvenTwoStrikePlan(hasFastball, velocity);
  if (hasFastball && velocity >= 60 && roll < 0.42) {
    return [
      { target: 'high_heat', reason: 'Ahead · high fastball put-away' },
      { target: 'bury_offspeed', reason: 'Ahead · bury a chase pitch' },
      { target: 'paint_corners', reason: 'Freeze them looking' },
    ];
  }
  return [
    { target: 'bury_offspeed', reason: 'Ahead · fish for a whiff' },
    hasFastball && velocity >= 56
      ? { target: 'high_heat', reason: 'Change eye level up' }
      : { target: 'paint_corners', reason: 'Dot the outer corner' },
    { target: 'paint_corners', reason: 'Freeze them on the edge' },
  ];
}

function buildEarlyCountPlan(
  hasFastball: boolean,
  velocity: number,
  roll: number,
): PlannedSpot[] {
  if (roll < 0.42) {
    return [
      { target: 'paint_corners', reason: 'Work the outer edge' },
      { target: 'attack_zone', reason: 'Get ahead with a strike' },
      { target: 'bury_offspeed', reason: 'Show a low chase look' },
    ];
  }
  if (roll < 0.78) {
    return [
      { target: 'attack_zone', reason: 'Get ahead early' },
      { target: 'paint_corners', reason: 'Paint the corner' },
      hasFastball && velocity >= 64
        ? { target: 'high_heat', reason: 'Elevate heat up top' }
        : { target: 'bury_offspeed', reason: 'Keep them off balance' },
    ];
  }
  return [
    { target: 'paint_corners', reason: 'Spot up on the corner' },
    hasFastball && velocity >= 60
      ? { target: 'high_heat', reason: 'Challenge up in the zone' }
      : { target: 'bury_offspeed', reason: 'Early chase pitch' },
    { target: 'attack_zone', reason: 'Pound the strike zone' },
  ];
}

function selectTargetPlan(
  session: GameSessionState,
  hasFastball: boolean,
  velocity: number,
  roll: number,
): PlannedSpot[] {
  if (session.balls >= 3 && session.strikes < 2) return buildBehindCountPlan(session.balls);
  if (session.strikes === 2) return buildTwoStrikePlan(session.balls, hasFastball, velocity, roll);
  if (session.balls >= 2 && session.balls > session.strikes) {
    return buildBehindCountPlan(session.balls);
  }
  return buildEarlyCountPlan(hasFastball, velocity, roll);
}

function toCatcherPitchCall(
  pitchType: PitchType,
  target: PitchTargetIntent,
  reason: string,
): CatcherPitchCall {
  return {
    pitchType,
    target,
    targetLabel: formatPitchTargetLabel(target),
    pitchShortLabel: PITCH_TYPE_SHORT_LABELS[pitchType],
    pitchLabel: PITCH_TYPE_LABELS[pitchType],
    reason,
  };
}

/**
 * Deterministically builds 2-3 smart Catcher pitch calls for Simple Mode (and Shake Off cycling).
 * Every pitch belongs to the active pitcher's arsenal, and `high_heat` is strictly fastball-only.
 */
export function buildCatcherCallSequence(
  session: GameSessionState,
): readonly CatcherPitchCall[] {
  const pitcher = getCurrentPitcher(session);
  const batter = getCurrentBatter(session);
  const slots = getRepertoireSlots(pitcher);
  const hasFastball = slots.some((slot) => classifyPitchFamily(slot.pitchType) === 'fastball');
  const rng = createSeededRng(
    (session.rngSeed ^ Math.imul(session.stepCounter + 19, 0x85ebca6b)) >>> 0,
  );
  const plan = selectTargetPlan(session, hasFastball, pitcher.ratings.velocity, rng.next());

  const calls: CatcherPitchCall[] = [];
  const seenKeys = new Set<string>();
  const usedPitches = new Set<PitchType>();

  for (const spot of plan) {
    const pitchType = pickPitchForSpot(
      slots,
      pitcher,
      batter,
      spot.target,
      session.atBatPitchHistory,
      usedPitches,
    );
    if (!pitchType) continue;
    const key = `${pitchType}:${spot.target}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    usedPitches.add(pitchType);
    calls.push(toCatcherPitchCall(pitchType, spot.target, spot.reason));
  }

  return calls;
}

/** Returns the active Catcher pitch call for the current shake-off step, wrapping cleanly. */
export function getCatcherCall(
  session: GameSessionState,
  shakeOffCount = 0,
): CatcherPitchCall {
  const sequence = buildCatcherCallSequence(session);
  const index = ((shakeOffCount % sequence.length) + sequence.length) % sequence.length;
  return sequence[index];
}
