import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  buildRivalryShowdownPreview,
  createCrosstownStarterRivalry,
  evaluateRivalryShowdownModifiers,
  getRivalryHeatTier,
  recordRivalrySpark,
  updateTravelingRivalryCup,
} from './rivalryEngine';

describe('Dynamic Team Rivalries Engine & Showdowns (TASK-028)', () => {
  it('initializes a Crosstown starter rivalry and escalates heat cleanly across walk-offs, playoffs & poached stars', () => {
    const rng = createSeededRng(2801);
    const home = createClub(rng, {
      id: 'club-a',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Rocket Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const rival = createClub(rng, {
      id: 'club-b',
      city: 'Bayou',
      name: 'Bandits',
      mascot: 'Gator',
      colors: { primary: '#2FB356', secondary: '#181B2C', accent: '#FFC300', monogram: 'BB' },
      leagueTier: 'rookie',
      isHuman: false,
    });

    const starter = createCrosstownStarterRivalry(home, rival);
    expect(starter.heat).toBeGreaterThanOrEqual(35);
    expect(getRivalryHeatTier(starter.heat)).toBe('heated');

    let records = [starter];
    records = recordRivalrySpark(records, home.id, rival.id, 'walk_off_finish', 'Walk-off grand slam in the 9th!');
    records = recordRivalrySpark(records, home.id, rival.id, 'playoff_rematch', 'Game 3 Championship thriller!');
    records = recordRivalrySpark(records, home.id, rival.id, 'poached_free_agent', 'Bandits signed ex-Comets ace!');

    const heated = records[0];
    expect(heated.heat).toBeGreaterThanOrEqual(80);
    expect(getRivalryHeatTier(heated.heat)).toBe('blood_feud');
    expect(heated.recentSparks.length).toBeGreaterThanOrEqual(3);

    const mods = evaluateRivalryShowdownModifiers(heated.heat);
    expect(mods.hypeGainMultiplier).toBeGreaterThanOrEqual(1.45);
    expect(mods.xpMultiplier).toBe(1.25);
    expect(mods.attendanceSurgePct).toBeGreaterThanOrEqual(0.25);

    const vsCard = buildRivalryShowdownPreview(home, rival, heated);
    expect(vsCard.vsBannerTitle).toMatch(/BLOOD FEUD|RIVALRY/i);
    expect(vsCard.cupName).toContain('Cup');

    const afterWin = updateTravelingRivalryCup(records, home.id, rival.id, home.id);
    expect(afterWin[0].cupHolderClubId).toBe(home.id);
  });
});
