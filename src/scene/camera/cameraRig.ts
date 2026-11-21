export type CameraPresetId =
  | 'over_shoulder_pitcher'
  | 'over_shoulder_batter'
  | 'broadcast_diamond'
  | 'showcase_closeup'
  | 'practice_diorama';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
}

export const CAMERA_PRESET_LABELS: Record<CameraPresetId, string> = {
  over_shoulder_pitcher: 'Pitcher OTS 3D',
  over_shoulder_batter: 'Batter OTS 3D',
  broadcast_diamond: 'Wide Ballpark',
  showcase_closeup: 'Chibi Close-Up',
  practice_diorama: 'Practice Cage',
};

export function getCameraPresetPose(
  preset: CameraPresetId,
  elapsedSec = 0,
  turntableAngle = 0,
): CameraPose {
  switch (preset) {
    case 'over_shoulder_pitcher':
      return {
        position: {
          x: -1.75 + Math.sin(elapsedSec * 0.7) * 0.08,
          y: 2.55 + Math.cos(elapsedSec * 0.9) * 0.04,
          z: -14.1,
        },
        lookAt: { x: 0.1, y: 1.05, z: 1.1 },
        fov: 44,
      };

    case 'over_shoulder_batter':
      return {
        position: {
          x: -1.85 + Math.sin(elapsedSec * 0.65) * 0.07,
          y: 2.65 + Math.cos(elapsedSec * 0.85) * 0.04,
          z: 4.85,
        },
        lookAt: { x: 0.25, y: 1.3, z: -11.4 },
        fov: 45,
      };

    case 'broadcast_diamond':
      return {
        position: {
          x: 16.5 + Math.sin(elapsedSec * 0.28) * 1.1,
          y: 13.8,
          z: 14.5,
        },
        lookAt: { x: 0, y: 0.8, z: -11.5 },
        fov: 42,
      };

    case 'showcase_closeup': {
      const angle = turntableAngle + elapsedSec * 0.35;
      const radius = 3.9;
      return {
        position: {
          x: Math.sin(angle) * radius,
          y: 1.95,
          z: -10.2 + Math.cos(angle) * radius,
        },
        lookAt: { x: 0, y: 1.15, z: -10.2 },
        fov: 38,
      };
    }

    case 'practice_diorama':
      return {
        position: { x: -4.8, y: 2.95, z: 4.3 },
        lookAt: { x: -0.6, y: 1.05, z: -0.6 },
        fov: 42,
      };
  }
}

export function dampCameraPose(
  current: CameraPose,
  target: CameraPose,
  dtSec: number,
  responsiveness = 6.5,
): CameraPose {
  const alpha = 1 - Math.exp(-Math.max(0, responsiveness) * Math.max(0, dtSec));
  const lerp = (a: number, b: number) => a + (b - a) * alpha;

  return {
    position: {
      x: lerp(current.position.x, target.position.x),
      y: lerp(current.position.y, target.position.y),
      z: lerp(current.position.z, target.position.z),
    },
    lookAt: {
      x: lerp(current.lookAt.x, target.lookAt.x),
      y: lerp(current.lookAt.y, target.lookAt.y),
      z: lerp(current.lookAt.z, target.lookAt.z),
    },
    fov: lerp(current.fov, target.fov),
  };
}

export function computeShakeOffset(trauma: number, timeSec: number): Vec3 {
  const clamped = Math.max(0, Math.min(1, trauma));
  if (clamped === 0) return { x: 0, y: 0, z: 0 };
  const mag = clamped * clamped * 0.32;
  return {
    x: Math.sin(timeSec * 57.3) * mag,
    y: Math.cos(timeSec * 49.1) * mag,
    z: Math.sin(timeSec * 37.7) * mag * 0.4,
  };
}
