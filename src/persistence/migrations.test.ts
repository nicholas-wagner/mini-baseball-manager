import { describe, expect, it } from 'vitest';
import { createInitialEconomy } from '../engine/models/club';
import { migrateSavePayload } from '../store/migrations';
import { migrateClubEconomy } from './migrations';

describe('TASK-108 economy migrations', () => {
  it('fills promo, receipt, and feast defaults on legacy club economies', () => {
    const legacy = createInitialEconomy('rookie');
    delete legacy.scheduledPromoId;
    delete legacy.recentLedgerEntries;
    delete legacy.spaUsedInSeriesIndex;

    const migrated = migrateClubEconomy(legacy);
    expect(migrated.scheduledPromoId).toBeNull();
    expect(migrated.recentLedgerEntries).toEqual([]);
    expect(migrated.spaUsedInSeriesIndex).toBeUndefined();
    expect(migrated.cash).toBe(legacy.cash);
  });

  it('hydrates missing economy fields when a v1 save is loaded', () => {
    const clubEconomy = createInitialEconomy('low_a');
    delete clubEconomy.scheduledPromoId;
    delete clubEconomy.recentLedgerEntries;
    const raw = {
      schemaVersion: 1,
      savedAtIso: '1994-06-01T00:00:00.000Z',
      worldSeed: 108,
      seasonNumber: 1,
      currentSeriesIndex: 0,
      humanClubId: 'club-legacy',
      manager: { id: 'mgr', name: 'Skip', avatarSeed: 1, level: 1, xp: 0, skillPoints: 0, unlockedNodeIds: [], activePowerIds: [], wins: 0, losses: 0 },
      leagues: {
        rookie: [],
        low_a: [
          {
            id: 'club-legacy',
            isHuman: true,
            city: 'Sandlot',
            name: 'Comets',
            mascot: 'Dog',
            colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
            leagueTier: 'low_a',
            aiArchetype: 'moneyball',
            roster: [],
            academyProspects: [],
            lineup: [],
            rotationIds: [],
            bullpenIds: [],
            rotationCursor: 0,
            coaches: { pitching: null, hitting: null, scouting: null, stadium: null, activeStaff: [], clinicSessionsUsedThisOffseason: 0 },
            stadium: { name: 'Park', seatingTier: 1, capacity: 1200, hasJumbotron: false, hasNightLights: false, hasMascotCannon: false, themeId: 'sandlot', retiredNumbers: [], championshipPennants: [], districtTiles: [] },
            economy: clubEconomy,
            wins: 0,
            losses: 0,
            streak: 0,
          },
        ],
        high_a: [],
        aa: [],
        aaa: [],
        majors: [],
      },
      settings: {},
    };

    const loaded = migrateSavePayload(raw);
    expect(loaded.leagues.low_a[0].economy.scheduledPromoId).toBeNull();
    expect(loaded.leagues.low_a[0].economy.recentLedgerEntries).toEqual([]);
  });
});
