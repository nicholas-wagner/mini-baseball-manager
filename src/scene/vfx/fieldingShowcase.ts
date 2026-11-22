import type { ThrowsHand } from '../../engine/handedness/types';
import { CLIP_DURATIONS, GLOVE_CONTACT_PHASE, type CharacterAnimClip } from '../characters/animationState';
import type { CameraPose } from '../camera/cameraRig';

type CatchClip = keyof typeof GLOVE_CONTACT_PHASE;
export const FIELDER_START = { x: 7.5, y: 0.04, z: -22.5 };
const gather = 0.26;
export const FIELD_CAMERA_CUT = 0.23;

export function isCatchClip(clip: CharacterAnimClip): clip is CatchClip {
  return clip === 'field_dive' || clip === 'field_high_jump';
}

export function sampleFieldingPlay(clip: CatchClip, hand: ThrowsHand, sinceHit: number, flightDuration: number) {
  // Time the full extension to an exact decoded sprite frame.
  const duration = CLIP_DURATIONS[clip];
  const extension = duration * GLOVE_CONTACT_PHASE[clip];
  const takeoff = flightDuration - extension;
  const sinceCatch = sinceHit - flightDuration;
  const stride = Math.max(0, Math.min(1, (sinceHit - 0.06) / (flightDuration - 0.06)));
  const slide = Math.max(0, Math.min(1, (sinceCatch - gather) / (duration - extension)));
  const side = hand === 'R' ? 1 : -1;
  const x = FIELDER_START.x + side * (4.1 * stride + 0.4 * slide);
  const z = FIELDER_START.z - 4.8 * stride - 0.22 * slide;
  let action: CharacterAnimClip = 'field_ready';
  let clipTime = Math.max(0, sinceHit);
  if (sinceHit >= 0.06 && sinceHit < takeoff) action = 'field_run';
  else if (sinceHit >= takeoff && slide < 1) {
    action = clip;
    clipTime = Math.min(extension, sinceHit - takeoff) + Math.max(0, sinceCatch - gather);
  }
  return { x, z, clip: action, clipTime, caught: sinceCatch >= 0 };
}

export function fieldingCamera(x: number, z: number, leap: boolean): CameraPose {
  return {
    position: { x: x + 2.7, y: 2.05, z: z + 4.2 },
    lookAt: { x, y: leap ? 1.72 : 0.94, z },
    fov: leap ? 40 : 32,
  };
}
