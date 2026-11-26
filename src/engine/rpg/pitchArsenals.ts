import type { FieldPosition } from '../handedness/types';
import {
  isPitcherPosition,
  type BatterPitchProfile,
  type PitchSlot,
  type PitchType,
  type PitcherArsenalProfile,
  type Player,
  type PlayerMarketTier,
  type PlayerRatings,
  type PlayerSpecialistArchetype,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import type { PitchTargetIntent } from '../simulation/pitchMindGames';

export interface PitchCatalogSpec {
  family: 'fastball' | 'breaking' | 'offspeed';
  mphOffset: number;
  stuffBias: number;
  controlBias: number;
}

export const PITCH_CATALOG: Readonly<Record<PitchType, PitchCatalogSpec>> = {
  four_seam: { family: 'fastball', mphOffset: 0, stuffBias: 2, controlBias: 2 },
  two_seam: { family: 'fastball', mphOffset: -2, stuffBias: 1, controlBias: 2 },
  cutter: { family: 'fastball', mphOffset: -4, stuffBias: 2, controlBias: 1 },
  slider: { family: 'breaking', mphOffset: -9, stuffBias: 4, controlBias: -1 },
  curveball: { family: 'breaking', mphOffset: -15, stuffBias: 3, controlBias: -2 },
  changeup: { family: 'offspeed', mphOffset: -11, stuffBias: 2, controlBias: 1 },
  splitter: { family: 'offspeed', mphOffset: -8, stuffBias: 4, controlBias: -2 },
  knuckleball: { family: 'offspeed', mphOffset: -22, stuffBias: 5, controlBias: -4 },
};

const FASTBALL_ANCHORS: readonly PitchType[] = ['four_seam', 'two_seam', 'cutter'];
const SECONDARY_PITCH_POOL: readonly PitchType[] = [
  'slider',
  'curveball',
  'changeup',
  'splitter',
  'two_seam',
  'cutter',
  'four_seam',
];
const COMMON_BATTER_PITCHES: readonly PitchType[] = [
  'four_seam',
  'two_seam',
  'cutter',
  'slider',
  'curveball',
  'changeup',
  'splitter',
];

const HITTER_BUDGET_BY_TIER: Readonly<Record<PlayerMarketTier, number>> = {
  all_star: 590,
  rookie: 535,
  above_average: 525,
  veteran: 495,
  average: 490,
  below_average: 455,
};

const PITCHER_BUDGET_BY_TIER: Readonly<Record<PlayerMarketTier, number>> = {
  all_star: 430,
  rookie: 390,
  above_average: 380,
  veteran: 360,
  average: 355,
  below_average: 325,
};

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Computes the total core-tool rating budget envelope for anti-overpower training balance. */
export function computeTotalRatingBudget(
  marketTier: PlayerMarketTier,
  position: FieldPosition,
): number {
  return isPitcherPosition(position)
    ? PITCHER_BUDGET_BY_TIER[marketTier]
    : HITTER_BUDGET_BY_TIER[marketTier];
}

/** Derives highest-mastery favoritePitch and lowest-mastery weakestPitch from a repertoire. */
export function deriveArsenalExtremes(
  repertoire: readonly PitchSlot[],
): { favoritePitch: PitchType; weakestPitch: PitchType } {
  let best = repertoire[0];
  let worst = repertoire[0];
  for (let i = 1; i < repertoire.length; i += 1) {
    const slot = repertoire[i];
    if (slot.mastery > best.mastery) best = slot;
    if (slot.mastery < worst.mastery) worst = slot;
  }
  return {
    favoritePitch: best.pitchType,
    weakestPitch: worst.pitchType,
  };
}

function pickFastballAnchor(
  rng: SeededRng,
  specialist: PlayerSpecialistArchetype,
): PitchType {
  if (specialist === 'flame_closer') return 'four_seam';
  if (specialist === 'crafty_tactician') return rng.pick(['two_seam', 'cutter'] as const);
  return rng.pick(FASTBALL_ANCHORS);
}

function pickRemainingPitchTypes(
  rng: SeededRng,
  anchor: PitchType,
  targetCount: number,
  specialist: PlayerSpecialistArchetype,
): PitchType[] {
  const chosen: PitchType[] = [anchor];
  const knuckChance = specialist === 'crafty_tactician' ? 0.08 : 0.02;
  if (chosen.length < targetCount && rng.chance(knuckChance)) {
    chosen.push('knuckleball');
  }

  const remaining = SECONDARY_PITCH_POOL.filter((pt) => !chosen.includes(pt));
  const breakingOnly = remaining.filter((pt) => PITCH_CATALOG[pt].family !== 'fastball');
  if (chosen.length < targetCount && breakingOnly.length > 0) {
    const firstOffspeed = rng.pick(breakingOnly);
    chosen.push(firstOffspeed);
  }

  const pool = remaining.filter((pt) => !chosen.includes(pt));
  while (chosen.length < targetCount && pool.length > 0) {
    const idx = rng.int(0, pool.length - 1);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

/** Rolls a role-locked pitcher repertoire: strictly 2-3 pitches for RP, 4-5 pitches for SP. */
export function rollPitcherArsenal(
  rng: SeededRng,
  position: 'SP' | 'RP',
  specialist: PlayerSpecialistArchetype,
  ratings: Pick<PlayerRatings, 'velocity' | 'movement' | 'control'>,
  marketTier: PlayerMarketTier,
): PitcherArsenalProfile {
  const targetCount = position === 'RP' ? (rng.chance(0.45) ? 2 : 3) : rng.chance(0.55) ? 4 : 5;
  const anchor = pickFastballAnchor(rng, specialist);
  const pitchTypes = pickRemainingPitchTypes(rng, anchor, targetCount, specialist);

  const baseMastery = Math.round((ratings.velocity + ratings.movement + ratings.control) / 3);
  const tierShift = marketTier === 'all_star' ? 8 : marketTier === 'below_average' ? -5 : 0;

  const repertoire: PitchSlot[] = pitchTypes.map((pitchType, idx) => {
    const isTop = idx === 0;
    const isBottom = idx === pitchTypes.length - 1;
    const shapeOffset = isTop ? rng.int(9, 14) : isBottom ? -rng.int(10, 16) : rng.int(-3, 5);
    return {
      pitchType,
      mastery: clampInt(baseMastery + tierShift + shapeOffset, 28, 99),
    };
  });

  // Guarantee distinct extremes even if clamping compressed two slots
  if (repertoire[0].mastery <= repertoire[repertoire.length - 1].mastery) {
    repertoire[repertoire.length - 1].mastery = Math.max(20, repertoire[0].mastery - 6);
  }

  const extremes = deriveArsenalExtremes(repertoire);
  return {
    repertoire,
    favoritePitch: extremes.favoritePitch,
    weakestPitch: extremes.weakestPitch,
  };
}

/** Rolls batter favorite pitch to crush, pitch weakness, and trainable recognition map. */
export function rollBatterPitchProfile(
  rng: SeededRng,
  specialist: PlayerSpecialistArchetype,
  _ratings: Pick<PlayerRatings, 'contact' | 'power' | 'eye'>,
  marketTier: PlayerMarketTier,
): BatterPitchProfile {
  const favoritePitch =
    specialist === 'power_slugger' && rng.chance(0.45)
      ? 'four_seam'
      : rng.pick(COMMON_BATTER_PITCHES);
  const weakCandidates = COMMON_BATTER_PITCHES.filter((pt) => pt !== favoritePitch);
  const weakPitch = rng.pick(weakCandidates);

  const isStar = marketTier === 'all_star';
  const pitchRecognition: Partial<Record<PitchType, number>> = {};
  for (const pt of COMMON_BATTER_PITCHES) {
    if (pt === favoritePitch) {
      pitchRecognition[pt] = isStar ? rng.int(13, 18) : rng.int(10, 16);
    } else if (pt === weakPitch) {
      pitchRecognition[pt] = isStar ? -rng.int(6, 10) : -rng.int(10, 16);
    } else {
      pitchRecognition[pt] = rng.int(-4, 4);
    }
  }

  return {
    favoritePitch,
    weakPitch,
    pitchRecognition,
  };
}

const TARGET_PITCH_WEIGHTS: Readonly<
  Record<PitchTargetIntent, Readonly<Record<PitchType, number>>>
> = {
  attack_zone: {
    four_seam: 1.75,
    two_seam: 1.75,
    cutter: 1.75,
    changeup: 1.15,
    slider: 0.7,
    curveball: 0.7,
    splitter: 0.7,
    knuckleball: 0.7,
  },
  paint_corners: {
    four_seam: 1.1,
    two_seam: 1.3,
    cutter: 1.3,
    changeup: 1.3,
    slider: 1.1,
    curveball: 1.1,
    splitter: 1.1,
    knuckleball: 0.75,
  },
  bury_offspeed: {
    four_seam: 0.3,
    two_seam: 0.75,
    cutter: 0.3,
    changeup: 2.8,
    slider: 2.8,
    curveball: 2.8,
    splitter: 2.8,
    knuckleball: 2.8,
  },
  high_heat: {
    four_seam: 3.2,
    two_seam: 1.8,
    cutter: 1.8,
    changeup: 0.22,
    slider: 0.22,
    curveball: 0.22,
    splitter: 0.22,
    knuckleball: 0.22,
  },
};

function targetPitchWeightMultiplier(
  pitchType: PitchType,
  pitchTarget?: PitchTargetIntent,
): number {
  return pitchTarget ? TARGET_PITCH_WEIGHTS[pitchTarget][pitchType] : 1;
}

function scorePitchSelectionWeight(
  slot: PitchSlot,
  arsenal: PitcherArsenalProfile,
  batterProfile: BatterPitchProfile,
  balls: number,
  strikes: number,
  recentTail: readonly PitchType[],
  pitchTarget?: PitchTargetIntent,
): number {
  let weight = (1 + slot.mastery * 0.015) * targetPitchWeightMultiplier(slot.pitchType, pitchTarget);
  if (slot.pitchType === arsenal.favoritePitch && strikes >= 2) weight *= 1.65;
  if (PITCH_CATALOG[slot.pitchType].family === 'fastball' && balls >= 2) weight *= 1.45;
  if (slot.pitchType === batterProfile.weakPitch) weight *= 1.25;
  if (slot.pitchType === arsenal.weakestPitch) weight *= 0.65;

  const repeatedTwice =
    recentTail.length >= 2 &&
    recentTail[recentTail.length - 1] === slot.pitchType &&
    recentTail[recentTail.length - 2] === slot.pitchType;
  if (repeatedTwice) weight *= 0.14;
  return weight;
}

/** Selects the next pitch strictly from the pitcher's repertoire, honoring valid manual calls and target location. */
export function selectPitchForCount(
  rng: SeededRng,
  pitcher: Player,
  batter: Player,
  balls: number,
  strikes: number,
  recentPitchTypes: readonly PitchType[],
  requestedPitchType?: PitchType,
  pitchTarget?: PitchTargetIntent,
): PitchType {
  const arsenal = pitcher.pitchArsenal;
  if (!arsenal || arsenal.repertoire.length === 0) return 'four_seam';

  if (
    requestedPitchType &&
    arsenal.repertoire.some((slot) => slot.pitchType === requestedPitchType)
  ) {
    return requestedPitchType;
  }

  const tail = recentPitchTypes.slice(-2);
  const weights = arsenal.repertoire.map((slot) =>
    scorePitchSelectionWeight(
      slot,
      arsenal,
      batter.batterPitchProfile,
      balls,
      strikes,
      tail,
      pitchTarget,
    ),
  );
  const total = weights.reduce((sum, value) => sum + value, 0);
  const roll = rng.next() * total;
  let cursor = 0;
  for (let i = 0; i < arsenal.repertoire.length; i += 1) {
    cursor += weights[i];
    if (roll <= cursor) return arsenal.repertoire[i].pitchType;
  }
  return arsenal.repertoire[0].pitchType;
}

export interface PitchMatchupEvaluation {
  pitchType: PitchType;
  mph: number;
  isFavoritePitch: boolean;
  isWeakPitchForPitcher: boolean;
  batterAffinity: 'favorite' | 'weak' | 'neutral';
  pitcherStuffDelta: number;
  pitcherControlDelta: number;
  batterContactDelta: number;
  batterPowerDelta: number;
  chaseRateDelta: number;
}

function classifyBatterAffinity(
  profile: BatterPitchProfile,
  pitchType: PitchType,
  recognition: number,
): 'favorite' | 'weak' | 'neutral' {
  if (pitchType === profile.favoritePitch || recognition >= 10) return 'favorite';
  if (pitchType === profile.weakPitch || recognition <= -10) return 'weak';
  return 'neutral';
}

function computePitcherPitchBonus(
  arsenal: PitcherArsenalProfile | undefined,
  pitchType: PitchType,
  consecutiveSamePitchCount: number,
): {
  isFavoritePitch: boolean;
  isWeakPitchForPitcher: boolean;
  stuffBonus: number;
  controlBonus: number;
} {
  const slot = arsenal?.repertoire.find((entry) => entry.pitchType === pitchType);
  const mastery = slot?.mastery ?? 62;
  const isFavoritePitch = arsenal?.favoritePitch === pitchType;
  const isWeakPitchForPitcher = arsenal?.weakestPitch === pitchType;
  const repeatPenalty =
    consecutiveSamePitchCount >= 2 ? (consecutiveSamePitchCount - 1) * 4 : 0;

  let roleStuff = 0;
  let roleControl = 0;
  if (isFavoritePitch) {
    roleStuff = 6;
    roleControl = 4;
  } else if (isWeakPitchForPitcher) {
    roleStuff = -6;
    roleControl = -5;
  }

  const masteryDelta = Math.round((mastery - 62) * 0.14);
  return {
    isFavoritePitch,
    isWeakPitchForPitcher,
    stuffBonus: roleStuff + masteryDelta - repeatPenalty,
    controlBonus: roleControl - Math.round(repeatPenalty * 0.5),
  };
}

/** Evaluates pitcher pitch mastery + favorite/weak/repeat modifiers against batter pitch recognition. */
export function evaluatePitchMatchup(
  pitcher: Player,
  batter: Player,
  pitchType: PitchType,
  consecutiveSamePitchCount: number,
): PitchMatchupEvaluation {
  const spec = PITCH_CATALOG[pitchType];
  const pitcherBonus = computePitcherPitchBonus(
    pitcher.pitchArsenal,
    pitchType,
    consecutiveSamePitchCount,
  );
  const recognition = batter.batterPitchProfile.pitchRecognition[pitchType] ?? 0;
  const batterAffinity = classifyBatterAffinity(batter.batterPitchProfile, pitchType, recognition);

  const baseFastballMph = 82 + Math.round((pitcher.ratings.velocity - 40) * 0.34);
  const mph = clampInt(baseFastballMph + spec.mphOffset, 62, 104);

  return {
    pitchType,
    mph,
    isFavoritePitch: pitcherBonus.isFavoritePitch,
    isWeakPitchForPitcher: pitcherBonus.isWeakPitchForPitcher,
    batterAffinity,
    pitcherStuffDelta: pitcherBonus.stuffBonus + spec.stuffBias,
    pitcherControlDelta: pitcherBonus.controlBonus + spec.controlBias,
    batterContactDelta: Math.round(recognition * 0.65),
    batterPowerDelta: Math.round(recognition * 0.55),
    chaseRateDelta: Number((-recognition * 0.0065).toFixed(4)),
  };
}
