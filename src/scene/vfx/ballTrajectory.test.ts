import { describe, expect, it } from 'vitest';
import { BALL_TRAJECTORY_PRESETS, sampleBallTrajectory } from './ballTrajectory';

describe('3D Ball Trajectory Physics & Special Power Arcs', () => {
  it('starts at start position and lands near end position', () => {
    const spec = BALL_TRAJECTORY_PRESETS.blazing_comet;
    const p0 = sampleBallTrajectory(spec, 0);
    const p1 = sampleBallTrajectory(spec, 1);

    expect(p0.z).toBeCloseTo(spec.start.z, 3);
    expect(p1.z).toBeCloseTo(spec.end.z, 3);
    expect(spec.durationSec).toBeLessThan(BALL_TRAJECTORY_PRESETS.fastball.durationSec);
  });

  it('produces wild lateral wobble on Ghost Knuckleball', () => {
    const spec = BALL_TRAJECTORY_PRESETS.ghost_knuckle;
    const samples = [0.15, 0.3, 0.5, 0.7, 0.85].map((t) => sampleBallTrajectory(spec, t).x);
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread).toBeGreaterThan(0.5);
  });

  it('launches Moonshot Bomb-Swing high above the outfield wall', () => {
    const spec = BALL_TRAJECTORY_PRESETS.moonshot_hr;
    const mid = sampleBallTrajectory(spec, 0.5);
    const end = sampleBallTrajectory(spec, 1);

    expect(mid.y).toBeGreaterThan(15);
    expect(end.z).toBeLessThan(-40);
  });

  it('deadens Ninja Bunt gently in front of the infield', () => {
    const spec = BALL_TRAJECTORY_PRESETS.ninja_bunt;
    const end = sampleBallTrajectory(spec, 1);
    expect(Math.hypot(end.x, end.z)).toBeLessThan(12);
    expect(end.y).toBeLessThan(0.5);
  });
});
