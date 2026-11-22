import { describe, expect, it } from 'vitest';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE, type CharacterAnimClip } from '../../scene/characters/animationState';
import { evaluateMiniPlayerPose } from './miniPlayerPose';

describe('Articulated 2.5D Chibi Mini-Player Pose Rig', () => {
  const clips = Object.keys(CLIP_DURATIONS) as CharacterAnimClip[];

  it.each(['pitch_windup', 'pitch_super', 'practice_bullpen'] as const)('empties the throwing hand on the release frame of %s', clip => {
    const time = CLIP_DURATIONS[clip] * PITCH_RELEASE_PHASE;
    expect(evaluateMiniPlayerPose(clip, time - .001, 'pitcher').holdingBall).toBe(true);
    expect(evaluateMiniPlayerPose(clip, time, 'pitcher').holdingBall).toBe(false);
  });

  it('evaluates finite joint transforms across all 14 animation clips', () => {
    for (const clip of clips) {
      const dur = CLIP_DURATIONS[clip];
      for (const frac of [0, 0.25, 0.5, 0.8]) {
        const pose = evaluateMiniPlayerPose(clip, dur * frac, 'pitcher');
        expect(Number.isFinite(pose.root.ty)).toBe(true);
        expect(Number.isFinite(pose.backArm.rotDeg)).toBe(true);
        expect(Number.isFinite(pose.frontArm.rotDeg)).toBe(true);
        expect(Number.isFinite(pose.hopWorldY)).toBe(true);
        expect(pose.shadowScale).toBeGreaterThan(0.2);
      }
    }
  });

  it.each(['bat_swing', 'bat_bomb', 'bat_bunt'] as const)('extends the %s barrel into the hitting lane at contact', clip => {
    const phase = clip === 'bat_bunt' ? 0.5 : 0.45;
    const pose = evaluateMiniPlayerPose(clip, CLIP_DURATIONS[clip] * phase, 'batter');
    const barrelAngle = pose.frontArm.rotDeg + pose.batRotDeg + pose.root.rotDeg;
    expect(barrelAngle).toBeGreaterThan(72);
    expect(barrelAngle).toBeLessThan(104);
  });

  it('shows swing smear swoosh mid-swing and crouches for catchers', () => {
    const midSwing = evaluateMiniPlayerPose('bat_bomb', CLIP_DURATIONS.bat_bomb * 0.45, 'batter');
    expect(midSwing.swingSmearOpacity).toBeGreaterThan(0.5);
    expect(midSwing.auraIntensity).toBeGreaterThan(0.8);

    const catcherCrouch = evaluateMiniPlayerPose('field_ready', 0.2, 'catcher');
    expect(catcherCrouch.root.ty).toBeGreaterThan(10);
  });
});
