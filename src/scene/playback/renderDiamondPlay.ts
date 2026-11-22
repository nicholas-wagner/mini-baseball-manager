import { pitchFlightScale } from '../vfx/ballFlightVisual';
import type { PerspectiveCamera } from 'three';
import type { EffectiveBatSide } from '../../engine/handedness/types';
import type { PaintedPlayerRig } from '../characters/paintedPlayer';
import { BALL_TRAJECTORY_PRESETS } from '../vfx/ballTrajectory';
import type { BallparkVfxSystem } from '../vfx/vfxSystem';
import { actorAt, diamondCamera, sampleLeg, type Actor, type DiamondPlay } from './diamondPlay';

export type DiamondCast = Record<Actor, PaintedPlayerRig>;
const actors: Actor[] = ['P', 'BAT', 'SS', '2B', '1B', '3B', 'RUN'];

export function renderDiamondPlay(play: DiamondPlay, cast: DiamondCast, side: EffectiveBatSide,
  seconds: number, previous: number, camera: PerspectiveCamera, heightPx: number, vfx: BallparkVfxSystem) {
  const t = Math.min(seconds, play.duration);
  const shot = diamondCamera(play, t, side);
  camera.position.copy(shot.position);
  camera.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
  if (camera.fov !== shot.fov) { camera.fov = shot.fov; camera.updateProjectionMatrix(); }

  function contact(actor: Actor, at: number) {
    const rig = cast[actor];
    const state = actorAt(play, actor, at, side);
    rig.logicalYaw = state.yaw;
    return rig.contactAt(state.clip, state.local, state.pos, camera.position);
  }
  const flying = play.legs.find(leg => t >= leg.start && t < leg.end);
  vfx.ball.group.visible = false;
  if (flying) {
    const a = contact(flying.from, flying.start);
    const b = contact(flying.to, flying.end);
    const durationSec = flying.end - flying.start;
    const spec = { ...BALL_TRAJECTORY_PRESETS.line_drive, start: a, end: b, durationSec,
      secondaryColor: flying.kind === 'ground' ? '#CE8852' : '#7DB5CD' };
    const progress = (t - flying.start) / durationSec;
    const scale = flying.kind === 'pitch' ? pitchFlightScale(progress, .55) : .55;
    vfx.ball.draw(spec, progress, '#FFF1C9', scale,
      (_, u) => sampleLeg(flying, a, b, u));
    vfx.ball.sizeForCamera(camera, heightPx);
  }
  if (play.unassisted && previous < play.finish && seconds >= play.finish) {
    const base = actorAt(play, '1B', play.finish, side).pos;
    vfx.impact(base, '#A9EDDC');
    vfx.spawnComicCallout('OUT!', base, '#167457', true);
  }
  for (const leg of play.legs) {
    if (previous >= leg.end || seconds < leg.end) continue;
    const at = contact(leg.to, leg.end);
    vfx.impact(at, leg.to === 'BAT' ? '#FFE499' : '#A9EDDC');
    if (leg.end === play.finish || (play.kind === 'double_play' && leg.to === '2B')) {
      const call = leg.end !== play.finish ? 'ONE!' : play.kind === 'double_play' ? 'TURN TWO!' : 'OUT!';
      vfx.spawnComicCallout(call, at, '#167457', true);
    }
  }

  const received = play.legs.filter(l => t >= l.end).at(-1);
  for (const actor of actors) {
    const rig = cast[actor];
    if (actor === 'RUN' && (play.kind !== 'double_play' || !rig.root.visible)) continue;
    const state = actorAt(play, actor, t, side);
    rig.logicalYaw = state.yaw;
    rig.root.position.copy(state.pos);
    rig.updatePose(state.clip, state.local, undefined, camera.position, !flying && received?.to === actor);
  }
}
