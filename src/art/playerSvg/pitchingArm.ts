import type { PitchingMotion } from '../portraits/types';
import { PITCH_RELEASE_PHASE } from '../../scene/characters/animationState';

export type SignatureMotion = Exclude<PitchingMotion, 'overhand'>;
type Key = readonly [phase: number, elbowX: number, elbowY: number, wristX: number, wristY: number];

// Coordinates face the viewer's right. The sidearmer opens the elbow and
// sweeps across at shoulder height. The underhander circles down past the hip.
const motionKeys: Record<SignatureMotion, readonly Key[]> = {
  sidearm: [
    [0, 154, 169, 160, 180], [.24, 169, 159, 164, 140], [.4, 180, 157, 177, 129],
    [PITCH_RELEASE_PHASE, 176, 158, 204, 154], [.74, 172, 172, 149, 167], [1, 154, 169, 160, 180],
  ],
  underhand: [
    [0, 154, 169, 160, 180], [.22, 167, 149, 164, 126], [.38, 179, 149, 196, 136],
    [.48, 172, 173, 193, 187], [PITCH_RELEASE_PHASE, 154, 186, 165, 205],
    [.74, 163, 160, 159, 136], [1, 154, 169, 160, 180],
  ],
};

export function pitchingArm(motion: SignatureMotion, phase: number, left: boolean) {
  const keys = motionKeys[motion];
  const index = keys.findIndex(key => key[0] >= phase);
  const next = index < 0 ? keys.length - 1 : Math.max(1, index);
  const a = keys[next - 1];
  const b = keys[next];
  const t = Math.max(0, Math.min(1, (phase - a[0]) / (b[0] - a[0])));
  const mix = (i: 1 | 2 | 3 | 4) => a[i] + t * (b[i] - a[i]);
  const mirror = (x: number) => left ? 240 - x : x;
  const wrist = { x: mirror(mix(3)), y: mix(4) };
  return {
    shoulder: { x: mirror(144), y: 162 },
    elbow: { x: mirror(mix(1)), y: mix(2) },
    wrist,
    ball: { x: wrist.x + (left ? 3 : -3), y: wrist.y - 5 },
  };
}
