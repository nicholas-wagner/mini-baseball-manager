import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import type { ThrowsHand } from '../../engine/handedness/types';
import { ALL_PITCH_TYPES, type PitchType } from '../../engine/models/player';
import { fitFieldOfView, getCameraPresetPose } from '../camera/cameraRig';
import { createBallFlightVisual } from '../vfx/ballFlightVisual';
import { BALL_TRAJECTORY_PRESETS, sampleBallTrajectory } from '../vfx/ballTrajectory';
import { createDelivery, sampleDeliveryFlight } from '../vfx/showcaseDelivery';
import { sampleLeg } from './diamondPlay';
import { getPitchTrailVisual, pitchSeconds, shapePitch } from './pitchFlight';

function offset(pitchType: PitchType, t: number, hand: ThrowsHand = 'R') {
  const pos = { x: 0, y: 0, z: 0 };
  shapePitch(pos, { pitchType, mph: 88 }, t, hand);
  return pos;
}

describe('pitch break relative to the straight release-to-pocket line', () => {
  it.each(ALL_PITCH_TYPES)('%s keeps both endpoints and mirrors only lateral movement', pitch => {
    for (const hand of ['R', 'L'] as const) {
      for (const t of [0, 1]) {
        expect(offset(pitch, t, hand)).toEqual({ x: 0, y: 0, z: 0 });
      }
    }
    for (const t of [.2, .6, .85]) {
      const right = offset(pitch, t);
      const left = offset(pitch, t, 'L');
      expect(left.x).toBeCloseTo(-right.x);
      expect(left.y).toBe(right.y);
      expect(left.z).toBe(0);
    }
  });

  it('keeps the four-seam straight with a hint of late carry', () => {
    expect(Math.abs(offset('four_seam', .6).x)).toBeLessThan(.1);
    expect(offset('four_seam', .95).y).toBeGreaterThan(offset('four_seam', .7).y);
  });

  it('runs and sinks the right-handed two-seam toward first base into the mitt', () => {
    const before = offset('two_seam', .7);
    const late = offset('two_seam', .95);
    expect(late.x - before.x).toBeGreaterThan(.3);
    expect(before.y - late.y).toBeGreaterThan(.3);
  });

  it('sweeps the right-handed slider toward third and cuts later with a tighter dart', () => {
    const slider = offset('slider', .55);
    const cutter = offset('cutter', .55);
    expect(slider.x).toBeGreaterThan(cutter.x + .3);
    expect(slider.y).toBeGreaterThan(offset('slider', .95).y + .3);
    expect(offset('slider', .95).x).toBeLessThan(slider.x - .3);
    expect(offset('cutter', .7).x).toBeGreaterThan(cutter.x);
    expect(offset('cutter', .95).x).toBeLessThan(offset('cutter', .7).x - .2);
  });

  it('loops the curveball high early and dives mostly vertically toward the pocket', () => {
    const top = offset('curveball', .45);
    expect(top.y).toBeGreaterThan(offset('four_seam', .45).y + 1);
    expect(top.y).toBeGreaterThan(offset('curveball', .85).y + .4);
    expect(Math.abs(top.x)).toBeLessThan(top.y / 4);
  });

  it('tunnels the changeup with the heater early before fading arm-side and tumbling', () => {
    const heater = offset('four_seam', .25);
    const change = offset('changeup', .25);
    expect(Math.hypot(heater.x - change.x, heater.y - change.y)).toBeLessThan(.08);
    const before = offset('changeup', .78);
    const late = offset('changeup', .97);
    expect(late.x - before.x).toBeGreaterThan(.3);
    expect(before.y - late.y).toBeGreaterThan(.35);
  });

  it('holds the splitter up beyond halfway before its steep late drop', () => {
    expect(offset('splitter', .75).y).toBeGreaterThan(offset('splitter', .55).y);
    expect(offset('splitter', .75).y - offset('splitter', .98).y).toBeGreaterThan(.4);
    expect(Math.abs(offset('splitter', .75).x)).toBeLessThan(.18);
  });

  it('flutters back and forth on both axes during a single knuckleball', () => {
    const samples = Array.from({ length: 19 }, (_, i) => offset('knuckleball', (i + 1) / 20));
    for (const axis of ['x', 'y'] as const) {
      const signs = samples.map(p => p[axis]).filter(value => Math.abs(value) > .05).map(Math.sign);
      const crossings = signs.slice(1).filter((sign, i) => sign !== signs[i]);
      expect(crossings.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives a 77 mph offspeed pitch visibly more travel time than a 98 mph heater', () => {
    expect(pitchSeconds(77) - pitchSeconds(98)).toBeGreaterThan(.1);
  });

  it.each(['over_shoulder_batter', 'over_shoulder_pitcher'] as const)(
    'separates the sweep, run and loop by more than a ball width from %s', preset => {
      const width = 390;
      const height = 240;
      const shot = getCameraPresetPose(preset);
      const camera = new PerspectiveCamera(fitFieldOfView(shot.fov, width / height), width / height);
      camera.position.copy(shot.position);
      camera.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
      camera.updateMatrixWorld();
      const release = { x: -.36, y: 1.04, z: -10.05 };
      const pocket = { x: -.31, y: .54, z: 1.1 };
      function projected(pitchType: PitchType) {
        const leg = { from: 'P', to: 'C', kind: 'pitch', start: 0, end: 1, pitch: { pitchType, mph: 88 } } as const;
        return new Vector3().copy(sampleLeg(leg, release, pocket, .65)).project(camera);
      }
      const heater = projected('four_seam');
      const sweep = projected('slider').x - heater.x;
      const run = projected('two_seam').x - heater.x;
      expect(sweep * run).toBeLessThan(0);
      expect(Math.min(Math.abs(sweep), Math.abs(run)) * width / 2).toBeGreaterThan(8);
      expect((projected('curveball').y - heater.y) * height / 2).toBeGreaterThan(8);
    },
  );
});

describe('pitch trails', () => {
  it.each([
    ['four_seam', '#FFF6D6', '#FFD166'], ['two_seam', '#FFF6D6', '#FFD166'],
    ['cutter', '#38BDF8', '#BAE6FD'], ['slider', '#38BDF8', '#BAE6FD'],
    ['curveball', '#A855F7', '#E9D5FF'], ['changeup', '#2DD4BF', '#99F6E4'],
    ['splitter', '#2DD4BF', '#99F6E4'], ['knuckleball', '#E0AAFF', '#F5D0FE'],
  ] as const)('%s has its family colors and a softer reduced-motion trail', (pitch, primaryColor, secondaryColor) => {
    const trail = getPitchTrailVisual(pitch);
    expect(trail).toMatchObject({ primaryColor, secondaryColor });
    const calm = getPitchTrailVisual(pitch, true);
    expect(calm.primaryColor).toBe('#FFF6D6');
    expect(calm.trailStrength).toBeGreaterThan(0);
    expect(calm.trailStrength).toBeLessThanOrEqual(trail.trailStrength * .5);
    expect(calm.spinRate).toBeLessThanOrEqual(trail.spinRate);
  });

  it('samples a longer stretch of the actual curve without tracing behind the release', () => {
    const ball = createBallFlightVisual();
    const spec = BALL_TRAJECTORY_PRESETS.fastball;
    function oldestSample(pitch: PitchType, progress: number) {
      let oldest = progress;
      ball.draw(spec, progress, getPitchTrailVisual(pitch), 1, (trajectory, t) => {
        oldest = Math.min(oldest, t);
        return sampleBallTrajectory(trajectory, t);
      });
      return oldest;
    }
    try {
      expect(oldestSample('curveball', .8)).toBeLessThan(oldestSample('four_seam', .8));
      expect(oldestSample('curveball', .02)).toBeGreaterThanOrEqual(0);
    } finally {
      ball.dispose();
    }
  });
});

describe('showcase deliveries', () => {
  it.each(['L', 'R'] as const)('matches the live %s-handed path, timing and pitch trail up to bat contact', hand => {
    const pitch = { pitchType: 'slider', mph: 83 } as const;
    const play = createDelivery('line_drive', hand, 'R', 'pitch_windup', 'bat_swing', undefined, pitch);
    expect(play.plateAt - play.releaseAt).toBeCloseTo(pitchSeconds(pitch.mph));
    const t = .72;
    const flight = sampleDeliveryFlight(play, play.releaseAt + pitchSeconds(pitch.mph) * t, true)!;
    expect(flight.visual).toEqual(getPitchTrailVisual('slider', true));
    const { start, end } = play.pitch;
    const leg = { from: 'P', to: 'BAT', kind: 'pitch', start: play.releaseAt, end: play.plateAt, pitch } as const;
    expect(sampleBallTrajectory(flight.spec, t)).toEqual(sampleLeg(leg, start, end, t, hand));
    const hit = sampleDeliveryFlight(play, play.plateAt)!;
    expect(hit.spec).toBe(play.hit);
    expect(hit.visual).toBeUndefined();
  });

  it('keeps a showcase with no recorded pitch on its authored special-effect preset', () => {
    const play = createDelivery('ghost_knuckle', 'R', 'L', 'pitch_super', 'bat_stance');
    const flight = sampleDeliveryFlight(play, play.releaseAt)!;
    expect(flight.visual).toBeUndefined();
    expect(flight.spec.trailColor).toBe(BALL_TRAJECTORY_PRESETS.ghost_knuckle.trailColor);
  });
});
