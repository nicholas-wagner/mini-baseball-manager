import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import type { PlayEvent } from '../../engine/models/playEvent';
import { getCameraPresetPose, type CameraPose, type Vec3 } from '../camera/cameraRig';
import { CLIP_DURATIONS, type CharacterAnimClip } from '../characters/animationState';
import { BASE_PATH_VERTICES as bags, batterBox, headingToward } from './diamondLayout';
import type { Actor, DiamondPlay, Leg } from './diamondPlay';
import { runBases } from './outfieldPlay';

export const PLATE_AND_STEALS = ['foul_back', 'called_third', 'swinging_third', 'ball_four', 'steal_safe', 'steal_out'] as const;
export type CloseKind = typeof PLATE_AND_STEALS[number] | 'called_pitch' | 'missed_pitch' | 'ball_pitch';
type Base = 1 | 2 | 3;
type Pose = { pos: Vec3; yaw: number; clip: CharacterAnimClip; local: number };
export interface CloseAction {
  kind: CloseKind;
  fromBase: Base;
  steal: boolean;
  decisionAt: number;
}
export function isCloseKind(kind: string): kind is CloseKind {
  return ['called_pitch','missed_pitch','ball_pitch'].includes(kind) || PLATE_AND_STEALS.some(value => value === kind);
}
export function closeKindFor(event: PlayEvent): CloseKind | undefined {
  if (event.type === 'stolen_base_attempt') return event.outsAfter > event.outsBefore ? 'steal_out' : 'steal_safe';
  if (event.outcome === 'called_strike') return 'called_pitch';
  if (event.outcome === 'swinging_strike') return 'missed_pitch';
  if (event.outcome === 'ball') return 'ball_pitch';
  if (event.outcome === 'foul') return 'foul_back';
  if (event.outcome === 'walk') return 'ball_four';
  if (event.outcome === 'strikeout') return event.soundCue === 'ump_strike_call' ? 'called_third' : 'swinging_third';
}
export function stealFrom(before: PlayEvent['basesAfter'], after: PlayEvent['basesAfter']): Base | undefined {
  for (const base of [3, 2, 1] as const) {
    const id = before[base - 1];
    if (id && after[base - 1] !== id) return base;
  }
}
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const fraction = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
function mix(a: Vec3, b: Vec3, u: number): Vec3 {
  return { x: a.x + (b.x-a.x)*u, y: a.y + (b.y-a.y)*u, z: a.z + (b.z-a.z)*u };
}
export function buildClosePlay(kind: CloseKind, pitch: Leg, fromBase: Base = 1, buntAttempt = false): DiamondPlay {
  const steal = kind === 'steal_safe' || kind === 'steal_out';
  const fieldAt = bags[fromBase + 1];
  const pickup = steal ? (['2B', '3B', 'C'] as const)[fromBase - 1] : 'C';
  const plate = pitch.end;
  const legs: Leg[] = [{ ...pitch, to: kind === 'foul_back' ? 'BAT' : 'C' }];
  if (kind === 'foul_back') legs.push({ from: 'BAT', to: 'BAT', start: plate, end: plate + .67,
    kind: 'flight', apex: 3.35, endPoint: { x: 1.5, y: 2.55, z: 5.6 } });
  const returns = kind.endsWith('_pitch');
  if (returns) legs.push({from:'C',to:'P',kind:'throw',start:plate+.72,end:plate+1.46});
  const tagAt = plate + 1.84;
  const receiveAt = steal && pickup !== 'C' ? tagAt - .36 : plate;
  if (steal && pickup !== 'C') legs.push({ from: 'C', to: pickup, start: plate + .55, end: receiveAt, kind: 'throw' });
  const leadArrival = kind === 'steal_safe' ? tagAt - .30 : tagAt + .31;
  const finish = steal ? tagAt : plate;
  const batterArrival = plate + 2.85;
  const duration = kind === 'ball_four' ? batterArrival + .45 : steal ? tagAt + 1.38 : returns ? plate+1.94 : plate+1.45;
  return { kind, close: { kind, fromBase, steal, decisionAt: finish }, legs, pickup, fieldAt, pickupAt: plate,
    receiveAt, finish, leadArrival, batterArrival, duration, unassisted: false, buntAttempt: buntAttempt || undefined };
}
export function closeActorAt(play: DiamondPlay, close: CloseAction, actor: Actor, time: number, bats: EffectiveBatSide, start: Vec3): Pose {
  const plate = play.legs[0].end;
  const box = batterBox(bats);
  const since = time - plate;
  const sign = bats === 'R' ? 1 : -1;
  const pose = (clip: CharacterAnimClip, local = time, pos = start, yaw = 0): Pose => ({ clip, local: Math.max(0, local), pos, yaw });
  if (actor === 'P' && play.legs.some(l=>l.to==='P') && since>.75) return pose('field_receive',.28);
  if (actor === 'P') return time < CLIP_DURATIONS.pitch_windup ? pose('pitch_windup') : pose('field_ready');
  if (actor === 'BAT') {
    const swing = close.kind === 'foul_back' || close.kind === 'swinging_third' || close.kind === 'missed_pitch';
    const swingClip: CharacterAnimClip = play.buntAttempt ? 'bat_bunt' : 'bat_swing';
    const swingTime = since + CLIP_DURATIONS[swingClip] * .48 + (!play.buntAttempt && play.legs[0].pitch?.pitchType === 'changeup' ? .19 : 0);
    if (swing && swingTime >= 0 && swingTime < CLIP_DURATIONS[swingClip])
      return pose(swingClip, swingTime, box.position, box.yaw);
    if (close.kind === 'ball_four' && since >= .48) {
      const stride = runBases(box.position, 0, 1, time, plate+.48, play.batterArrival);
      stride.local *= .73;
      return stride;
    }
    return pose('bat_stance', time, box.position, box.yaw);
  }
  if (actor === 'RUN' && !close.steal) {
    return runBases(bags[1], 1, close.kind === 'ball_four' ? 2 : 1, time, plate+.60, play.batterArrival);
  }
  if (actor === 'RUN') {
    const base = bags[close.fromBase], bag = play.fieldAt;
    const lead = mix(base, bag, .12);
    const yaw = headingToward(base, bag);
    // Keep the lead cleat on the near edge of the bag in the extended slide pose.
    const stop = mix(bag, base, .055);
    const slideAt = play.leadArrival - .60;
    const slideStart = mix(stop, base, .21);
    if (time < .52) return pose('runner_lead', time, lead, headingToward(lead,bags[0]));
    if (time < slideAt) return pose('field_run', time-.52, mix(lead,slideStart,fraction(time,.52,slideAt)),yaw);
    const slidingTime = close.kind === 'steal_out' ? Math.min(time,play.finish) : time;
    const u = fraction(slidingTime,slideAt,play.leadArrival);
    if (close.kind === 'steal_safe' && time > play.finish+.10) return pose('slide_safe',time-play.finish-.10,stop,yaw);
    return pose('runner_slide', time-slideAt, mix(slideStart,stop,1-(1-u)**1.45),yaw);
  }
  const catcher = { x: sign * (close.kind === 'ball_four' || close.kind === 'ball_pitch' ? .68 : play.legs[0].pitch?.pitchType === 'slider' ? -.28 : close.kind.startsWith('called') ? .30 : 0), y: .04, z: 1.02 };
  if (actor === 'C' && (!close.steal || play.pickup !== 'C' || since < .3)) {
    if ((close.kind === 'called_pitch' || close.kind === 'called_third') && since >= .06 && since < .39)
      return pose('catch_frame', since-.06, catcher, Math.PI);
    if (close.kind.endsWith('_pitch') && since >= .39) return pose('catch_throw',Math.min(.62,since-.39),catcher,Math.PI);
    if (close.kind.endsWith('third') && since > .46) return pose('catch_point',since-.46,catcher,Math.PI);
    if (close.steal && play.pickup !== 'C' && since >= .22) {
      return pose('catch_throw', Math.min(.61, since-.22), catcher, Math.PI);
    }
    if (close.kind === 'foul_back' && since > .04) return pose('field_ready', time, catcher, Math.PI);
    return pose(since < -.15 ? 'catch_target' : 'catch_receive', Math.min(.22, since+.15), catcher, Math.PI);
  }
  if (close.steal && actor === play.pickup) {
    const bag = play.fieldAt;
    const towards = bags[close.fromBase];
    const side = headingToward(bag, towards) + Math.PI / 2;
    const cover = { x: bag.x + Math.sin(side)*.54, y: bag.y, z: bag.z + Math.cos(side)*.54 };
    const pos = mix(actor === 'C' ? catcher : start,cover,fraction(time,.48,actor === 'C' ? plate+.68 : play.receiveAt-.12));
    const yaw = headingToward(pos,bags[0]);
    if (close.kind === 'steal_out' && time>play.finish+.34) return pose('field_pop',.32,pos,yaw);
    if (time > play.finish-.26) {
      const sweep = fraction(time,play.finish-.26,play.finish);
      pos.x += Math.sin(side)*.42*(1-sweep);
      pos.z += Math.cos(side)*.42*(1-sweep);
      return pose('field_tag', Math.min(.47,time-play.finish+.26), pos, yaw);
    }
    return pose(time < play.receiveAt-.27 ? 'field_run' : 'field_receive', Math.min(.42,time-play.receiveAt+.27),pos,yaw);
  }
  return pose('field_ready');
}
export function closeCamera(play: DiamondPlay, close: CloseAction, t: number, bats: EffectiveBatSide, throws: ThrowsHand): CameraPose {
  const plate = play.legs[0].end;
  const sign = bats === 'R' ? 1 : -1;
  const atPlate = { position: { x: sign*3.75, y: 1.83, z: -3.95 }, lookAt: { x: -sign*.17, y: 1.06, z: .35 }, fov: 36 };
  if (close.kind.endsWith('_pitch') || close.kind.endsWith('_third')) {
    // Keep both endpoints visible while the viewer follows the small moving ball.
    return {position:{x:sign*4.8,y:2.8,z:-16.8}, lookAt:{x:0,y:.94,z:-7}, fov:36};
  }
  if (!close.steal && t < play.legs[0].start + .12) return getCameraPresetPose('over_shoulder_pitcher',t,0,throws,bats);
  if (close.kind === 'ball_four' && t > plate+.85) {
    const p = closeActorAt(play,close,'BAT',t,bats,bags[0]).pos;
    return { position:{x:p.x+2.6,y:2.9,z:p.z+5},lookAt:{x:p.x,y:.91,z:p.z},fov:39 };
  }
  if (close.steal && t < play.legs[0].start+.1) {
    const lead = closeActorAt(play,close,'RUN',t,bats,bags[close.fromBase]).pos;
    return { position:{x:lead.x+2.6,y:2.8,z:lead.z+4.2},lookAt:{x:lead.x-.3,y:.9,z:lead.z-.35},fov:42 };
  }
  if (!close.steal || t < plate+.65) return atPlate;
  const bag = play.fieldAt;
  const incoming = headingToward(bag,bags[close.fromBase]);
  const side = incoming - Math.PI/2;
  const width = 1 - fraction(t,plate+.62,play.receiveAt);
  const target = mix(bag,bags[close.fromBase],(close.kind === 'steal_out' ? .10 : .035) + .19*width);
  const pullback = fraction(t,play.finish-.24,play.finish+.12);
  return { lookAt:{...target,y:.66+width*.52}, position:{
    x:target.x+Math.sin(side)*(4.7+width*7+pullback*1.36),y:2.15+width*3+.32*pullback,z:target.z+Math.cos(side)*(4.7+width*7+pullback*1.36),
  }, fov:36+3*pullback };
}
