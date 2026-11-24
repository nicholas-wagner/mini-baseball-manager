import { describe, expect, it } from 'vitest';
import { BALLPARK_CATALOG } from '../engine/ballparks/stadiumCatalog';
import type { LeagueTierId } from '../engine/models/club';
import {
  BGM_TRACKS,
  getBgmTracksForTier,
  getTrackForBallpark,
  isTrackAllowedForTier,
  RetroBgmEngine,
  type BgmTrackId,
} from './bgmEngine';

const ALL_TIERS: readonly LeagueTierId[] = ['rookie', 'low_a', 'high_a', 'aa', 'aaa', 'majors'];

describe('RetroBgmEngine — League-Tier-Gated 90s Arcade Jukebox (12 Mutable Tracks Across All 6 Tiers)', () => {
  it('provides at least 2 selectable 90s tracks per league tier and covers every ballpark with full multi-voice patterns', () => {
    expect(BGM_TRACKS).toHaveLength(12);
    const ids = new Set<BgmTrackId>(BGM_TRACKS.map((t) => t.id));
    expect(ids.size).toBe(12);

    // Every league tier (Rookie -> Majors) has 2 dedicated selectable tracks
    for (const tier of ALL_TIERS) {
      const tierTracks = getBgmTracksForTier(tier);
      expect(tierTracks.length).toBeGreaterThanOrEqual(2);
      for (const t of tierTracks) {
        expect(t.leagueTier).toBe(tier);
        expect(isTrackAllowedForTier(t.id, tier)).toBe(true);
      }
    }

    // Every single ballpark still maps to a stadium-specific track
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

  it('restricts track selection to the active league tier and switches music cleanly on promotion', () => {
    const bgm = new RetroBgmEngine({ persist: false });
    bgm.syncLeagueTier('rookie');

    expect(bgm.getState().currentLeagueTier).toBe('rookie');
    expect(bgm.getState().trackId).toBe('sandlot_sunshine');

    // Rookie club can pick the second Rookie track
    bgm.selectTrack('twilight_bleachers');
    expect(bgm.getState().trackId).toBe('twilight_bleachers');
    expect(bgm.getState().autoMatchStadium).toBe(false);

    // Rookie club CANNOT select Major League music!
    bgm.selectTrack('cathedral_championship');
    expect(bgm.getState().trackId).toBe('twilight_bleachers');

    // Promoting to Mini Major League automatically moves into Major League tracks and unlocks both Majors options
    bgm.syncLeagueTier('majors');
    expect(isTrackAllowedForTier(bgm.getState().trackId, 'majors')).toBe(true);
    bgm.selectTrack('cathedral_championship');
    expect(bgm.getState().trackId).toBe('cathedral_championship');
    bgm.selectTrack('ninth_inning_turbo');
    expect(bgm.getState().trackId).toBe('ninth_inning_turbo');

    // Major League club cannot pick Rookie tracks either
    bgm.selectTrack('sandlot_sunshine');
    expect(bgm.getState().trackId).toBe('ninth_inning_turbo');

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
