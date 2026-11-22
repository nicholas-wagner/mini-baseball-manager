import type { SeededRng } from '../rng/seededRng';
import type {
  BatsHand,
  EffectiveBatSide,
  FieldPosition,
  PlatoonMatchupEffect,
  ThrowsHand,
} from './types';

/**
 * Exact batting handedness distribution:
 * - 50% Righty (R)
 * - 40% Lefty (L)
 * - 10% Switch Hitter (S)
 */
export const BATS_WEIGHTS = {
  R: 50,
  L: 40,
  S: 10,
} as const;

/**
 * Position-specific left-handed throwing probability (0..1):
 * - SP: 35% L / 65% R
 * - RP: 50% L / 50% R
 * - LF/CF/RF: 50% L / 50% R
 * - 1B: 80% L / 20% R
 * - C: 20% L / 80% R
 * - 2B/3B/SS: 0% L / 100% R
 */
export const THROWS_LEFT_PROBABILITY: Readonly<Record<FieldPosition, number>> = {
  SP: 0.35,
  RP: 0.5,
  LF: 0.5,
  CF: 0.5,
  RF: 0.5,
  '1B': 0.8,
  C: 0.2,
  '2B': 0,
  '3B': 0,
  SS: 0,
};

export function rollBatsHand(rng: SeededRng): BatsHand {
  const roll = rng.next() * 100;
  if (roll < BATS_WEIGHTS.R) return 'R';
  if (roll < BATS_WEIGHTS.R + BATS_WEIGHTS.L) return 'L';
  return 'S';
}

export function rollThrowsHand(rng: SeededRng, position: FieldPosition): ThrowsHand {
  const leftProb = THROWS_LEFT_PROBABILITY[position];
  return rng.chance(leftProb) ? 'L' : 'R';
}

/**
 * Switch hitters automatically step into the opposite batter's box from the pitcher.
 */
export function resolveEffectiveBatSide(
  bats: BatsHand,
  pitcherThrows: ThrowsHand,
): EffectiveBatSide {
  if (bats === 'S') {
    return pitcherThrows === 'R' ? 'L' : 'R';
  }
  return bats;
}

/**
 * Computes tactical platoon advantages & handedness traits for a batter-vs-pitcher duel.
 */
export function evaluatePlatoonMatchup(
  bats: BatsHand,
  pitcherThrows: ThrowsHand,
): PlatoonMatchupEffect {
  const effectiveBatSide = resolveEffectiveBatSide(bats, pitcherThrows);
  const oppositeHand = effectiveBatSide !== pitcherThrows;
  const firstBaseStepBonus = effectiveBatSide === 'L' ? 4 : 0;

  if (oppositeHand) {
    return {
      effectiveBatSide,
      advantage: 'batter',
      isSwitchHitterEdge: bats === 'S',
      batterContactDelta: 6,
      batterPowerDelta: 4,
      pitcherBreakDelta: -3,
      firstBaseStepBonus,
      label: bats === 'S' ? 'Switch-Hitter Platoon Edge' : 'Batter Platoon Edge',
    };
  }

  return {
    effectiveBatSide,
    advantage: 'pitcher',
    isSwitchHitterEdge: false,
    batterContactDelta: -5,
    batterPowerDelta: -4,
    pitcherBreakDelta: 6,
    firstBaseStepBonus,
    label: pitcherThrows === 'L' ? 'Lefty-on-Lefty Pitcher Edge' : 'Righty-on-Righty Pitcher Edge',
  };
}

/**
 * Positional handedness traits outside the direct batter-pitcher duel:
 * - LHP get a hold-runner / pickoff bonus against steals.
 * - Lefty 1B get a stretch & scoop fielding edge.
 */
export function getPositionalHandednessBonus(
  position: FieldPosition,
  throws: ThrowsHand,
): { pickoffHoldBonus: number; firstBaseScoopBonus: number } {
  return {
    pickoffHoldBonus: (position === 'SP' || position === 'RP') && throws === 'L' ? 7 : 0,
    firstBaseScoopBonus: position === '1B' && throws === 'L' ? 6 : 0,
  };
}
