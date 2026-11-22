import { describe, expect, it } from 'vitest';
import { CLIP_DURATIONS } from '../characters/animationState';
import { createDelivery, sampleDeliveryFlight, signatureReleasePoint } from './showcaseDelivery';
import { sampleBallTrajectory } from './ballTrajectory';

describe('showcase pitch choreography', () => {
  it('releases sidearm wide of the hip and underhand below it, on the throwing side from either camera', () => {
    for (const camera of [{x:0,y:2,z:4}, {x:0,y:2,z:-15}]) {
      for (const hand of ['L','R'] as const) {
        const side = signatureReleasePoint('sidearm', 'pitch_windup', hand, 1, camera);
        const low = signatureReleasePoint('underhand', 'pitch_windup', hand, 1, camera);
        expect(Math.abs(side.x)).toBeGreaterThan(Math.abs(low.x) + .12);
        expect(side.y).toBeGreaterThan(low.y + .15);
        expect(Math.sign(side.x)).toBe(hand === 'R' ? -1 : 1);
        expect(Math.sign(low.x)).toBe(Math.sign(side.x));
        expect(signatureReleasePoint('underhand', 'pitch_windup', hand, 1.16, camera).y).toBeGreaterThan(low.y);
      }
    }
  });
  it('winds up before release, flies to the mitt, and clears the field on receipt', () => {
    const play = createDelivery('ghost_knuckle', 'R', 'L', 'pitch_super', 'bat_stance');
    expect(play.releaseAt).toBeGreaterThan(CLIP_DURATIONS.pitch_super / 2);
    expect(sampleDeliveryFlight(play, play.releaseAt - 0.01)).toBeNull();
    expect(sampleDeliveryFlight(play, play.releaseAt)?.progress).toBe(0);
    expect(play.pitch.end.z).toBeGreaterThan(0.5);
    expect(sampleDeliveryFlight(play, play.plateAt + 0.001)).toBeNull();
  });

  it.each(['moonshot_hr', 'ninja_bunt', 'line_drive'] as const)('connects the incoming pitch to %s at the bat', style => {
    const play = createDelivery(style, 'R', 'L', 'pitch_windup', 'bat_bomb');
    const contact = sampleDeliveryFlight(play, play.plateAt)!;
    expect(contact.spec.style).toBe(style);
    expect(contact.progress).toBeCloseTo(0);
    expect(sampleBallTrajectory(play.pitch, 1)).toEqual(sampleBallTrajectory(contact.spec, 0));
    expect(play.swingAt + CLIP_DURATIONS.bat_bomb * 0.45).toBeCloseTo(play.plateAt);
    expect(sampleDeliveryFlight(play, play.plateAt + contact.spec.durationSec + 0.01)).toBeNull();
  });

  it('releases from the throwing side and mirrors the contact point for left-handed hitters', () => {
    const right = createDelivery('moonshot_hr', 'R', 'R', 'pitch_super', 'bat_bomb');
    const left = createDelivery('moonshot_hr', 'L', 'L', 'pitch_super', 'bat_bomb');
    expect(right.pitch.start.x).toBeLessThan(0);
    expect(left.pitch.start.x).toBe(-right.pitch.start.x);
    expect(left.pitch.end.x).toBe(-right.pitch.end.x);
  });
});
