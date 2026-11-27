import type { Club, LeagueTierId } from '../engine/models/club';
import type { ManagerProfile } from '../engine/models/manager';
import { createEmptySeasonStats, isPitcherPosition, type Player, type PlayerSeasonStats } from '../engine/models/player';
import { createSeededRng } from '../engine/rng/seededRng';
import { rollInitialCareerService } from '../engine/rpg/careerExperience';
import { rollCoEdSpecialTrait } from '../engine/rpg/coEdArchetypes';
import { rollMentalAndPressureProfile } from '../engine/rpg/mentalAndLeverage';
import {
  computeTotalRatingBudget,
  rollBatterPitchProfile,
  rollPitcherArsenal,
} from '../engine/rpg/pitchArsenals';
import { rollPitcherRole } from '../engine/rpg/pitcherRoles';
import { rollBattedBallProfile } from '../engine/simulation/sabermetrics';
import { migrateClubEconomy } from '../persistence/migrations';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_SAVE_SETTINGS,
  type SaveFileV1,
} from './persistence';

interface RawLegacyV0Payload {
  schemaVersion: 0;
  savedAtIso?: string;
  worldSeed: number;
  humanClub: Club;
  manager: ManagerProfile;
}

function hydrateStatsDefaults(stats: PlayerSeasonStats | undefined): PlayerSeasonStats {
  return { ...createEmptySeasonStats(), ...(stats ?? {}) };
}

function hydratePlayerDefaults(player: Player): Player {
  const favoritePosition = player.favoritePosition ?? player.position;
  const marketTier = player.marketTier ?? 'average';
  const specialistArchetype = player.specialistArchetype ?? 'balanced_regular';
  const seedRng = createSeededRng((player.traits?.seed ?? 1994) ^ (player.jerseyNumber * 131));

  const pitchArsenal =
    player.pitchArsenal ??
    (isPitcherPosition(player.position)
      ? rollPitcherArsenal(seedRng, player.position, specialistArchetype, player.ratings, marketTier)
      : undefined);
  const pitcherRole =
    player.pitcherRole ??
    (isPitcherPosition(player.position)
      ? rollPitcherRole(seedRng, player.position, player.throws, specialistArchetype)
      : undefined);
  const batterPitchProfile =
    player.batterPitchProfile ??
    rollBatterPitchProfile(seedRng, specialistArchetype, player.ratings, marketTier);
  const battedBallProfile =
    player.battedBallProfile ??
    rollBattedBallProfile(seedRng, player.position, specialistArchetype, pitchArsenal?.favoritePitch);
  const mental =
    player.mentalTraits && player.pressureProfile
      ? { mentalTraits: player.mentalTraits, pressureProfile: player.pressureProfile }
      : rollMentalAndPressureProfile(seedRng, player.personality ?? 'clutch_captain', marketTier);
  const careerService =
    player.careerService ??
    rollInitialCareerService(seedRng, marketTier, player.age ?? 24, player.position);
  const coEdTrait =
    player.coEdTrait ??
    rollCoEdSpecialTrait(
      seedRng,
      player.traits?.playerLook === 'female' ? 'female' : 'male',
      player.position,
    );
  const ratings =
    typeof player.ratings.luck === 'number' &&
    typeof player.ratings.gapPower === 'number' &&
    typeof player.ratings.range === 'number'
      ? player.ratings
      : {
          ...player.ratings,
          gapPower: player.ratings.gapPower ?? player.ratings.power,
          range: player.ratings.range ?? player.ratings.fielding,
          luck: player.ratings.luck ?? 50,
        };
  const statCaps = player.statCaps
    ? typeof player.statCaps.luck === 'number' &&
      typeof player.statCaps.gapPower === 'number' &&
      typeof player.statCaps.range === 'number'
      ? player.statCaps
      : {
          ...player.statCaps,
          gapPower: player.statCaps.gapPower ?? Math.min(99, ratings.gapPower + 10),
          range: player.statCaps.range ?? Math.min(99, ratings.range + 10),
          luck: player.statCaps.luck ?? Math.min(99, ratings.luck + 10),
        }
    : { ...ratings, potential: 99 };

  return {
    ...player,
    marketTier,
    specialistArchetype,
    ...(pitcherRole ? { pitcherRole } : {}),
    flexibilityProfile: player.flexibilityProfile ?? 'single_position',
    favoritePosition,
    positionProficiency: player.positionProficiency ?? { [favoritePosition]: 90 },
    ...(pitchArsenal ? { pitchArsenal } : {}),
    batterPitchProfile,
    battedBallProfile,
    mentalTraits: mental.mentalTraits,
    pressureProfile: mental.pressureProfile,
    careerService,
    coEdTrait,
    ratings,
    statCaps,
    totalRatingBudget:
      player.totalRatingBudget ?? computeTotalRatingBudget(marketTier, player.position),
    xpGrowthMultiplier: player.xpGrowthMultiplier ?? 0.85,
    careerRetrainsUsed:
      typeof player.careerRetrainsUsed === 'number' && Number.isFinite(player.careerRetrainsUsed)
        ? Math.max(0, Math.floor(player.careerRetrainsUsed))
        : 0,
    seasonStats: hydrateStatsDefaults(player.seasonStats),
    careerStats: hydrateStatsDefaults(player.careerStats),
  };
}

function hydrateClubDefaults(club: Club): Club {
  return {
    ...club,
    economy: migrateClubEconomy(club.economy),
    stadium: {
      ...club.stadium,
      ballparkId: club.stadium?.ballparkId ?? 'sandlot_commons',
    },
    coaches: {
      ...club.coaches,
      activeStaff: club.coaches?.activeStaff ?? [],
      clinicSessionsUsedThisOffseason: club.coaches?.clinicSessionsUsedThisOffseason ?? 0,
    },
    roster: club.roster.map(hydratePlayerDefaults),
    academyProspects: (club.academyProspects ?? []).map(hydratePlayerDefaults),
  };
}

function hydrateLeaguesDefaults(
  leagues: Record<LeagueTierId, Club[]>,
): Record<LeagueTierId, Club[]> {
  return {
    rookie: (leagues.rookie ?? []).map(hydrateClubDefaults),
    low_a: (leagues.low_a ?? []).map(hydrateClubDefaults),
    high_a: (leagues.high_a ?? []).map(hydrateClubDefaults),
    aa: (leagues.aa ?? []).map(hydrateClubDefaults),
    aaa: (leagues.aaa ?? []).map(hydrateClubDefaults),
    majors: (leagues.majors ?? []).map(hydrateClubDefaults),
  };
}

function emptyTierLeagues(): Record<LeagueTierId, Club[]> {
  return {
    rookie: [],
    low_a: [],
    high_a: [],
    aa: [],
    aaa: [],
    majors: [],
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Migrates raw parsed save payloads forward to CURRENT_SAVE_SCHEMA_VERSION. */
export function migrateSavePayload(raw: unknown): SaveFileV1 {
  if (!isPlainRecord(raw)) {
    throw new Error('Invalid save payload: expected an object.');
  }

  if (raw.schemaVersion === CURRENT_SAVE_SCHEMA_VERSION) {
    if (typeof raw.humanClubId !== 'string' || !isPlainRecord(raw.manager) || !isPlainRecord(raw.leagues)) {
      throw new Error('Invalid SaveFileV1 payload: missing required fields.');
    }
    const v1 = raw as unknown as SaveFileV1;
    return {
      ...v1,
      leagues: hydrateLeaguesDefaults(v1.leagues),
      settings: { ...DEFAULT_SAVE_SETTINGS, ...(v1.settings ?? {}) },
    };
  }

  if (raw.schemaVersion === 0) {
    const legacy = raw as unknown as RawLegacyV0Payload;
    if (!legacy.humanClub || !legacy.manager) {
      throw new Error('Invalid v0 save payload: missing humanClub or manager.');
    }
    const leagues = emptyTierLeagues();
    leagues[legacy.humanClub.leagueTier] = [hydrateClubDefaults(legacy.humanClub)];
    return {
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAtIso: legacy.savedAtIso ?? new Date(0).toISOString(),
      worldSeed: legacy.worldSeed ?? 1994,
      seasonNumber: 1,
      currentSeriesIndex: 0,
      humanClubId: legacy.humanClub.id,
      manager: legacy.manager,
      leagues,
      rivalries: [],
      trophies: [],
      newspaperArchive: [],
      unlockedCosmeticIds: [],
      settings: { ...DEFAULT_SAVE_SETTINGS },
    };
  }

  throw new Error(`Unsupported save schema version: ${String(raw.schemaVersion)}.`);
}
