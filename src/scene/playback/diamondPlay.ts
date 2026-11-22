import { BASE_PATH_VERTICES, batterBox, headingToward } from './diamondLayout';
import type { AtBatOutcome } from '../../engine/models/playEvent';
import type { BattedBallType } from '../../engine/models/player';
import type { CameraPose, Vec3 } from '../camera/cameraRig';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE, type CharacterAnimClip } from '../characters/animationState';
import type { EffectiveBatSide, FieldPosition } from '../../engine/handedness/types';

export type DiamondPlayKind = 'ground_out' | 'double_play' | 'pop_up' | 'bunt_out';
export type Actor = 'P' | 'BAT' | 'SS' | '2B' | '1B' | '3B' | 'RUN';
type Leg = { from: Actor; to: Actor; start: number; end: number; kind: 'pitch' | 'ground' | 'pop' | 'throw' };
const [home, first, second] = BASE_PATH_VERTICES;
const release = CLIP_DURATIONS.pitch_windup * PITCH_RELEASE_PHASE;
const plate = release + 0.56;
const pitch: Leg = { from: 'P', to: 'BAT', start: release, end: plate, kind: 'pitch' };
const starts: Record<Actor, Vec3> = {
  P: { x: 0, y: 0.24, z: -10.2 }, BAT: batterBox('R').position,
  SS: { x: -4.6, y: 0.04, z: -17.6 }, '2B': { x: 4.6, y: 0.04, z: -17.6 },
  '3B': { x: -8.8, y: 0.04, z: -11.4 }, '1B': { x: 8.8, y: 0.04, z: -11.4 },
  RUN: { x: 8.8, y: 0.04, z: -10.5 },
};
export function selectDiamondPlay(outcome?: AtBatOutcome, contact?: BattedBallType): DiamondPlayKind | undefined {
  if (outcome === 'fly_out' && contact === 'pop_up') return 'pop_up';
  if (outcome === 'double_play' || outcome === 'ground_out' || outcome === 'bunt_out') return outcome;
}

export function diamondPlay(kind: DiamondPlayKind, highlight?: FieldPosition) {
  const pop = kind === 'pop_up';
  const bunt = kind === 'bunt_out';
  const pivot = kind === 'double_play';
  const marked = highlight === 'SS' || highlight === '3B' || highlight === '2B' || highlight === '1B' ? highlight : undefined;
  const pickup: Actor = pivot ? 'SS' : bunt ? '3B' : marked ?? (pop ? '2B' : 'SS');
  const unassisted = !pop && pickup === '1B';
  const pickupAt = pop ? 3.86 : bunt ? 2.64 : 2.85;
  const receiveAt = pivot ? 3.86 : 4.28;
  const finish = pop ? pickupAt : pivot ? 4.94 : receiveAt;
  const legs: Leg[] = [pitch, {
    from: 'BAT', to: pickup, start: plate, end: pickupAt, kind: pop ? 'pop' : 'ground',
  }];
  if (!pop && !unassisted) legs.push({
    from: pickup, to: pivot ? '2B' : '1B', start: pickupAt + 0.38, end: receiveAt, kind: 'throw',
  });
  if (pivot) legs.push({ from: '2B', to: '1B', start: receiveAt + 0.32, end: finish, kind: 'throw' });
  const fieldAt = bunt ? { x: -4.25, y: 0.04, z: -4.9 }
    : { x: starts[pickup].x * (pickup === 'SS' && !pop ? 1.39 : .82), y: .04, z: starts[pickup].z + 3.9 };
  return { kind, legs, pickup, pickupAt, receiveAt, finish, fieldAt, unassisted, duration: finish + 1.05,
    batterArrival: finish + 0.37, leadArrival: receiveAt + 0.28 };
}
export type DiamondPlay = ReturnType<typeof diamondPlay>;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const progress = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
function between(a: Vec3, b: Vec3, u: number): Vec3 {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
}

export function sampleLeg(leg: Leg, a: Vec3, b: Vec3, progress01: number): Vec3 {
  const t = clamp(progress01);
  if (t === 0) return a;
  if (t === 1) return b;
  const v = between(a, b, t);
  if (leg.kind === 'ground') {
    const drop = 0.22;
    if (t < drop) v.y = a.y + (0.11 - a.y) * (t / drop);
    else {
      const hop = (t - drop) / (1 - drop);
      v.y = 0.11 + 0.66 * (1 - hop) * Math.abs(Math.sin(hop * 2.5 * Math.PI))
        + (b.y - 0.11) * progress(hop, 0.74, 1);
    }
  } else {
    v.y += 4 * t * (1 - t) * (leg.kind === 'pop' ? 7.8 : leg.kind === 'throw' ? 0.65 : 0.10);
  }
  return v;
}

export function actorAt(play: DiamondPlay, actor: Actor, time: number, bats: EffectiveBatSide) {
  let pos = starts[actor];
  let clip: CharacterAnimClip = 'field_ready';
  let local = time;
  let yaw = actor === '1B' && play.pickup !== '1B' ? -2.1 : 0;
  if (actor === 'P') {
    clip = time < CLIP_DURATIONS.pitch_windup ? 'pitch_windup' : 'field_ready';
  } else if (actor === 'BAT' || actor === 'RUN') {
    const lead = actor === 'RUN';
    const box = batterBox(bats);
    const start = lead ? pos : box.position;
    const arrival = lead ? play.leadArrival : play.batterArrival;
    const go = plate + (lead ? 0.04 : 0.20);
    if (!lead && time < go) {
      const swing: CharacterAnimClip = play.kind === 'bunt_out' ? 'bat_bunt' : 'bat_swing';
      local = time - plate + CLIP_DURATIONS[swing] * 0.45;
      clip = local < 0 ? 'bat_stance' : swing;
      pos = start;
      yaw = box.yaw;
    } else {
      const u = progress(time, go, arrival);
      const bag = lead ? second : first;
      const touch = { ...bag, x: bag.x + .26, z: bag.z + .22 };
      pos = between(start, touch, u);
      yaw = headingToward(start, touch);
      if (time > arrival) {
        const runThrough = progress(time, arrival, arrival + .54);
        pos.x += (lead ? -1.24 : 1.9) * runThrough;
        pos.z -= 1.6 * runThrough;
        yaw = headingToward(touch, pos);
      }
      local = Math.max(0, time - go);
      clip = time >= go && time < arrival + .54 ? 'field_run' : 'runner_lead';
      if (clip === 'runner_lead') yaw = headingToward(pos, home);
    }
  } else {
    const isPickup = actor === play.pickup;
    const stop = isPickup ? play.fieldAt : actor === '1B' ? { ...first, x: first.x - .44, z: first.z - .35 }
      : actor === '2B' ? { ...second, x: second.x - .34, z: second.z - .28 } : pos;
    const arrive = isPickup ? play.pickupAt - 0.18 : play.receiveAt - 0.24;
    const u = progress(time, plate + 0.05, arrive);
    pos = between(pos, stop, u);
    if (u > 0 && u < 1) clip = 'field_run';
    const receive = play.legs.find(leg => leg.to === actor);
    const toss = play.legs.find(leg => leg.from === actor);
    if (receive && time >= receive.end - 0.28) {
      clip = receive.kind === 'ground' ? 'field_scoop' : receive.kind === 'pop' ? 'field_pop' : 'field_receive';
      local = Math.max(0, time - receive.end + 0.28);
    }
    if (play.unassisted && actor === '1B' && time > play.pickupAt + .22) {
      pos = between(stop, first, progress(time, play.pickupAt + .22, play.finish));
      clip = time < play.finish ? 'field_run' : 'field_ready';
    }
    if (toss && time >= toss.start - 0.20) {
      clip = 'field_throw';
      local = Math.min(0.64, time - toss.start + 0.20);
    }
  }
  return { pos, yaw, clip, local: Math.max(0, local) };
}

export function diamondCamera(play: DiamondPlay, t: number, bats: EffectiveBatSide): CameraPose {
  if (t < plate + 0.10) return {
    position: { x: bats === 'R' ? -2.25 : 2.25, y: 2.7, z: 4.8 },
    lookAt: { x: 0, y: 1.14, z: -2.75 }, fov: 39,
  };
  const leg = play.legs.find(l => t < l.end) ?? play.legs[play.legs.length - 1];
  const start = actorAt(play, leg.from, leg.start, bats).pos;
  const end = actorAt(play, leg.to, leg.end, bats).pos;
  const u = progress(t, leg.start, leg.end);
  const focus = between(start, end, u * u * (3 - 2 * u));
  if (play.unassisted && t > play.pickupAt) Object.assign(focus, actorAt(play,'1B',t,bats).pos);
  const high = leg.kind === 'pop' ? 6.3 * Math.sin(Math.PI * u) : 0;
  const lookAt = { ...focus, y: 0.95 + high };
  return { lookAt, position: { x: focus.x + 1.8, y: 4.8 + high * 0.65, z: focus.z + 8.3 },
    fov: leg.kind === 'pop' ? 42 : 36 };
}
