import type { HobbyMemory } from '../rpg/playerHobbies';
import type { ClubRitualProfile, PolaroidKeepsake } from '../gm/polaroidKeepsakes';
import type { ScorebookMoment } from '../gm/scorebookMoments';
import type { BallparkPresetId } from '../ballparks/stadiumCatalog';
import type { FieldPosition } from '../handedness/types';
import type { ClubFranchiseRecords } from '../league/clubRecords';
import type { CoachStaffState } from './manager';
import type { Player } from './player';

export type LeagueTierId = 'rookie' | 'low_a' | 'high_a' | 'aa' | 'aaa' | 'majors';

export const LEAGUE_TIER_ORDER: readonly LeagueTierId[] = [
  'rookie',
  'low_a',
  'high_a',
  'aa',
  'aaa',
  'majors',
] as const;

/** Tier-scaled annual club payroll Salary Caps (scales cleanly from Rookie Sandlot to Mini Major League). */
export const TIER_SALARY_CAPS: Readonly<Record<LeagueTierId, number>> = {
  rookie: 15_000,
  low_a: 24_000,
  high_a: 38_000,
  aa: 66_000,
  aaa: 120_000,
  majors: 240_000,
};

/** In-season signings and extensions may spend up to 15% past the hard cap. */
export const SOFT_CAP_MULTIPLIER = 1.15;

export interface ClubLedgerLine {
  label: string;
  amount: number;
  kind: 'income' | 'expense';
}

export interface ClubLedgerEntry {
  id: string;
  season: number;
  gameLabel: string;
  revenueTotal: number;
  expenseTotal: number;
  netDelta: number;
  lines: ClubLedgerLine[];
  luxuryTaxPaid: number;
  promoConsumedId: string | null;
  bailoutTriggered: boolean;
  bailoutAmount: number;
  endingCash: number;
}

export type AiArchetype =
  | 'mashers'
  | 'speed_demons'
  | 'ace_factory'
  | 'defense_first'
  | 'moneyball';

export type DefensiveLineupPosition = Exclude<FieldPosition, 'SP' | 'RP'> | 'DH';

export interface LineupSlot {
  orderIndex: number;
  playerId: string;
  defensivePosition: DefensiveLineupPosition;
}

export type JerseyPatternId =
  | 'classic_solid'
  | 'vintage_pinstripes'
  | 'raglan_sleeves'
  | 'neon_90s_gradient'
  | 'racing_chest_stripe'
  | 'retro_vest';

export type StirrupStyleId =
  | 'classic_solid'
  | 'double_stripe'
  | 'high_neon_90s'
  | 'candy_cane';

export type CapStyleId =
  | 'classic_crown'
  | 'two_tone_panel'
  | 'trucker_bill'
  | 'throwback_pillbox';

export type CrestEmblemId =
  | 'baseball_diamond'
  | 'lightning_bolt'
  | 'comet_star'
  | 'crown_shield'
  | 'crossed_bats'
  | 'rocket_paw'
  | 'flaming_baseball'
  | 'winged_cleat'
  | 'anchor_bay'
  | 'sakura_blossom'
  | 'thunder_bird'
  | 'rocket_ship'
  | 'desert_cactus'
  | 'mountain_peak'
  | 'shamrock_clover'
  | 'dragon_crest'
  | 'vintage_mitt'
  | 'sunburst_wave';

export interface ClubColors {
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
  roadPrimary?: string;
  roadSecondary?: string;
  roadAccent?: string;
  jerseyPattern?: JerseyPatternId;
  stirrupStyle?: StirrupStyleId;
  capStyle?: CapStyleId;
  crestEmblem?: CrestEmblemId;
}

export interface RelicInventoryEntry {
  relicId: string;
  count: number;
  foilTier: 1 | 2 | 3;
}

export interface DistrictTile {
  slotId: string;
  buildingId: string | null;
  tier: 1 | 2 | 3;
}

export interface StadiumState {
  ballparkId?: BallparkPresetId;
  name: string;
  seatingTier: 1 | 2 | 3 | 4;
  capacity: number;
  hasJumbotron: boolean;
  hasNightLights: boolean;
  hasMascotCannon: boolean;
  themeId: string;
  retiredNumbers: { jerseyNumber: number; playerName: string }[];
  championshipPennants: { season: number; leagueTier: LeagueTierId }[];
  districtTiles: DistrictTile[];
}

export interface ClubEconomy {
  cash: number;
  fanBase: number;
  teamHype: number;
  ticketPrice: number;
  concessionPrice: number;
  concessionQuality: 1 | 2 | 3;
  scoutingBudget: number;
  tvContractId: string | null;
  activeSponsorIds: string[];
  /** Promo night already paid for and waiting on the next home game. */
  scheduledPromoId?: string | null;
  /** Newest-first itemized P&L receipts. Capped at 12. */
  recentLedgerEntries?: ClubLedgerEntry[];
  /** Series index that already used the clubhouse recovery feast. */
  spaUsedInSeriesIndex?: number;
}

export const MAX_ACTIVE_ROSTER_SIZE = 20;
export const MIN_ACTIVE_ROSTER_SIZE = 15;
export const MAX_ACADEMY_ROSTER_SIZE = 6;

export interface LeagueWireFinal {
  roundSeed: number;
  matchupIndex: number;
  gameIndex: number;
  awayName: string;
  homeName: string;
  awayScore: number;
  homeScore: number;
  winnerName: string;
  winnerWins: number;
}

export interface Club {
  priorHobbyGames?: number;
  hobbyMemories?: HobbyMemory[];
  leagueWireFinal?: LeagueWireFinal;
  keepsakes?: ScorebookMoment[];
  earnedStickerIds?: string[];
  clubRituals?: ClubRitualProfile;
  polaroids?: PolaroidKeepsake[];
  franchiseRecords?: ClubFranchiseRecords;
  relicInventory?: RelicInventoryEntry[];
  discoveredRelicIds?: string[];
  id: string;
  isHuman: boolean;
  city: string;
  name: string;
  mascot: string;
  colors: ClubColors;
  leagueTier: LeagueTierId;
  aiArchetype: AiArchetype;
  roster: Player[];
  academyProspects: Player[];
  lineup: LineupSlot[];
  rotationIds: string[];
  bullpenIds: string[];
  rotationCursor: number;
  coaches: CoachStaffState;
  stadium: StadiumState;
  economy: ClubEconomy;
  wins: number;
  losses: number;
  streak: number;
}

interface TierFacilityDefaults {
  seatingTier: 1 | 2 | 3 | 4;
  capacity: number;
  cash: number;
  fanBase: number;
  ticketPrice: number;
  scoutingBudget: number;
}

const TIER_DEFAULTS: Readonly<Record<LeagueTierId, TierFacilityDefaults>> = {
  rookie: {
    seatingTier: 1,
    capacity: 1200,
    cash: 12000,
    fanBase: 850,
    ticketPrice: 8,
    scoutingBudget: 1500,
  },
  low_a: {
    seatingTier: 1,
    capacity: 2200,
    cash: 22000,
    fanBase: 1600,
    ticketPrice: 11,
    scoutingBudget: 2500,
  },
  high_a: {
    seatingTier: 2,
    capacity: 4000,
    cash: 38000,
    fanBase: 3200,
    ticketPrice: 14,
    scoutingBudget: 4000,
  },
  aa: {
    seatingTier: 2,
    capacity: 7500,
    cash: 65000,
    fanBase: 6000,
    ticketPrice: 18,
    scoutingBudget: 6500,
  },
  aaa: {
    seatingTier: 3,
    capacity: 14000,
    cash: 110000,
    fanBase: 12500,
    ticketPrice: 24,
    scoutingBudget: 10000,
  },
  majors: {
    seatingTier: 4,
    capacity: 28000,
    cash: 220000,
    fanBase: 26000,
    ticketPrice: 32,
    scoutingBudget: 18000,
  },
};

const INITIAL_DISTRICT_SLOTS = ['north-1', 'north-2', 'east-1', 'west-1'] as const;

const DEFAULT_PARKS_BY_TIER: Readonly<Record<LeagueTierId, readonly BallparkPresetId[]>> = {
  rookie: ['sandlot_commons', 'cornfield_twilight', 'brickyard_classic'],
  low_a: ['brickyard_classic', 'cornfield_twilight', 'harbor_shipyard', 'bayfront_cove'],
  high_a: ['harbor_shipyard', 'bayfront_cove', 'sunbelt_cactus', 'brickyard_classic'],
  aa: ['sunbelt_cactus', 'sakura_garden', 'bayfront_cove', 'harbor_shipyard'],
  aaa: ['high_altitude_mesa', 'neon_metro_dome', 'sakura_garden', 'sunbelt_cactus'],
  majors: [
    'grand_cathedral',
    'neon_metro_dome',
    'high_altitude_mesa',
    'sakura_garden',
    'brickyard_classic',
    'bayfront_cove',
    'harbor_shipyard',
    'sunbelt_cactus',
  ],
};

function hashStadiumName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function createInitialStadium(
  name: string,
  tier: LeagueTierId,
  ballparkId?: BallparkPresetId,
): StadiumState {
  const defaults = TIER_DEFAULTS[tier];
  const tierParks = DEFAULT_PARKS_BY_TIER[tier];
  const resolvedParkId =
    ballparkId ??
    (tier === 'rookie' && name.toLowerCase().includes('sandlot')
      ? 'sandlot_commons'
      : tierParks[hashStadiumName(name) % tierParks.length]);
  return {
    ballparkId: resolvedParkId,
    name,
    seatingTier: defaults.seatingTier,
    capacity: defaults.capacity,
    hasJumbotron: tier === 'aaa' || tier === 'majors',
    hasNightLights: tier !== 'rookie' && tier !== 'low_a',
    hasMascotCannon: tier === 'majors',
    themeId: resolvedParkId,
    retiredNumbers: [],
    championshipPennants: [],
    districtTiles: INITIAL_DISTRICT_SLOTS.map((slotId) => ({
      slotId,
      buildingId: null,
      tier: 1,
    })),
  };
}

export function createInitialEconomy(tier: LeagueTierId): ClubEconomy {
  const defaults = TIER_DEFAULTS[tier];
  return {
    cash: defaults.cash,
    fanBase: defaults.fanBase,
    teamHype: 50,
    ticketPrice: defaults.ticketPrice,
    concessionPrice: 6,
    concessionQuality: 1,
    scoutingBudget: defaults.scoutingBudget,
    tvContractId: null,
    activeSponsorIds: [],
    scheduledPromoId: null,
    recentLedgerEntries: [],
  };
}
