import type { Club, LeagueTierId } from '../engine/models/club';
import type { ManagerProfile } from '../engine/models/manager';
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
    return raw as unknown as SaveFileV1;
  }

  if (raw.schemaVersion === 0) {
    const legacy = raw as unknown as RawLegacyV0Payload;
    if (!legacy.humanClub || !legacy.manager) {
      throw new Error('Invalid v0 save payload: missing humanClub or manager.');
    }
    const leagues = emptyTierLeagues();
    leagues[legacy.humanClub.leagueTier] = [legacy.humanClub];
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
