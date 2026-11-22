import { describe, expect, it } from 'vitest';
import {
  ALL_SOUNDBOARD_CUES,
  RetroSoundEngine,
  type SoundCue,
} from './soundEngine';

const EXPECTED_NEW_CUES: readonly SoundCue[] = [
  'strikeout_punch',
  'dirt_slide',
  'foul_clank',
  'double_play_snap',
  'error_bonk',
  'tornado_whoosh',
  'bullpen_phone',
  'crowd_gasp',
  'organ_rally',
  'stadium_stomp_clap',
  'fireworks_boom',
  'clutch_stinger',
  'card_flip',
  'trophy_fanfare',
];

describe('RetroSoundEngine', () => {
  it('tracks cues and respects mute toggle safely without AudioContext', () => {
    const engine = new RetroSoundEngine();
    expect(engine.getState().muted).toBe(false);

    expect(engine.play('organ_charge')).toBe(true);
    expect(engine.getState().lastCue).toBe('organ_charge');

    expect(engine.toggleMute()).toBe(true);
    expect(engine.play('bat_crack')).toBe(false);
    expect(engine.getState().lastCue).toBe('organ_charge');

    engine.setMuted(false);
    expect(engine.play('level_up')).toBe(true);
    expect(engine.getState().lastCue).toBe('level_up');
  });

  it('clamps volume strictly between 0 and 1', () => {
    const engine = new RetroSoundEngine();
    engine.setVolume(2.5);
    expect(engine.getState().volume).toBe(1);
    engine.setVolume(-0.4);
    expect(engine.getState().volume).toBe(0);
  });

  it('exposes all 28 ballpark, action, and RPG sound cues in ALL_SOUNDBOARD_CUES and plays each cleanly', () => {
    expect(ALL_SOUNDBOARD_CUES).toHaveLength(28);
    const cueSet = new Set(ALL_SOUNDBOARD_CUES.map((item) => item.cue));
    expect(cueSet.size).toBe(28);

    for (const cue of EXPECTED_NEW_CUES) {
      expect(cueSet.has(cue)).toBe(true);
    }

    const engine = new RetroSoundEngine();
    for (const item of ALL_SOUNDBOARD_CUES) {
      expect(item.label.length).toBeGreaterThan(2);
      expect(engine.play(item.cue)).toBe(true);
      expect(engine.getState().lastCue).toBe(item.cue);
    }
  });
});
