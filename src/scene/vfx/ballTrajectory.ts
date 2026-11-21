import type { Vec3 } from '../camera/cameraRig';

export type BallVfxStyle =
  | 'fastball'
  | 'blazing_comet'
  | 'ghost_knuckle'
  | 'tornado_slider'
  | 'moonshot_hr'
  | 'ninja_bunt'
  | 'line_drive';

export interface BallTrajectorySpec {
  style: BallVfxStyle;
  start: Vec3;
  end: Vec3;
  apexHeight: number;
  durationSec: number;
  trailColor: string;
  secondaryColor: string;
  calloutText: string;
  cameraShake: number;
}

export const BALL_TRAJECTORY_PRESETS: Record<BallVfxStyle, BallTrajectorySpec> = {
  fastball: {
    style: 'fastball',
    start: { x: 0.2, y: 1.35, z: -9.8 },
    end: { x: 0, y: 0.95, z: 0.3 },
    apexHeight: 1.45,
    durationSec: 0.56,
    trailColor: '#FFFFFF',
    secondaryColor: '#4CC3FF',
    calloutText: 'ZIP!',
    cameraShake: 0.18,
  },
  blazing_comet: {
    style: 'blazing_comet',
    start: { x: 0.2, y: 1.38, z: -9.8 },
    end: { x: 0, y: 1.02, z: 0.35 },
    apexHeight: 1.42,
    durationSec: 0.42,
    trailColor: '#FF4D6D',
    secondaryColor: '#FFC300',
    calloutText: 'BLAZING COMET!',
    cameraShake: 0.85,
  },
  ghost_knuckle: {
    style: 'ghost_knuckle',
    start: { x: 0.15, y: 1.42, z: -9.8 },
    end: { x: -0.25, y: 0.78, z: 0.35 },
    apexHeight: 2.15,
    durationSec: 0.88,
    trailColor: '#9B5DE5',
    secondaryColor: '#E0AAFF',
    calloutText: 'GHOST KNUCKLE!',
    cameraShake: 0.25,
  },
  tornado_slider: {
    style: 'tornado_slider',
    start: { x: 0.3, y: 1.35, z: -9.8 },
    end: { x: -0.45, y: 0.72, z: 0.35 },
    apexHeight: 1.55,
    durationSec: 0.62,
    trailColor: '#00E5FF',
    secondaryColor: '#4CC3FF',
    calloutText: 'TORNADO!',
    cameraShake: 0.42,
  },
  moonshot_hr: {
    style: 'moonshot_hr',
    start: { x: -0.2, y: 1.05, z: 0 },
    end: { x: 7.5, y: 3.5, z: -48 },
    apexHeight: 18.5,
    durationSec: 1.85,
    trailColor: '#FFC300',
    secondaryColor: '#FF4D6D',
    calloutText: 'KA-BOOM! HR!',
    cameraShake: 0.95,
  },
  ninja_bunt: {
    style: 'ninja_bunt',
    start: { x: -0.1, y: 0.95, z: 0 },
    end: { x: -5.4, y: 0.18, z: -6.8 },
    apexHeight: 1.4,
    durationSec: 1.05,
    trailColor: '#00E5FF',
    secondaryColor: '#FFFFFF',
    calloutText: 'NINJA BUNT!',
    cameraShake: 0.12,
  },
  line_drive: {
    style: 'line_drive',
    start: { x: -0.1, y: 1.0, z: 0 },
    end: { x: 11.5, y: 2.4, z: -29.5 },
    apexHeight: 5.2,
    durationSec: 1.1,
    trailColor: '#2FB356',
    secondaryColor: '#FFD166',
    calloutText: 'CRACK!',
    cameraShake: 0.5,
  },
};

export function sampleBallTrajectory(spec: BallTrajectorySpec, progress01: number): Vec3 {
  const t = Math.max(0, Math.min(1, progress01));
  let x = spec.start.x + (spec.end.x - spec.start.x) * t;
  const z = spec.start.z + (spec.end.z - spec.start.z) * t;

  // Parabolic arc through apexHeight
  const linearY = spec.start.y + (spec.end.y - spec.start.y) * t;
  const extraArch = Math.max(0, spec.apexHeight - (spec.start.y + spec.end.y) * 0.5);
  let y = linearY + 4 * extraArch * t * (1 - t);

  if (spec.style === 'ghost_knuckle') {
    const envelope = Math.sin(t * Math.PI);
    x += Math.sin(t * Math.PI * 5) * 0.52 * envelope;
    y += Math.cos(t * Math.PI * 4) * 0.28 * envelope;
  } else if (spec.style === 'tornado_slider') {
    const envelope = Math.sin(t * Math.PI);
    x += Math.cos(t * Math.PI * 6) * 0.34 * envelope;
    y += Math.sin(t * Math.PI * 6) * 0.22 * envelope;
  } else if (spec.style === 'ninja_bunt' && t > 0.55) {
    // Soft bounce along infield grass
    const bounceT = (t - 0.55) / 0.45;
    y = 0.18 + Math.abs(Math.sin(bounceT * Math.PI * 2)) * 0.35 * (1 - bounceT);
  }

  return { x, y: Math.max(0.16, y), z };
}
