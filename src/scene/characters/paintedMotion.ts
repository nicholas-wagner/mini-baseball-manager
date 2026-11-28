import type { PaintedRole } from '../../art/miniPlayers/paintedLook';
import {
  CLIP_DURATIONS,
  type CharacterAnimClip,
  GLOVE_CONTACT_PHASE,
  PITCH_RELEASE_PHASE,
} from './animationState';

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const pulse = (t: number, start: number, end: number) =>
  Math.sin(Math.PI * clamp((t - start) / (end - start)));
const pitchClips = new Set<CharacterAnimClip>(['pitch_stretch', 'pitch_windup', 'pitch_super', 'practice_bullpen']);

export function paintedMotion(
  role: PaintedRole,
  clip: CharacterAnimClip,
  seconds: number,
) {
  const phase = (((seconds / CLIP_DURATIONS[clip]) % 1) + 1) % 1;

  const wave = Math.sin(seconds * 3.9);
  let cel = 0,
    expression = 0,
    hop = 0,
    lean = wave * 0.015,
    squash = wave * 0.015,
    tilt = wave * 0.02,
    shift = 0;
  let barrelAngle = .78 + .05 * wave, gripChoke = 0, stanceWidth = 0, bodyTurn = 0;
  let held = false;
  let pitchPhase = 0, headTurn = 0, nod = 0;
  const glovePat = 0;
  if (role === 'pitcher') {
    lean = 0;
    squash = 0;
    tilt = wave * .009;
    if (clip === 'pitch_set' || clip === 'pitch_stretch_set') {
      const breath = Math.sin(phase * Math.PI * 2);
      const peek = pulse(phase,.52,.90);
      squash = .013 * breath + .011 * peek;
      lean = -.018 * peek;
      nod = .075 * peek;
      if (clip === 'pitch_stretch_set') headTurn = .22 * pulse(phase,.16,.52) ** 2;
    }
    if (clip === 'pitch_shake_off') {
      const t = clamp(seconds / CLIP_DURATIONS.pitch_shake_off);
      headTurn = .24 * Math.sin(t * Math.PI * 5) * pulse(t,0,.68);
      nod = .19 * pulse(t,.65,1);
    }
    if (pitchClips.has(clip)) {
      pitchPhase = phase;
      expression = phase < .16 || phase > .92 ? 0 : 1;
      held = phase >= .43 && phase < PITCH_RELEASE_PHASE;
      tilt = -.06 * pulse(phase,.25,.52) + .11 * pulse(phase,.52,.84);
    }
  } else if (role === 'batter') {
    const swings = clip === 'bat_swing' || clip === 'bat_bomb' || clip === 'practice_cage';
    cel = clip === 'bat_bunt' ? 3 : swings ? (phase < 0.22 ? 0 : phase < 0.42 ? 1 : 2) : 0;
    expression = 1;
    // Load onto the back hip, plant the front cleat, then turn through contact.
    const load = swings ? pulse(phase, 0.04, 0.42) : (1 + wave) * 0.13;
    const drive = swings ? pulse(phase, 0.34, 0.94) : 0;
    shift = -0.075 * load + 0.105 * drive;
    lean = -0.045 * load + 0.059 * drive;
    tilt = 0.065 * load - 0.055 * drive;
    squash = 0.025 + 0.035 * load - 0.025 * drive;
    if (swings) {
      barrelAngle = (cel === 0 ? .78 : .36) + .04 * wave;
      const finish = clamp((phase - .58) / .20) - .5 * clamp((phase-.78)/.22);
      lean += .085 * finish;
      shift += .095 * finish;
      tilt -= .12 * finish;
    }
    if (clip === 'bat_power_set') {
      const load = clamp(seconds / .32);
      cel = Number(load > .45);
      lean -= .13 * load;
      shift -= .14 * load;
      squash += (.060 + .014 * wave) * load;
      tilt += .10 * load;
      stanceWidth = .65 * load;
      barrelAngle = .78 - .52 * load + .075 * wave;
    }
    if (clip === 'bat_contact_set') {
      const choke = clamp(seconds/.28);
      shift += .025 * choke;
      squash += (.07 + .014 * wave) * choke;
      lean += .038 * choke;
      gripChoke = .17 * choke;
      barrelAngle -= .18 * choke;
    }
    if (clip === 'bat_take') {
      const check = pulse(seconds,0,.34);
      shift -= .075 * check;
      lean -= .095 * check;
      barrelAngle -= .26 * check;
      tilt += .11 * check;
    }
    if (clip === 'bat_recover') {
      const recoil = clamp(seconds/CLIP_DURATIONS.bat_recover);
      cel = recoil < .35 ? 2 : recoil < .65 ? 1 : 0;
      lean += .043 * (1-recoil);
      shift += .048 * (1-recoil);
      tilt -= .06 * (1-recoil);
      barrelAngle = .78 - .52*(1-recoil);
    }
    if (clip === 'bat_slump') {
      const drop = clamp(seconds/.48);
      cel = 0;
      squash += .14 * drop;
      tilt -= .28 * drop;
      nod = .27 * drop;
      lean += .09 * drop;
      barrelAngle -= 2.85 * drop;
    }
    if (clip === 'bat_square' || clip === 'bat_bunt' || clip === 'bat_bunt_tap' || clip === 'bat_bunt_pullback') {
      const square = clip === 'bat_bunt_pullback' ? 1-clamp(seconds/CLIP_DURATIONS.bat_bunt_pullback)
        : clip === 'bat_square' ? clamp(seconds/CLIP_DURATIONS.bat_square)
        : clip === 'bat_bunt' ? clamp(seconds/.22) : 1;
      const cushion = clip === 'bat_bunt_tap' ? pulse(seconds,0,.14) : 0;
      bodyTurn = .27 * square;
      stanceWidth = .22 * square;
      cel = square >= .60 ? 3 : 0;
      shift += .075 * square - .055 * cushion;
      lean += .06 * square - .065 * cushion;
      squash += (.07 + .012 * wave) * square;
      barrelAngle -= 2.25 * square;
    }
    if (clip === 'bat_bomb') {
      lean -= .10 * load;
      shift += .11 * (drive-load);
      tilt += .06 * load;
    }
  } else if (role === 'catcher') {
    cel = clip === 'catch_receive' && phase > 0.18 && phase < 0.9 ? 5 : 4;
    squash += 0.055 * pulse(phase, 0.18, 0.65);
  } else if (role === 'runner') {
    cel = Math.sin(seconds * 2.3) > 0.55 ? 1 : 0;
    shift = wave * 0.025;
    if (clip === 'field_run') {
      cel = 6 + Number(phase >= 0.5);
      hop = 0.095 * Math.abs(Math.sin(phase * Math.PI * 2));
      lean = Math.cos(phase * Math.PI * 2) * 0.045;
      expression = 1;
    }
  } else {
    cel = clip === 'field_run' ? 9 : 8;
    if (clip === 'field_high_jump' || clip === 'field_dive') {
      const reach = GLOVE_CONTACT_PHASE[clip];
      cel = phase < 0.16 ? 8 : phase > 0.9 ? 9 : clip === 'field_dive' ? 11 : 10;
      hop =
        (clip === 'field_dive' ? 0.12 : 0.47) *
        Math.sin(Math.PI * clamp((phase - 0.12) / (2 * (reach - 0.12))));
      tilt = clip === 'field_dive' ? -0.65 : -0.13;
      expression = 1;
    } else if (clip === 'field_receive' || clip === 'field_pop') {
      cel = clip === 'field_pop' ? 2 : 0;
      squash = .015 * wave;
      tilt = clip === 'field_pop' ? -.14 : -.055;
    } else if (clip === 'field_throw') {
      cel = seconds < 0.19 ? 6 : seconds < 0.36 ? 7 : 5;
      lean = -0.08 * pulse(phase, 0.05, 0.88);
    } else if (clip === 'field_scoop') {
      cel = 8;
      squash = 0.04;
      tilt = 0.12;
    } else if (cel === 9) {
      const step = Math.sin(phase * 2*Math.PI);
      hop = .068*Math.abs(step);
      squash = .032*Math.cos(phase * 4*Math.PI);
      lean = -.075 + .032*step;
      tilt = .048*step;
    }
  }
  if (clip === 'celebrate_hr' && role === 'pitcher') {
    const lift = clamp((phase - 0.16) / 0.67);
    cel = phase < 0.16 ? 1 : phase < 0.83 ? 10 : 11;
    expression = phase < 0.12 ? 0 : 2;
    held = false;
    hop = 1.24 * lift * (1 - lift);
    tilt = -0.12 * Math.sin(Math.PI * lift);
    squash = 0.085 * (pulse(phase, 0, 0.17) + pulse(phase, 0.82, 1));
  } else if (clip === 'celebrate_hr') {
    expression = 2;
    hop = 0.17 * Math.abs(Math.sin(phase * 2 * Math.PI));
  }
  return { cel, expression, hop, lean, squash, tilt, shift, held, pitchPhase, headTurn, nod, glovePat, barrelAngle, gripChoke, stanceWidth, bodyTurn };
}
