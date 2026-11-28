import type { Player } from '../models/player';
import { evaluatePlayerRelicBonuses } from './relics';

export const NEUTRAL_LUCK = 50;

/**
 * Resolves a player's effective Luck rating (1..99), combining base `ratings.luck`
 * with any equipped Relic `+LUCK` bonuses so lucky gear genuinely affects every roll.
 */
export function computeEffectiveLuck(
  player: Pick<Player, 'ratings'> & { equippedRelicIds?: readonly string[] },
  explicitRelicLuckBonus?: number,
): number {
  const relicLuck =
    explicitRelicLuckBonus ??
    (player.equippedRelicIds?.length
      ? evaluatePlayerRelicBonuses({ equippedRelicIds: [...player.equippedRelicIds] }).luck
      : 0);
  const raw = (player.ratings.luck ?? NEUTRAL_LUCK) + relicLuck;
  return Math.max(1, Math.min(99, Math.round(raw)));
}

/** Normalizes effective Luck (`1..99`) into a centered factor in `[-0.98, +0.98]`. */
export function getCenteredLuck(effectiveLuck: number): number {
  const clamped = Math.max(1, Math.min(99, effectiveLuck));
  return Number(((clamped - NEUTRAL_LUCK) / NEUTRAL_LUCK).toFixed(4));
}

/** Produces a strictly subtle additive probability nudge (`±maxAbsDelta`) from Luck. */
export function luckMicroDelta(effectiveLuck: number, maxAbsDelta: number): number {
  return Number((getCenteredLuck(effectiveLuck) * maxAbsDelta).toFixed(4));
}

/** Produces a subtle multiplicative factor (`1 ± maxSwing`) from Luck (e.g., error or injury protection). */
export function luckScaleMultiplier(effectiveLuck: number, maxSwing: number): number {
  return Number((1 + getCenteredLuck(effectiveLuck) * maxSwing).toFixed(4));
}

/**
 * Computes a subtle head-to-head Luck shift favoring the primary actor (`actorLuck`)
 * while lightly accounting for the opponent's Luck (`opponentLuck`), tightly bounded so skill dominates.
 */
export function computeContestLuckDelta(
  actorLuck: number,
  opponentLuck: number,
  maxAbsDelta: number,
): number {
  const net = getCenteredLuck(actorLuck) - getCenteredLuck(opponentLuck) * 0.5;
  const clampedNet = Math.max(-1.25, Math.min(1.25, net));
  return Number((clampedNet * maxAbsDelta).toFixed(4));
}
