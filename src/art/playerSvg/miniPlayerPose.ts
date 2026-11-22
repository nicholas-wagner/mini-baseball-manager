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
  backArm: JointTransform2D;
  frontArm: JointTransform2D;
  backLeg: JointTransform2D;
  frontLeg: JointTransform2D;
  batRotDeg: number;
  swingSmearOpacity: number;
  auraIntensity: number;
  auraColor: string;
  sweatVisible: boolean;
  blink: boolean;
  expression: PortraitMood;
  shadowScale: number;
  hopWorldY: number;
  tiltWorldZ: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Evaluates bouncy 2.5D chibi skeletal transforms (giant bobbing mochi head,
 * tiny bean torso, stepped near/far stubby limbs, and 3D world hop/tilt).
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
    head: { tx: 0, ty: 0, rotDeg: 0, sx: 1, sy: 1 },
    torso: { tx: 0, ty: 0, rotDeg: 0 },
    backArm: { tx: 0, ty: 0, rotDeg: 10 },
    frontArm: { tx: 0, ty: 0, rotDeg: -10 },
    backLeg: { tx: 0, ty: 0, rotDeg: 0 },
    frontLeg: { tx: 0, ty: 0, rotDeg: 0 },
    batRotDeg: 20,
    swingSmearOpacity: 0,
    auraIntensity: 0,
    auraColor: '#FFC300',
    sweatVisible: false,
    blink,
    expression: 'happy',
    shadowScale: 1,
    hopWorldY: 0,
    tiltWorldZ: 0,
  };

  if (role === 'catcher' && clip === 'field_ready') {
    const bob = Math.sin(tau) * 2.5;
    pose.root = { tx: 0, ty: 12 + bob, rotDeg: 0, sx: 1.07, sy: 0.91 };
    pose.head = { tx: 0, ty: 2 + bob * 0.4, rotDeg: -2 };
    pose.backLeg = { tx: -5, ty: -6, rotDeg: 24 };
    pose.frontLeg = { tx: 6, ty: -6, rotDeg: -24 };
    pose.backArm = { tx: -4, ty: 3, rotDeg: 22 };
    pose.frontArm = { tx: 4, ty: 3, rotDeg: -18 };
    pose.expression = 'determined';
    return pose;
  }

  switch (clip) {
    case 'idle': {
      const s = Math.sin(tau);
      const delayed = Math.sin(tau - 0.45);
      pose.root = {
        tx: 0,
        ty: s * 4,
        rotDeg: 0,
        sx: 1 - s * 0.035,
        sy: 1 + s * 0.045,
      };
      // Secondary overlapping head follow-through makes chibi feel squishy & 3D!
      pose.head = { tx: 0, ty: delayed * 3, rotDeg: Math.sin(tau * 0.5) * 4.5 };
      pose.backArm.rotDeg = 14 + delayed * 9;
      pose.frontArm.rotDeg = -14 - delayed * 9;
      pose.hopWorldY = Math.max(0, -s * 0.06);
      break;
    }

    case 'bat_stance': {
      const rhythm = Math.sin(tau * 2);
      pose.root = { tx: 0, ty: 3 + rhythm * 2.5, rotDeg: -2, sx: 1.03, sy: 0.97 };
      pose.head = { tx: -2, ty: rhythm * 2, rotDeg: -4 };
      // Unified two-handed bat assembly coiled cleanly outside the back shoulder!
      pose.frontArm = { tx: 4, ty: -4 + rhythm * 2.5, rotDeg: -10 + rhythm * 5 };
      pose.backArm = { tx: 0, ty: 0, rotDeg: 0 };
      pose.batRotDeg = 24 + rhythm * 9;
      pose.backLeg.rotDeg = 8;
      pose.frontLeg.rotDeg = -8;
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
        const t = smoothstep(phase / 0.4);
        pose.root = {
          tx: 5 * t,
          ty: (isSuper ? -12 : -4) * t,
          rotDeg: 8 * t,
          sx: 1 + 0.06 * t,
          sy: 1 - 0.06 * t,
        };
        pose.head = { tx: -3 * t, ty: -3 * t, rotDeg: -7 * t };
        pose.backLeg = { tx: -8 * t, ty: -20 * t, rotDeg: 56 * t };
        pose.frontArm = { tx: 10 * t, ty: -12 * t, rotDeg: -68 * t };
        pose.backArm = { tx: -6 * t, ty: -10 * t, rotDeg: 38 * t };
        pose.auraIntensity = isSuper ? t : 0;
        pose.shadowScale = 1 - 0.2 * t;
        pose.hopWorldY = (isSuper ? 0.28 : 0.08) * t;
        pose.tiltWorldZ = -0.1 * t;
      } else if (phase < 0.68) {
        const t = smoothstep((phase - 0.4) / 0.28);
        pose.root = {
          tx: 5 - 16 * t,
          ty: 5 * t,
          rotDeg: 8 - 22 * t,
          sx: 1 - 0.08 * Math.sin(t * Math.PI),
          sy: 1 + 0.12 * Math.sin(t * Math.PI),
        };
        pose.head = { tx: -4 * t, ty: 2 * t, rotDeg: 8 * t };
        pose.backLeg = { tx: -14 * t, ty: -20 * (1 - t), rotDeg: 56 - 86 * t };
        pose.frontLeg = { tx: 8 * t, ty: -5 * t, rotDeg: 30 * t };
        pose.frontArm = { tx: -16 * t, ty: -6 * (1 - t), rotDeg: -68 + 150 * t };
        pose.backArm = { tx: -8, ty: 4 * t, rotDeg: 38 - 72 * t };
        pose.auraIntensity = isSuper ? 1 : 0;
        pose.hopWorldY = (isSuper ? 0.28 : 0.08) * (1 - t);
        pose.tiltWorldZ = -0.1 + 0.22 * t;
      } else {
        const t = smoothstep((phase - 0.68) / 0.32);
        pose.root = { tx: -11 * (1 - t), ty: 5 * (1 - t), rotDeg: -14 * (1 - t), sx: 1, sy: 1 };
        pose.backLeg = { tx: -14 * (1 - t), ty: 0, rotDeg: -30 * (1 - t) };
        pose.frontLeg = { tx: 8 * (1 - t), ty: 0, rotDeg: 30 * (1 - t) };
        pose.frontArm = { tx: -16 * (1 - t), ty: 0, rotDeg: 82 * (1 - t) - 10 * t };
        pose.backArm = { tx: -8 * (1 - t), ty: 0, rotDeg: -34 * (1 - t) + 10 * t };
        pose.auraIntensity = isSuper ? 1 - t : 0;
        pose.tiltWorldZ = 0.12 * (1 - t);
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
        const t = smoothstep(phase / 0.32);
        pose.root = {
          tx: 6 * t,
          ty: (isBomb ? 9 : 5) * t,
          rotDeg: 8 * t,
          sx: 1 + 0.1 * t,
          sy: 1 - 0.1 * t,
        };
        pose.head = { tx: -3 * t, ty: 3 * t, rotDeg: -6 * t };
        pose.frontArm = { tx: 8 * t, ty: -8 * t, rotDeg: -22 * t };
        pose.batRotDeg = 24 + 24 * t;
        pose.auraIntensity = isBomb ? t : 0;
      } else if (phase < 0.58) {
        const raw = (phase - 0.32) / 0.26;
        const t = smoothstep(raw);
        pose.root = {
          tx: 6 - 18 * t,
          ty: -7 * Math.sin(raw * Math.PI),
          rotDeg: 8 - 22 * t,
          sx: 1 - 0.08 * Math.sin(raw * Math.PI),
          sy: 1 + 0.14 * Math.sin(raw * Math.PI),
        };
        pose.head = { tx: -4 * t, ty: -2 * t, rotDeg: 8 * t };
        pose.frontArm = { tx: 8 - 46 * t, ty: -8 + 8 * t, rotDeg: -22 + 92 * t };
        pose.batRotDeg = 48 - 152 * t;
        pose.backLeg.rotDeg = -22 * t;
        pose.frontLeg.rotDeg = 24 * t;
        pose.swingSmearOpacity = Math.sin(raw * Math.PI);
        pose.auraIntensity = isBomb ? 1 : 0;
        pose.hopWorldY = (isBomb ? 0.24 : 0.08) * Math.sin(raw * Math.PI);
      } else {
        const t = smoothstep((phase - 0.58) / 0.42);
        pose.root = { tx: -12 * (1 - t), ty: 0, rotDeg: -14 * (1 - t), sx: 1, sy: 1 };
        pose.frontArm = { tx: -38 * (1 - t) + 4 * t, ty: -4 * t, rotDeg: 70 * (1 - t) - 10 * t };
        pose.batRotDeg = -104 * (1 - t) + 24 * t;
        pose.auraIntensity = isBomb ? 1 - t : 0;
        if (isBomb && t > 0.2) pose.expression = 'happy';
      }
      break;
    }

    case 'bat_bunt': {
      const t = Math.sin(phase * Math.PI);
      pose.root = { tx: -5 * t, ty: 10 * t, rotDeg: -6 * t, sx: 1 + 0.07 * t, sy: 1 - 0.08 * t };
      pose.backLeg = { tx: -4 * t, ty: -5 * t, rotDeg: 20 * t };
      pose.frontLeg = { tx: 5 * t, ty: -5 * t, rotDeg: -20 * t };
      pose.frontArm = { tx: -28 * t, ty: 2 * t, rotDeg: 28 * t };
      pose.batRotDeg = 24 - 110 * t;
      pose.auraColor = '#00E5FF';
      pose.auraIntensity = 0.75 * t;
      pose.expression = 'determined';
      break;
    }

    case 'field_ready': {
      const hop = Math.abs(Math.sin(tau)) * 5;
      pose.root = { tx: 0, ty: 5 - hop, rotDeg: 0, sx: 1.04, sy: 0.96 };
      pose.head.ty = -hop * 0.4;
      pose.backLeg.rotDeg = 14;
      pose.frontLeg.rotDeg = -14;
      pose.backArm = { tx: -4, ty: 2, rotDeg: 26 - hop * 2 };
      pose.frontArm = { tx: 4, ty: 2, rotDeg: -22 + hop * 2 };
      pose.hopWorldY = hop * 0.025;
      pose.expression = 'determined';
      break;
    }

    case 'field_run': {
      const s = Math.sin(tau);
      const lift = Math.abs(Math.cos(tau));
      pose.root = { tx: 0, ty: -lift * 10, rotDeg: -7, sx: 0.98, sy: 1.05 };
      pose.head = { tx: -2, ty: -lift * 3, rotDeg: 4 };
      pose.backLeg = { tx: 0, ty: -Math.max(0, s) * 9, rotDeg: s * 42 };
      pose.frontLeg = { tx: 0, ty: -Math.max(0, -s) * 9, rotDeg: -s * 42 };
      pose.backArm.rotDeg = -s * 46;
      pose.frontArm.rotDeg = s * 46;
      pose.shadowScale = 1 - lift * 0.24;
      pose.hopWorldY = lift * 0.22;
      pose.expression = 'determined';
      break;
    }

    case 'field_dive': {
      const arc = Math.sin(phase * Math.PI);
      pose.root = {
        tx: -30 * arc,
        ty: -18 * arc,
        rotDeg: -64 * arc,
        sx: 1 - 0.08 * arc,
        sy: 1 + 0.14 * arc,
      };
      pose.backArm = { tx: -8 * arc, ty: -16 * arc, rotDeg: 112 * arc };
      pose.frontArm = { tx: 6 * arc, ty: 4 * arc, rotDeg: -34 * arc };
      pose.backLeg.rotDeg = -20 * arc;
      pose.frontLeg.rotDeg = 18 * arc;
      pose.shadowScale = 1 - 0.35 * arc;
      pose.hopWorldY = 0.45 * arc;
      pose.auraColor = '#00E5FF';
      pose.auraIntensity = 0.65 * arc;
      pose.expression = 'shocked';
      break;
    }

    case 'field_high_jump': {
      pose.auraColor = '#00E5FF';
      if (phase < 0.22) {
        const t = smoothstep(phase / 0.22);
        pose.root = { tx: 0, ty: 14 * t, rotDeg: 0, sx: 1 + 0.18 * t, sy: 1 - 0.22 * t };
        pose.expression = 'determined';
        pose.auraIntensity = t;
      } else {
        const air = Math.sin(((phase - 0.22) / 0.78) * Math.PI);
        pose.root = {
          tx: 0,
          ty: -42 * air,
          rotDeg: -8 * air,
          sx: 1 - 0.1 * air,
          sy: 1 + 0.15 * air,
        };
        pose.head.ty = -4 * air;
        pose.backArm = { tx: -4, ty: -18 * air, rotDeg: 136 * air };
        pose.frontArm = { tx: 4, ty: 5 * air, rotDeg: -28 * air };
        pose.backLeg.rotDeg = 22 * air;
        pose.frontLeg.rotDeg = -18 * air;
        pose.shadowScale = Math.max(0.32, 1 - 0.62 * air);
        pose.hopWorldY = 1.45 * air;
        pose.auraIntensity = air;
        pose.expression = 'fired_up';
      }
      break;
    }

    case 'celebrate_hr': {
      const jump = Math.abs(Math.sin(tau * 2));
      pose.root = {
        tx: 0,
        ty: -22 * jump,
        rotDeg: Math.sin(tau) * 8,
        sx: 1.05 - jump * 0.08,
        sy: 0.94 + jump * 0.14,
      };
      pose.head.ty = -5 * jump;
      pose.backArm = { tx: -4, ty: -14 * jump, rotDeg: 132 };
      pose.frontArm = { tx: 4, ty: -14 * jump, rotDeg: -132 };
      pose.backLeg.rotDeg = 18 * jump;
      pose.frontLeg.rotDeg = -18 * jump;
      pose.shadowScale = 1 - 0.38 * jump;
      pose.hopWorldY = 0.55 * jump;
      pose.auraColor = '#FFC300';
      pose.auraIntensity = 0.75;
      pose.expression = 'happy';
      break;
    }
  }

  return pose;
}
