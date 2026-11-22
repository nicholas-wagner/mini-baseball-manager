import { isPitcherPosition, type FormState, type Player, type PlayerSeasonStats } from '../models/player';

export interface FormStatModifiers {
  contactDelta: number;
  powerDelta: number;
  stuffDelta: number;
  controlDelta: number;
  clutchDelta: number;
}

const FORM_MODIFIERS: Readonly<Record<FormState, FormStatModifiers>> = {
  blazing: { contactDelta: 8, powerDelta: 9, stuffDelta: 7, controlDelta: 6, clutchDelta: 8 },
  hot: { contactDelta: 4, powerDelta: 5, stuffDelta: 4, controlDelta: 3, clutchDelta: 4 },
  neutral: { contactDelta: 0, powerDelta: 0, stuffDelta: 0, controlDelta: 0, clutchDelta: 0 },
  cold: { contactDelta: -4, powerDelta: -4, stuffDelta: -4, controlDelta: -3, clutchDelta: -3 },
  frozen: { contactDelta: -8, powerDelta: -8, stuffDelta: -7, controlDelta: -6, clutchDelta: -7 },
};

function clampFormScore(score: number): number {
  return Math.max(-100, Math.min(100, Math.round(score)));
}

/** Maps a -100..+100 rolling form score onto the 5 visible player form states. */
export function deriveFormState(formScore: number): FormState {
  if (formScore >= 60) return 'blazing';
  if (formScore >= 25) return 'hot';
  if (formScore <= -60) return 'frozen';
  if (formScore <= -25) return 'cold';
  return 'neutral';
}

/** Returns rating deltas applied during live simulation based on player hot/cold form. */
export function getFormStatModifiers(formState: FormState): FormStatModifiers {
  return FORM_MODIFIERS[formState];
}

/** Computes post-game momentum shift from box-score batting or pitching performance. */
export function computeGameFormDelta(
  isPitcher: boolean,
  delta: PlayerSeasonStats | undefined,
): number {
  if (!delta || delta.games === 0) return 0;

  if (isPitcher) {
    const score =
      delta.inningsPitchedOuts * 0.6 +
      delta.pitchingStrikeouts * 2.2 -
      delta.earnedRuns * 5.5 +
      delta.wins * 6 -
      delta.losses * 5;
    return Math.round(Math.max(-28, Math.min(28, score)));
  }

  const hitterScore =
    delta.hits * 6 +
    delta.homeRuns * 10 +
    delta.rbis * 2 +
    delta.walks * 2 -
    Math.max(0, delta.atBats - delta.hits) * 3 -
    delta.strikeouts * 3;
  return Math.round(Math.max(-28, Math.min(28, hitterScore)));
}

/** Updates a player's rolling formScore (with gentle mean reversion) and formState after a game. */
export function updatePlayerFormAfterGame(
  player: Player,
  delta: PlayerSeasonStats | undefined,
): Player {
  const shift = computeGameFormDelta(isPitcherPosition(player.position), delta);
  const dampedPrev = Math.round(player.formScore * 0.85);
  const nextScore = clampFormScore(dampedPrev + shift);
  return {
    ...player,
    formScore: nextScore,
    formState: deriveFormState(nextScore),
  };
}

/** Applies a film-room / pep-talk slump buster recovering cold form toward neutral. */
export function applySlumpBuster(player: Player, boostAmount = 35): Player {
  const nextScore = clampFormScore(
    player.formScore < 0
      ? Math.min(10, player.formScore + Math.abs(boostAmount))
      : player.formScore + Math.round(boostAmount * 0.35),
  );
  return {
    ...player,
    formScore: nextScore,
    formState: deriveFormState(nextScore),
  };
}
