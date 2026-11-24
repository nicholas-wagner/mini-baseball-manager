import type { EffectiveBatSide } from '../../engine/handedness/types';
import type { CameraPose, Vec3 } from '../camera/cameraRig';
import type { CharacterAnimClip } from '../characters/animationState';
import type { Actor, DiamondPlay, Leg } from './diamondPlay';
import { actorAt } from './diamondPlay';
import { BASE_PATH_VERTICES as bags, headingToward, batterBox } from './diamondLayout';

type Pose = { pos: Vec3; yaw: number; clip: CharacterAnimClip; local: number };
const mound = { x: 0, y: 0.24, z: -10.2 };
const fraction = (v: number) => Math.max(0, Math.min(1, v));
function move(from: Vec3, to: Vec3, u: number) {
  const t = fraction(u);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
  };
}

export function bullpenPlay(): DiamondPlay {
  return {
    kind: 'bullpen',
    legs: [{ from: 'C', to: 'P', kind: 'handoff', start: 2.04, end: 2.33 }],
    pickup: 'C',
    fieldAt: mound,
    pickupAt: 0,
    receiveAt: 2.33,
    finish: 2.33,
    duration: 3.45,
    leadArrival: 0,
    batterArrival: 0,
    unassisted: false,
  };
}

export function finishPlay(play: DiamondPlay, thirdOut: boolean, walkoff: boolean, scorerBase?: 1 | 2 | 3) {
  play.scorerBase = scorerBase;
  if (scorerBase && play.outfield && play.kind !== 'home_run') {
    const cutoff = play.legs.at(-1)!;
    if (cutoff.kind === 'throw') {
      const relay = {
        from: cutoff.to,
        to: 'C',
        kind: 'throw',
        start: cutoff.end + 0.36,
        end: cutoff.end + 1.34,
      } as const;
      play.legs.push(relay);
      play.leadArrival = relay.end - 0.22;
      play.duration = Math.max(play.duration, relay.end + 0.68);
    }
  }
  if (walkoff) {
    const stealHome = play.kind === 'steal_safe' && play.close?.fromBase === 3;
    const runnerWins = Boolean(scorerBase || stealHome);
    const touch = runnerWins ? play.leadArrival : play.batterArrival;
    play.ending = { kind: 'walkoff', start: touch, scorer: runnerWins ? 'RUN' : 'BAT' };
    play.duration = Math.max(play.duration, touch + 2.05);
  } else if (thirdOut) {
    const start = play.finish + 0.72;
    const holder = play.legs.at(-1)!.to;
    const flips: Leg[] = [];
    if (holder !== 'SS') flips.push({ from: holder, to: 'SS', kind: 'throw', start, end: start + 0.6 });
    const flip = flips.length ? start + 0.95 : start;
    flips.push({ from: 'SS', to: '2B', kind: 'throw', start: flip, end: flip + 0.5 });
    play.ending = { kind: 'third_out', start: start - 0.24, scorer: 'BAT' };
    play.legs.push(...flips);
    play.duration = flip + 1.05;
  }
  return play;
}

export function reactionPose(
  play: DiamondPlay,
  actor: Actor,
  t: number,
  base: Pose,
  bats: EffectiveBatSide,
): Pose | undefined {
  if (play.kind === 'bullpen') {
    const from = actor === 'P' ? { x: 7.7, y: 0.04, z: -15 } : { x: 0.2, y: 0.04, z: -4.2 };
    const dest = actor === 'P' ? mound : { x: -1.14, y: 0.24, z: -9.85 };
    if (actor === 'BAT') {
      const box = batterBox(bats);
      return { pos: box.position, yaw: box.yaw, clip: 'bat_stance', local: t };
    }
    if (actor !== 'C' && actor !== 'P') return { ...base, clip: 'field_ready', local: t };
    const pos = move(from, dest, t / 1.75);
    const yaw =
      t < 1.75
        ? headingToward(from, dest)
        : headingToward(dest, actor === 'C' ? mound : { x: -1.14, y: 0.24, z: -9.85 });
    const clip = t < 1.75 ? 'field_run' : actor === 'P' ? 'field_receive' : 'catch_handoff';
    return { pos, yaw, clip, local: Math.max(0, t < 1.75 ? t : Math.min(0.63, t - 1.72)) };
  }
  const end = play.ending;
  if (!end || t < end.start) return;
  if (end.kind === 'walkoff') {
    if (actor === 'C' && t > end.start + 0.35) {
      const away = { x: 1.75, y: 0.04, z: -1.12 };
      const u = fraction((t - end.start - 0.35) / 0.83);
      const pos = move(base.pos, away, u);
      return {
        pos,
        yaw: headingToward(pos, bags[0]),
        clip: u < 1 ? 'field_run' : 'field_ready',
        local: t - end.start,
      };
    }
    if (actor === end.scorer)
      return { ...base, pos: bags[0], yaw: 0.42, clip: 'celebrate_hr', local: t - end.start };
    return;
  }
  const throws = play.legs.filter((l) => l.start >= end.start);
  const pitch = throws.find((l) => l.from === actor && t >= l.start - 0.24);
  if (pitch)
    return {
      ...base,
      clip: actor === 'C' ? 'catch_throw' : 'field_throw',
      local: Math.min(0.61, t - pitch.start + (actor === 'C' ? 0.33 : 0.2)),
    };
  const catchAt = throws.find((l) => l.to === actor);
  if (catchAt) return { ...base, clip: 'field_receive', local: 0.27 };
}

export function reactionCamera(play: DiamondPlay, t: number, bats: EffectiveBatSide): CameraPose | undefined {
  if (play.kind === 'bullpen') {
    const runner = actorAt(play, 'P', t, bats).pos;
    const lookAt = { ...move(runner, mound, 0.32), y: 1.1 };
    return { lookAt, position: { x: lookAt.x + 2.1, y: 2.85, z: lookAt.z + 5.4 }, fov: 39 };
  }
  const end = play.ending;
  if (!end) return;
  if (end.kind === 'walkoff' && t >= end.start - 0.65) {
    return { lookAt: { x: -0.25, y: 1, z: -0.1 }, position: { x: 2.3, y: 2.6, z: 5.9 }, fov: 42 };
  }
  if (end.kind === 'third_out' && t >= end.start) {
    const flips = play.legs.filter((l) => l.start >= end.start);
    const leg = flips.find((l) => t < l.end) ?? flips[flips.length - 1];
    const at = move(
      actorAt(play, leg.from, leg.start, bats).pos,
      actorAt(play, leg.to, leg.end, bats).pos,
      (t - leg.start) / (leg.end - leg.start),
    );
    return { lookAt: { ...at, y: 1 }, position: { x: at.x + 2.15, y: 3.4, z: at.z + 6.2 }, fov: 42 };
  }
}

// Teammates enter from the dugout after the winning cleat touches the plate.
export function welcomePose(index: number, seconds: number): Pose {
  const side = index === 0 ? -1 : 1;
  const delay = index * 0.18;
  const u = fraction((seconds - delay) / 0.78);
  const pos = move(
    { x: side * (3.3 + index * 0.42), y: 0.04, z: 2.3 },
    { x: side * (0.98 + index * 0.1), y: 0.04, z: 0.4 + index * 0.39 },
    u,
  );
  return {
    pos,
    yaw: headingToward(pos, bags[0]),
    local: Math.max(0, seconds - delay),
    clip: u < 1 ? 'field_run' : 'celebrate_hr',
  };
}

// The third-base dugout looks straight down the runner's path to home.
export const DUGOUT_RAIL = { x: -10.6, z: -6.2, yaw: Math.PI / 4 };
export function railReaction(play: DiamondPlay, t: number): Pose | undefined {
  if (!play.outfield || (!play.scorerBase && !play.runnerToThird) || t < play.pickupAt) return;
  return { pos: { x: DUGOUT_RAIL.x - .39, y: .04, z: DUGOUT_RAIL.z + .26 },
    yaw: 1.9, clip: 'rail_lean', local: t - play.pickupAt };
}
