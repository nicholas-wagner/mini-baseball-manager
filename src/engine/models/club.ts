import type { FieldPosition } from '../handedness/types';
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

export interface ClubColors {
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
}

export interface DistrictTile {
  slotId: string;
  buildingId: string | null;
  tier: 1 | 2 | 3;
}

export interface StadiumState {
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
}

export const MAX_ACTIVE_ROSTER_SIZE = 20;
export const MIN_ACTIVE_ROSTER_SIZE = 15;
export const MAX_ACADEMY_ROSTER_SIZE = 6;

export interface Club {
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

export function createInitialStadium(name: string, tier: LeagueTierId): StadiumState {
  const defaults = TIER_DEFAULTS[tier];
  return {
    name,
    seatingTier: defaults.seatingTier,
    capacity: defaults.capacity,
    hasJumbotron: tier === 'aaa' || tier === 'majors',
    hasNightLights: tier !== 'rookie' && tier !== 'low_a',
    hasMascotCannon: tier === 'majors',
    themeId: 'sandlot_classic',
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
  };
}
