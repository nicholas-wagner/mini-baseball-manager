import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../../engine/league/seasonEngine';
import { createGameSession, stepPitch } from '../../engine/simulation/baseballEngine';
import { buildLiveStadiumScoreboardSnapshot } from './liveScoreboardData';

describe('Live 3D Stadium Scoreboard Data Projection', () => {
  it('projects live team abbreviations, R/H/E, inning runs, count (B/S/O), bases, and updates signature on every state change', () => {
    const world = generateSixTierWorld(1994, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });
    const home = world.leagues.rookie[0];
    const away = world.leagues.rookie[1];
    const session = createGameSession(away, home, 1994, 'regular', 5);

    const initial = buildLiveStadiumScoreboardSnapshot(away, home, session);
    expect(initial.awayAbbr).toBe(away.colors.monogram);
    expect(initial.homeAbbr).toBe(home.colors.monogram);
    expect(initial.awayRuns).toBe(0);
    expect(initial.homeRuns).toBe(0);
    expect(initial.awayHits).toBe(0);
    expect(initial.homeHits).toBe(0);
    expect(initial.awayErrors).toBe(0);
    expect(initial.homeErrors).toBe(0);
    expect(initial.inning).toBe(1);
    expect(initial.half).toBe('TOP');
    expect(initial.balls).toBe(0);
    expect(initial.strikes).toBe(0);
    expect(initial.outs).toBe(0);
    expect(initial.inningColumns.length).toBeGreaterThanOrEqual(5);

    // Step pitches until count or outs/score changes and verify snapshot updates live!
    let cur = session;
    let changed = false;
    for (let i = 0; i < 12; i += 1) {
      cur = stepPitch(cur, 'normal').nextSession;
      const snap = buildLiveStadiumScoreboardSnapshot(away, home, cur);
      if (snap.signature !== initial.signature) {
        changed = true;
        expect(snap.balls).toBe(cur.balls);
        expect(snap.strikes).toBe(cur.strikes);
        expect(snap.outs).toBe(cur.outs);
        expect(snap.awayRuns).toBe(cur.away.score);
        expect(snap.homeRuns).toBe(cur.home.score);
        expect(snap.awayHits).toBe(cur.away.hits);
        expect(snap.homeHits).toBe(cur.home.hits);
        expect(snap.awayErrors).toBe(cur.away.errors);
        expect(snap.homeErrors).toBe(cur.home.errors);
        break;
      }
    }
    expect(changed).toBe(true);
  });
});
