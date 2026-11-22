import type { Club, DistrictTile } from '../models/club';

export type DistrictBuildingId =
  | 'nacho_cantina'
  | 'bobblehead_megastore'
  | 'arcade_pavilion'
  | 'batting_academy'
  | 'pitching_lab'
  | 'transit_shuttle'
  | 'broadcast_tower'
  | 'club_museum';

export interface DistrictBuildingDefinition {
  id: DistrictBuildingId;
  name: string;
  buildCost: number;
  seriesUpkeep: number;
  seriesRevenueBonus: number;
  concessionBonusPerFan: number;
  attendanceBonusPct: number;
  hypePerSeries: number;
  trainingBonus: number;
  synergyPartnerIds: readonly DistrictBuildingId[];
  description: string;
}

export interface DistrictBonusesSummary {
  totalSeriesRevenueBonus: number;
  totalSeriesUpkeep: number;
  concessionBonusPerFan: number;
  attendanceBonusPct: number;
  hypePerSeries: number;
  trainingBonus: number;
  adjacencySynergyCount: number;
}

/** 8 Sim-City Ballpark District buildings with neighborhood adjacency synergies! */
export const DISTRICT_BUILDINGS_CATALOG: readonly DistrictBuildingDefinition[] = [
  {
    id: 'nacho_cantina',
    name: 'Loaded Nacho Cantina',
    buildCost: 3_500,
    seriesUpkeep: 200,
    seriesRevenueBonus: 450,
    concessionBonusPerFan: 0.65,
    attendanceBonusPct: 0.03,
    hypePerSeries: 1,
    trainingBonus: 0,
    synergyPartnerIds: ['bobblehead_megastore', 'arcade_pavilion'],
    description: 'Cheesy stadium plaza favorite; pairs with Merch & Arcade for plaza synergy!',
  },
  {
    id: 'bobblehead_megastore',
    name: 'Bobblehead Megastore',
    buildCost: 4_200,
    seriesUpkeep: 240,
    seriesRevenueBonus: 620,
    concessionBonusPerFan: 0.5,
    attendanceBonusPct: 0.04,
    hypePerSeries: 2,
    trainingBonus: 0,
    synergyPartnerIds: ['nacho_cantina', 'club_museum'],
    description: '90s merch emporium; boosts revenue alongside Cantina or Museum.',
  },
  {
    id: 'arcade_pavilion',
    name: '90s Pixel Arcade Pavilion',
    buildCost: 4_000,
    seriesUpkeep: 220,
    seriesRevenueBonus: 500,
    concessionBonusPerFan: 0.35,
    attendanceBonusPct: 0.05,
    hypePerSeries: 3,
    trainingBonus: 0,
    synergyPartnerIds: ['nacho_cantina', 'transit_shuttle'],
    description: 'Draws kids & weekend crowds early for pre-game quarters!',
  },
  {
    id: 'batting_academy',
    name: 'Neighborhood Batting Academy',
    buildCost: 5_000,
    seriesUpkeep: 320,
    seriesRevenueBonus: 200,
    concessionBonusPerFan: 0,
    attendanceBonusPct: 0.01,
    hypePerSeries: 1,
    trainingBonus: 1,
    synergyPartnerIds: ['pitching_lab'],
    description: 'Sharpens hitter drills; pairs with Pitching Lab for Elite Complex synergy.',
  },
  {
    id: 'pitching_lab',
    name: 'High-Speed Pitching Lab',
    buildCost: 5_200,
    seriesUpkeep: 340,
    seriesRevenueBonus: 200,
    concessionBonusPerFan: 0,
    attendanceBonusPct: 0.01,
    hypePerSeries: 1,
    trainingBonus: 1,
    synergyPartnerIds: ['batting_academy'],
    description: 'Spin cameras & mound analytics; pairs with Batting Academy.',
  },
  {
    id: 'transit_shuttle',
    name: 'Ballpark Express Shuttle',
    buildCost: 4_500,
    seriesUpkeep: 280,
    seriesRevenueBonus: 300,
    concessionBonusPerFan: 0.15,
    attendanceBonusPct: 0.12,
    hypePerSeries: 2,
    trainingBonus: 0,
    synergyPartnerIds: ['arcade_pavilion', 'nacho_cantina'],
    description: 'Delivers packed crowds straight to the front gate!',
  },
  {
    id: 'broadcast_tower',
    name: 'Retro Broadcast Tower',
    buildCost: 6_000,
    seriesUpkeep: 360,
    seriesRevenueBonus: 850,
    concessionBonusPerFan: 0,
    attendanceBonusPct: 0.03,
    hypePerSeries: 3,
    trainingBonus: 0,
    synergyPartnerIds: ['club_museum'],
    description: 'Amplifies TV reach and regional buzz.',
  },
  {
    id: 'club_museum',
    name: 'Club Legends Museum',
    buildCost: 5_500,
    seriesUpkeep: 260,
    seriesRevenueBonus: 520,
    concessionBonusPerFan: 0.25,
    attendanceBonusPct: 0.06,
    hypePerSeries: 4,
    trainingBonus: 0,
    synergyPartnerIds: ['bobblehead_megastore', 'broadcast_tower'],
    description: 'Celebrates trophies & retired numbers for lasting fan prestige.',
  },
];

function getBuilding(id: string | null): DistrictBuildingDefinition | undefined {
  if (!id) return undefined;
  return DISTRICT_BUILDINGS_CATALOG.find((b) => b.id === id);
}

/** Builds or upgrades a Ballpark District building on a chosen slot tile using club cash. */
export function buildDistrictBuilding(
  club: Club,
  slotId: string,
  buildingId: DistrictBuildingId,
): { built: boolean; reason?: string; club: Club } {
  const tile = club.stadium.districtTiles.find((t) => t.slotId === slotId);
  const def = getBuilding(buildingId);
  if (!tile || !def) return { built: false, reason: 'Invalid district slot or building.', club };

  const isUpgrade = tile.buildingId === buildingId;
  if (isUpgrade && tile.tier >= 3) {
    return { built: false, reason: `${def.name} is already max Tier 3.`, club };
  }
  const cost = isUpgrade ? Math.round(def.buildCost * (tile.tier + 0.5)) : def.buildCost;
  if (club.economy.cash < cost) {
    return { built: false, reason: `Need $${cost.toLocaleString()} to build ${def.name}.`, club };
  }

  const nextTier = isUpgrade ? ((tile.tier + 1) as 1 | 2 | 3) : 1;
  return {
    built: true,
    club: {
      ...club,
      stadium: {
        ...club.stadium,
        districtTiles: club.stadium.districtTiles.map((t) =>
          t.slotId === slotId ? { ...t, buildingId, tier: nextTier } : t,
        ),
      },
      economy: {
        ...club.economy,
        cash: club.economy.cash - cost,
      },
    },
  };
}

function countAdjacentSynergies(tiles: readonly DistrictTile[]): number {
  let synergies = 0;
  for (let i = 0; i < tiles.length - 1; i += 1) {
    const a = getBuilding(tiles[i].buildingId);
    const b = getBuilding(tiles[i + 1].buildingId);
    if (a && b && a.synergyPartnerIds.includes(b.id)) {
      synergies += 1;
    }
  }
  return synergies;
}

/** Aggregates all revenue, upkeep, attendance, hype, training & adjacency bonuses across District Tiles. */
export function evaluateDistrictBonuses(tiles: readonly DistrictTile[]): DistrictBonusesSummary {
  let revenue = 0;
  let upkeep = 0;
  let concBonus = 0;
  let attBonus = 0;
  let hype = 0;
  let training = 0;

  for (const tile of tiles) {
    const def = getBuilding(tile.buildingId);
    if (!def) continue;
    const scale = 1 + (tile.tier - 1) * 0.45;
    revenue += Math.round(def.seriesRevenueBonus * scale);
    upkeep += Math.round(def.seriesUpkeep * scale);
    concBonus += def.concessionBonusPerFan * scale;
    attBonus += def.attendanceBonusPct * scale;
    hype += Math.round(def.hypePerSeries * scale);
    training += def.trainingBonus;
  }

  const adjacencySynergyCount = countAdjacentSynergies(tiles);
  const synergyRevenueBonus = adjacencySynergyCount * 350;

  return {
    totalSeriesRevenueBonus: revenue + synergyRevenueBonus,
    totalSeriesUpkeep: upkeep,
    concessionBonusPerFan: Number(concBonus.toFixed(2)),
    attendanceBonusPct: Number(Math.min(0.3, attBonus).toFixed(3)),
    hypePerSeries: hype + adjacencySynergyCount,
    trainingBonus: training,
    adjacencySynergyCount,
  };
}
