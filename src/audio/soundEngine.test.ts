import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALL_SOUNDBOARD_CUES,
  bindSoundGestureUnlock,
  RetroSoundEngine,
  soundEngine,
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
  'ump_strike_call',
  'ump_safe_call',
  'steal_burst',
  'broken_bat',
  'wall_thud',
  'walk_ball_four',
  'organ_seventh_stretch',
  'stadium_airhorn',
  'vendor_bell',
  'rain_thunder',
  'heritage_power_surge',
  'trade_gavel',
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

  it('exposes all 40 ballpark, action, and RPG sound cues in ALL_SOUNDBOARD_CUES and plays each cleanly', () => {
    expect(ALL_SOUNDBOARD_CUES).toHaveLength(40);
    const cueSet = new Set(ALL_SOUNDBOARD_CUES.map((item) => item.cue));
    expect(cueSet.size).toBe(40);

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

  it('returns false from unlock when no AudioContext exists', () => {
    expect(new RetroSoundEngine().unlock()).toBe(false);
  });

  it('creates and resumes a suspended AudioContext once inside a gesture', () => {
    const previous = window.AudioContext;
    const made: { state: string; resume: ReturnType<typeof vi.fn> }[] = [];
    class FakeContext {
      state = 'suspended';
      resume = vi.fn(() => {
        this.state = 'running';
        return Promise.resolve();
      });
      constructor() {
        made.push(this);
      }
    }
    window.AudioContext = FakeContext as unknown as typeof AudioContext;
    try {
      const engine = new RetroSoundEngine();
      expect(engine.unlock()).toBe(true);
      expect(engine.unlock()).toBe(true);
      expect(made).toHaveLength(1);
      expect(made[0].resume).toHaveBeenCalledTimes(1);
    } finally {
      window.AudioContext = previous;
    }
  });

  it('unlocks once from the first pointer or key gesture', () => {
    const unlock = vi.spyOn(soundEngine, 'unlock').mockReturnValue(true);
    const target = new EventTarget();
    bindSoundGestureUnlock(target);
    bindSoundGestureUnlock(target);
    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('keydown'));
    expect(unlock).toHaveBeenCalledTimes(1);
    unlock.mockRestore();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
