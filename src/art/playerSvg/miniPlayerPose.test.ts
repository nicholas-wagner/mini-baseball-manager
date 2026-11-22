import { describe, expect, it } from 'vitest';
import { CLIP_DURATIONS, type CharacterAnimClip } from '../../scene/characters/animationState';
import { evaluateMiniPlayerPose } from './miniPlayerPose';

describe('Articulated Mini-Player SVG Pose Rig', () => {
  const clips = Object.keys(CLIP_DURATIONS) as CharacterAnimClip[];

  it('evaluates finite joint transforms across all 14 animation clips', () => {
    for (const clip of clips) {
      const dur = CLIP_DURATIONS[clip];
      for (const frac of [0, 0.25, 0.5, 0.8]) {
        const pose = evaluateMiniPlayerPose(clip, dur * frac, 'pitcher');
        expect(Number.isFinite(pose.root.ty)).toBe(true);
        expect(Number.isFinite(pose.leftArm.rotDeg)).toBe(true);
        expect(Number.isFinite(pose.rightArm.rotDeg)).toBe(true);
        expect(pose.shadowScale).toBeGreaterThan(0.2);
      }
    }
  });

  it('shows swing smear swoosh mid-swing and crouches for catchers', () => {
    const midSwing = evaluateMiniPlayerPose('bat_bomb', CLIP_DURATIONS.bat_bomb * 0.45, 'batter');
    expect(midSwing.swingSmearOpacity).toBeGreaterThan(0.5);
    expect(midSwing.auraIntensity).toBeGreaterThan(0.8);

    const catcherCrouch = evaluateMiniPlayerPose('field_ready', 0.2, 'catcher');
    expect(catcherCrouch.root.ty).toBeGreaterThan(10);
  });
});
