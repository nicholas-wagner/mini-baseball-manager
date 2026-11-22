import { describe, expect, it } from 'vitest';
import { createClub } from '../engine/gm/rosterFactory';
import { createManagerProfile } from '../engine/models/manager';
import { createSeededRng } from '../engine/rng/seededRng';
import { migrateSavePayload } from './migrations';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  createSaveRepository,
  exportSaveJson,
  importSaveJson,
  type SaveFileV1,
} from './persistence';

function buildSampleSave(seed: number, city: string): SaveFileV1 {
  const club = createClub(createSeededRng(seed), {
    id: `club-${seed}`,
    city,
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'rookie',
    isHuman: true,
  });

  return {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    savedAtIso: '2026-11-21T20:00:00.000Z',
    worldSeed: seed,
    seasonNumber: 1,
    currentSeriesIndex: 0,
    humanClubId: club.id,
    manager: createManagerProfile({ name: 'Skip', avatarSeed: seed }),
    leagues: {
      rookie: [club],
      low_a: [],
      high_a: [],
      aa: [],
      aaa: [],
      majors: [],
    },
    rivalries: [],
    trophies: [],
    newspaperArchive: [],
    unlockedCosmeticIds: [],
    settings: {
      muted: false,
      volume: 0.75,
      defaultGameSpeed: 1,
      defaultWatchMode: 'live',
      reducedMotion: false,
      hapticsEnabled: true,
      enableInjuries: true,
      enableIllnesses: true,
    },
  };
}

function createMockStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('Local Multi-Slot Persistence & Schema Migrations', () => {
  it('isolates slot-1, slot-2, and slot-3 round-trips, lists metadata, and deletes cleanly', async () => {
    const repo = createSaveRepository(createMockStorage());
    const saveOne = buildSampleSave(1994, 'Sandlot');
    const saveTwo = buildSampleSave(1995, 'Baytown');

    await repo.saveSlot('slot-1', saveOne);
    await repo.saveSlot('slot-2', saveTwo);

    expect(await repo.loadSlot('slot-1')).toEqual(saveOne);
    expect(await repo.loadSlot('slot-2')).toEqual(saveTwo);
    expect(await repo.loadSlot('slot-3')).toBeNull();

    const slots = await repo.listSlots();
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.slotId).sort()).toEqual(['slot-1', 'slot-2']);
    expect(slots.find((s) => s.slotId === 'slot-1')?.clubName).toBe('Sandlot Comets');

    await repo.deleteSlot('slot-1');
    expect(await repo.loadSlot('slot-1')).toBeNull();
    expect(await repo.loadSlot('slot-2')).toEqual(saveTwo);
  });

  it('exports and imports JSON save payloads and rejects corrupted files', () => {
    const saveOne = buildSampleSave(2001, 'Maple');
    const json = exportSaveJson(saveOne);
    expect(importSaveJson(json)).toEqual(saveOne);

    expect(() => importSaveJson('{not valid json')).toThrow(/invalid save json/i);
    expect(() => importSaveJson('{"schemaVersion": 999}')).toThrow(/unsupported save/i);
  });

  it('migrates legacy schemaVersion 0 payloads to SaveFileV1', () => {
    const v1Ref = buildSampleSave(808, 'Austin');
    const legacyV0 = {
      schemaVersion: 0,
      worldSeed: 808,
      humanClub: v1Ref.leagues.rookie[0],
      manager: v1Ref.manager,
    };

    const migrated = migrateSavePayload(legacyV0);
    expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(migrated.humanClubId).toBe(v1Ref.humanClubId);
    expect(migrated.leagues.rookie).toHaveLength(1);
    expect(migrated.settings.defaultGameSpeed).toBe(1);

    // Strip newer pitchArsenal / batterPitchProfile / totalRatingBudget fields from legacy players
    const strippedClub = {
      ...v1Ref.leagues.rookie[0],
      roster: v1Ref.leagues.rookie[0].roster.map((p) => {
        const clone = { ...p } as Record<string, unknown>;
        delete clone.pitchArsenal;
        delete clone.batterPitchProfile;
        delete clone.totalRatingBudget;
        return clone;
      }),
    };
    const hydratedV0 = migrateSavePayload({
      ...legacyV0,
      humanClub: strippedClub,
    });
    for (const player of hydratedV0.leagues.rookie[0].roster) {
      expect(player.batterPitchProfile.favoritePitch).not.toBe(player.batterPitchProfile.weakPitch);
      expect(player.totalRatingBudget).toBeGreaterThan(300);
      if (player.position === 'SP') {
        expect(player.pitchArsenal!.repertoire.length).toBeGreaterThanOrEqual(4);
        expect(player.pitchArsenal!.repertoire.length).toBeLessThanOrEqual(5);
      } else if (player.position === 'RP') {
        expect(player.pitchArsenal!.repertoire.length).toBeGreaterThanOrEqual(2);
        expect(player.pitchArsenal!.repertoire.length).toBeLessThanOrEqual(3);
      } else {
        expect(player.pitchArsenal).toBeUndefined();
      }
    }
  });
});
