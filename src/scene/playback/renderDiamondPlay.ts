import { moonshotCall } from './outfieldPlay';
import { ROBBERY_CALL, WEB_GEM_CALL } from './fieldingHighlights';
import { PICKOFF_CALLS, isPickoffKind } from './plateAndSteals';
import type { playReadout } from './playReadout';
import { BASE_PATH_VERTICES } from './diamondLayout';
import { railReaction, welcomePose } from './teamReactions';
import { fitFieldOfView, type CameraPose } from '../camera/cameraRig';
import { pitchFlightScale } from '../vfx/ballFlightVisual';
import { getPitchTrailVisual } from './pitchFlight';
import { Vector3, type PerspectiveCamera } from 'three';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import type { PaintedPlayerRig } from '../characters/paintedPlayer';
import { BALL_TRAJECTORY_PRESETS } from '../vfx/ballTrajectory';
import { inSwingArcWindow, type BallparkVfxSystem } from '../vfx/vfxSystem';
import { actorAt, buntFollowBase, diamondCamera, forceAtFirst, sampleLeg, sparkleContact, type Actor, type DiamondPlay } from './diamondPlay';
import { collectPlayAudioCues, type PlayAudioFrame } from './playAudioTimeline';

export type DiamondCast = Record<Actor, PaintedPlayerRig>;
const up = new Vector3(0,1,0);
const actors: Actor[] = ['C', 'P', 'BAT', 'SS', '2B', '1B', '3B', 'LF', 'CF', 'RF', 'RUN'];

export function renderDiamondPlay(play: DiamondPlay, cast: DiamondCast, side: EffectiveBatSide,
  seconds: number, previous: number, camera: PerspectiveCamera, heightPx: number, vfx: BallparkVfxSystem, throws: ThrowsHand = 'R', fixedShot?: CameraPose, teammates:readonly PaintedPlayerRig[] = [], readout?: ReturnType<typeof playReadout>, audio?: PlayAudioFrame, idleFielders = false) {
  const t = Math.min(seconds, play.duration);
  if (audio) {
    for (const cue of collectPlayAudioCues(audio.schedule, audio.previousTime, t)) audio.onCue(cue);
  }
  const shot = fixedShot ?? diamondCamera(play, t, side, throws);
  camera.position.copy(shot.position);
  camera.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
  const fov = fitFieldOfView(shot.fov, camera.aspect);
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }

  // Bring the pocket across the leg on the same side of the bag in either handedness.
  function stateAt(actor: Actor, at: number) {
    const state = actorAt(play, actor, at, side);
    const plateTag = play.plateDecision === 'out' && actor === 'C';
    const pickoff = play.close?.pickoff;
    if (!plateTag && !((play.close?.steal || pickoff) && actor === play.pickup)) return state;
    const approach = pickoff ? play.legs[0].start : actor === 'C' ? play.pickupAt+.3 : .48;
    if (at < approach) return state;
    const receiver = cast[actor];
    const tag = actorAt(play, actor, play.finish, side);
    const runner = actorAt(play, 'RUN', play.finish, side);
    const shotAtTag = fixedShot ?? diamondCamera(play, play.finish, side, throws);
    receiver.logicalYaw = tag.yaw;
    const glove = receiver.contactAt(tag.clip, tag.local, tag.pos, shotAtTag.position);
    const span = pickoff ? play.finish - approach : Math.max(.5, play.receiveAt-approach);
    const u = Math.min(1, (at-approach) / span);
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
  const power = play.power;
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
    const powerFlight = power && (power.actor === 'pitcher' ? flying.kind === 'pitch' : flying === play.legs[1]);
    const trail = powerFlight ? power.vfxColor
      : flying.kind === 'pitch' && flying.pitch ? getPitchTrailVisual(flying.pitch.pitchType, vfx.reducedMotion)
      : homer ? '#FFD166' : '#FFF1C9';
    vfx.ball.draw(spec, progress, trail, scale,
      (_, u) => sampleLeg(flying, a, b, u, throws), play.close && flying.from === 'C' && flying.to === 'P' ? .23 : 1);
    vfx.ball.sizeForCamera(camera, heightPx);
    const statAt = flying.start + Math.min(.55, durationSec / 2);
    if (homer && previous < statAt && t >= statAt) {
      vfx.spawnComicCallout(moonshotCall(play.hrStatcast), vfx.ball.position, '#FFC300', 'flight');
    }
  }
  const pitch = play.legs[0];
  const sincePlate = t-pitch.end;
  let barrel = null;
  if (!vfx.reducedMotion && pitch.kind === 'pitch' && inSwingArcWindow(sincePlate)) {
    const batter = actorAt(play,'BAT',pitch.end,side);
    if (batter.clip === 'bat_swing' || batter.clip === 'bat_bomb') barrel = contact('BAT',pitch.end);
  }
  vfx.drawSwingArc(barrel,side,sincePlate);
  if (power) {
    const actor = power.actor === 'fielder' ? play.pickup : power.actor === 'pitcher' ? 'P' : 'BAT';
    const unleashAt = actor === 'P' ? pitch.start : actor === 'BAT' ? pitch.end : play.pickupAt;
    if (previous < unleashAt && seconds >= unleashAt) {
      vfx.celebration.unleash(contact(actor,unleashAt),power.vfxColor);
    }
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
  const sparkle = play.favoriteSparkle || play.webGem || play.outfield?.robbedHomeRun ? sparkleContact(play) : undefined;
  for (const leg of play.legs) {
    if (previous >= leg.end || seconds < leg.end) continue;
    const at = leg.endPoint ?? contact(leg.to, leg.end);
    if (play.close && leg.from === 'C' && leg.to === 'P') continue;
    if (leg === sparkle) vfx.celebration.starSparkle(at);
    if (leg === pitch && leg.to === 'BAT') {
      vfx.celebration.barrel(at);
      if (play.brokenBat) {
        vfx.triggerBrokenBat(at, side);
        vfx.spawnComicCallout('SNAP!', at, '#F4A261', 'contact');
      }
    }
    if (leg === play.legs[1] && play.kind === 'home_run') vfx.celebration.homer(Boolean(play.mascotCannon));
    if (leg === play.legs[1] && (play.webGem || play.outfield?.robbedHomeRun)) {
      const robbery = play.outfield?.robbedHomeRun;
      const call = robbery ? ROBBERY_CALL : WEB_GEM_CALL;
      vfx.impact(at, robbery ? '#FFD166' : call.color);
      if (play.webGem) vfx.kickChalk(at);
      vfx.spawnComicCallout(call.text, at, call.color, 'contact');
      continue;
    }
    vfx.impact(at, (leg.to === 'BAT' || (force && leg.end === play.finish)) ? '#FFE499' : '#A9EDDC');
    if (play.close || play.kind==='bullpen') continue;
    if (play.outfield) {
      if (leg === play.legs[1]) {
        if (play.splashHit) {
          vfx.celebration.splashDown(at);
          vfx.spawnComicCallout('SPLASH HIT!', at, '#00B4D8', true);
          continue;
        }
        const firstCall = play.kind === 'sac_fly' ? 'CAUGHT!' : play.outfield.wall ? 'OFF THE WALL!'
          : play.kind === 'double' ? 'IN THE GAP!' : play.outfield.call;
        vfx.spawnComicCallout(firstCall, at, play.outfield.callColor, true);
      }
      continue;
    }
    if (leg.end === play.finish || (play.kind === 'double_play' && leg.to === '2B')) {
      const call = play.kind === 'bunt_single' ? 'SAFE!' : play.kind === 'fielding_error' ? 'ERROR!' : leg.end !== play.finish ? 'ONE!' : play.kind === 'double_play' ? 'TURN TWO!' : play.kind === 'pop_up' && play.buntAttempt ? 'POP-UP OUT!' : 'OUT!';
      if (leg.end !== play.finish || (!play.holdForceCall && !play.buntAdvances)) vfx.spawnComicCallout(call, at, '#167457', true);
    }
  }

  if (play.plateDecision && previous < play.finish && seconds >= play.finish) {
    const call = {safe:'SAFE AT HOME!',out:'OUT AT HOME!',held:'HELD AT THIRD'}[play.plateDecision];
    vfx.spawnComicCallout(call, actorAt(play,'RUN',play.finish,side).pos,play.plateDecision === 'out' ? '#C1394C' : '#167457',true);
  }
  if (play.outfield && (play.kind === 'double' || play.kind === 'triple' || play.kind === 'sac_fly')) {
    const tag = play.kind === 'sac_fly';
    const arrival = tag ? play.leadArrival : play.batterArrival;
    if (previous < arrival && seconds >= arrival) {
      const base = actorAt(play, tag ? 'RUN' : 'BAT', arrival, side).pos;
      const call = tag && (play.webGem || play.outfield.robbedHomeRun) ? 'SAC FLY!' : play.outfield.call;
      vfx.spawnComicCallout(call, base, play.outfield.callColor, true);
    }
  }
  if (readout?.base && previous < play.batterArrival && seconds >= play.batterArrival) {
    vfx.impact(BASE_PATH_VERTICES[readout.base], '#FFCE54');
  }
  const dropAt = play.legs[0].end+(play.kind==='ball_four'?.48:.20);
  vfx.droppedBat.visible=false;
  if (!play.brokenBat && (!play.close && play.kind!=='bullpen' || play.kind==='ball_four') && t>=dropAt) {
      const state=stateAt('BAT',dropAt-.001);
      const eye = (fixedShot ?? diamondCamera(play,dropAt-.001,side,throws)).position;
      const grip=cast.BAT.batGripAt(state.clip,state.local,state.pos,eye);
      const u = Math.min(1,(t-dropAt)/.38);
      const dir = side === 'R' ? -1 : 1;
      const bat = vfx.droppedBat;
      bat.visible = true;
      bat.position.set(grip.x+dir*.35*u, .11+(grip.y-.11)*(1-u*u), grip.z+.35*u);
      const flip = play.kind === 'home_run' && !vfx.reducedMotion;
      if (flip) bat.position.y += .76 * Math.sin(Math.PI*u);
      if (state.clip === 'bat_bunt_tap') {
        const axis = cast.BAT.contactAt(state.clip,state.local,state.pos,eye).sub(grip).normalize();
        axis.y *= 1-u;
        bat.quaternion.setFromUnitVectors(up,axis.normalize());
        bat.rotateOnWorldAxis(up,dir*.36*u);
      } else bat.rotation.set(.13*u,dir*.52,dir*(.47+u*1.12+(flip ? Math.PI*2*u : 0)));
    }
  if (play.close) {
    const {kind,decisionAt}=play.close;
    if (play.close.pickoff && previous < play.leadArrival && seconds >= play.leadArrival) vfx.kickChalk(play.fieldAt);
    if (previous < decisionAt && seconds >= decisionAt) {
      const call = isPickoffKind(kind) ? PICKOFF_CALLS[kind] : {
        text: readout?.label.toUpperCase() ?? { foul_back:'FOUL!', called_third:'STRIKE THREE!', swinging_third:'SWING AND MISS!',
          called_pitch:'STRIKE!', missed_pitch:'SWING AND MISS!', ball_pitch:'BALL!', ball_four:'BALL FOUR!', steal_safe:'SAFE!', steal_out:'OUT!' }[kind],
        color: kind === 'steal_out' ? '#C1394C' : '#167457',
      };
      const receiver = play.close.steal || play.close.pickoff ? play.pickup : pitch.to;
      vfx.spawnComicCallout(call.text, contact(receiver, decisionAt), call.color, 'contact');
    }
  }
  const ump = vfx.umpire;
  const atHome = Boolean(play.plateDecision && play.plateDecision !== 'held' && t > play.finish-.5);
  const stealing = play.close?.steal && t > play.pickupAt + .62;
  const atFirst = force && t > play.finish - .30 && (fixedShot || !buntFollowBase(play, t));
  ump.sprite.visible = Boolean((atHome || stealing || (play.close?.pickoff && t >= pitch.start) || atFirst) && (!play.ending || t < play.ending.start));
  if (ump.sprite.visible) {
    const bag=atHome ? BASE_PATH_VERTICES[0] : force ? BASE_PATH_VERTICES[1] : play.fieldAt;
    const dx=shot.position.x-bag.x,dz=shot.position.z-bag.z;
    const distance=Math.max(.01,Math.hypot(dx,dz));
    const sidestep = force ? 2.25 : -.76;
    ump.sprite.position.set(bag.x+(-1.5*dx+sidestep*dz)/distance,.045,bag.z+(-1.5*dz-sidestep*dx)/distance);
    ump.signal(play.kind==='steal_safe' || play.kind==='pickoff_safe' || play.plateDecision==='safe',t-play.finish);
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
    if (idleFielders && actor !== 'P' && actor !== 'C' && actor !== 'BAT' && actor !== 'RUN') continue;
    const rig = cast[actor];
    const movingLead = play.scorerBase || play.runnerToThird || play.kind === 'double_play' || play.kind === 'sac_fly' || play.close?.steal || play.close?.pickoff || play.kind === 'ball_four';
    if (actor === 'RUN' && (!movingLead || !rig.root.visible)) continue;
    const state = stateAt(actor, t);
    rig.logicalYaw = state.yaw;
    rig.root.position.copy(state.pos);
    const grin = play.kind === 'double_play' && actor === '1B' && t > play.finish + .20;
    // On a foul into the stands the catcher sends a fresh ball back to the mound.
    const freshBall = actor === 'C' && play.kind === 'foul_back' && state.clip === 'catch_throw';
    const ready = state.clip === 'bat_stance' || state.clip === 'pitch_set' || state.clip === 'pitch_stretch_set' || state.clip === 'catch_target';
    const local = state.local + (ready && !vfx.reducedMotion ? seconds-t : 0);
    const loadingPickoff = play.close?.pickoff && actor === 'P' && t < pitch.start;
    const holdsBall = !flying && (loadingPickoff || freshBall || (!received?.endPoint && received?.to === actor)
      || (!received && play.kind === 'bullpen' && actor === 'C'));
    rig.updatePose(state.clip, local, grin ? 'happy' : undefined, camera.position, holdsBall,
      actor === 'RUN' && play.close?.pickoff && state.clip === 'runner_slide');
  }
}
