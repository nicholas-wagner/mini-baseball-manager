import type { PitchType } from '../../engine/models/player';
import type { ThrowsHand } from '../../engine/handedness/types';
import type { Vec3 } from '../camera/cameraRig';

export interface PitchFlight {
  pitchType: PitchType;
  mph: number;
}
// Signed horizontal movement is in right-handed mound coordinates. Each pitch reaches the called pocket.
const movement: Record<PitchType, readonly [number, number]> = {
  four_seam: [0.06, 0.09],
  two_seam: [0.49, 0.29],
  cutter: [-0.32, 0.19],
  slider: [-0.86, 0.48],
  curveball: [-0.53, 0.98],
  changeup: [0.37, 0.58],
  splitter: [0.12, 0.86],
  knuckleball: [0.24, 0.31],
};
export function pitchSeconds(mph: number) {
  return (0.56 * 92) / Math.max(50, Math.min(110, mph));
}
export function shapePitch(pos: Vec3, pitch: PitchFlight, t: number, hand: ThrowsHand) {
  const [run, drop] = movement[pitch.pitchType];
  // A tangent aimed off the final pocket bends onto target late in flight.
  const bend = 2.6 * t * (1 - t * t);
  const flutter =
    pitch.pitchType === 'knuckleball' ? 0.19 * Math.sin(5 * Math.PI * t) * Math.sin(Math.PI * t) : 0;
  pos.x += (hand === 'R' ? 1 : -1) * (run * bend + flutter);
  pos.y += drop * bend + flutter * 0.53;
}
