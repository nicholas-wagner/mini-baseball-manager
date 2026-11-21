import { describe, expect, it } from 'vitest';
import {
  CLIP_DURATIONS,
  evaluateCharacterPose,
  type CharacterAnimClip,
} from './animationState';

describe('Chibi 3D Character Animation State Machine', () => {
  const allClips = Object.keys(CLIP_DURATIONS) as CharacterAnimClip[];

  it('produces finite numeric poses across the full cycle for every clip', () => {
    for (const clip of allClips) {
      const duration = CLIP_DURATIONS[clip];
      for (const ratio of [0, 0.25, 0.5, 0.75, 0.99]) {
        const pose = evaluateCharacterPose(clip, duration * ratio);
        expect(Number.isFinite(pose.bodyOffset.y)).toBe(true);
        expect(Number.isFinite(pose.scale.x)).toBe(true);
        expect(Number.isFinite(pose.scale.y)).toBe(true);
        expect(pose.scale.x).toBeGreaterThan(0.4);
        expect(pose.scale.y).toBeGreaterThan(0.4);
      }
    }
  });

  it('activates fiery aura and fired_up expression during Super Pitch and Bomb Swing', () => {
    const superPitchPeak = evaluateCharacterPose('pitch_super', CLIP_DURATIONS.pitch_super * 0.5);
    expect(superPitchPeak.auraIntensity).toBeGreaterThan(0.8);
    expect(superPitchPeak.expression).toBe('fired_up');

    const bombSwingFlip = evaluateCharacterPose('bat_bomb', CLIP_DURATIONS.bat_bomb * 0.85);
    expect(bombSwingFlip.batDetachedSpin).toBeGreaterThan(1);
  });

  it('reaches significant aerial height on Sky-High Leap and shows sweat on Practice drills', () => {
    const leapApex = evaluateCharacterPose('field_high_jump', CLIP_DURATIONS.field_high_jump * 0.6);
    expect(leapApex.bodyOffset.y).toBeGreaterThan(1.2);

    const cage = evaluateCharacterPose('practice_cage', 0.5);
    const bullpen = evaluateCharacterPose('practice_bullpen', 0.5);
    expect(cage.sweatVisible).toBe(true);
    expect(bullpen.sweatVisible).toBe(true);
  });
});
