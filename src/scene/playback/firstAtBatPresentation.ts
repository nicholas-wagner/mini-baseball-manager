import type { EffectiveBatSide, ThrowsHand } from "../../engine/handedness/types";
import type { PitchTargetIntent } from "../../engine/simulation/pitchMindGames";
import { getCameraPresetPose } from "../camera/cameraRig";
import type { DiamondPlay } from "./diamondPlay";
import {
  CLIP_DURATIONS, type CharacterAnimClip,
} from "../characters/animationState";

export interface PlayerEntranceCue {
  role: "pitcher" | "batter";
  outgoingId?: string;
}

type SwingPreview = "balanced" | "contact" | "power" | "bunt";
export type AtBatPreview = PitchTargetIntent | SwingPreview;
export function isSwingPreview(intent: AtBatPreview | null): intent is SwingPreview {
  return intent === 'balanced' || intent === 'contact' || intent === 'power' || intent === 'bunt';
}
export function previewShot(
  intent: AtBatPreview,
  side: EffectiveBatSide,
  throws: ThrowsHand = "R",
) {
  if (isSwingPreview(intent)) {
    return getCameraPresetPose("over_shoulder_batter", 0, 0, throws, side);
  }
  return getCameraPresetPose("over_shoulder_pitcher", 0, 0, throws, side);
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
  intent: SwingPreview,
  elapsed: number,
  still: boolean,
) {
  const clips = { balanced: "bat_stance", contact: "bat_contact_set", power: "bat_power_set", bunt: "bat_bunt" } as const;
  return { clip: clips[intent],
    time: still ? 0.32 : Math.max(0, elapsed) };
}

export type BattingPreviewPose = ReturnType<typeof rehearsalPose>;

export function plateBatterPose(play: DiamondPlay, time: number): { clip: CharacterAnimClip; local: number } {
  const pitch = play.legs[0], since = time - pitch.end;
  const preview = play.battingPreview;
  const ready = { clip: preview?.clip ?? 'bat_stance' as const, local: time + (preview?.time ?? 0) };
  const third = play.kind === 'swinging_third' || play.kind === 'called_third';
  const nextStance = { clip: 'bat_stance' as const, local: Math.max(0,since) };
  const slump = (start: number) => ({ clip: 'bat_slump' as const, local: since-start });

  if (play.buntAttempt || (preview?.clip === 'bat_bunt' && play.close && !play.close.steal)) {
    const squareAt = pitch.start;
    if (time < squareAt && preview?.clip !== 'bat_bunt') return ready;
    if (preview?.clip !== 'bat_bunt' && time < squareAt + CLIP_DURATIONS.bat_square)
      return {clip:'bat_square', local:time-squareAt};
    if (since <= 0) return {clip:'bat_bunt', local:.32 + Math.max(0,time-squareAt)};
    const touch = !play.close || play.kind === 'foul_back';
    if (touch && (since < CLIP_DURATIONS.bat_bunt_tap || !play.close))
      return {clip:'bat_bunt_tap', local:since};
    const pull = since - (touch ? CLIP_DURATIONS.bat_bunt_tap : 0);
    if (pull < CLIP_DURATIONS.bat_bunt_pullback) return {clip:'bat_bunt_pullback',local:pull};
    return third ? slump(.30) : nextStance;
  }

  const swing = !play.close || play.close.swing || play.kind === 'swinging_third' || play.kind === 'missed_pitch' || play.kind === 'foul_back';
  if (swing) {
    const clip = play.kind === 'home_run' ? 'bat_bomb' : 'bat_swing';
    const duration = CLIP_DURATIONS[clip];
    const early = play.close && pitch.pitch?.pitchType === 'changeup' ? .19 : 0;
    const swingTime = since + duration * (play.close ? .48 : .45) + early;
    if (swingTime < 0) return ready;
    if (!play.close && since > 0) return {clip, local:duration*(.45+.53*Math.min(1,since/.20))};
    if (swingTime < duration) return {clip, local:swingTime};
    const recoil = swingTime-duration;
    if (recoil < CLIP_DURATIONS.bat_recover) return {clip:'bat_recover',local:recoil};
    return third ? {clip:'bat_slump',local:recoil-CLIP_DURATIONS.bat_recover} : nextStance;
  }
  if (play.kind === 'called_third' || play.kind === 'called_pitch' || play.kind === 'ball_pitch') {
    if (since < -.12) return ready;
    if (since < .22) return {clip:'bat_take',local:since+.12};
    return third ? slump(.22) : nextStance;
  }
  return ready;
}

// Let the signal read while the ball is in the pocket and the cleat is off the bag.
export const FORCE_HOLD_SECONDS = 0.48;
export function forceReplayTime(elapsed: number, finish: number) {
  const signal = finish + 0.14;
  return elapsed - Math.min(FORCE_HOLD_SECONDS, Math.max(0, elapsed - signal));
}
