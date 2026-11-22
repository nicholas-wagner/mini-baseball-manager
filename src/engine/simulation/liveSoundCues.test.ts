import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { simFullGame } from './baseballEngine';
import { resolveBaseStealPlay } from './baserunning';

describe('Live Gameplay Sound Cue Wiring (12 New 90s SFX)', () => {
  it('emits steal_burst, ump_safe_call, and stadium_airhorn across steal outcomes', () => {
    const rng = createSeededRng(7701);
    const fast = createPlayer(rng, { position: 'CF', tier: 'aaa' });
    fast.ratings.speed = 96;
    const trail = createPlayer(rng, { position: '2B', tier: 'aaa' });
    trail.ratings.speed = 85;
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aaa' });
    pitcher.throws = 'R';
    const catcher = createPlayer(rng, { position: 'C', tier: 'aaa' });
    catcher.ratings.arm = 52;
    catcher.ratings.fielding = 52;
    const map = { [fast.id]: fast, [trail.id]: trail };

    const cues = new Set<string>();
    for (let s = 1; s <= 150; s += 1) {
      const s2 = resolveBaseStealPlay(createSeededRng(s), 'steal_2b', [fast.id, null, null], map, pitcher, catcher);
      if (s2?.success) cues.add(s2.soundCue);

      const ds = resolveBaseStealPlay(createSeededRng(s), 'double_steal', [trail.id, fast.id, null], map, pitcher, catcher);
      if (ds?.success) cues.add(ds.soundCue);

      const sh = resolveBaseStealPlay(createSeededRng(s), 'steal_home', [null, null, fast.id], map, pitcher, catcher);
      if (sh?.success) cues.add(sh.soundCue);
    }

    expect(cues.has('steal_burst')).toBe(true);
    expect(cues.has('ump_safe_call')).toBe(true);
    expect(cues.has('stadium_airhorn')).toBe(true);
  });

  it('emits ump_strike_call, walk_ball_four, wall_thud, broken_bat, and organ_seventh_stretch across full 9-inning games', () => {
    const away = createClub(createSeededRng(8811), {
      id: 'sfx-away',
      isHuman: false,
      city: 'Harbor',
      name: 'Gulls',
      mascot: 'Gull',
      colors: { primary: '#1D3557', secondary: '#E63946', accent: '#FFD166', monogram: 'HG' },
      leagueTier: 'aa',
    });
    const home = createClub(createSeededRng(8812), {
      id: 'sfx-home',
      isHuman: true,
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'aa',
    });

    const seenCues = new Set<string>();
    for (let gameSeed = 100; gameSeed < 125; gameSeed += 1) {
      const res = simFullGame(away, home, gameSeed, 9);
      for (const ev of res.events) {
        if (ev.soundCue) seenCues.add(ev.soundCue);
      }
    }

    expect(seenCues.has('ump_strike_call')).toBe(true);
    expect(seenCues.has('walk_ball_four')).toBe(true);
    expect(seenCues.has('broken_bat')).toBe(true);
    expect(seenCues.has('organ_seventh_stretch')).toBe(true);
    // wall_thud fires on off-the-wall triples (and deep wall doubles)
    expect(seenCues.has('wall_thud')).toBe(true);
  });
});
