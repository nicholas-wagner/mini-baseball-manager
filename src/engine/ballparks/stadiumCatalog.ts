import {
  LEAGUE_TIER_ORDER,
  type Club,
  type LeagueTierId,
} from '../models/club';

export type BallparkPresetId =
  | 'sandlot_commons'
  | 'brickyard_classic'
  | 'bayfront_cove'
  | 'high_altitude_mesa'
  | 'neon_metro_dome'
  | 'cornfield_twilight'
  | 'harbor_shipyard'
  | 'sakura_garden'
  | 'sunbelt_cactus'
  | 'grand_cathedral';

export interface ParkFactors {
  leftWallFt: number;
  centerWallFt: number;
  rightWallFt: number;
  leftWallHeightFt: number;
  surface: 'natural_grass' | 'fast_turf';
  isDome: boolean;
  hrFactor: number;
  leftyHrFactor: number;
  rightyHrFactor: number;
  doublesTriplesFactor: number;
  groundballSpeedFactor: number;
}

export interface BallparkVisualPalette {
  grassColor: string;
  wallColor: string;
  skyTint: string;
  sceneryStyle: string;
}

export interface BallparkPreset {
  id: BallparkPresetId;
  name: string;
  tagline: string;
  unlockTier: LeagueTierId;
  commissionCost: number;
  baseCapacity: number;
  factors: ParkFactors;
  visualPalette: BallparkVisualPalette;
}

/** Catalog of 10 handcrafted 90s retro ballparks with authentic simulation Park Factors & 3D themes. */
export const BALLPARK_CATALOG: readonly BallparkPreset[] = [
  {
    id: 'sandlot_commons',
    name: 'Sandlot Commons',
    tagline: 'Cozy neighborhood diamond with pine trees and chain-link nostalgia',
    unlockTier: 'rookie',
    commissionCost: 0,
    baseCapacity: 1_400,
    factors: {
      leftWallFt: 325,
      centerWallFt: 392,
      rightWallFt: 325,
      leftWallHeightFt: 10,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 1.0,
      leftyHrFactor: 1.0,
      rightyHrFactor: 1.0,
      doublesTriplesFactor: 1.0,
      groundballSpeedFactor: 1.0,
    },
    visualPalette: {
      grassColor: '#2FB356',
      wallColor: '#1B4332',
      skyTint: '#8ECAE6',
      sceneryStyle: 'suburban_pines',
    },
  },
  {
    id: 'brickyard_classic',
    name: 'Brickyard Classic',
    tagline: 'Downtown red-brick jewel box with a towering 37-ft Emerald Wall in left',
    unlockTier: 'low_a',
    commissionCost: 9_000,
    baseCapacity: 3_600,
    factors: {
      leftWallFt: 310,
      centerWallFt: 395,
      rightWallFt: 320,
      leftWallHeightFt: 37,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 0.98,
      leftyHrFactor: 1.06,
      rightyHrFactor: 0.9,
      doublesTriplesFactor: 1.18,
      groundballSpeedFactor: 1.0,
    },
    visualPalette: {
      grassColor: '#279B48',
      wallColor: '#14532D',
      skyTint: '#93C5FD',
      sceneryStyle: 'downtown_bricks',
    },
  },
  {
    id: 'cornfield_twilight',
    name: 'Cornfield Twilight Park',
    tagline: 'Heartland timber grandstands glowing under golden-hour farm skies',
    unlockTier: 'low_a',
    commissionCost: 8_500,
    baseCapacity: 3_200,
    factors: {
      leftWallFt: 330,
      centerWallFt: 400,
      rightWallFt: 330,
      leftWallHeightFt: 10,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 1.04,
      leftyHrFactor: 1.04,
      rightyHrFactor: 1.04,
      doublesTriplesFactor: 1.02,
      groundballSpeedFactor: 1.0,
    },
    visualPalette: {
      grassColor: '#34A853',
      wallColor: '#3F6212',
      skyTint: '#FDBA74',
      sceneryStyle: 'heartland_cornfield',
    },
  },
  {
    id: 'harbor_shipyard',
    name: 'Harbor Shipyard Yard',
    tagline: 'Industrial dockside cranes with an ultra-short 312-ft lefty pull porch in right',
    unlockTier: 'high_a',
    commissionCost: 15_000,
    baseCapacity: 5_800,
    factors: {
      leftWallFt: 338,
      centerWallFt: 404,
      rightWallFt: 312,
      leftWallHeightFt: 12,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 1.07,
      leftyHrFactor: 1.24,
      rightyHrFactor: 0.93,
      doublesTriplesFactor: 0.98,
      groundballSpeedFactor: 1.01,
    },
    visualPalette: {
      grassColor: '#228B44',
      wallColor: '#1E3A5F',
      skyTint: '#7DD3FC',
      sceneryStyle: 'harbor_cranes',
    },
  },
  {
    id: 'bayfront_cove',
    name: 'Bayfront Cove Park',
    tagline: 'Swirling ocean breezes and deep power alleys — a true pitchers sanctuary',
    unlockTier: 'high_a',
    commissionCost: 16_000,
    baseCapacity: 6_400,
    factors: {
      leftWallFt: 339,
      centerWallFt: 410,
      rightWallFt: 335,
      leftWallHeightFt: 16,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 0.85,
      leftyHrFactor: 0.84,
      rightyHrFactor: 0.86,
      doublesTriplesFactor: 1.1,
      groundballSpeedFactor: 0.97,
    },
    visualPalette: {
      grassColor: '#1E824C',
      wallColor: '#0F4C5C',
      skyTint: '#BAE6FD',
      sceneryStyle: 'ocean_bay_boats',
    },
  },
  {
    id: 'sunbelt_cactus',
    name: 'Sunbelt Cactus Field',
    tagline: 'Dry desert heat, terracotta mesas, lively fly carry & fast hardpan infield',
    unlockTier: 'aa',
    commissionCost: 24_000,
    baseCapacity: 9_200,
    factors: {
      leftWallFt: 326,
      centerWallFt: 398,
      rightWallFt: 326,
      leftWallHeightFt: 9,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 1.11,
      leftyHrFactor: 1.11,
      rightyHrFactor: 1.11,
      doublesTriplesFactor: 1.07,
      groundballSpeedFactor: 1.07,
    },
    visualPalette: {
      grassColor: '#4D9E38',
      wallColor: '#9A3412',
      skyTint: '#FDE68A',
      sceneryStyle: 'desert_red_rocks',
    },
  },
  {
    id: 'sakura_garden',
    name: 'Sakura Garden Stadium',
    tagline: 'Crisp dirt infield, deep symmetrical outfield & roaring brass-band stands',
    unlockTier: 'aa',
    commissionCost: 26_000,
    baseCapacity: 11_000,
    factors: {
      leftWallFt: 335,
      centerWallFt: 408,
      rightWallFt: 335,
      leftWallHeightFt: 14,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 0.93,
      leftyHrFactor: 0.93,
      rightyHrFactor: 0.93,
      doublesTriplesFactor: 1.04,
      groundballSpeedFactor: 1.05,
    },
    visualPalette: {
      grassColor: '#25964A',
      wallColor: '#1E293B',
      skyTint: '#FBCFE8',
      sceneryStyle: 'sakura_blossoms',
    },
  },
  {
    id: 'high_altitude_mesa',
    name: 'High-Altitude Mesa Park',
    tagline: 'Mile-high mountain air where line drives scream and fly balls soar into orbit',
    unlockTier: 'aaa',
    commissionCost: 38_000,
    baseCapacity: 16_500,
    factors: {
      leftWallFt: 332,
      centerWallFt: 405,
      rightWallFt: 332,
      leftWallHeightFt: 11,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 1.22,
      leftyHrFactor: 1.22,
      rightyHrFactor: 1.22,
      doublesTriplesFactor: 1.14,
      groundballSpeedFactor: 1.04,
    },
    visualPalette: {
      grassColor: '#2E9D52',
      wallColor: '#3B0764',
      skyTint: '#C4B5FD',
      sceneryStyle: 'snowy_peaks',
    },
  },
  {
    id: 'neon_metro_dome',
    name: 'Neon Metro Dome',
    tagline: 'Climate-controlled 90s retro indoor dome with lightning-fast artificial turf',
    unlockTier: 'aaa',
    commissionCost: 42_000,
    baseCapacity: 19_000,
    factors: {
      leftWallFt: 328,
      centerWallFt: 400,
      rightWallFt: 328,
      leftWallHeightFt: 14,
      surface: 'fast_turf',
      isDome: true,
      hrFactor: 1.02,
      leftyHrFactor: 1.02,
      rightyHrFactor: 1.02,
      doublesTriplesFactor: 1.12,
      groundballSpeedFactor: 1.15,
    },
    visualPalette: {
      grassColor: '#00C853',
      wallColor: '#0F172A',
      skyTint: '#312E81',
      sceneryStyle: 'retro_dome_neon',
    },
  },
  {
    id: 'grand_cathedral',
    name: 'Grand Cathedral Colosseum',
    tagline: 'Double-deck Mini Major League monument built for World Championship drama',
    unlockTier: 'majors',
    commissionCost: 75_000,
    baseCapacity: 30_000,
    factors: {
      leftWallFt: 330,
      centerWallFt: 404,
      rightWallFt: 326,
      leftWallHeightFt: 12,
      surface: 'natural_grass',
      isDome: false,
      hrFactor: 1.05,
      leftyHrFactor: 1.08,
      rightyHrFactor: 1.02,
      doublesTriplesFactor: 1.03,
      groundballSpeedFactor: 1.02,
    },
    visualPalette: {
      grassColor: '#1E8E3E',
      wallColor: '#1D3557',
      skyTint: '#60A5FA',
      sceneryStyle: 'monument_skyline',
    },
  },
];

const PARKS_BY_TIER_ROTATION: Readonly<Record<LeagueTierId, readonly BallparkPresetId[]>> = {
  rookie: ['sandlot_commons', 'cornfield_twilight', 'brickyard_classic', 'sandlot_commons'],
  low_a: ['brickyard_classic', 'cornfield_twilight', 'harbor_shipyard', 'bayfront_cove'],
  high_a: ['harbor_shipyard', 'bayfront_cove', 'sunbelt_cactus', 'brickyard_classic'],
  aa: ['sunbelt_cactus', 'sakura_garden', 'bayfront_cove', 'harbor_shipyard'],
  aaa: ['high_altitude_mesa', 'neon_metro_dome', 'sakura_garden', 'sunbelt_cactus'],
  majors: ['grand_cathedral', 'neon_metro_dome', 'high_altitude_mesa', 'sakura_garden', 'brickyard_classic', 'bayfront_cove', 'harbor_shipyard', 'sunbelt_cactus'],
};

export function getBallparkPreset(id?: BallparkPresetId): BallparkPreset {
  return BALLPARK_CATALOG.find((p) => p.id === id) ?? BALLPARK_CATALOG[0];
}

export function pickBallparkForClub(tier: LeagueTierId, clubIndex: number): BallparkPresetId {
  const list = PARKS_BY_TIER_ROTATION[tier];
  return list[Math.abs(clubIndex) % list.length];
}

/** Computes live simulation HR, XBH, and groundball-speed modifiers for the host ballpark & batter side. */
export function evaluateParkHitMultipliers(
  ballparkId: BallparkPresetId | undefined,
  effectiveBatSide: 'L' | 'R',
): { hrMultiplier: number; xbhMultiplier: number; groundballHitBonus: number } {
  const { factors } = getBallparkPreset(ballparkId);
  const hrMultiplier = effectiveBatSide === 'L' ? factors.leftyHrFactor : factors.rightyHrFactor;
  const groundballHitBonus = Number(((factors.groundballSpeedFactor - 1) * 0.16).toFixed(4));
  return {
    hrMultiplier,
    xbhMultiplier: factors.doublesTriplesFactor,
    groundballHitBonus,
  };
}

/** Commissions/relocates a club to a new home stadium archetype if unlocked at their tier & affordable. */
export function commissionHomeBallpark(
  club: Club,
  targetBallparkId: BallparkPresetId,
): { commissioned: boolean; reason?: string; club: Club } {
  const preset = getBallparkPreset(targetBallparkId);
  if (club.stadium.ballparkId === preset.id) {
    return { commissioned: false, reason: `Already playing home games at ${preset.name}.`, club };
  }

  const currentRank = LEAGUE_TIER_ORDER.indexOf(club.leagueTier);
  const requiredRank = LEAGUE_TIER_ORDER.indexOf(preset.unlockTier);
  if (currentRank < requiredRank) {
    return {
      commissioned: false,
      reason: `${preset.name} unlocks at ${preset.unlockTier.toUpperCase()} tier or higher.`,
      club,
    };
  }

  if (club.economy.cash < preset.commissionCost) {
    return {
      commissioned: false,
      reason: `Need $${preset.commissionCost.toLocaleString()} to commission ${preset.name}.`,
      club,
    };
  }

  return {
    commissioned: true,
    club: {
      ...club,
      stadium: {
        ...club.stadium,
        ballparkId: preset.id,
        name: `${club.city} ${preset.name}`,
        themeId: preset.id,
        capacity: Math.max(club.stadium.capacity, preset.baseCapacity),
      },
      economy: {
        ...club.economy,
        cash: club.economy.cash - preset.commissionCost,
      },
    },
  };
}
