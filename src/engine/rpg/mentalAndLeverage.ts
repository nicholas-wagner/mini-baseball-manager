import type {
  GamePressureLevel,
  MentalTraitId,
  PersonalityArchetype,
  Player,
  PlayerMarketTier,
  PressureResponseProfile,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { computeEffectiveLuck, luckMicroDelta, luckScaleMultiplier } from './luckFactor';

export interface SituationLeverageInput {
  inning: number;
  outs: number;
  bases: readonly [string | null, string | null, string | null];
  scoreDiff: number; // absolute or signed run differential
  gamePressureLevel: GamePressureLevel;
}

export type LeverageTier = 'low' | 'normal' | 'high' | 'critical';

export interface SituationLeverageResult {
  leverageIndex: number; // 0.35 .. 3.50+
  tier: LeverageTier;
  label: string;
}

export interface PressureAndLuckModifiers {
  pressureRatingDelta: number; // applied to Contact/Power/Control/Stuff under high LI
  luckHitProbDelta: number;    // subtle universal BABIP / bloop shift (-0.025 .. +0.025)
  luckZoneProbDelta: number;   // subtle borderline call edge (-0.018 .. +0.018)
  luckErrorMultiplier: number; // subtle bounce luck (0.90 .. 1.10)
}

export interface ClubhouseMentalAura {
  clubhouseGlueCount: number;
  highEnergyCount: number;
  moraleRecoveryBonus: number;
  hypeGainMultiplier: number;
  slumpRecoveryBonus: number;
}

const GAME_STAKES_MULTIPLIER: Readonly<Record<GamePressureLevel, number>> = {
  regular: 1.0,
  series_rubber: 1.15,
  rivalry_showdown: 1.25,
  playoff_game: 1.35,
  elimination_championship: 1.5,
};

const SECONDARY_CLUBHOUSE_TRAITS: readonly MentalTraitId[] = [
  'clubhouse_glue',
  'high_energy',
  'steady_hand',
  'fiery_competitor',
];

function rollPressureProfile(
  rng: SeededRng,
  personality: PersonalityArchetype,
  marketTier: PlayerMarketTier,
): PressureResponseProfile {
  const roll = rng.next();
  const starBoost = marketTier === 'all_star' ? 0.14 : 0;
  const captainBoost =
    personality === 'clutch_captain' || personality === 'quiet_assassin' ? 0.12 : 0;
  const iceCutoff = 0.16 + starBoost + captainBoost;
  const riserCutoff = iceCutoff + 0.24;
  const steadyCutoff = riserCutoff + 0.38 - starBoost * 0.5;

  if (roll < iceCutoff) return 'ice_veins';
  if (roll < riserCutoff) return 'clutch_riser';
  if (roll < steadyCutoff) return 'steady';
  return 'pressure_wilt';
}

function primaryTraitForPressure(
  rng: SeededRng,
  profile: PressureResponseProfile,
  personality: PersonalityArchetype,
): MentalTraitId {
  if (profile === 'ice_veins') return 'ice_veins';
  if (profile === 'clutch_riser') return 'pressure_riser';
  if (profile === 'pressure_wilt') return 'pressure_wilt';
  if (personality === 'prankster' || personality === 'showboat') return 'high_energy';
  if (personality === 'gym_rat') return 'clubhouse_glue';
  return rng.pick(SECONDARY_CLUBHOUSE_TRAITS);
}

/** Deterministically rolls non-contradictory mentalTraits and aligned pressureProfile. */
export function rollMentalAndPressureProfile(
  rng: SeededRng,
  personality: PersonalityArchetype,
  marketTier: PlayerMarketTier,
): { mentalTraits: MentalTraitId[]; pressureProfile: PressureResponseProfile } {
  const pressureProfile = rollPressureProfile(rng, personality, marketTier);
  const firstTrait = primaryTraitForPressure(rng, pressureProfile, personality);
  const mentalTraits: MentalTraitId[] = [firstTrait];

  if (rng.chance(0.55)) {
    const candidates = SECONDARY_CLUBHOUSE_TRAITS.filter((t) => t !== firstTrait);
    mentalTraits.push(rng.pick(candidates));
  }
  return { mentalTraits, pressureProfile };
}

function scoreDiffFactor(absDiff: number): number {
  if (absDiff === 0) return 1.32;
  if (absDiff === 1) return 1.24;
  if (absDiff === 2) return 1.04;
  if (absDiff === 3) return 0.84;
  if (absDiff <= 5) return 0.58;
  return 0.38;
}

function baseOccupancyFactor(
  bases: readonly [string | null, string | null, string | null],
): number {
  const runners =
    (bases[0] ? 1 : 0) + (bases[1] ? 1.35 : 0) + (bases[2] ? 1.65 : 0);
  return 0.8 + runners * 0.18;
}

function classifyLeverageTier(li: number): { tier: LeverageTier; label: string } {
  if (li >= 2.1) return { tier: 'critical', label: 'Critical Moment!' };
  if (li >= 1.55) return { tier: 'high', label: 'High Leverage' };
  if (li >= 0.8) return { tier: 'normal', label: 'Normal' };
  return { tier: 'low', label: 'Low Leverage' };
}

/** Computes real-time baseball Leverage Index (LI) scaled by inning, score, bases, outs, and game stakes. */
export function computeSituationLeverage(
  input: SituationLeverageInput,
): SituationLeverageResult {
  const inningFactor =
    input.inning >= 9 ? 1.45 : input.inning >= 7 ? 1.2 : input.inning >= 5 ? 1.02 : 0.9;
  const diffFactor = scoreDiffFactor(Math.abs(input.scoreDiff));
  const baseFactor = baseOccupancyFactor(input.bases);
  const outsFactor = input.outs === 2 ? 1.08 : 1.0;
  const stakesFactor = GAME_STAKES_MULTIPLIER[input.gamePressureLevel];

  const raw = inningFactor * diffFactor * baseFactor * outsFactor * stakesFactor;
  const leverageIndex = Number(Math.max(0.35, Math.min(6.0, raw)).toFixed(2));
  const { tier, label } = classifyLeverageTier(leverageIndex);
  return { leverageIndex, tier, label };
}

function computePressureDelta(
  pressureProfile: PressureResponseProfile,
  clutch: number,
  leverageIndex: number,
): number {
  if (leverageIndex < 1.25) return 0;
  const intensity = Math.min(1.4, (leverageIndex - 1.15) / 1.0);
  const clutchEdge = (clutch - 60) * 0.08;

  if (pressureProfile === 'ice_veins') {
    return Math.round((5.5 + Math.max(0, clutchEdge)) * intensity);
  }
  if (pressureProfile === 'clutch_riser') {
    return Math.round((3.8 + Math.max(0, clutchEdge)) * intensity);
  }
  if (pressureProfile === 'pressure_wilt') {
    return -Math.round((5.2 + Math.max(0, -clutchEdge)) * intensity);
  }
  return Math.round(clutchEdge * 0.5 * intensity);
}

/** Evaluates high-leverage pressure swings and subtle universal luck modifiers. */
export function evaluatePressureAndLuckModifiers(
  player: Pick<Player, 'pressureProfile' | 'ratings'> & { equippedRelicIds?: readonly string[] },
  leverageIndex: number,
  relicLuckBonus?: number,
): PressureAndLuckModifiers {
  const effectiveLuck = computeEffectiveLuck(player, relicLuckBonus);
  return {
    pressureRatingDelta: computePressureDelta(
      player.pressureProfile,
      player.ratings.clutch,
      leverageIndex,
    ),
    luckHitProbDelta: luckMicroDelta(effectiveLuck, 0.024),
    luckZoneProbDelta: luckMicroDelta(effectiveLuck, 0.016),
    luckErrorMultiplier: Number(luckScaleMultiplier(effectiveLuck, -0.08).toFixed(3)),
  };
}

/** Aggregates clubhouse glue & high-energy sparkplug bonuses across an active roster. */
export function evaluateClubhouseMentalAura(
  roster: readonly Pick<Player, 'mentalTraits'>[],
): ClubhouseMentalAura {
  let clubhouseGlueCount = 0;
  let highEnergyCount = 0;
  for (const player of roster) {
    if (player.mentalTraits.includes('clubhouse_glue')) clubhouseGlueCount += 1;
    if (player.mentalTraits.includes('high_energy')) highEnergyCount += 1;
  }

  return {
    clubhouseGlueCount,
    highEnergyCount,
    moraleRecoveryBonus: Math.min(8, clubhouseGlueCount * 2),
    hypeGainMultiplier: Number(Math.min(1.35, 1 + highEnergyCount * 0.07).toFixed(2)),
    slumpRecoveryBonus: Math.min(6, clubhouseGlueCount * 2),
  };
}
