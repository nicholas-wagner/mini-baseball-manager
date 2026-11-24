import type { playReadout } from './playReadout';
import { BASE_PATH_VERTICES } from './diamondLayout';
import { railReaction, welcomePose } from './teamReactions';
import type { CameraPose } from '../camera/cameraRig';
import { pitchFlightScale } from '../vfx/ballFlightVisual';
import type { PerspectiveCamera } from 'three';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import type { PaintedPlayerRig } from '../characters/paintedPlayer';
import { BALL_TRAJECTORY_PRESETS } from '../vfx/ballTrajectory';
import type { BallparkVfxSystem } from '../vfx/vfxSystem';
import { actorAt, diamondCamera, forceAtFirst, sampleLeg, type Actor, type DiamondPlay } from './diamondPlay';

export type DiamondCast = Record<Actor, PaintedPlayerRig>;
const actors: Actor[] = ['C', 'P', 'BAT', 'SS', '2B', '1B', '3B', 'LF', 'CF', 'RF', 'RUN'];

export function renderDiamondPlay(play: DiamondPlay, cast: DiamondCast, side: EffectiveBatSide,
  seconds: number, previous: number, camera: PerspectiveCamera, heightPx: number, vfx: BallparkVfxSystem, throws: ThrowsHand = 'R', fixedShot?: CameraPose, teammates:readonly PaintedPlayerRig[] = [], readout?: ReturnType<typeof playReadout>) {
  const t = Math.min(seconds, play.duration);
  const shot = fixedShot ?? diamondCamera(play, t, side, throws);
  camera.position.copy(shot.position);
  camera.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
  if (camera.fov !== shot.fov) { camera.fov = shot.fov; camera.updateProjectionMatrix(); }

  // Bring the pocket across the leg on the same side of the bag in either handedness.
  function stateAt(actor: Actor, at: number) {
    const state = actorAt(play, actor, at, side);
    if (!play.close?.steal || actor !== play.pickup) return state;
    const approach = actor === 'C' ? play.pickupAt+.3 : .48;
    if (at < approach) return state;
    const receiver = cast[actor];
    const tag = actorAt(play, actor, play.finish, side);
    const runner = actorAt(play, 'RUN', play.finish, side);
    const shotAtTag = fixedShot ?? diamondCamera(play, play.finish, side, throws);
    receiver.logicalYaw = tag.yaw;
    const glove = receiver.contactAt(tag.clip, tag.local, tag.pos, shotAtTag.position);
    const u = Math.min(1, (at-approach) / Math.max(.5, play.receiveAt-approach));
    const reach = .30;
    state.pos = { ...state.pos, x: state.pos.x + u*(runner.pos.x+Math.sin(runner.yaw)*reach-glove.x),
      z: state.pos.z + u*(runner.pos.z+Math.cos(runner.yaw)*reach-glove.z) };
    return state;
  }
  function contact(actor: Actor, at: number) {
    const rig = cast[actor];
    const state = stateAt(actor, at);
    rig.logicalYaw = state.yaw;
    return rig.contactAt(state.clip, state.local, state.pos, camera.position);
  }
  const flying = play.legs.find(leg => t >= leg.start && t < leg.end);
  vfx.ball.group.visible = false;
  if (flying) {
    const a = flying.startPoint ?? contact(flying.from, flying.start);
    const b = flying.endPoint ?? contact(flying.to, flying.end);
    const durationSec = flying.end - flying.start;
    const homer = play.kind === 'home_run' && flying.kind === 'flight';
    const style = homer ? 'moonshot_hr' : flying.kind === 'pitch' ? 'fastball' : 'line_drive';
    const spec = { ...BALL_TRAJECTORY_PRESETS[style], start: a, end: b, durationSec,
      secondaryColor: homer ? '#FF9056' : flying.kind === 'ground' || flying.kind === 'bounce' ? '#CE8852' : '#7DB5CD' };
    const progress = (t - flying.start) / durationSec;
    const scale = flying.kind === 'pitch' ? pitchFlightScale(progress, .55) : flying.kind==='handoff' ? pitchFlightScale(0,.55) : .55;
    vfx.ball.draw(spec, progress, homer ? '#FFD166' : '#FFF1C9', scale,
      (_, u) => sampleLeg(flying, a, b, u, throws), play.close && flying.from === 'C' && flying.to === 'P' ? .23 : 1);
    vfx.ball.sizeForCamera(camera, heightPx);
  }
  const force = forceAtFirst(play);
  if (force && previous < play.batterArrival && seconds >= play.batterArrival) {
    vfx.kickChalk(actorAt(play, 'BAT', play.batterArrival, side).pos);
  }
  if (play.unassisted && previous < play.finish && seconds >= play.finish) {
    const base = actorAt(play, '1B', play.finish, side).pos;
    vfx.impact(base, '#A9EDDC');
    if (!play.holdForceCall) vfx.spawnComicCallout('OUT!', base, '#167457', true);
  }
  for (const leg of play.legs) {
    if (previous >= leg.end || seconds < leg.end) continue;
    const at = leg.endPoint ?? contact(leg.to, leg.end);
    if (play.close && leg.from === 'C' && leg.to === 'P') continue;
    vfx.impact(at, (leg.to === 'BAT' || (force && leg.end === play.finish)) ? '#FFE499' : '#A9EDDC');
    if (play.close || play.kind==='bullpen') continue;
    if (play.outfield) {
      if (leg === play.legs[1]) {
        const firstCall = play.kind === 'sac_fly' ? 'CAUGHT!' : play.outfield.wall ? 'OFF THE WALL!'
          : play.kind === 'double' ? 'IN THE GAP!' : play.outfield.call;
        vfx.spawnComicCallout(firstCall, at, play.outfield.callColor, true);
      }
      continue;
    }
    if (leg.end === play.finish || (play.kind === 'double_play' && leg.to === '2B')) {
      const call = play.kind === 'bunt_single' ? 'SAFE!' : play.kind === 'fielding_error' ? 'ERROR!' : leg.end !== play.finish ? 'ONE!' : play.kind === 'double_play' ? 'TURN TWO!' : 'OUT!';
      if (!play.holdForceCall || leg.end !== play.finish) vfx.spawnComicCallout(call, at, '#167457', true);
    }
  }

  if (play.outfield && (play.kind === 'double' || play.kind === 'triple' || play.kind === 'sac_fly')) {
    const tag = play.kind === 'sac_fly';
    const arrival = tag ? play.leadArrival : play.batterArrival;
    if (previous < arrival && seconds >= arrival) {
      const base = actorAt(play, tag ? 'RUN' : 'BAT', arrival, side).pos;
      vfx.spawnComicCallout(play.outfield.call, base, play.outfield.callColor, true);
    }
  }
  if (readout?.base && previous < play.batterArrival && seconds >= play.batterArrival) {
    vfx.impact(BASE_PATH_VERTICES[readout.base], '#FFCE54');
  }
  const dropAt = play.legs[0].end+(play.kind==='ball_four'?.48:.20);
  vfx.droppedBat.visible=false;
  if ((!play.close && play.kind!=='bullpen' || play.kind==='ball_four') && t>=dropAt) {
      const state=stateAt('BAT',dropAt-.001);
      const grip=cast.BAT.batGripAt(state.clip,state.local,state.pos,camera.position);
      const u = Math.min(1,(t-dropAt)/.38);
      const dir = side === 'R' ? -1 : 1;
      const bat = vfx.droppedBat;
      bat.visible = true;
      bat.position.set(grip.x+dir*.35*u, .11+(grip.y-.11)*(1-u*u), grip.z+.35*u);
      bat.rotation.set(.13*u,dir*.52,dir*(.47+u*1.12));
    }
  if (play.close) {
    const {kind,decisionAt}=play.close;
    if (previous < decisionAt && seconds >= decisionAt) {
      const call = { foul_back:'FOUL!', called_third:'STRIKE THREE!', swinging_third:'SWING AND MISS!',
        called_pitch:'STRIKE!', missed_pitch:'SWING AND MISS!', ball_pitch:'BALL!', ball_four:'BALL FOUR!', steal_safe:'SAFE!', steal_out:'OUT!' }[kind];
      const at = play.close.steal ? contact(play.pickup,decisionAt) : contact(play.legs[0].to,decisionAt);
      vfx.spawnComicCallout(readout?.label.toUpperCase() ?? call, {...at,y:at.y+.55},
        kind === 'steal_out' ? '#C1394C' : '#167457', 'contact');
    }
  }
  const ump = vfx.umpire;
  ump.sprite.visible=Boolean(((play.close?.steal && t>play.pickupAt+.62) || (force && t>play.finish-.30)) && (!play.ending || t<play.ending.start));
  if (ump.sprite.visible) {
    const bag=force ? BASE_PATH_VERTICES[1] : play.fieldAt;
    const dx=shot.position.x-bag.x,dz=shot.position.z-bag.z;
    const distance=Math.max(.01,Math.hypot(dx,dz));
    const sidestep = force ? 2.25 : -.76;
    ump.sprite.position.set(bag.x+(-1.5*dx+sidestep*dz)/distance,.045,bag.z+(-1.5*dz-sidestep*dx)/distance);
    ump.signal(play.kind==='steal_safe',t-play.finish);
  }
  teammates.forEach((member,index)=>{
    const ending=play.ending;
    const pose = ending?.kind === 'walkoff' && t >= ending.start
      ? welcomePose(index,t-ending.start) : index === 0 ? railReaction(play,t) : undefined;
    member.root.visible = Boolean(pose);
    if (!pose) return;
    member.root.position.copy(pose.pos);
    member.logicalYaw=pose.yaw;
    member.updatePose(pose.clip,pose.local,undefined,camera.position);
  });
  const received = play.legs.filter(l => t >= l.end).at(-1);
  for (const actor of actors) {
    const rig = cast[actor];
    const movingLead = play.scorerBase || play.runnerToThird || play.kind === 'double_play' || play.kind === 'sac_fly' || play.close?.steal || play.kind === 'ball_four';
    if (actor === 'RUN' && (!movingLead || !rig.root.visible)) continue;
    const state = stateAt(actor, t);
    rig.logicalYaw = state.yaw;
    rig.root.position.copy(state.pos);
    const grin = play.kind === 'double_play' && actor === '1B' && t > play.finish + .20;
    rig.updatePose(state.clip, state.local, grin ? 'happy' : undefined, camera.position, !flying && !received?.endPoint && (received?.to === actor || (!received && play.kind==='bullpen' && actor==='C')));
  }
}
