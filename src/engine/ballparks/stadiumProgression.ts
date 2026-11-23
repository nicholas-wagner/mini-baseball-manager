import {
  LEAGUE_TIER_ORDER,
  type Club,
  type LeagueTierId,
  type StadiumState,
} from '../models/club';

export type StadiumArchitectureClass =
  | 'neighborhood_sandlot'
  | 'community_park'
  | 'municipal_single_a'
  | 'regional_double_a'
  | 'pro_showcase_aaa'
  | 'major_league_cathedral';

export type StadiumFenceStyle = 'chain_link' | 'painted_wood' | 'brick_wall' | 'pro_padded';
export type StadiumScoreboardStyle = 'manual_wood' | 'led_line' | 'jumbo_tower' | 'hd_cathedral';

export interface StadiumTierProfile {
  tier: LeagueTierId;
  architectureClass: StadiumArchitectureClass;
  label: string;
  description: string;
  minCapacity: number;
  maxCapacity: number;
  defaultSeatingTier: 1 | 2 | 3 | 4;
  fenceStyle: StadiumFenceStyle;
  scoreboardStyle: StadiumScoreboardStyle;
  crowdDensityScale: number;
  upperDeckCount: 0 | 1 | 2;
  hasLuxurySuites: boolean;
  floodlightTowers: 0 | 2 | 4 | 6;
}

/** 6-tier Sandlot → Pro Major League capacity & 3D architecture ladder. */
export const STADIUM_TIER_PROFILES: Readonly<Record<LeagueTierId, StadiumTierProfile>> = {
  rookie: {
    tier: 'rookie',
    architectureClass: 'neighborhood_sandlot',
    label: 'Neighborhood Sandlot',
    description: 'Chain-link fence, wooden benches, backyard pines, and a hand-painted manual scoreboard.',
    minCapacity: 500,
    maxCapacity: 1_500,
    defaultSeatingTier: 1,
    fenceStyle: 'chain_link',
    scoreboardStyle: 'manual_wood',
    crowdDensityScale: 0.45,
    upperDeckCount: 0,
    hasLuxurySuites: false,
    floodlightTowers: 0,
  },
  low_a: {
    tier: 'low_a',
    architectureClass: 'community_park',
    label: 'Small-Town Community Park',
    description: 'Covered timber grandstand, first/third-base bleachers, local wall ads & starter poles.',
    minCapacity: 2_200,
    maxCapacity: 3_800,
    defaultSeatingTier: 1,
    fenceStyle: 'painted_wood',
    scoreboardStyle: 'manual_wood',
    crowdDensityScale: 0.62,
    upperDeckCount: 0,
    hasLuxurySuites: false,
    floodlightTowers: 2,
  },
  high_a: {
    tier: 'high_a',
    architectureClass: 'municipal_single_a',
    label: 'Single-A Municipal Stadium',
    description: 'Concrete & brick lower bowl wrapping down both foul lines with 4 light towers & LED board.',
    minCapacity: 4_500,
    maxCapacity: 7_000,
    defaultSeatingTier: 2,
    fenceStyle: 'brick_wall',
    scoreboardStyle: 'led_line',
    crowdDensityScale: 0.78,
    upperDeckCount: 0,
    hasLuxurySuites: false,
    floodlightTowers: 4,
  },
  aa: {
    tier: 'aa',
    architectureClass: 'regional_double_a',
    label: 'Double-A Regional Ballpark',
    description: 'Concourse roof overhang, outfield pavilion seating, club press suites & rising skyline.',
    minCapacity: 8_000,
    maxCapacity: 12_500,
    defaultSeatingTier: 2,
    fenceStyle: 'brick_wall',
    scoreboardStyle: 'led_line',
    crowdDensityScale: 0.9,
    upperDeckCount: 1,
    hasLuxurySuites: true,
    floodlightTowers: 4,
  },
  aaa: {
    tier: 'aaa',
    architectureClass: 'pro_showcase_aaa',
    label: 'Triple-A Pro Showcase Park',
    description: 'Wraparound lower deck, upper balcony grandstands, suite ribbon & towering Jumbotron.',
    minCapacity: 14_000,
    maxCapacity: 20_000,
    defaultSeatingTier: 3,
    fenceStyle: 'pro_padded',
    scoreboardStyle: 'jumbo_tower',
    crowdDensityScale: 1.0,
    upperDeckCount: 1,
    hasLuxurySuites: true,
    floodlightTowers: 6,
  },
  majors: {
    tier: 'majors',
    architectureClass: 'major_league_cathedral',
    label: 'Pro Major League Cathedral',
    description: 'Multi-deck Major League bowl, luxury suites, HD Jumbotron, mascot cannon & roaring crowds.',
    minCapacity: 28_000,
    maxCapacity: 45_000,
    defaultSeatingTier: 4,
    fenceStyle: 'pro_padded',
    scoreboardStyle: 'hd_cathedral',
    crowdDensityScale: 1.15,
    upperDeckCount: 2,
    hasLuxurySuites: true,
    floodlightTowers: 6,
  },
};

export type StadiumUpgradeId = 'seating_expansion' | 'jumbotron' | 'night_lights' | 'mascot_cannon';

export interface StadiumUpgradeSpec {
  id: StadiumUpgradeId;
  label: string;
  cost: number;
  minTier: LeagueTierId;
  description: string;
}

export const STADIUM_UPGRADE_CATALOG: readonly StadiumUpgradeSpec[] = [
  {
    id: 'seating_expansion',
    label: 'Expand Seating Deck',
    cost: 4_500,
    minTier: 'rookie',
    description: 'Adds rows/decks (+25% capacity within your league stadium band) and boosts seating tier.',
  },
  {
    id: 'night_lights',
    label: 'Stadium Floodlight Towers',
    cost: 5_000,
    minTier: 'low_a',
    description: 'Installs towering light banks, unlocking dramatic Night Games & primetime attendance boosts.',
  },
  {
    id: 'jumbotron',
    label: 'Center-Field Jumbotron',
    cost: 9_500,
    minTier: 'high_a',
    description: 'Mounts a giant glowing HD Jumbotron above center field (+5 Team Hype, bigger crowd buzz).',
  },
  {
    id: 'mascot_cannon',
    label: 'Home-Run Mascot Cannon',
    cost: 12_000,
    minTier: 'aa',
    description: 'Fires t-shirt blasts & fireworks after every home run (+8 Team Hype & fan-draw spark).',
  },
];

export function getStadiumTierProfile(tier: LeagueTierId): StadiumTierProfile {
  return STADIUM_TIER_PROFILES[tier];
}

function meetsTier(current: LeagueTierId, required: LeagueTierId): boolean {
  return LEAGUE_TIER_ORDER.indexOf(current) >= LEAGUE_TIER_ORDER.indexOf(required);
}

/** Scales stadium capacity & seating floor automatically when a club is promoted to a higher league. */
export function scaleStadiumForLeagueTier(
  stadium: StadiumState,
  targetTier: LeagueTierId,
): StadiumState {
  const profile = STADIUM_TIER_PROFILES[targetTier];
  const nextCapacity = Math.max(stadium.capacity, profile.minCapacity);
  const nextSeating = Math.max(stadium.seatingTier, profile.defaultSeatingTier) as 1 | 2 | 3 | 4;
  return {
    ...stadium,
    seatingTier: nextSeating,
    capacity: Math.min(profile.maxCapacity, nextCapacity),
    hasNightLights: stadium.hasNightLights || profile.floodlightTowers >= 4,
    hasJumbotron: stadium.hasJumbotron || profile.scoreboardStyle === 'jumbo_tower' || profile.scoreboardStyle === 'hd_cathedral',
    hasMascotCannon: stadium.hasMascotCannon || targetTier === 'majors',
  };
}

function computeSeatingExpansionCost(club: Club): number {
  const tierRank = LEAGUE_TIER_ORDER.indexOf(club.leagueTier) + 1;
  return Math.round(3_000 * tierRank + club.stadium.seatingTier * 1_500);
}

function applyFacilityMutation(
  club: Club,
  upgradeId: StadiumUpgradeId,
): { ok: boolean; reason?: string; cost: number; stadium: StadiumState; hypeBoost: number } {
  const profile = STADIUM_TIER_PROFILES[club.leagueTier];
  if (upgradeId === 'seating_expansion') {
    if (club.stadium.capacity >= profile.maxCapacity && club.stadium.seatingTier >= 4) {
      return { ok: false, reason: 'Stadium seating is already maxed for this league tier.', cost: 0, stadium: club.stadium, hypeBoost: 0 };
    }
    const cost = computeSeatingExpansionCost(club);
    const addedSeats = Math.max(250, Math.round((profile.maxCapacity - profile.minCapacity) * 0.45));
    const nextCap = Math.min(profile.maxCapacity, club.stadium.capacity + addedSeats);
    const nextTier = Math.min(4, club.stadium.seatingTier + 1) as 1 | 2 | 3 | 4;
    return { ok: true, cost, stadium: { ...club.stadium, capacity: nextCap, seatingTier: nextTier }, hypeBoost: 3 };
  }
  const spec = STADIUM_UPGRADE_CATALOG.find((u) => u.id === upgradeId)!;
  if (upgradeId === 'night_lights') {
    if (club.stadium.hasNightLights) return { ok: false, reason: 'Floodlights already installed.', cost: 0, stadium: club.stadium, hypeBoost: 0 };
    return { ok: true, cost: spec.cost, stadium: { ...club.stadium, hasNightLights: true }, hypeBoost: 4 };
  }
  if (upgradeId === 'jumbotron') {
    if (club.stadium.hasJumbotron) return { ok: false, reason: 'Jumbotron already installed.', cost: 0, stadium: club.stadium, hypeBoost: 0 };
    return { ok: true, cost: spec.cost, stadium: { ...club.stadium, hasJumbotron: true }, hypeBoost: 5 };
  }
  if (club.stadium.hasMascotCannon) {
    return { ok: false, reason: 'Mascot Cannon already installed.', cost: 0, stadium: club.stadium, hypeBoost: 0 };
  }
  return { ok: true, cost: spec.cost, stadium: { ...club.stadium, hasMascotCannon: true }, hypeBoost: 8 };
}

/** Purchases a 3D stadium facility upgrade using club cash while respecting league tier unlocks. */
export function upgradeStadiumFacility(
  club: Club,
  upgradeId: StadiumUpgradeId,
): { upgraded: boolean; reason?: string; club: Club } {
  const spec = STADIUM_UPGRADE_CATALOG.find((u) => u.id === upgradeId);
  if (!spec) return { upgraded: false, reason: 'Unknown stadium upgrade.', club };
  if (!meetsTier(club.leagueTier, spec.minTier)) {
    return { upgraded: false, reason: `${spec.label} unlocks at ${spec.minTier.toUpperCase()} tier.`, club };
  }
  const mutation = applyFacilityMutation(club, upgradeId);
  if (!mutation.ok) return { upgraded: false, reason: mutation.reason, club };
  if (club.economy.cash < mutation.cost) {
    return { upgraded: false, reason: `Need $${mutation.cost.toLocaleString()} for ${spec.label}.`, club };
  }
  return {
    upgraded: true,
    club: {
      ...club,
      stadium: mutation.stadium,
      economy: {
        ...club.economy,
        cash: club.economy.cash - mutation.cost,
        teamHype: Math.min(100, club.economy.teamHype + mutation.hypeBoost),
      },
    },
  };
}

export type StadiumUpgradeCardStatus = 'installed' | 'ready' | 'need_cash' | 'locked_tier';

export interface StadiumUpgradeCardView {
  id: StadiumUpgradeId;
  label: string;
  emoji: string;
  funPayoff: string;
  cost: number;
  minTier: LeagueTierId;
  status: StadiumUpgradeCardStatus;
  statusBadge: string;
}

const TIER_SHORT_LABELS: Readonly<Record<LeagueTierId, string>> = {
  rookie: 'Rookie',
  low_a: 'Low-A',
  high_a: 'High-A',
  aa: 'AA',
  aaa: 'AAA',
  majors: 'Majors',
};

const UPGRADE_PAYOFF_META: Readonly<
  Record<StadiumUpgradeId, { emoji: string; funPayoff: string }>
> = {
  seating_expansion: {
    emoji: '🏟️',
    funPayoff: '+300+ fans per game & bigger gate cash!',
  },
  night_lights: {
    emoji: '💡',
    funPayoff: 'Unlock dramatic Night Games & +4 Team Hype!',
  },
  jumbotron: {
    emoji: '📺',
    funPayoff: 'Giant center-field HD board & +5 Team Hype!',
  },
  mascot_cannon: {
    emoji: '🎆',
    funPayoff: 'Booming HR fireworks blasts & +8 Team Hype!',
  },
};

function isFacilityInstalled(club: Club, upgradeId: StadiumUpgradeId): boolean {
  const profile = STADIUM_TIER_PROFILES[club.leagueTier];
  if (upgradeId === 'seating_expansion') {
    return club.stadium.capacity >= profile.maxCapacity && club.stadium.seatingTier >= 4;
  }
  if (upgradeId === 'night_lights') return club.stadium.hasNightLights;
  if (upgradeId === 'jumbotron') return club.stadium.hasJumbotron;
  return club.stadium.hasMascotCannon;
}

function resolveUpgradeCardStatus(
  club: Club,
  spec: StadiumUpgradeSpec,
  liveCost: number,
): { status: StadiumUpgradeCardStatus; statusBadge: string } {
  if (isFacilityInstalled(club, spec.id)) {
    return { status: 'installed', statusBadge: '✓ Installed' };
  }
  if (!meetsTier(club.leagueTier, spec.minTier)) {
    return { status: 'locked_tier', statusBadge: `🔒 Unlocks ${TIER_SHORT_LABELS[spec.minTier]}` };
  }
  if (club.economy.cash < liveCost) {
    return { status: 'need_cash', statusBadge: `Need $${liveCost.toLocaleString()}` };
  }
  return { status: 'ready', statusBadge: `Build · $${liveCost.toLocaleString()}` };
}

/** Projects stadium upgrade cards with live pricing, tier-unlock clarity, and kid-friendly payoffs. */
export function buildStadiumUpgradeCards(club: Club): StadiumUpgradeCardView[] {
  return STADIUM_UPGRADE_CATALOG.map((spec) => {
    const liveCost =
      spec.id === 'seating_expansion' ? computeSeatingExpansionCost(club) : spec.cost;
    const meta = UPGRADE_PAYOFF_META[spec.id];
    const { status, statusBadge } = resolveUpgradeCardStatus(club, spec, liveCost);
    return {
      id: spec.id,
      label: spec.label,
      emoji: meta.emoji,
      funPayoff: meta.funPayoff,
      cost: liveCost,
      minTier: spec.minTier,
      status,
      statusBadge,
    };
  });
}
