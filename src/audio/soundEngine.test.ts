import { describe, expect, it } from 'vitest';
import { RetroSoundEngine } from './soundEngine';

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
});
