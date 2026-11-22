import type { FieldPosition } from '../handedness/types';
import {
  isPitcherPosition,
  type CoEdSpecialTraitId,
  type PitchType,
  type Player,
  type PlayerRatings,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';

export type AthletePresentation = 'male' | 'female';

export type CoEdSynergyId =
  | 'balanced_harmony'
  | 'calm_in_storm'
  | 'thunder_anchor'
  | 'bash_bro_chaos'
  | 'precision_swarm';

export interface CoEdTraitEffect {
  contactDelta: number;
  powerDelta: number;
  eyeDelta: number;
  movementDelta: number;
  controlDelta: number;
  chaseRateDelta: number;
  fastballDrainScale: number;
  breakingHangScale: number;
  slumpResistance: number;
  errorMultiplier: number;
}

export interface CoEdClubhouseSynergy {
  id: CoEdSynergyId;
  label: string;
  summary: string;
  maleCount: number;
  femaleCount: number;
  contactDelta: number;
  powerDelta: number;
  eyeDelta: number;
  velocityDelta: number;
  movementDelta: number;
  controlDelta: number;
  fieldingDelta: number;
  hypeMultiplierBonus: number;
}

const BREAKING_OR_OFFSPEED_PITCHES = new Set<PitchType>([
  'slider',
  'curveball',
  'changeup',
  'splitter',
  'knuckleball',
]);

function clampRating(value: number, maxCap: number): number {
  return Math.max(25, Math.min(maxCap, Math.round(value)));
}

function resolvePresentation(player: Pick<Player, 'traits'>): AthletePresentation {
  return player.traits.playerLook === 'female' ? 'female' : 'male';
}

function applyDeltaPatch(
  ratings: PlayerRatings,
  caps: PlayerRatings,
  patch: Partial<Record<keyof PlayerRatings, number>>,
): PlayerRatings {
  const next = { ...ratings };
  for (const [key, delta] of Object.entries(patch) as [keyof PlayerRatings, number][]) {
    next[key] = clampRating(next[key] + delta, caps[key]);
  }
  return next;
}

/** Applies balanced, equal-OVR classic male vs. female attribute tilts. */
export function applyCoEdAttributeTilt(
  ratings: PlayerRatings,
  statCaps: PlayerRatings,
  presentation: AthletePresentation,
  position: FieldPosition,
): PlayerRatings {
  const pitcher = isPitcherPosition(position);
  if (presentation === 'male') {
    return pitcher
      ? applyDeltaPatch(ratings, statCaps, {
          velocity: 6,
          stamina: 3,
          movement: -4,
          control: -4,
        })
      : applyDeltaPatch(ratings, statCaps, {
          power: 6,
          gapPower: 3,
          arm: 4,
          contact: -4,
          eye: -4,
          fielding: -3,
          range: -3,
        });
  }

  return pitcher
    ? applyDeltaPatch(ratings, statCaps, {
        movement: 5,
        control: 5,
        fielding: 3,
        popularity: 6,
        velocity: -5,
        stamina: -2,
      })
    : applyDeltaPatch(ratings, statCaps, {
        contact: 5,
        eye: 5,
        speed: 4,
        fielding: 4,
        range: 4,
        popularity: 6,
        power: -5,
        arm: -3,
      });
}

/** Computes a modest, balanced attendance multiplier (0.98..1.08) driven by roster Popularity. */
export function computeRosterPopularityAttendanceMultiplier(
  roster: readonly Pick<Player, 'ratings'>[],
): number {
  if (roster.length === 0) return 1;
  const avgPop =
    roster.reduce((sum, p) => sum + p.ratings.popularity, 0) / roster.length;
  // Subtle ~1-6% gate boost for fan-favorite rosters (baseline 55 pop = 1.00x)
  const delta = (avgPop - 55) * 0.0022;
  return Number(Math.max(0.96, Math.min(1.08, 1 + delta)).toFixed(4));
}

/** Rolls a complementary male or female signature trait matched to player role. */
export function rollCoEdSpecialTrait(
  rng: SeededRng,
  presentation: AthletePresentation,
  position: FieldPosition,
): CoEdSpecialTraitId {
  const pitcher = isPitcherPosition(position);
  if (presentation === 'male') {
    return pitcher
      ? rng.pick(['iron_shoulder', 'thunder_bravado'] as const)
      : rng.pick(['cleanup_enforcer', 'thunder_bravado'] as const);
  }
  return pitcher
    ? rng.pick(['crafty_spin_wizard', 'tactical_poise'] as const)
    : rng.pick(['precision_spark', 'tactical_poise'] as const);
}

const NEUTRAL_COED_EFFECT: CoEdTraitEffect = {
  contactDelta: 0,
  powerDelta: 0,
  eyeDelta: 0,
  movementDelta: 0,
  controlDelta: 0,
  chaseRateDelta: 0,
  fastballDrainScale: 1,
  breakingHangScale: 1,
  slumpResistance: 0,
  errorMultiplier: 1,
};

type TraitCtx = { leverageIndex: number; hasRisp: boolean; pitchType?: PitchType };

const COED_TRAIT_EVALUATORS: Readonly<
  Record<CoEdSpecialTraitId, (ctx: TraitCtx) => Partial<CoEdTraitEffect>>
> = {
  thunder_bravado: (ctx) => ({
    powerDelta: ctx.leverageIndex >= 1.55 ? 4 : 2,
    chaseRateDelta: 0.04,
  }),
  cleanup_enforcer: (ctx) => ({
    powerDelta: ctx.hasRisp ? 4 : 1,
    eyeDelta: ctx.hasRisp ? 1 : 0,
  }),
  iron_shoulder: () => ({ fastballDrainScale: 0.9 }),
  tactical_poise: (ctx) => ({
    eyeDelta: ctx.leverageIndex >= 1.55 ? 3 : 1,
    controlDelta: ctx.leverageIndex >= 1.55 ? 3 : 1,
    slumpResistance: 0.3,
    errorMultiplier: 0.85,
  }),
  precision_spark: () => ({ contactDelta: 3, eyeDelta: 2, errorMultiplier: 0.92 }),
  crafty_spin_wizard: (ctx) => ({
    movementDelta:
      ctx.pitchType && BREAKING_OR_OFFSPEED_PITCHES.has(ctx.pitchType) ? 5 : 1,
    breakingHangScale: 0.75,
  }),
};

/** Evaluates live per-pitch tactical modifiers from an athlete's co-ed special trait. */
export function evaluateCoEdPlayerTraitEffect(
  player: Pick<Player, 'coEdTrait'>,
  ctx: TraitCtx,
): CoEdTraitEffect {
  return {
    ...NEUTRAL_COED_EFFECT,
    ...COED_TRAIT_EVALUATORS[player.coEdTrait](ctx),
  };
}

/** Evaluates clubhouse roster-composition synergies across mixed, splash, all-male, and all-female rosters. */
export function evaluateCoEdClubhouseSynergy(
  roster: readonly Pick<Player, 'traits'>[],
): CoEdClubhouseSynergy {
  let maleCount = 0;
  let femaleCount = 0;
  for (const player of roster) {
    if (resolvePresentation(player) === 'female') femaleCount += 1;
    else maleCount += 1;
  }

  const total = Math.max(1, maleCount + femaleCount);
  const femaleRatio = femaleCount / total;

  if (femaleCount === 0) {
    return {
      id: 'bash_bro_chaos',
      label: 'Bash-Bro Chaos (All-Male)',
      summary: 'Explosive HR/velocity punch & hype spikes, but looser discipline & command.',
      maleCount,
      femaleCount,
      contactDelta: 0,
      powerDelta: 3,
      eyeDelta: -3,
      velocityDelta: 3,
      movementDelta: 0,
      controlDelta: -3,
      fieldingDelta: -1,
      hypeMultiplierBonus: 0.15,
    };
  }

  if (maleCount === 0) {
    return {
      id: 'precision_swarm',
      label: 'Precision Swarm (All-Female)',
      summary: 'Relentless contact, wicked spin & iron defense, trading away effortless HR/velo thunder.',
      maleCount,
      femaleCount,
      contactDelta: 3,
      powerDelta: -3,
      eyeDelta: 2,
      velocityDelta: -3,
      movementDelta: 3,
      controlDelta: 2,
      fieldingDelta: 3,
      hypeMultiplierBonus: 0.05,
    };
  }

  if (femaleRatio < 0.3) {
    return {
      id: 'calm_in_storm',
      label: 'Calm in the Storm (Male Core + Female Splash)',
      summary: 'Key female specialists stabilize command, poise & defense inside a power-heavy roster.',
      maleCount,
      femaleCount,
      contactDelta: 1,
      powerDelta: 2,
      eyeDelta: 1,
      velocityDelta: 2,
      movementDelta: 1,
      controlDelta: 2,
      fieldingDelta: 1,
      hypeMultiplierBonus: 0.08,
    };
  }

  if (femaleRatio > 0.7) {
    return {
      id: 'thunder_anchor',
      label: 'Thunder Anchor (Female Core + Male Splash)',
      summary: 'Key male sluggers & flamethrowers add middle-order thunder to a high-OBP precision squad.',
      maleCount,
      femaleCount,
      contactDelta: 2,
      powerDelta: 2,
      eyeDelta: 1,
      velocityDelta: 2,
      movementDelta: 2,
      controlDelta: 1,
      fieldingDelta: 1,
      hypeMultiplierBonus: 0.08,
    };
  }

  return {
    id: 'balanced_harmony',
    label: 'Total Baseball Harmony (Balanced Co-Ed)',
    summary: 'Table-setter precision, spin & poise feed cleanup thunder for complete roster balance.',
    maleCount,
    femaleCount,
    contactDelta: 2,
    powerDelta: 2,
    eyeDelta: 1,
    velocityDelta: 1,
    movementDelta: 1,
    controlDelta: 2,
    fieldingDelta: 1,
    hypeMultiplierBonus: 0.1,
  };
}
