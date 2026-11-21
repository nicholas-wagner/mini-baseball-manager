import { describe, expect, it } from 'vitest';
import {
  computeShakeOffset,
  dampCameraPose,
  getCameraPresetPose,
  type CameraPresetId,
} from './cameraRig';

describe('Over-the-Shoulder 3D Camera Rig', () => {
  it('places over-shoulder-pitcher behind the mound facing home plate (+Z)', () => {
    const pose = getCameraPresetPose('over_shoulder_pitcher');
    expect(pose.position.z).toBeLessThan(-10.2);
    expect(pose.lookAt.z).toBeGreaterThan(0);
  });

  it('places over-shoulder-batter behind home plate looking toward the mound (-Z)', () => {
    const pose = getCameraPresetPose('over_shoulder_batter');
    expect(pose.position.z).toBeGreaterThan(2);
    expect(pose.lookAt.z).toBeLessThan(-8);
  });

  it('converges smoothly via exponential damping across presets', () => {
    let current = getCameraPresetPose('over_shoulder_pitcher');
    const target = getCameraPresetPose('over_shoulder_batter');
    const initialDist = Math.abs(target.position.z - current.position.z);

    for (let i = 0; i < 60; i += 1) {
      current = dampCameraPose(current, target, 1 / 60, 8);
    }

    const finalDist = Math.abs(target.position.z - current.position.z);
    expect(finalDist).toBeLessThan(initialDist * 0.02);
  });

  it('returns zero camera shake when trauma is 0 and non-zero when positive', () => {
    expect(computeShakeOffset(0, 1.5)).toEqual({ x: 0, y: 0, z: 0 });
    const shake = computeShakeOffset(0.9, 1.2);
    expect(Math.hypot(shake.x, shake.y, shake.z)).toBeGreaterThan(0.05);
  });

  it('supports every documented camera preset', () => {
    const presets: CameraPresetId[] = [
      'over_shoulder_pitcher',
      'over_shoulder_batter',
      'broadcast_diamond',
      'showcase_closeup',
      'practice_diorama',
    ];
    for (const id of presets) {
      const pose = getCameraPresetPose(id, 1.0);
      expect(pose.fov).toBeGreaterThanOrEqual(30);
      expect(pose.fov).toBeLessThanOrEqual(60);
    }
  });
});
