import type { PortraitMood } from '../portraits/types';
import { CLIP_DURATIONS, type CharacterAnimClip } from '../../scene/characters/animationState';

export type MiniPlayerRole = 'pitcher' | 'batter' | 'fielder' | 'catcher';
export type MiniPlayerFacing = 'front' | 'back';

export interface JointTransform2D {
  tx: number;
  ty: number;
  rotDeg: number;
  sx?: number;
  sy?: number;
}

export interface MiniPlayerRigPose {
  root: JointTransform2D;
  head: JointTransform2D;
  torso: JointTransform2D;
  leftArm: JointTransform2D;
  rightArm: JointTransform2D;
  leftLeg: JointTransform2D;
  rightLeg: JointTransform2D;
  batRotDeg: number;
  swingSmearOpacity: number;
  auraIntensity: number;
  auraColor: string;
  sweatVisible: boolean;
  blink: boolean;
  expression: PortraitMood;
  shadowScale: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Evaluates crisp 2D cartoon skeletal transforms + squash-and-stretch for our
 * articulated Mini-Player SVG rig across all 14 idle, practice, and game clips.
 */
export function evaluateMiniPlayerPose(
  clip: CharacterAnimClip,
  timeSec: number,
  role: MiniPlayerRole = 'pitcher',
): MiniPlayerRigPose {
  const duration = CLIP_DURATIONS[clip];
  const cycle = ((timeSec % duration) + duration) % duration;
  const phase = cycle / duration;
  const tau = phase * Math.PI * 2;
  const blink = (timeSec % 3.4) > 3.24;

  const pose: MiniPlayerRigPose = {
    root: { tx: 0, ty: 0, rotDeg: 0, sx: 1, sy: 1 },
    head: { tx: 0, ty: 0, rotDeg: 0 },
    torso: { tx: 0, ty: 0, rotDeg: 0 },
    leftArm: { tx: 0, ty: 0, rotDeg: 10 },
    rightArm: { tx: 0, ty: 0, rotDeg: -10 },
    leftLeg: { tx: 0, ty: 0, rotDeg: 0 },
    rightLeg: { tx: 0, ty: 0, rotDeg: 0 },
    batRotDeg: -22,
    swingSmearOpacity: 0,
    auraIntensity: 0,
    auraColor: '#FFC300',
    sweatVisible: false,
    blink,
    expression: 'happy',
    shadowScale: 1,
  };

  if (role === 'catcher' && clip === 'field_ready') {
    // Classic compact catcher crouch!
    const bob = Math.sin(tau) * 2.2;
    pose.root = { tx: 0, ty: 14 + bob, rotDeg: 0, sx: 1.06, sy: 0.92 };
    pose.leftLeg = { tx: -6, ty: -8, rotDeg: 28 };
    pose.rightLeg = { tx: 6, ty: -8, rotDeg: -28 };
    pose.leftArm = { tx: -4, ty: 4, rotDeg: -24 };
    pose.rightArm = { tx: 4, ty: 4, rotDeg: 18 };
    pose.expression = 'determined';
    return pose;
  }

  switch (clip) {
    case 'idle': {
      const bob = Math.sin(tau) * 4.5;
      pose.root = {
        tx: 0,
        ty: bob,
        rotDeg: 0,
        sx: 1 - Math.sin(tau) * 0.03,
        sy: 1 + Math.sin(tau) * 0.04,
      };
      pose.head.rotDeg = Math.sin(tau * 0.5) * 4.5;
      pose.leftArm.rotDeg = 12 + Math.sin(tau + 0.5) * 8;
      pose.rightArm.rotDeg = -12 - Math.sin(tau) * 8;
      break;
    }

    case 'bat_stance': {
      const rhythm = Math.sin(tau * 2);
      pose.root = { tx: 0, ty: 3 + rhythm * 2.5, rotDeg: -2, sx: 1.02, sy: 0.98 };
      pose.head.rotDeg = -4;
      // Hands held high by the back shoulder, bat angled proudly skyward above the helmet!
      pose.rightArm = { tx: 6, ty: -32 + rhythm * 3, rotDeg: -16 + rhythm * 5 };
      pose.leftArm = { tx: 68, ty: -26 + rhythm * 3, rotDeg: -28 + rhythm * 5 };
      pose.batRotDeg = 22 + rhythm * 9;
      pose.leftLeg.rotDeg = 8;
      pose.rightLeg.rotDeg = -8;
      pose.expression = 'determined';
      break;
    }

    case 'pitch_windup':
    case 'pitch_super':
    case 'practice_bullpen': {
      const isSuper = clip === 'pitch_super';
      pose.sweatVisible = clip === 'practice_bullpen';
      pose.auraColor = '#FF4D6D';
      pose.expression = isSuper ? 'fired_up' : 'determined';

      if (phase < 0.4) {
        // High leg-kick windup & coil!
        const t = smoothstep(phase / 0.4);
        pose.root = {
          tx: -4 * t,
          ty: (isSuper ? -12 : -4) * t,
          rotDeg: -8 * t,
          sx: 1 + 0.06 * t,
          sy: 1 - 0.06 * t,
        };
        pose.leftLeg = { tx: -6 * t, ty: -24 * t, rotDeg: 58 * t };
        pose.rightArm = { tx: 8 * t, ty: -14 * t, rotDeg: -72 * t };
        pose.leftArm = { tx: -6 * t, ty: -12 * t, rotDeg: 42 * t };
        pose.head.rotDeg = 6 * t;
        pose.auraIntensity = isSuper ? t : 0;
        pose.shadowScale = 1 - 0.18 * t;
      } else if (phase < 0.68) {
        // Explosive forward whip delivery!
        const t = smoothstep((phase - 0.4) / 0.28);
        pose.root = {
          tx: -4 + 14 * t,
          ty: 5 * t,
          rotDeg: -8 + 24 * t,
          sx: 1 - 0.08 * Math.sin(t * Math.PI),
          sy: 1 + 0.12 * Math.sin(t * Math.PI),
        };
        pose.leftLeg = { tx: -12 * t, ty: -24 * (1 - t), rotDeg: 58 - 88 * t };
        pose.rightLeg = { tx: 8 * t, ty: -6 * t, rotDeg: 32 * t };
        pose.rightArm = { tx: -14 * t, ty: -6 * (1 - t), rotDeg: -72 + 158 * t };
        pose.leftArm = { tx: -8, ty: 4 * t, rotDeg: 42 - 78 * t };
        pose.auraIntensity = isSuper ? 1 : 0;
      } else {
        // Follow-through & reset
        const t = smoothstep((phase - 0.68) / 0.32);
        pose.root = { tx: 10 * (1 - t), ty: 5 * (1 - t), rotDeg: 16 * (1 - t), sx: 1, sy: 1 };
        pose.leftLeg = { tx: -12 * (1 - t), ty: 0, rotDeg: -30 * (1 - t) };
        pose.rightLeg = { tx: 8 * (1 - t), ty: 0, rotDeg: 32 * (1 - t) };
        pose.rightArm = { tx: -14 * (1 - t), ty: 0, rotDeg: 86 * (1 - t) - 10 * t };
        pose.leftArm = { tx: -8 * (1 - t), ty: 0, rotDeg: -36 * (1 - t) + 10 * t };
        pose.auraIntensity = isSuper ? 1 - t : 0;
      }
      break;
    }

    case 'bat_swing':
    case 'bat_bomb':
    case 'practice_cage': {
      const isBomb = clip === 'bat_bomb';
      pose.sweatVisible = clip === 'practice_cage';
      pose.auraColor = '#FFC300';
      pose.expression = isBomb ? 'fired_up' : 'determined';

      if (phase < 0.32) {
        // Coiled power load
        const t = smoothstep(phase / 0.32);
        pose.root = {
          tx: -8 * t,
          ty: (isBomb ? 9 : 5) * t,
          rotDeg: -10 * t,
          sx: 1 + 0.09 * t,
          sy: 1 - 0.09 * t,
        };
        pose.rightArm = { tx: 14, ty: -20, rotDeg: -68 * t };
        pose.leftArm = { tx: 22, ty: -14, rotDeg: -52 * t };
        pose.batRotDeg = -58 * t;
        pose.auraIntensity = isBomb ? t : 0;
      } else if (phase < 0.58) {
        // Explosive bat whip + motion smear swoosh!
        const raw = (phase - 0.32) / 0.26;
        const t = smoothstep(raw);
        pose.root = {
          tx: -8 + 18 * t,
          ty: -6 * Math.sin(raw * Math.PI),
          rotDeg: -10 + 24 * t,
          sx: 1 - 0.08 * Math.sin(raw * Math.PI),
          sy: 1 + 0.14 * Math.sin(raw * Math.PI),
        };
        pose.rightArm = { tx: 14 - 32 * t, ty: -16, rotDeg: -68 + 154 * t };
        pose.leftArm = { tx: 22 - 36 * t, ty: -12, rotDeg: -52 + 136 * t };
        pose.batRotDeg = -58 + 178 * t;
        pose.leftLeg.rotDeg = -22 * t;
        pose.rightLeg.rotDeg = 24 * t;
        pose.swingSmearOpacity = Math.sin(raw * Math.PI);
        pose.auraIntensity = isBomb ? 1 : 0;
      } else {
        // Hero follow-through pose!
        const t = smoothstep((phase - 0.58) / 0.42);
        pose.root = { tx: 10 * (1 - t), ty: 0, rotDeg: 14 * (1 - t), sx: 1, sy: 1 };
        pose.rightArm = { tx: -18 * (1 - t) + 10 * t, ty: -16, rotDeg: 86 * (1 - t) - 48 * t };
        pose.leftArm = { tx: -14 * (1 - t) + 22 * t, ty: -12, rotDeg: 84 * (1 - t) - 36 * t };
        pose.batRotDeg = 120 * (1 - t) - 34 * t;
        pose.auraIntensity = isBomb ? 1 - t : 0;
        if (isBomb && t > 0.2) pose.expression = 'happy';
      }
      break;
    }

    case 'bat_bunt': {
      const t = Math.sin(phase * Math.PI);
      pose.root = { tx: 6 * t, ty: 12 * t, rotDeg: 8 * t, sx: 1 + 0.06 * t, sy: 1 - 0.08 * t };
      pose.leftLeg = { tx: -4 * t, ty: -6 * t, rotDeg: 22 * t };
      pose.rightLeg = { tx: 6 * t, ty: -6 * t, rotDeg: -22 * t };
      pose.rightArm = { tx: -6 * t, ty: -8 * t, rotDeg: 24 * t };
      pose.leftArm = { tx: 10 * t, ty: -8 * t, rotDeg: 38 * t };
      pose.batRotDeg = 76 * t;
      pose.auraColor = '#00E5FF';
      pose.auraIntensity = 0.75 * t;
      pose.expression = 'determined';
      break;
    }

    case 'field_ready': {
      const hop = Math.abs(Math.sin(tau)) * 5;
      pose.root = { tx: 0, ty: 6 - hop, rotDeg: 0, sx: 1.04, sy: 0.96 };
      pose.leftLeg.rotDeg = 14;
      pose.rightLeg.rotDeg = -14;
      pose.leftArm = { tx: -4, ty: 2, rotDeg: 28 - hop * 2 };
      pose.rightArm = { tx: 4, ty: 2, rotDeg: -24 + hop * 2 };
      pose.expression = 'determined';
      break;
    }

    case 'field_run': {
      const s = Math.sin(tau);
      const lift = Math.abs(Math.cos(tau));
      pose.root = { tx: 0, ty: -lift * 12, rotDeg: 9, sx: 0.98, sy: 1.05 };
      pose.leftLeg = { tx: 0, ty: -Math.max(0, s) * 10, rotDeg: s * 44 };
      pose.rightLeg = { tx: 0, ty: -Math.max(0, -s) * 10, rotDeg: -s * 44 };
      pose.leftArm.rotDeg = -s * 48;
      pose.rightArm.rotDeg = s * 48;
      pose.shadowScale = 1 - lift * 0.22;
      pose.expression = 'determined';
      break;
    }

    case 'field_dive': {
      const arc = Math.sin(phase * Math.PI);
      pose.root = {
        tx: -34 * arc,
        ty: -22 * arc,
        rotDeg: -68 * arc,
        sx: 1 - 0.08 * arc,
        sy: 1 + 0.14 * arc,
      };
      pose.leftArm = { tx: -8 * arc, ty: -18 * arc, rotDeg: 118 * arc };
      pose.rightArm = { tx: 6 * arc, ty: 4 * arc, rotDeg: -38 * arc };
      pose.leftLeg.rotDeg = -22 * arc;
      pose.rightLeg.rotDeg = 18 * arc;
      pose.shadowScale = 1 - 0.35 * arc;
      pose.auraColor = '#00E5FF';
      pose.auraIntensity = 0.65 * arc;
      pose.expression = 'shocked';
      break;
    }

    case 'field_high_jump': {
      pose.auraColor = '#00E5FF';
      if (phase < 0.22) {
        const t = smoothstep(phase / 0.22);
        pose.root = { tx: 0, ty: 16 * t, rotDeg: 0, sx: 1 + 0.18 * t, sy: 1 - 0.22 * t };
        pose.expression = 'determined';
        pose.auraIntensity = t;
      } else {
        const air = Math.sin(((phase - 0.22) / 0.78) * Math.PI);
        pose.root = {
          tx: 0,
          ty: -56 * air,
          rotDeg: -8 * air,
          sx: 1 - 0.1 * air,
          sy: 1 + 0.16 * air,
        };
        pose.leftArm = { tx: -4, ty: -22 * air, rotDeg: 142 * air };
        pose.rightArm = { tx: 4, ty: 6 * air, rotDeg: -32 * air };
        pose.leftLeg.rotDeg = 22 * air;
        pose.rightLeg.rotDeg = -18 * air;
        pose.shadowScale = Math.max(0.35, 1 - 0.6 * air);
        pose.auraIntensity = air;
        pose.expression = 'fired_up';
      }
      break;
    }

    case 'celebrate_hr': {
      const jump = Math.abs(Math.sin(tau * 2));
      pose.root = {
        tx: 0,
        ty: -28 * jump,
        rotDeg: Math.sin(tau) * 8,
        sx: 1.05 - jump * 0.08,
        sy: 0.94 + jump * 0.14,
      };
      pose.leftArm = { tx: -4, ty: -18 * jump, rotDeg: 135 };
      pose.rightArm = { tx: 4, ty: -18 * jump, rotDeg: -135 };
      pose.leftLeg.rotDeg = 18 * jump;
      pose.rightLeg.rotDeg = -18 * jump;
      pose.shadowScale = 1 - 0.38 * jump;
      pose.auraColor = '#FFC300';
      pose.auraIntensity = 0.75;
      pose.expression = 'happy';
      break;
    }
  }

  return pose;
}
