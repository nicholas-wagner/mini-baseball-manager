import type { PortraitMood } from '../../art/portraits/types';

export type CharacterAnimClip =
  | 'idle'
  | 'pitch_windup'
  | 'pitch_super'
  | 'bat_stance'
  | 'bat_swing'
  | 'bat_bunt'
  | 'bat_bomb'
  | 'catch_receive'
  | 'field_ready'
  | 'field_run'
  | 'field_dive'
  | 'field_high_jump'
  | 'practice_cage'
  | 'practice_bullpen'
  | 'celebrate_hr';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface CharacterPose {
  bodyOffset: Vec3Tuple;
  bodyRotation: Vec3Tuple;
  scale: Vec3Tuple;
  headRotation: Vec3Tuple;
  leftHand: Vec3Tuple;
  rightHand: Vec3Tuple;
  leftFoot: Vec3Tuple;
  rightFoot: Vec3Tuple;
  batRotation: Vec3Tuple;
  batDetachedSpin: number;
  expression: PortraitMood;
  blink: boolean;
  auraIntensity: number;
  auraColor: string;
  sweatVisible: boolean;
}

// Release on an exact pose in the standee's 16-frame animation cycle.
export const PITCH_RELEASE_PHASE = 9 / 16;
export const GLOVE_CONTACT_PHASE = { field_dive: 8 / 16, field_high_jump: 10 / 16 } as const;

export const CLIP_DURATIONS: Record<CharacterAnimClip, number> = {
  idle: 2.0,
  pitch_windup: 1.35,
  pitch_super: 1.65,
  bat_stance: 1.8,
  bat_swing: 0.95,
  bat_bunt: 0.9,
  bat_bomb: 1.55,
  field_ready: 1.6,
  catch_receive: 0.42,
  field_run: 0.52,
  field_dive: 1.15,
  field_high_jump: 1.2,
  practice_cage: 1.4,
  practice_bullpen: 1.45,
  celebrate_hr: 1.3,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function evaluateCharacterPose(clip: CharacterAnimClip, timeSec: number): CharacterPose {
  const duration = CLIP_DURATIONS[clip];
  const cycle = ((timeSec % duration) + duration) % duration;
  const phase = cycle / duration;
  const tau = phase * Math.PI * 2;
  const blink = (timeSec % 3.6) > 3.46;

  // Base buoyant chibi neutral pose
  const pose: CharacterPose = {
    bodyOffset: { x: 0, y: 0, z: 0 },
    bodyRotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    headRotation: { x: 0, y: 0, z: 0 },
    leftHand: { x: -0.44, y: 0.56, z: 0.14 },
    rightHand: { x: 0.44, y: 0.56, z: 0.14 },
    leftFoot: { x: -0.2, y: 0.12, z: 0 },
    rightFoot: { x: 0.2, y: 0.12, z: 0 },
    batRotation: { x: 0.25, y: 0, z: -0.45 },
    batDetachedSpin: 0,
    expression: 'happy',
    blink,
    auraIntensity: 0,
    auraColor: '#FFC300',
    sweatVisible: false,
  };

  switch (clip) {
    case 'idle': {
      const bob = Math.sin(tau) * 0.055;
      pose.bodyOffset.y = bob;
      pose.scale.y = 1 + Math.sin(tau) * 0.035;
      pose.scale.x = 1 - Math.sin(tau) * 0.02;
      pose.scale.z = 1 - Math.sin(tau) * 0.02;
      pose.headRotation.y = Math.sin(tau * 0.5) * 0.14;
      pose.headRotation.z = Math.cos(tau) * 0.05;
      pose.leftHand.y = 0.56 + Math.sin(tau + 0.6) * 0.05;
      pose.rightHand.y = 0.56 + Math.cos(tau) * 0.05;
      break;
    }

    case 'bat_stance': {
      const bounce = Math.sin(tau * 2) * 0.04;
      pose.bodyOffset.y = bounce - 0.04;
      pose.bodyRotation.y = -0.35;
      pose.headRotation.y = 0.35;
      pose.scale.y = 0.96 + Math.sin(tau * 2) * 0.03;
      pose.rightHand = { x: 0.34, y: 0.84 + Math.sin(tau) * 0.04, z: -0.15 };
      pose.leftHand = { x: 0.16, y: 0.78 + Math.sin(tau) * 0.04, z: 0.02 };
      pose.batRotation = { x: -0.25 + Math.sin(tau) * 0.14, y: 0.1, z: -0.52 + Math.cos(tau) * 0.1 };
      pose.expression = 'determined';
      break;
    }

    case 'pitch_windup':
    case 'pitch_super':
    case 'practice_bullpen': {
      const isSuper = clip === 'pitch_super';
      const isPractice = clip === 'practice_bullpen';
      pose.expression = isSuper ? 'fired_up' : 'determined';
      pose.sweatVisible = isPractice;
      pose.auraColor = '#FF4D6D';

      if (phase < 0.38) {
        // Leg kick & coil
        const t = smoothstep(phase / 0.38);
        pose.bodyRotation.y = -0.75 * t;
        pose.bodyRotation.x = -0.16 * t;
        pose.bodyOffset.y = (isSuper ? 0.18 : 0.06) * t;
        pose.scale.y = 1 - 0.1 * t;
        pose.scale.x = 1 + 0.08 * t;
        pose.leftFoot = { x: -0.22, y: 0.12 + 0.42 * t, z: 0.18 * t };
        pose.rightHand = { x: 0.45 + 0.12 * t, y: 0.65 + 0.25 * t, z: -0.28 * t };
        pose.leftHand = { x: -0.36, y: 0.72 + 0.14 * t, z: 0.28 * t };
        pose.auraIntensity = isSuper ? t : 0;
      } else if (phase < 0.62) {
        // Explosive stride & whip release
        const t = easeOutBack((phase - 0.38) / 0.24);
        pose.bodyRotation.y = -0.75 + 1.45 * t;
        pose.bodyRotation.x = -0.16 + 0.46 * t;
        pose.bodyOffset.z = 0.38 * t;
        pose.scale.y = 0.9 + 0.24 * Math.sin(clamp01((phase - 0.38) / 0.24) * Math.PI);
        pose.scale.x = 1 - 0.1 * Math.sin(clamp01((phase - 0.38) / 0.24) * Math.PI);
        pose.leftFoot = { x: -0.22, y: 0.12, z: 0.44 * t };
        pose.rightFoot = { x: 0.22, y: 0.18, z: -0.22 * t };
        pose.rightHand = { x: 0.25 - 0.45 * t, y: 0.98 - 0.32 * t, z: 0.56 * t };
        pose.leftHand = { x: -0.48, y: 0.52, z: -0.18 * t };
        pose.auraIntensity = isSuper ? 1 : 0;
      } else {
        // Follow-through recover
        const t = smoothstep((phase - 0.62) / 0.38);
        pose.bodyRotation.y = 0.7 * (1 - t);
        pose.bodyRotation.x = 0.3 * (1 - t);
        pose.bodyOffset.z = 0.38 * (1 - t);
        pose.leftFoot = { x: -0.2, y: 0.12, z: 0.44 * (1 - t) };
        pose.rightHand = { x: -0.2 + 0.64 * t, y: 0.66 - 0.1 * t, z: 0.56 * (1 - t) + 0.14 * t };
        pose.auraIntensity = isSuper ? 1 - t : 0;
      }
      break;
    }

    case 'bat_swing':
    case 'bat_bomb':
    case 'practice_cage': {
      const isBomb = clip === 'bat_bomb';
      const isPractice = clip === 'practice_cage';
      pose.expression = isBomb ? 'fired_up' : 'determined';
      pose.sweatVisible = isPractice;
      pose.auraColor = '#FFC300';

      if (phase < 0.3) {
        // Deep load & anticipation coil
        const t = smoothstep(phase / 0.3);
        pose.bodyRotation.y = -0.35 - (isBomb ? 0.55 : 0.32) * t;
        pose.bodyOffset.y = -(isBomb ? 0.15 : 0.08) * t;
        pose.scale.y = 1 - (isBomb ? 0.16 : 0.08) * t;
        pose.scale.x = 1 + (isBomb ? 0.12 : 0.06) * t;
        pose.rightHand = { x: 0.42 + 0.1 * t, y: 0.85, z: -0.28 * t };
        pose.leftHand = { x: 0.24, y: 0.78, z: -0.1 * t };
        pose.batRotation = { x: -0.45, y: -0.2 * t, z: -0.78 - 0.25 * t };
        pose.auraIntensity = isBomb ? t : 0;
      } else if (phase < 0.58) {
        // Explosive bat whip through the zone!
        const raw = (phase - 0.3) / 0.28;
        const t = easeOutBack(raw);
        pose.bodyRotation.y = -0.7 + 2.05 * t;
        pose.bodyOffset.y = (isBomb ? 0.14 : 0.04) * Math.sin(clamp01(raw) * Math.PI);
        pose.scale.y = 1 + (isBomb ? 0.18 : 0.09) * Math.sin(clamp01(raw) * Math.PI);
        pose.rightHand = { x: 0.38 - 0.88 * t, y: 0.8 + 0.14 * t, z: 0.36 * Math.sin(clamp01(raw) * Math.PI) };
        pose.leftHand = { x: 0.2 - 0.65 * t, y: 0.78 + 0.12 * t, z: 0.24 * Math.sin(clamp01(raw) * Math.PI) };
        pose.batRotation = { x: 0.25, y: 1.95 * t, z: -0.85 + 2.25 * t };
        pose.auraIntensity = isBomb ? 1 : 0;
      } else {
        // Follow-through (+ epic bat flip on Bomb Swing!)
        const t = smoothstep((phase - 0.58) / 0.42);
        pose.bodyRotation.y = 1.35 * (1 - t) - 0.35 * t;
        pose.rightHand = { x: -0.5 + 0.84 * t, y: 0.94 - 0.1 * t, z: 0.14 * (1 - t) };
        pose.leftHand = { x: -0.45 + 0.61 * t, y: 0.9 - 0.12 * t, z: 0.1 * (1 - t) };
        pose.batRotation = { x: 0.25 * (1 - t), y: 1.95 * (1 - t), z: 1.4 * (1 - t) - 0.52 * t };
        pose.batDetachedSpin = isBomb ? t * Math.PI * 3 : 0;
        pose.auraIntensity = isBomb ? 1 - t : 0;
        if (isBomb && t > 0.25) pose.expression = 'happy';
      }
      break;
    }

    case 'bat_bunt': {
      const t = Math.sin(phase * Math.PI);
      pose.bodyOffset.y = -0.14 * t;
      pose.bodyRotation.y = 0.25 * t;
      pose.bodyRotation.x = 0.22 * t;
      pose.scale.y = 1 - 0.12 * t;
      pose.scale.x = 1 + 0.08 * t;
      pose.leftHand = { x: -0.26, y: 0.72, z: 0.42 * t };
      pose.rightHand = { x: 0.28, y: 0.72, z: 0.42 * t };
      pose.batRotation = { x: 0.05, y: 0.0, z: 1.52 * t };
      pose.expression = 'determined';
      pose.auraColor = '#00E5FF';
      pose.auraIntensity = 0.7 * t;
      break;
    }

    case 'catch_receive':
    case 'field_ready': {
      const hop = Math.abs(Math.sin(tau)) * 0.06;
      pose.bodyOffset.y = -0.08 + hop;
      pose.bodyRotation.x = 0.16;
      pose.scale.y = 0.94 + hop;
      pose.leftHand = { x: -0.36, y: 0.46 + hop, z: 0.34 };
      pose.rightHand = { x: 0.22, y: 0.48 + Math.abs(Math.cos(tau * 2)) * 0.08, z: 0.34 };
      pose.expression = 'determined';
      break;
    }

    case 'field_run': {
      const stride = Math.sin(tau);
      const lift = Math.abs(Math.cos(tau));
      pose.bodyOffset.y = lift * 0.16;
      pose.bodyRotation.x = 0.24;
      pose.bodyRotation.z = stride * 0.1;
      pose.scale.y = 0.94 + lift * 0.12;
      pose.leftFoot = { x: -0.2, y: 0.12 + Math.max(0, stride) * 0.28, z: stride * 0.36 };
      pose.rightFoot = { x: 0.2, y: 0.12 + Math.max(0, -stride) * 0.28, z: -stride * 0.36 };
      pose.leftHand = { x: -0.44, y: 0.58, z: -stride * 0.34 };
      pose.rightHand = { x: 0.44, y: 0.58, z: stride * 0.34 };
      pose.expression = 'determined';
      break;
    }

    case 'field_dive': {
      const arc = Math.sin(phase * Math.PI);
      pose.bodyOffset.x = -0.85 * arc;
      pose.bodyOffset.y = 0.42 * arc;
      pose.bodyRotation.z = 1.32 * arc;
      pose.scale.y = 1 + 0.18 * arc;
      pose.scale.x = 1 - 0.12 * arc;
      pose.leftHand = { x: -0.58 - 0.35 * arc, y: 0.85 + 0.25 * arc, z: 0.25 };
      pose.rightHand = { x: 0.38, y: 0.45, z: -0.15 };
      pose.leftFoot = { x: -0.15, y: 0.15, z: -0.22 * arc };
      pose.rightFoot = { x: 0.24, y: 0.18, z: -0.3 * arc };
      pose.expression = 'shocked';
      pose.auraColor = '#00E5FF';
      pose.auraIntensity = 0.65 * arc;
      break;
    }

    case 'field_high_jump': {
      pose.auraColor = '#00E5FF';
      if (phase < 0.22) {
        // Deep spring coil
        const t = smoothstep(phase / 0.22);
        pose.bodyOffset.y = -0.22 * t;
        pose.scale.y = 1 - 0.26 * t;
        pose.scale.x = 1 + 0.2 * t;
        pose.scale.z = 1 + 0.2 * t;
        pose.expression = 'determined';
        pose.auraIntensity = t;
      } else {
        // Sky-High Leap!
        const air = (phase - 0.22) / 0.78;
        const height = Math.sin(air * Math.PI);
        pose.bodyOffset.y = 1.65 * height;
        pose.scale.y = 1 + 0.22 * height;
        pose.scale.x = 1 - 0.12 * height;
        pose.leftHand = { x: -0.36, y: 1.05 + 0.55 * height, z: 0.22 };
        pose.rightHand = { x: 0.44, y: 0.56 - 0.12 * height, z: 0.12 };
        pose.leftFoot = { x: -0.22, y: 0.12 - 0.08 * height, z: -0.12 * height };
        pose.rightFoot = { x: 0.22, y: 0.12 + 0.15 * height, z: 0.14 * height };
        pose.expression = 'fired_up';
        pose.auraIntensity = height;
      }
      break;
    }

    case 'celebrate_hr': {
      const jump = Math.abs(Math.sin(tau * 2));
      pose.bodyOffset.y = jump * 0.48;
      pose.bodyRotation.y = Math.sin(tau) * 0.45;
      pose.scale.y = 0.92 + jump * 0.18;
      pose.scale.x = 1.06 - jump * 0.08;
      pose.leftHand = { x: -0.46, y: 1.15 + jump * 0.18, z: 0.1 };
      pose.rightHand = { x: 0.46, y: 1.15 + jump * 0.18, z: 0.1 };
      pose.expression = 'happy';
      pose.auraColor = '#FFC300';
      pose.auraIntensity = 0.65;
      break;
    }
  }

  return pose;
}
