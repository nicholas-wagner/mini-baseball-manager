import type { PitchTargetIntent } from '../../engine/simulation/pitchMindGames';
import { pitchSeconds, shapePitch, type PitchFlight } from './pitchFlight';
import { reactionCamera, reactionPose, bullpenPlay } from './teamReactions';
import { buildClosePlay, closeActorAt, closeCamera, isCloseKind, type CloseAction, type CloseKind } from './plateAndSteals';
import { BASE_PATH_VERTICES, OUTFIELD_STARTS, batterBox, headingToward } from './diamondLayout';
import { buildOutfieldPlay, isOutfieldKind, outfieldDefenderAt, runBases, type OutfieldKind } from './outfieldPlay';
import type { AtBatOutcome, PlayEvent } from '../../engine/models/playEvent';
import type { BattedBallType } from '../../engine/models/player';
import type { CameraPose, Vec3 } from '../camera/cameraRig';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE, type CharacterAnimClip } from '../characters/animationState';
import type { EffectiveBatSide, FieldPosition, ThrowsHand } from '../../engine/handedness/types';

type InfieldKind = 'ground_out' | 'double_play' | 'pop_up' | 'bunt_out' | 'bunt_single' | 'fielding_error' | 'infield_liner';
export type DiamondPlayKind = InfieldKind | OutfieldKind | CloseKind | 'cover_first' | 'bullpen';
export type Actor = 'LF' | 'CF' | 'RF' | 'P' | 'BAT' | 'SS' | '2B' | '1B' | '3B' | 'RUN' | 'C';
export type Leg = { from: Actor; to: Actor; start: number; end: number; kind: 'pitch' | 'ground' | 'pop' | 'throw' | 'flight' | 'bounce' | 'handoff'; startPoint?: Vec3; endPoint?: Vec3; apex?: number; pitch?: PitchFlight };
const [home, first, second] = BASE_PATH_VERTICES;
const release = CLIP_DURATIONS.pitch_windup * PITCH_RELEASE_PHASE;

const starts: Record<Actor, Vec3> = {
  ...OUTFIELD_STARTS,
  C: { x: 0, y: .04, z: 1.12 }, P: { x: 0, y: 0.24, z: -10.2 }, BAT: batterBox('R').position,
  SS: { x: -4.6, y: 0.04, z: -17.6 }, '2B': { x: 4.6, y: 0.04, z: -17.6 },
  '3B': { x: -8.8, y: 0.04, z: -11.4 }, '1B': { x: 8.8, y: 0.04, z: -11.4 },
  RUN: { x: 8.8, y: 0.04, z: -10.5 },
};
export function selectDiamondPlay(outcome?: AtBatOutcome, contact?: BattedBallType, fielder?: FieldPosition): InfieldKind | undefined {
  if (outcome === 'bunt_single' || outcome === 'fielding_error') return outcome;
  if (outcome === 'line_out' && fielder && ['SS','2B','1B','3B'].includes(fielder)) return 'infield_liner';
  if (outcome === 'fly_out' && contact === 'pop_up') return 'pop_up';
  if (outcome === 'double_play' || outcome === 'ground_out' || outcome === 'bunt_out') return outcome;
}

export function isBuntEvent(event?: PlayEvent): boolean {
  if (!event) return false;
  if (event.outcome === 'bunt_single' || event.outcome === 'bunt_out') return true;
  if (event.ballFlight?.style === 'ninja_bunt') return true;
  return Boolean(event.mathBreakdown?.activeModifiers?.some((tag) => /\bbunt\b/i.test(tag)));
}

export interface DiamondPlay {
  kind: DiamondPlayKind;
  legs: Leg[];
  pickup: Actor;
  fieldAt: Vec3;
  pickupAt: number;
  receiveAt: number;
  finish: number;
  batterArrival: number;
  leadArrival: number;
  duration: number;
  unassisted: boolean;
  buntAttempt?: boolean;
  buntAdvances?: (1 | 2 | 3)[];
  holdForceCall?: boolean;
  pitchTarget?: PitchTargetIntent;
  reliefStrikeout?: boolean;
  runnerToThird?: 1 | 2;
  scorerBase?: 1 | 2 | 3;
  ending?: {kind: 'third_out' | 'walkoff'; start: number; scorer: 'BAT' | 'RUN'};
  close?: CloseAction;
  outfield?: {
    bags: number; catchClip: 'field_pop' | 'field_high_jump' | 'field_dive';
    call: string; callColor: string; caught: boolean; wall: boolean;
  };
}
export function diamondPlay(kind: DiamondPlayKind, highlight?: FieldPosition, event?: PlayEvent, stealBase?: 1 | 2 | 3, pitchInfo: PitchFlight | undefined = event?.pitchThrown): DiamondPlay {
  if (kind === 'bullpen') return bullpenPlay();
  const plate = release + (pitchInfo ? pitchSeconds(pitchInfo.mph) : .56);
  const pitch: Leg = {from:'P', to:'BAT', start:release, end:plate, kind:'pitch', pitch:pitchInfo};
  const buntAttempt = kind === 'bunt_out' || kind === 'bunt_single' || isBuntEvent(event);
  if (isCloseKind(kind)) return buildClosePlay(kind, pitch, stealBase, buntAttempt);
  if (isOutfieldKind(kind)) return buildOutfieldPlay(kind, pitch, event);
  const pop = kind === 'pop_up';
  const bunt = kind === 'bunt_out' || kind === 'bunt_single';
  const liner = kind === 'infield_liner';
  const error = kind === 'fielding_error';
  const pivot = kind === 'double_play';
  const marked: Actor | undefined =
    highlight === 'SS' || highlight === '3B' || highlight === '2B' || highlight === '1B'
      ? highlight
      : (pop || bunt) && highlight === 'C'
        ? 'C'
        : (pop || bunt) && (highlight === 'SP' || highlight === 'RP')
          ? 'P'
          : undefined;
  const pickup: Actor = pivot ? 'SS' : bunt ? marked ?? '3B' : kind === 'cover_first' ? '1B' : marked ?? (pop ? '2B' : 'SS');
  const unassisted = kind === 'ground_out' && pickup === '1B';
  const pickupAt = liner ? plate+.66 : pop ? 3.86 : bunt ? 2.64 : 2.85;
  const receiveAt = pivot ? 3.86 : 4.28;
  const finish = error ? pickupAt+.98 : pop || liner ? pickupAt : pivot ? 4.94 : receiveAt;
  const legs: Leg[] = [pitch, {
    from: 'BAT', to: pickup, start: plate, end: pickupAt, kind: pop ? 'pop' : liner ? 'flight' : 'ground', apex: liner ? 1.48 : undefined,
  }];
  if (!pop && !liner && !error && !unassisted) legs.push({
    from: pickup, to: kind === 'cover_first' || (bunt && pickup === '1B') ? 'P' : pivot ? '2B' : '1B', start: pickupAt + 0.38, end: receiveAt, kind: 'throw',
  });
  if (pivot) legs.push({ from: '2B', to: '1B', start: receiveAt + 0.32, end: finish, kind: 'throw' });
  const fieldAt = bunt
    ? { x: event?.ballFlight?.landingX ?? -4.25, y: .04, z: event?.ballFlight?.landingZ ?? -4.9 }
    : pop && pickup === 'C'
      ? { x: -0.65, y: 0.04, z: -2.1 }
      : pop && pickup === 'P'
        ? { x: -0.45, y: 0.1, z: -7.2 }
        : { x: starts[pickup].x * (pickup === 'SS' && !pop ? 1.39 : .82), y: .04, z: starts[pickup].z + 3.9 };
  if (error) {
    const loose = { x:fieldAt.x+.95, y:.14, z:fieldAt.z+.8 };
    legs.push({ from:pickup,to:pickup,start:pickupAt,end:pickupAt+.44,kind:'bounce',endPoint:loose },
      { from:pickup,to:pickup,start:pickupAt+.44,end:finish,kind:'ground',startPoint:loose });
  }
  return { kind, legs, pickup, pickupAt, receiveAt, finish, fieldAt, unassisted,
    buntAttempt: buntAttempt || undefined,
    duration: finish + (error ? 1.75 : 1.05),
    batterArrival: kind === 'bunt_single' ? finish-.34 : finish + 0.37, leadArrival: receiveAt + 0.28 };
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const progress = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
function between(a: Vec3, b: Vec3, u: number): Vec3 {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
}

export function sampleLeg(leg: Leg, a: Vec3, b: Vec3, progress01: number, throws: ThrowsHand = 'R'): Vec3 {
  const t = clamp(progress01);
  if (t === 0) return a;
  if (t === 1) return b;
  const v = between(a, b, t);
  if (leg.kind === 'pitch' && leg.pitch) {
    shapePitch(v,leg.pitch,t,throws);
  } else if (leg.kind === 'flight') {
    v.y += 4*t*(1-t)*Math.max(0,(leg.apex ?? 3) - (a.y+b.y)/2);
  } else if (leg.kind === 'bounce') {
    const hop = Math.abs(Math.sin(t*Math.PI*2.5))*(1-t)*.82;
    v.y = .12 + (a.y-.12)*(1-t)**3 + hop + (b.y-.12)*progress(t,.78,1);
  } else if (leg.kind === 'ground') {
    const drop = 0.22;
    if (t < drop) v.y = a.y + (0.11 - a.y) * (t / drop);
    else {
      const hop = (t - drop) / (1 - drop);
      v.y = 0.11 + 0.66 * (1 - hop) * Math.abs(Math.sin(hop * 2.5 * Math.PI))
        + (b.y - 0.11) * progress(hop, 0.74, 1);
    }
  } else {
    v.y += 4 * t * (1 - t) * (leg.kind === 'pop' ? 7.8 : leg.kind === 'throw' ? 0.65 : leg.kind==='handoff' ? .035 : 0.10);
  }
  return v;
}

export function forceAtFirst(play: DiamondPlay) {
  return ['ground_out', 'cover_first', 'double_play', 'bunt_out'].includes(play.kind);
}

// From pitch to contact, a runner taking a secondary lead still owns the original bag.
export function heldRunnerLead(play: DiamondPlay, base: number, time: number) {
  const lead = .06 + .18 * progress(time, play.legs[0].start, play.legs[0].end + .65);
  return between(BASE_PATH_VERTICES[base], BASE_PATH_VERTICES[base+1], lead);
}

export function buntRunnerPose(play: DiamondPlay, from: number, time: number) {
  const contact = play.legs[0].end;
  const start = heldRunnerLead(play, from, Math.min(time, contact));
  if (time < contact) {
    return { pos: start, yaw: headingToward(start, BASE_PATH_VERTICES[0]), clip: 'runner_lead' as const, local: time };
  }
  const arrival = time - play.leadArrival;
  if (from < 3 && arrival >= .26 && arrival < .74) {
    const bag = BASE_PATH_VERTICES[from + 1];
    return { pos: bag, yaw: headingToward(bag, BASE_PATH_VERTICES[0]), clip: 'helmet_tip' as const, local: arrival + .15 };
  }
  return runBases(start, from, from + 1, time, contact, play.leadArrival);
}

function baseActorAt(play: DiamondPlay, actor: Actor, time: number, bats: EffectiveBatSide) {
  const plate = play.legs[0].end;
  let pos = starts[actor];
  const leadBase = play.scorerBase ?? play.runnerToThird;
  if (actor === 'RUN' && play.buntAdvances && play.scorerBase) return buntRunnerPose(play, play.scorerBase, time);
  if (actor === 'RUN' && leadBase && !play.close?.steal) {
    const go = (play.outfield?.caught ? play.pickupAt : plate) + .10;
    return runBases(BASE_PATH_VERTICES[leadBase],leadBase,play.scorerBase ? 4 : 3,time,go,play.leadArrival);
  }
  if (play.close) return closeActorAt(play, play.close, actor, time, bats, pos);
  if (actor === 'C' && play.scorerBase && play.outfield) {
    const relay = play.legs.find(l=>l.kind === 'throw' && l.to === 'C');
    if (relay) {
      const target = {x:.45,y:.04,z:-.40};
      pos = between(pos,target,progress(time,plate+.18,relay.start));
      return {pos,yaw:headingToward(pos,play.fieldAt),clip:time < relay.end-.25 ? 'field_ready' as const : 'catch_receive' as const,local:.22};
    }
  }
  if ((actor === 'P' || actor === 'C') && play.pickup === actor &&
      (play.kind === 'bunt_out' || play.kind === 'bunt_single') && time > plate + .06) {
    const throwLeg = play.legs[2];
    const charge = progress(time, plate + .06, play.pickupAt - .22);
    const throwing = time >= throwLeg.start - .16;
    return { pos: between(pos, play.fieldAt, charge),
      yaw: charge < 1 ? headingToward(pos, play.fieldAt) : headingToward(play.fieldAt, first),
      clip: charge < 1 ? 'field_run' as const : !throwing ? 'field_scoop' as const :
        actor === 'C' ? 'catch_throw' as const : 'field_throw' as const,
      local: throwing ? Math.min(.64, time - throwLeg.start + .24) : Math.max(0, time - play.pickupAt + .24) };
  }
  if (actor === 'C') {
    if (play.pickup === 'C') {
      const startAt = plate + 0.06;
      const arrive = play.pickupAt - 0.34;
      const receive = play.legs.find((leg) => leg.to === 'C');
      if (receive && time >= receive.end - 0.32) {
        return { pos: play.fieldAt, yaw: Math.PI, clip: 'field_pop' as const, local: Math.max(0, time - receive.end + 0.32) };
      }
      const u = progress(time, startAt, arrive);
      if (u > 0) {
        return {
          pos: between(pos, play.fieldAt, u),
          yaw: u < 1 ? headingToward(pos, play.fieldAt) : Math.PI,
          clip: u < 1 ? 'field_run' as const : 'field_pop' as const,
          local: Math.max(0, time - startAt),
        };
      }
      return { pos, yaw: Math.PI, clip: 'catch_target' as const, local: time };
    }
    return { pos, yaw: Math.PI, clip: 'field_ready' as const, local: time };
  }
  let clip: CharacterAnimClip = 'field_ready';
  let local = time;
  let yaw = actor === '1B' && play.pickup !== '1B' ? -2.1 : 0;
  if (play.outfield && actor !== 'P' && actor !== 'BAT' && actor !== 'RUN') {
    return outfieldDefenderAt(play, play.outfield, actor, pos, time);
  }
  if (play.kind === 'sac_fly' && actor === 'RUN') {
    return runBases(BASE_PATH_VERTICES[3],3,4,time,play.pickupAt+.08,play.leadArrival);
  }
  if (actor === 'P') {
    if (play.pickup === 'P') {
      const startAt = Math.max(CLIP_DURATIONS.pitch_windup, plate + 0.06);
      const arrive = play.pickupAt - 0.34;
      const receive = play.legs.find((leg) => leg.to === 'P');
      if (time < startAt) {
        return {
          pos,
          yaw: 0,
          clip: time < CLIP_DURATIONS.pitch_windup ? 'pitch_windup' as const : 'field_ready' as const,
          local: time,
        };
      }
      if (receive && time >= receive.end - 0.32) {
        return { pos: play.fieldAt, yaw: 0, clip: 'field_pop' as const, local: Math.max(0, time - receive.end + 0.32) };
      }
      const u = progress(time, startAt, arrive);
      return {
        pos: between(pos, play.fieldAt, u),
        yaw: u < 1 ? headingToward(pos, play.fieldAt) : 0,
        clip: u < 1 ? 'field_run' as const : 'field_pop' as const,
        local: Math.max(0, time - startAt),
      };
    }
    if (play.pickup === '1B' && time > plate+.12) {
      const bag = {...first,x:first.x-.27,z:first.z-.18};
      const u = progress(time,plate+.12,play.receiveAt-.16);
      const target = play.unassisted ? {...bag,x:bag.x+1.2,z:bag.z-.9} : bag;
      return {pos:between(pos,target,u),yaw:u<1 ? headingToward(pos,target) : headingToward(target,play.fieldAt),
        clip:u<1 ? 'field_run' as const : 'field_receive' as const,local:time-plate-.12};
    }
    clip = time < CLIP_DURATIONS.pitch_windup ? 'pitch_windup' : 'field_ready';
  } else if (actor === 'BAT' || actor === 'RUN') {
    const lead = actor === 'RUN';
    const box = batterBox(bats);
    const start = lead ? pos : box.position;
    const arrival = lead ? play.leadArrival : play.batterArrival;
    const go = plate + (lead ? 0.04 : 0.20);
    if (!lead && time < go) {
      const swing: CharacterAnimClip = (play.kind === 'bunt_out' || play.kind === 'bunt_single' || play.buntAttempt) ? 'bat_bunt' : play.kind === 'home_run' ? 'bat_bomb' : 'bat_swing';
      local = time - plate + CLIP_DURATIONS[swing] * 0.45;
      clip = local < 0 ? 'bat_stance' : swing;
      pos = start;
      yaw = box.yaw;
    } else {
      if (!lead && (play.kind === 'bunt_single' || play.kind === 'fielding_error')) {
        return runBases(start,0,1,time,go,arrival);
      }
      if (!lead && play.kind === 'infield_liner') {
        const chase = runBases(start,0,1,Math.min(time,play.finish),go,go+2.7);
        if (time >= play.finish) { chase.clip = 'runner_lead'; chase.yaw = headingToward(chase.pos,play.fieldAt); }
        return chase;
      }
      if (!lead && play.outfield) {
        if (play.outfield.bags) return runBases(start,0,play.outfield.bags,time,go,arrival);
        // Pull up between home and first on the catch.
        const pace = Math.max(1.65, (play.pickupAt - go) * 1.55);
        const chase = runBases(start, 0, 1, Math.min(time, play.pickupAt), go, go + pace);
        if (time >= play.pickupAt) {
          chase.clip = 'runner_lead';
          chase.yaw = headingToward(chase.pos, play.fieldAt);
        }
        return chase;
      }
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
    const stop = isPickup ? play.fieldAt : actor === '1B' ? { ...first, x: first.x + .16, z: first.z - .44 }
      : actor === '2B' && !play.buntAdvances ? { ...second, x: second.x - .34, z: second.z - .28 } : pos;
    const arrive = isPickup ? play.pickupAt - 0.18 : play.receiveAt - 0.24;
    const u = progress(time, plate + 0.05, arrive);
    pos = between(pos, stop, u);
    if (u > 0 && u < 1 && stop !== starts[actor]) clip = 'field_run';
    const receive = play.legs.find(leg => leg.to === actor);
    const toss = play.legs.find(leg => leg.from === actor);
    if (receive && time >= receive.end - 0.28) {
      clip = receive.kind === 'ground' ? 'field_scoop' : receive.kind === 'pop' ? 'field_pop' : 'field_receive';
      local = Math.max(0, time - receive.end + 0.28);
    }
    if (play.kind === 'fielding_error' && isPickup && time > play.pickupAt) {
      const loose = play.legs[2].endPoint!;
      pos = between(stop, { ...loose, y:stop.y }, progress(time,play.pickupAt+.11,play.finish-.13));
      clip = time < play.finish-.22 ? 'field_run' : 'field_scoop';
      local = Math.max(0,time-play.finish+.25);
    }
    if (play.unassisted && actor === '1B' && time > play.pickupAt + .22) {
      pos = between(stop, first, progress(time, play.pickupAt + .22, play.finish));
      clip = time < play.finish ? 'field_run' : 'field_ready';
    }
    if (toss?.kind === 'throw' && time >= toss.start - 0.20) {
      clip = 'field_throw';
      local = Math.min(0.64, time - toss.start + 0.20);
    }
  }
  return { pos, yaw, clip, local: Math.max(0, local) };
}

export function actorAt(play: DiamondPlay, actor: Actor, time: number, bats: EffectiveBatSide): {pos:Vec3; yaw:number; local:number; clip:CharacterAnimClip} {
  let base = baseActorAt(play,actor,time,bats);
  if (actor==='BAT' && !play.close && play.kind!=='bullpen') {
    const go=play.legs[0].end+.20;
    const u=progress(time,go,go+.36);
    if (time>=go && u<1 && base.clip==='field_run') {
      // Load the pivot cleat, then accelerate through the first running step.
      base=baseActorAt(play,actor,go+.36*u*u,bats);
      if (u<.52) base={...base,clip:'runner_push',local:time-go};
    }
  }
  if (actor === 'BAT' && forceAtFirst(play) && time >= play.batterArrival + .08 && base.clip === 'field_run') {
    base = {...base, clip:'runner_glance'};
  }
  if (actor === '1B' && play.kind === 'double_play') {
    // Keep the pocket facing the throw through the force before acknowledging the bench.
    const turn = progress(time, play.finish + .28, play.finish + .78);
    base = {...base, yaw: base.yaw - 2.65 * turn};
  }
  const salute = time - play.finish - .36;
  if (play.reliefStrikeout && actor === 'P' && salute >= 0 && salute < CLIP_DURATIONS.pitch_salute && (!play.ending || time < play.ending.start)) {
    return {...base,clip:'pitch_salute',local:salute};
  }
  return reactionPose(play,actor,time,base,bats) ?? base;
}

export function buntFollowBase(play: DiamondPlay, time: number) {
  return time > play.batterArrival ? play.buntAdvances?.at(-1) : undefined;
}

export function diamondCamera(play: DiamondPlay, t: number, bats: EffectiveBatSide, throws: ThrowsHand = 'R'): CameraPose {
  const reaction = reactionCamera(play,t,bats);
  if (reaction) return reaction;
  const plate = play.legs[0].end;
  if (play.reliefStrikeout && t > play.finish+.36) {
    const mound = actorAt(play,'P',t,bats).pos;
    return {position:{x:mound.x+1.8,y:1.85,z:mound.z+3.8},lookAt:{...mound,y:1.02},fov:36};
  }
  if (play.close) return closeCamera(play, play.close, t, bats, throws);
  if (t < plate + 0.10) return {
    position: { x: bats === 'R' ? -2.25 : 2.25, y: 2.7, z: 4.8 },
    lookAt: { x: 0, y: 1.14, z: -2.75 }, fov: 39,
  };
  if (play.buntAdvances && t < play.finish - .36) {
    return { position: {x: 8, y: 11, z: 6}, lookAt: {x: 2, y: .5, z: -10.5}, fov: 44 };
  }
  const leg = play.legs.find(part => t < part.end) ?? play.legs[play.legs.length - 1];
  if (play.outfield) {
    const a = leg.startPoint ?? actorAt(play,leg.from,leg.start,bats).pos;
    const b = leg.endPoint ?? actorAt(play,leg.to,leg.end,bats).pos;
    const u = progress(t,leg.start,leg.end);
    const point = sampleLeg(leg,a,b,u);
    const runnerFinish = play.outfield.bags > 0 || play.kind === 'sac_fly';
    if ((play.kind === 'double' || play.kind === 'triple') && (play.scorerBase || play.runnerToThird) &&
        t >= play.pickupAt + .28 && t <= play.leadArrival + .25) {
      const runner = actorAt(play, 'RUN', t, bats).pos;
      return {lookAt: {...runner, y:.83}, position:{x:runner.x-2.7, y:3.15, z:runner.z+5.3}, fov:41};
    }
    if (play.scorerBase && t >= play.leadArrival-.55) return {position:{x:3.3,y:2.2,z:4.4},lookAt:{x:-.4,y:.85,z:-.2},fov:40};
    if (runnerFinish && t > leg.end+.12 && leg === play.legs.at(-1)) {
      const runner = actorAt(play,play.kind === 'sac_fly' ? 'RUN' : 'BAT',t,bats).pos;
      return { lookAt:{...runner,y:.85},position:{x:runner.x+3.2,y:3.8,z:runner.z+6},fov:39 };
    }
    // Keep the warning track and the pursuing fielder in the wall shot.
    const fenceShot = play.outfield.wall || play.kind === 'home_run';
    const atWall = fenceShot && (leg.kind === 'flight' || leg.kind === 'bounce');
    const zoom = leg.kind === 'flight' ? progress(u, .55, 1) : 1;
    const lookAt = { ...point, y: Math.max(.88, point.y * .83 + .23) };
    return { lookAt, fov: 43, position: {
      x: point.x + 1.9, y: lookAt.y + (play.kind === 'home_run' ? 6 : atWall ? 4.2 : 3.0 - zoom),
      z: point.z + (atWall ? 10.4 : 9.5 - 4 * zoom),
    } };
  }
  const advancingRunner = buntFollowBase(play, t);
  if (advancingRunner) {
    const runner = buntRunnerPose(play, advancingRunner, t).pos;
    return { position: { x: runner.x + 3.4, y: 3.1, z: runner.z + 5.7 }, lookAt: { ...runner, y: .80 }, fov: 40 };
  }
  if (forceAtFirst(play) && t >= play.finish-.36) {
    const runner = actorAt(play,'BAT',t,bats).pos;
    const focus = between(first,runner,.45);
    return {position:{x:focus.x+4.8,y:2.4,z:focus.z+1.35},lookAt:{...focus,y:.76},fov:39};
  }
  const start = actorAt(play, leg.from, leg.start, bats).pos;
  const end = actorAt(play, leg.to, leg.end, bats).pos;
  const u = progress(t, leg.start, leg.end);
  const focus = between(start, end, u * u * (3 - 2 * u));
  if (play.kind === 'fielding_error' && t > play.finish+.15) Object.assign(focus, actorAt(play,'BAT',t,bats).pos);
  if (play.unassisted && t > play.pickupAt) Object.assign(focus, actorAt(play,'1B',t,bats).pos);
  const high = leg.kind === 'pop' ? 6.3 * Math.sin(Math.PI * u) : 0;
  const lookAt = { ...focus, y: 0.95 + high };
  return { lookAt, position: { x: focus.x + 1.8, y: 4.8 + high * 0.65, z: focus.z + 8.3 },
    fov: leg.kind === 'pop' ? 42 : 36 };
}
