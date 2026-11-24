import type { EffectiveBatSide } from '../../engine/handedness/types';
import type { Vec3 } from '../camera/cameraRig';

export const BASE_PATH_VERTICES: readonly Vec3[] = [
  { x: 0, y: 0.04, z: 0 }, // Home (0)
  { x: 9.8, y: 0.04, z: -9.8 }, // 1B (1)
  { x: 0, y: 0.04, z: -19.6 }, // 2B (2)
  { x: -9.8, y: 0.04, z: -9.8 }, // 3B (3)
  { x: 0, y: 0.04, z: 0 }, // Home (4)
] as const;

export const CATCHER_HOME = { x: 0, y: .04, z: 1.75 } as const;
export const PITCHING_RUBBER = { x: 0, y: .24, z: -10.2 } as const;

export const INFIELD_DIRT = { radius: 15.2, centerZ: -10.5 } as const;
export const OUTFIELD_WALL = { radius: 40, centerZ: -3 } as const;
export const OUTFIELD_STARTS = {
  LF: { x: -15, y: .04, z: -27 },
  CF: { x: 0, y: .04, z: -32 },
  RF: { x: 15, y: .04, z: -27 },
} as const;

export const BATTERS_BOX = { centerOffset: 1.18, halfWidth: .64, halfLength: 1.32, lineWidth: .06 } as const;

export function batterBox(side: EffectiveBatSide) {
  const acrossPlate = side === 'R' ? 1 : -1;
  return { position: { x: -BATTERS_BOX.centerOffset * acrossPlate, y: .04, z: .05 }, yaw: acrossPlate * Math.PI / 2 };
}

export function headingToward(from: Vec3, to: Vec3) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}
