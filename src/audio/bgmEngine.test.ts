import { describe, expect, it } from 'vitest';
import { BALLPARK_CATALOG } from '../engine/ballparks/stadiumCatalog';
import {
  BGM_TRACKS,
  getTrackForBallpark,
  RetroBgmEngine,
  type BgmTrackId,
} from './bgmEngine';

describe('RetroBgmEngine — Unique Per-Stadium 90s Arcade Jukebox (10 Mutable Tracks)', () => {
  it('provides a unique 90s arcade background track for every one of the 10 ballparks with full multi-voice patterns', () => {
    expect(BGM_TRACKS).toHaveLength(10);
    const ids = new Set<BgmTrackId>(BGM_TRACKS.map((t) => t.id));
    expect(ids.size).toBe(10);

    // Every single ballpark maps to a distinct stadium-specific track
    const mappedTrackIds = new Set<BgmTrackId>();
    for (const park of BALLPARK_CATALOG) {
      const track = getTrackForBallpark(park.id);
      expect(track.ballparkId).toBe(park.id);
      mappedTrackIds.add(track.id);
    }
    expect(mappedTrackIds.size).toBe(BALLPARK_CATALOG.length);

    for (const track of BGM_TRACKS) {
      expect(track.title.length).toBeGreaterThan(3);
      expect(track.stadiumLabel.length).toBeGreaterThan(3);
      expect(track.bpm).toBeGreaterThanOrEqual(88);
      expect(track.bpm).toBeLessThanOrEqual(148);
      expect(track.leadNotes.length).toBe(32);
      expect(track.bassNotes.length).toBe(32);
      expect(track.chordRoots.length).toBe(8);
    }
  });

  it('auto-switches music per stadium when autoMatchStadium is ON, and respects manual track lock, mute & gentle volume', () => {
    const bgm = new RetroBgmEngine({ persist: false });
    const initial = bgm.getState();

    expect(initial.enabled).toBe(true);
    expect(initial.autoMatchStadium).toBe(true);
    expect(initial.volume).toBeGreaterThan(0);
    expect(initial.volume).toBeLessThanOrEqual(0.35);
    expect(initial.trackId).toBe('sandlot_sunshine');

    // Traveling to Sakura Garden or Neon Metro Dome automatically updates the environmental soundtrack
    bgm.syncStadium('sakura_garden');
    expect(bgm.getState().trackId).toBe('sakura_pentatonic_march');

    bgm.syncStadium('neon_metro_dome');
    expect(bgm.getState().trackId).toBe('ninth_inning_turbo');

    // Manually choosing a track pins it (disables autoMatchStadium until user re-enables)
    bgm.selectTrack('dugout_funk');
    expect(bgm.getState().trackId).toBe('dugout_funk');
    expect(bgm.getState().autoMatchStadium).toBe(false);

    // Stadium changes do not override a manually pinned track
    bgm.syncStadium('bayfront_cove');
    expect(bgm.getState().trackId).toBe('dugout_funk');

    // Re-enabling Auto-Match immediately syncs to the current stadium
    bgm.setAutoMatchStadium(true);
    expect(bgm.getState().trackId).toBe('bayfront_surf_94');

    // Independent Music mute toggle + volume clamping + master mute
    expect(bgm.toggleEnabled()).toBe(false);
    expect(bgm.getState().enabled).toBe(false);
    expect(bgm.getState().playing).toBe(false);

    bgm.setEnabled(true);
    expect(bgm.getState().enabled).toBe(true);

    bgm.setVolume(2.5);
    expect(bgm.getState().volume).toBe(1);
    bgm.setVolume(-0.2);
    expect(bgm.getState().volume).toBe(0);

    bgm.setMasterMuted(true);
    expect(bgm.getState().masterMuted).toBe(true);
    expect(bgm.getState().playing).toBe(false);

    bgm.dispose();
  });
});
