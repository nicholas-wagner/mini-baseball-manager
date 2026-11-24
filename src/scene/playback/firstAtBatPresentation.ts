import type { EffectiveBatSide } from "../../engine/handedness/types";
import type { PitchTargetIntent } from "../../engine/simulation/pitchMindGames";
import {
  type CharacterAnimClip,
} from "../characters/animationState";

export interface PlayerEntranceCue {
  role: "pitcher" | "batter";
  outgoingId?: string;
}

export type AtBatPreview = PitchTargetIntent | "contact" | "power";
export function previewShot(intent: AtBatPreview, side: EffectiveBatSide) {
  const sign = side === "R" ? 1 : -1;
  if (intent === "power" || intent === "contact") {
    return {
      position: { x: sign * 1.75, y: 1.75, z: -3.8 },
      lookAt: { x: -sign * 0.78, y: 0.99, z: 0.12 },
      fov: 39,
    };
  }
  return {
    position: { x: sign * 1.9, y: 1.92, z: -4.4 },
    lookAt: { x: 0, y: 0.9, z: 0.82 },
    fov: 39,
  };
}
export function targetOffset(target: AtBatPreview, side: EffectiveBatSide) {
  const away = side === "R" ? 1 : -1;
  switch (target) {
    case "paint_corners":
      return { x: away * 0.48, y: 0 };
    case "bury_offspeed":
      return { x: away * 0.35, y: -0.16 };
    case "high_heat":
      return { x: 0, y: 0.12 };
    default:
      return { x: 0, y: 0 };
  }
}
export function rehearsalPose(
  intent: "contact" | "power",
  elapsed: number,
  still: boolean,
): { clip: CharacterAnimClip; time: number } {
  return { clip: intent === "contact" ? "bat_contact_set" : "bat_power_set",
    time: still ? 0.32 : Math.min(0.32, elapsed) };
}

// Let the signal read while the ball is in the pocket and the cleat is off the bag.
export const FORCE_HOLD_SECONDS = 0.48;
export function forceReplayTime(elapsed: number, finish: number) {
  const signal = finish + 0.14;
  return elapsed - Math.min(FORCE_HOLD_SECONDS, Math.max(0, elapsed - signal));
}
