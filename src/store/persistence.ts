import type { Club, LeagueTierId } from '../engine/models/club';
import type { ManagerProfile } from '../engine/models/manager';
import { migrateSavePayload } from './migrations';

export const CURRENT_SAVE_SCHEMA_VERSION = 1;

export type SaveSlotId = 'slot-1' | 'slot-2' | 'slot-3';

export const SAVE_SLOT_IDS: readonly SaveSlotId[] = ['slot-1', 'slot-2', 'slot-3'] as const;

export interface RivalryRecord {
  clubIdA: string;
  clubIdB: string;
  heat: number;
}

export interface TrophyRecord {
  id: string;
  seasonNumber: number;
  title: string;
  clubId: string;
}

export interface NewspaperIssue {
  id: string;
  seasonNumber: number;
  seriesIndex: number;
  headline: string;
  subhead: string;
}

export interface UserSaveSettings {
  muted: boolean;
  volume: number;
  defaultGameSpeed: 1 | 2 | 4;
  defaultWatchMode: 'live' | 'clutch' | 'sim';
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  enableInjuries: boolean;
  enableIllnesses: boolean;
}

export const DEFAULT_SAVE_SETTINGS: UserSaveSettings = {
  muted: false,
  volume: 0.75,
  defaultGameSpeed: 1,
  defaultWatchMode: 'live',
  reducedMotion: false,
  hapticsEnabled: true,
  enableInjuries: true,
  enableIllnesses: true,
};

export interface SaveSlotMetadata {
  slotId: SaveSlotId;
  clubName: string;
  leagueTier: LeagueTierId;
  seasonNumber: number;
  recordLabel: string;
  updatedAtIso: string;
  schemaVersion: number;
}

export interface SaveFileV1 {
  schemaVersion: 1;
  savedAtIso: string;
  worldSeed: number;
  seasonNumber: number;
  currentSeriesIndex: number;
  humanClubId: string;
  manager: ManagerProfile;
  leagues: Record<LeagueTierId, Club[]>;
  rivalries: RivalryRecord[];
  trophies: TrophyRecord[];
  newspaperArchive: NewspaperIssue[];
  unlockedCosmeticIds: string[];
  settings: UserSaveSettings;
}

export interface SaveRepository {
  saveSlot: (slotId: SaveSlotId, payload: SaveFileV1) => Promise<SaveSlotMetadata>;
  loadSlot: (slotId: SaveSlotId) => Promise<SaveFileV1 | null>;
  listSlots: () => Promise<SaveSlotMetadata[]>;
  deleteSlot: (slotId: SaveSlotId) => Promise<void>;
}

const SLOT_STORAGE_PREFIX = 'mbm.save.v1.';
const META_STORAGE_PREFIX = 'mbm.meta.v1.';

function extractSlotMetadata(slotId: SaveSlotId, save: SaveFileV1): SaveSlotMetadata {
  const allClubs = Object.values(save.leagues).flat();
  const humanClub = allClubs.find((c) => c.id === save.humanClubId);
  return {
    slotId,
    clubName: humanClub ? `${humanClub.city} ${humanClub.name}` : 'Unknown Club',
    leagueTier: humanClub?.leagueTier ?? 'rookie',
    seasonNumber: save.seasonNumber,
    recordLabel: humanClub ? `${humanClub.wins}-${humanClub.losses}` : '0-0',
    updatedAtIso: save.savedAtIso,
    schemaVersion: save.schemaVersion,
  };
}

function syncToIndexedDbBestEffort(slotId: SaveSlotId, json: string | null): void {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.open !== 'function') return;
  try {
    const req = indexedDB.open('mini_baseball_manager_db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saves')) {
        db.createObjectStore('saves');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('saves', 'readwrite');
      const store = tx.objectStore('saves');
      if (json === null) store.delete(slotId);
      else store.put(json, slotId);
    };
  } catch {
    // Graceful localStorage fallback handles environments with restricted IndexedDB.
  }
}

export function exportSaveJson(save: SaveFileV1): string {
  return JSON.stringify(save, null, 2);
}

export function importSaveJson(rawJson: string): SaveFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid save JSON format.');
  }
  return migrateSavePayload(parsed);
}

/** Creates an offline-first repository using localStorage + best-effort IndexedDB mirroring. */
export function createSaveRepository(customStorage?: Storage): SaveRepository {
  const memoryFallback = new Map<string, string>();
  const resolveStorage = (): Storage | null => {
    if (customStorage) return customStorage;
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage?.getItem === 'function' &&
      typeof window.localStorage?.setItem === 'function'
    ) {
      return window.localStorage;
    }
    return null;
  };

  const readRaw = (key: string): string | null => {
    const storage = resolveStorage();
    return storage ? storage.getItem(key) : (memoryFallback.get(key) ?? null);
  };

  const writeRaw = (key: string, value: string): void => {
    const storage = resolveStorage();
    if (storage) storage.setItem(key, value);
    else memoryFallback.set(key, value);
  };

  const removeRaw = (key: string): void => {
    const storage = resolveStorage();
    if (storage) storage.removeItem(key);
    else memoryFallback.delete(key);
  };

  return {
    async saveSlot(slotId, payload) {
      const meta = extractSlotMetadata(slotId, payload);
      const serialized = exportSaveJson(payload);
      writeRaw(`${SLOT_STORAGE_PREFIX}${slotId}`, serialized);
      writeRaw(`${META_STORAGE_PREFIX}${slotId}`, JSON.stringify(meta));
      syncToIndexedDbBestEffort(slotId, serialized);
      return meta;
    },

    async loadSlot(slotId) {
      const raw = readRaw(`${SLOT_STORAGE_PREFIX}${slotId}`);
      if (!raw) return null;
      return importSaveJson(raw);
    },

    async listSlots() {
      const slots: SaveSlotMetadata[] = [];
      for (const slotId of SAVE_SLOT_IDS) {
        const metaRaw = readRaw(`${META_STORAGE_PREFIX}${slotId}`);
        if (metaRaw) {
          slots.push(JSON.parse(metaRaw) as SaveSlotMetadata);
        }
      }
      return slots;
    },

    async deleteSlot(slotId) {
      removeRaw(`${SLOT_STORAGE_PREFIX}${slotId}`);
      removeRaw(`${META_STORAGE_PREFIX}${slotId}`);
      syncToIndexedDbBestEffort(slotId, null);
    },
  };
}
