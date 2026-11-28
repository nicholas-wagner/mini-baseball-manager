import type { PortraitMood } from '../../art/portraits/types';
import type { EffectiveBatSide } from '../../engine/handedness/types';
import type { CameraPose, Vec3 } from '../camera/cameraRig';
import type { CharacterAnimClip } from '../characters/animationState';
import type { Actor, DiamondPlay, Leg } from './diamondPlay';
import { actorAt, isBaseHit } from './diamondPlay';
import { BASE_PATH_VERTICES as bags, CATCHER_HOME, PITCHING_RUBBER, headingToward, batterBox } from './diamondLayout';

export type LiveActorMood = 'happy' | 'focused';

export interface LiveActorMoodParams {
  actor: Actor;
  play: DiamondPlay;
  time: number;
  isHighLeverage?: boolean;
}

export const STADIUM_WAVE_DURATION_SEC = 2.4;
const WAVE_START_X = -34;
const WAVE_END_X = 34;
const WAVE_SIGMA = 7.5;
const WAVE_MAX_LIFT = 0.95;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const u = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return u * u * (3 - 2 * u);
}

/**
 * Pure vertical jump offset (0..0.95) for a bleacher fan at world `fanX` as an
 * interactive 3D stadium wave sweeps left-to-right across the park (~2.4s).
 */
export function computeStadiumWaveLift(
  fanX: number,
  waveAgeSec: number,
  reducedMotion: boolean,
): number {
  if (
    reducedMotion ||
    !Number.isFinite(fanX) ||
    !Number.isFinite(waveAgeSec) ||
    waveAgeSec < 0 ||
    waveAgeSec > STADIUM_WAVE_DURATION_SEC
  ) {
    return 0;
  }
  const progress = waveAgeSec / STADIUM_WAVE_DURATION_SEC;
  const waveFrontX = WAVE_START_X + (WAVE_END_X - WAVE_START_X) * progress;
  const dist = (fanX - waveFrontX) / WAVE_SIGMA;
  const envelope =
    smoothstep01(0, 0.14, waveAgeSec) *
    (1 - smoothstep01(STADIUM_WAVE_DURATION_SEC - 0.14, STADIUM_WAVE_DURATION_SEC, waveAgeSec));
  return WAVE_MAX_LIFT * envelope * Math.exp(-(dist * dist));
}

/** Maps a live chibi play mood onto the rig's supported PortraitMood values. */
export function toPortraitMood(mood?: LiveActorMood): PortraitMood | undefined {
  if (mood === 'happy') return 'happy';
  if (mood === 'focused') return 'determined';
  return undefined;
}

/**
 * Pure live expression selector: determined focus before contact in high leverage,
 * and joyful celebration on hits, HRs, safe steals, walkoffs, web gems, robberies, Ks, and pickoffs.
 */
export function selectLiveActorMood({
  actor,
  play,
  time,
  isHighLeverage,
}: LiveActorMoodParams): LiveActorMood | undefined {
  const pitchLeg = play.legs[0]?.kind === 'pitch' ? play.legs[0] : undefined;
  const contactAt = pitchLeg?.end ?? 0;
  const highLeverage = isHighLeverage ?? Boolean(play.highLeverage);

  if (highLeverage && pitchLeg && time < contactAt && (actor === 'P' || actor === 'BAT')) {
    return 'focused';
  }

  if (
    play.ending?.kind === 'walkoff' &&
    time >= play.ending.start &&
    (actor === play.ending.scorer || actor === 'BAT' || actor === 'RUN')
  ) {
    return 'happy';
  }

  if (isBaseHit(play) && time >= contactAt) {
    if (actor === 'BAT') return 'happy';
    if (
      actor === 'RUN' &&
      play.plateDecision !== 'out' &&
      (play.scorerBase || play.runnerToThird || play.kind === 'home_run')
    ) {
      return 'happy';
    }
  }

  if ((play.kind === 'steal_safe' || play.kind === 'pickoff_safe') && actor === 'RUN' && time >= play.leadArrival) {
    return 'happy';
  }

  if ((play.outfield?.robbedHomeRun || play.webGem) && time >= play.pickupAt && (actor === play.pickup || actor === 'P')) {
    return 'happy';
  }

  if ((play.kind === 'called_third' || play.kind === 'swinging_third') && time >= play.finish && (actor === 'P' || actor === 'C')) {
    return 'happy';
  }

  if (play.kind === 'pickoff_out' && time >= play.finish && (actor === 'P' || actor === play.pickup)) {
    return 'happy';
  }

  if (play.kind === 'steal_out' && time >= play.finish && (actor === 'C' || actor === play.pickup)) {
    return 'happy';
  }

  if (play.kind === 'double_play' && actor === '1B' && time > play.finish + 0.2) {
    return 'happy';
  }

  return undefined;
}

type Pose = { pos: Vec3; yaw: number; clip: CharacterAnimClip; local: number };
const mound = PITCHING_RUBBER;
const catcherAtMound = { x: -2.05, y: .17, z: -9.8 };
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
    duration: 4.4,
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
      play.leadArrival = relay.end + (play.plateDecision === 'out' ? .24 : -.22);
      if (play.plateDecision) play.finish = Math.max(relay.end, play.leadArrival) + .22;
      play.duration = Math.max(play.duration, relay.end + 0.68);
    }
  }
  if (walkoff) {
    const stealHome = play.kind === 'steal_safe' && play.close?.fromBase === 3;
    const runnerWins = Boolean(scorerBase || stealHome);
    const touch = runnerWins ? play.leadArrival : play.batterArrival;
    play.ending = { kind: 'walkoff', start: play.plateDecision ? play.finish + .25 : touch, scorer: runnerWins ? 'RUN' : 'BAT' };
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
    if (actor === 'BAT') {
      const box = batterBox(bats);
      return { pos: box.position, yaw: box.yaw, clip: 'bat_stance', local: t };
    }
    if (actor !== 'C' && actor !== 'P') return { ...base, clip: 'field_ready', local: t };
    const pitching = actor === 'P';
    const from = pitching ? { x: 7.7, y: .04, z: -15 } : CATCHER_HOME;
    const dest = pitching ? mound : catcherAtMound;
    const arrival = 1.75;
    if (t < arrival) {
      return { pos: move(from, dest, t / arrival), yaw: headingToward(from, dest), clip: 'field_run', local: t };
    }
    const leave = play.receiveAt + .20;
    if (t < leave) {
      return { pos: dest, yaw: headingToward(dest, pitching ? catcherAtMound : mound),
        clip: pitching ? 'field_receive' : 'catch_handoff', local: t - arrival };
    }
    if (pitching) return { pos: mound, yaw: 0, clip: 'pitch_set', local: t - leave };
    const returning = t < play.duration;
    return { pos: move(dest, CATCHER_HOME, (t - leave) / (play.duration - leave)),
      yaw: returning ? headingToward(dest, CATCHER_HOME) : Math.PI,
      clip: returning ? 'field_run' : 'field_ready', local: t - leave };
  }
  const end = play.ending;
  if (
    play.kind === 'home_run' &&
    play.hrCelebration === 'curtain_call' &&
    actor === 'BAT' &&
    t >= play.batterArrival &&
    !(end?.kind === 'walkoff' && end.scorer === 'BAT')
  ) {
    return {
      ...base,
      pos: bags[0],
      yaw: 0.42,
      clip: 'helmet_tip',
      local: t - play.batterArrival + 0.3,
    };
  }
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
    const together = move(catcherAtMound, mound, .5);
    const lookAt = { ...move(runner, together, fraction(t / play.legs[0].start)), y: 1.05 };
    return { lookAt, position: { x: lookAt.x + .85, y: 2.85, z: lookAt.z + 6.5 }, fov: 39 };
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
export function railReaction(play: DiamondPlay, t: number, index = 0): Pose | undefined {
  if (play.kind === 'home_run' && play.hrCelebration === 'dugout_dance_line') {
    if (t < play.pickupAt) return;
    const elapsed = t - play.pickupAt;
    const cadence = elapsed * 8.4 + index * 0.55;
    const hopOffset = 0.28 * Math.abs(Math.sin(cadence));
    const railOffset = index === 0 ? 0 : index % 2 === 1 ? -0.95 * Math.ceil(index / 2) : 0.95 * (index / 2);
    return {
      pos: {
        x: DUGOUT_RAIL.x - 0.39 + railOffset * Math.SQRT1_2,
        y: 0.04 + hopOffset,
        z: DUGOUT_RAIL.z + 0.26 + railOffset * Math.SQRT1_2,
      },
      yaw: 1.9,
      clip: 'celebrate_hr',
      local: elapsed * 1.5 + index * 0.16,
    };
  }
  if (index !== 0 || !play.outfield || (!play.scorerBase && !play.runnerToThird) || t < play.pickupAt) return;
  return { pos: { x: DUGOUT_RAIL.x - .39, y: .04, z: DUGOUT_RAIL.z + .26 },
    yaw: 1.9, clip: 'rail_lean', local: t - play.pickupAt };
}
