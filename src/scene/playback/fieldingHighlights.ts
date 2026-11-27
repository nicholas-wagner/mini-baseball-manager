import type { PlayEvent } from '../../engine/models/playEvent';
import type { Vec3 } from '../camera/cameraRig';
import { CLIP_DURATIONS, GLOVE_CONTACT_PHASE } from '../characters/animationState';
import { headingToward } from './diamondLayout';
import type { ActorPose, DiamondPlay } from './diamondPlay';

export const ROBBERY_CALL = { text: 'ROBBED!!', color: '#FF4D6D' } as const;
export const WEB_GEM_CALL = { text: 'WEB GEM!', color: '#00B4D8' } as const;

export function isDivingWebGem(highlight?: PlayEvent['fieldingHighlight']) {
  return highlight?.webGem === true && highlight.anim === 'field_dive';
}

/** Run to a takeoff point, then carry the painted glove into the catch on its extension frame. */
export function divingCatchPose(play: DiamondPlay, start: Vec3, time: number): ActorPose | undefined {
  const contact = play.legs[0].end;
  const reach = CLIP_DURATIONS.field_dive * GLOVE_CONTACT_PHASE.field_dive;
  const takeoff = Math.max(contact, play.pickupAt - reach);
  // Leave the infielder time to gather and make the next throw.
  if (time > play.pickupAt + (play.outfield ? .28 : .17)) return;
  const target = play.fieldAt;
  const yaw = headingToward(start, target);
  const distance = Math.hypot(target.x - start.x, target.z - start.z);
  const runningReach = (takeoff - contact) * 8;
  const lunge = Math.max(Math.min(2, distance + runningReach), distance - runningReach);
  const launch = { x: target.x - lunge * Math.sin(yaw), y: target.y, z: target.z - lunge * Math.cos(yaw) };
  if (time < takeoff) {
    const u = Math.max(0, (time - contact) / Math.max(.01, takeoff - contact));
    return { pos: { x: start.x + (launch.x - start.x) * u, y: start.y, z: start.z + (launch.z - start.z) * u },
      clip: u > 0 ? 'field_run' : 'field_ready', yaw: u > 0 ? headingToward(start, launch) : 0,
      local: Math.max(0, time - contact) };
  }
  const remaining = Math.max(0, (play.pickupAt - time) / Math.max(.01, play.pickupAt - takeoff));
  return { pos: { x: target.x - lunge * remaining * Math.sin(yaw), y: target.y, z: target.z - lunge * remaining * Math.cos(yaw) },
    clip: 'field_dive', yaw, local: time - play.pickupAt + reach };
}
