import type { CareerExperienceTier, PressureResponseProfile } from '../models/player';

export type CrowdHeatTier = 'quiet' | 'lively' | 'fired_up' | 'deafening';

export interface HomeFieldInput {
  inning: number;
  maxInnings: number;
  homeScore: number;
  awayScore: number;
  runnersOnBase: number;
  outs: number;
  /** Ratio of home attendance vs tier cap (0.2..1.0), defaults to 0.55. */
  homeAttendanceRatio?: number;
  /** Home club hype (0..100), defaults to 50. */
  homeTeamHype?: number;
  promoActive?: boolean;
  /** Consecutive hits/baserunners by home club in current rally (0..5). */
  homeRallyStreak?: number;
  /** Temporary spike from interactive Mascot Stadium Wave (0..20). */
  stadiumWaveBoost?: number;
  isPlayoffs?: boolean;
}

export interface HomeFieldEffect {
  crowdEnergy: number; // 0..100
  tier: CrowdHeatTier;
  badgeLabel: string | null;
  homeBatterClutchDelta: number;
  homeBatterEyeDelta: number;
  homePitcherComposureDelta: number;
  awayPitcherControlPenalty: number; // <= 0
  homeHypeGainMultiplier: number;
  bleacherExcitement: number; // 0..1 for 3D bleachers
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function classifyCrowdTier(energy: number): { tier: CrowdHeatTier; badgeLabel: string | null } {
  if (energy >= 88) return { tier: 'deafening', badgeLabel: '🔥 DEAFENING HOME CROWD!' };
  if (energy >= 70) return { tier: 'fired_up', badgeLabel: '📣 HOME CROWD FIRED UP!' };
  if (energy >= 45) return { tier: 'lively', badgeLabel: null };
  return { tier: 'quiet', badgeLabel: null };
}

function computeSituationCrowdBoost(input: HomeFieldInput): number {
  const lateGame = input.inning >= Math.max(4, input.maxInnings - 1);
  const diff = Math.abs(input.homeScore - input.awayScore);
  const closeGameBoost = diff <= 2 ? (lateGame ? 18 : 8) : diff <= 4 ? 3 : -8;
  const homeLeadingOrTied = input.homeScore >= input.awayScore ? 4 : lateGame && diff <= 2 ? 6 : -4;
  const rallyBoost = Math.min(18, (input.homeRallyStreak ?? 0) * 6 + input.runnersOnBase * 3);
  const twoOutDrama = input.outs === 2 && diff <= 2 ? 4 : 0;
  return closeGameBoost + homeLeadingOrTied + rallyBoost + twoOutDrama;
}

const SURGE_BY_TIER: Readonly<Record<CrowdHeatTier, number>> = {
  quiet: 0,
  lively: 1,
  fired_up: 2,
  deafening: 3,
};

const AWAY_PENALTY_BY_TIER: Readonly<Record<CrowdHeatTier, number>> = {
  quiet: 0,
  lively: 0,
  fired_up: -1,
  deafening: -2,
};

/**
 * Evaluates live Home-Field Advantage and Fired-Up Crowd Momentum.
 * Home teams always enjoy subtle sightline comfort (+1), scaling cleanly when
 * attendance, Hype, Promo Nights, rallies, and Stadium Waves ignite the bleachers!
 */
export function evaluateHomeFieldAdvantage(input: HomeFieldInput): HomeFieldEffect {
  const attendance = clamp(input.homeAttendanceRatio ?? 0.55, 0.15, 1.0);
  const hype = clamp(input.homeTeamHype ?? 50, 0, 100);
  const baseEnergy = 26 + attendance * 28 + (hype - 40) * 0.28;
  const eventBoost =
    Number(Boolean(input.promoActive)) * 10 +
    Number(Boolean(input.isPlayoffs)) * 14 +
    clamp(input.stadiumWaveBoost ?? 0, 0, 20);
  const crowdEnergy = Math.round(
    clamp(baseEnergy + eventBoost + computeSituationCrowdBoost(input), 5, 100),
  );
  const { tier, badgeLabel } = classifyCrowdTier(crowdEnergy);
  const surge = SURGE_BY_TIER[tier];

  return {
    crowdEnergy,
    tier,
    badgeLabel,
    homeBatterClutchDelta: 1 + surge,
    homeBatterEyeDelta: surge >= 2 ? 2 : 1,
    homePitcherComposureDelta: 1 + Math.min(2, surge),
    awayPitcherControlPenalty: AWAY_PENALTY_BY_TIER[tier],
    homeHypeGainMultiplier: Number((1 + surge * 0.06).toFixed(2)),
    bleacherExcitement: Number(clamp(crowdEnergy / 100, 0.12, 1.0).toFixed(2)),
  };
}

/** Computes visiting pitcher's effective road-crowd control penalty after Ice Veins / Veteran resistance. */
export function adjustAwayPitcherCrowdPenalty(
  basePenalty: number,
  pressureProfile: PressureResponseProfile,
  experienceTier: CareerExperienceTier,
): number {
  if (basePenalty >= 0) return 0;
  const calmFactor =
    pressureProfile === 'ice_veins' || experienceTier === 'cagey_veteran'
      ? 0.5
      : pressureProfile === 'pressure_wilt'
        ? 1.5
        : 1.0;
  return Math.round(basePenalty * calmFactor);
}
