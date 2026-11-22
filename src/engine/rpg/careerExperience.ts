import type { FieldPosition } from '../handedness/types';
import {
  isPitcherPosition,
  type CareerExperienceTier,
  type CareerServiceProfile,
  type PlayerMarketTier,
  type PlayerSeasonStats,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';

export interface VeteranSavvyModifiers {
  eyeDelta: number;
  controlDelta: number;
  composureDelta: number;
  rustMultiplier: number;
}

/** Realistic slow-burn RPG XP threshold per level (200 -> 400 -> 600...). */
export function xpRequiredForNextLevel(level: number): number {
  return Math.max(1, level) * 200;
}

/** Maps slow-earned 0..100 career experience score onto canonical experience tiers. */
export function deriveExperienceTier(score: number): CareerExperienceTier {
  if (score >= 70) return 'cagey_veteran';
  if (score >= 40) return 'seasoned';
  if (score >= 15) return 'developing';
  return 'rookie_green';
}

/** Computes slow-burn career experience (0..100) from seasons, games, PAs/IP, and playoffs. */
export function computeCareerExperienceScore(
  seasonsPlayed: number,
  careerStats: Pick<
    PlayerSeasonStats,
    'games' | 'plateAppearances' | 'atBats' | 'walks' | 'inningsPitchedOuts'
  >,
  careerPlayoffGames: number,
): number {
  const pa = careerStats.plateAppearances || careerStats.atBats + careerStats.walks;
  const ip = careerStats.inningsPitchedOuts / 3;
  const raw =
    seasonsPlayed * 7.5 +
    careerStats.games * 0.28 +
    pa * 0.035 +
    ip * 0.14 +
    careerPlayoffGames * 1.6;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Seeds realistic initial career service matching a player's market tier and age. */
export function rollInitialCareerService(
  rng: SeededRng,
  marketTier: PlayerMarketTier,
  age: number,
  position: FieldPosition,
): CareerServiceProfile {
  if (marketTier === 'rookie') {
    const score = rng.int(0, 4);
    return {
      seasonsPlayed: 0,
      careerPlayoffGames: 0,
      experienceScore: score,
      experienceTier: deriveExperienceTier(score),
    };
  }

  const seasonsPlayed =
    marketTier === 'veteran'
      ? rng.int(7, 12)
      : Math.max(1, Math.min(8, age - 20 + rng.int(-1, 1)));
  const gamesPerSeason = isPitcherPosition(position) ? rng.int(8, 16) : rng.int(15, 20);
  const impliedGames = seasonsPlayed * gamesPerSeason;
  const impliedPlayoffs =
    marketTier === 'veteran' || marketTier === 'all_star'
      ? rng.int(2, seasonsPlayed)
      : rng.int(0, Math.max(1, Math.floor(seasonsPlayed * 0.5)));
  const impliedPa = isPitcherPosition(position) ? 0 : impliedGames * 4;
  const impliedOuts = isPitcherPosition(position) ? impliedGames * 12 : 0;

  const experienceScore = computeCareerExperienceScore(
    seasonsPlayed,
    {
      games: impliedGames,
      plateAppearances: impliedPa,
      atBats: impliedPa,
      walks: 0,
      inningsPitchedOuts: impliedOuts,
    },
    impliedPlayoffs,
  );
  return {
    seasonsPlayed,
    careerPlayoffGames: impliedPlayoffs,
    experienceScore,
    experienceTier: deriveExperienceTier(experienceScore),
  };
}

/** Increments career experience slowly after a completed game without dropping prior veteran floor. */
export function updateCareerServiceAfterGame(
  current: CareerServiceProfile,
  careerStats: Pick<
    PlayerSeasonStats,
    'games' | 'plateAppearances' | 'atBats' | 'walks' | 'inningsPitchedOuts'
  >,
  wasPlayoffGame: boolean,
): CareerServiceProfile {
  const nextPlayoffs = current.careerPlayoffGames + (wasPlayoffGame ? 1 : 0);
  const computed = computeCareerExperienceScore(
    current.seasonsPlayed,
    careerStats,
    nextPlayoffs,
  );
  const experienceScore = Math.min(100, Math.max(current.experienceScore, computed));
  return {
    seasonsPlayed: current.seasonsPlayed,
    careerPlayoffGames: nextPlayoffs,
    experienceScore,
    experienceTier: deriveExperienceTier(experienceScore),
  };
}

/** Credits one completed season of pro service and recalculates experience tier. */
export function advanceCareerServiceForSeason(
  current: CareerServiceProfile,
  careerStats: Pick<
    PlayerSeasonStats,
    'games' | 'plateAppearances' | 'atBats' | 'walks' | 'inningsPitchedOuts'
  >,
): CareerServiceProfile {
  const nextSeasons = current.seasonsPlayed + 1;
  const computed = computeCareerExperienceScore(
    nextSeasons,
    careerStats,
    current.careerPlayoffGames,
  );
  const experienceScore = Math.min(100, Math.max(current.experienceScore + 6, computed));
  return {
    seasonsPlayed: nextSeasons,
    careerPlayoffGames: current.careerPlayoffGames,
    experienceScore,
    experienceTier: deriveExperienceTier(experienceScore),
  };
}

const BASE_SAVVY_BY_TIER: Readonly<
  Record<CareerExperienceTier, { eyeDelta: number; controlDelta: number; highLiDelta: number; rustMultiplier: number }>
> = {
  rookie_green: { eyeDelta: 0, controlDelta: 0, highLiDelta: -2, rustMultiplier: 1.0 },
  developing: { eyeDelta: 0, controlDelta: 0, highLiDelta: 0, rustMultiplier: 1.0 },
  seasoned: { eyeDelta: 1, controlDelta: 1, highLiDelta: 1, rustMultiplier: 0.92 },
  cagey_veteran: { eyeDelta: 3, controlDelta: 3, highLiDelta: 2, rustMultiplier: 0.85 },
};

/** Returns subtle veteran discipline/control/composure advantage over green rookies. */
export function evaluateVeteranSavvyEdge(
  tier: CareerExperienceTier,
  leverageIndex: number,
): VeteranSavvyModifiers {
  const spec = BASE_SAVVY_BY_TIER[tier];
  return {
    eyeDelta: spec.eyeDelta,
    controlDelta: spec.controlDelta,
    composureDelta: leverageIndex >= 1.55 ? spec.highLiDelta : 0,
    rustMultiplier: spec.rustMultiplier,
  };
}
