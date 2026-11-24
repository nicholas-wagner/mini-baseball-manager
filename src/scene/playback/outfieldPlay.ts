import type { PlayEvent } from '../../engine/models/playEvent';
import type { Vec3 } from '../camera/cameraRig';
import { CLIP_DURATIONS, GLOVE_CONTACT_PHASE, type CharacterAnimClip } from '../characters/animationState';
import { BASE_PATH_VERTICES, INFIELD_DIRT, OUTFIELD_WALL, headingToward } from './diamondLayout';
import type { Actor, DiamondPlay, Leg } from './diamondPlay';

export type OutfieldKind = 'single' | 'double' | 'triple' | 'home_run' | 'fly_out' | 'line_out' | 'sac_fly';
type Outfielder = 'LF' | 'CF' | 'RF';
const presets = {
  single: { x: -9, z: -21, apex: 3.4, flight: .9, bags: 1, call: 'BASE HIT!' },
  double: { x: 12, z: -29, apex: 5.2, flight: 1.1, bags: 2, call: 'DOUBLE!' },
  triple: { x: -17, z: -36, apex: 6.5, flight: 1.25, bags: 3, call: 'TRIPLE!' },
  home_run: { x: 8, z: -49, apex: 18, flight: 1.85, bags: 4, call: 'HOME RUN!' },
  fly_out: { x: -12, z: -30, apex: 10, flight: 1.25, bags: 0, call: 'OUT!' },
  line_out: { x: 12, z: -26, apex: 2.3, flight: .85, bags: 0, call: 'SNAGGED!' },
  sac_fly: { x: 2, z: -34, apex: 11.5, flight: 1.4, bags: 0, call: 'SAC FLY!' },
} as const;

export function isOutfieldKind(kind: string): kind is OutfieldKind {
  return Object.hasOwn(presets, kind);
}

function isOutfielder(pos?: string): pos is Outfielder {
  return pos === 'LF' || pos === 'CF' || pos === 'RF';
}

export function selectOutfieldKind(event: PlayEvent) {
  const kind = event.outcome;
  if (event.type !== 'ball_in_play' || !kind || !isOutfieldKind(kind)) return;
  if (kind === 'fly_out' || kind === 'line_out') {
    const defender = event.fieldingHighlight?.fielderPos;
    if (defender && !isOutfielder(defender)) return;
    if (!defender && (event.battedBallType === 'pop_up' || (event.ballFlight && event.ballFlight.landingZ > -20))) return;
  }
  return kind;
}

export function buildOutfieldPlay(kind: OutfieldKind, pitch: Leg, event?: PlayEvent): DiamondPlay {
  const preset = presets[kind];
  const flight = event?.ballFlight;
  const x = flight?.landingX ?? preset.x, z = flight?.landingZ ?? preset.z;
  const highlighted = event?.fieldingHighlight?.fielderPos;
  const pickup = isOutfielder(highlighted) ? highlighted : x < -6 ? 'LF' : x > 6 ? 'RF' : 'CF';
  const caught = preset.bags === 0;
  const homer = kind === 'home_run';
  const wall = !homer && !caught && (event?.soundCue === 'wall_thud' || kind === 'triple');
  const reach = event?.fieldingHighlight?.anim;
  const catchClip = kind === 'line_out' || reach === 'field_dive' ? 'field_dive'
    : reach === 'field_high_jump' ? 'field_high_jump' : 'field_pop';
  const landing = { x, y: .12, z };
  if (kind === 'single') {
    // Shallow singles in the simulation can fall inside the miniature clay cutout.
    // Preserve the lateral placement and give the pickup a strip of grass.
    const edge = INFIELD_DIRT.radius + 1;
    const grassZ = INFIELD_DIRT.centerZ - Math.sqrt(Math.max(0, edge * edge - x * x));
    landing.z = Math.min(z, grassZ);
  }
  const wallCatch = caught && event?.specialPowerTriggered?.powerId === 'sky_high_leap';
  if (wall || homer || wallCatch) {
    const angle = Math.atan2(x, OUTFIELD_WALL.centerZ - z);
    const radius = Math.hypot(x, z - OUTFIELD_WALL.centerZ);
    const distance = homer ? Math.max(OUTFIELD_WALL.radius + 5, radius) : OUTFIELD_WALL.radius - (wallCatch ? .85 : .35);
    landing.x = Math.sin(angle) * distance;
    landing.z = OUTFIELD_WALL.centerZ - Math.cos(angle) * distance;
    landing.y = homer ? 1.7 : 1.15;
  }
  const landAt = pitch.end + (flight?.durationSec ?? preset.flight) * 1.48;
  const pickupAt = caught || homer ? landAt : landAt + (wall ? 1.25 : kind === 'single' ? .80 : 1.10);
  const carry = kind === 'single' ? 2.6 : 4.4;
  const fieldAt = {
    x: landing.x + (caught || homer ? 0 : wall ? -Math.sign(x) * 1.6 : Math.sign(x) * .9),
    z: landing.z + (caught || homer ? 0 : wall ? 3.6 : -carry), y: .04
  };
  if (homer) Object.assign(fieldAt, { x: landing.x * .78, z: OUTFIELD_WALL.centerZ + (landing.z - OUTFIELD_WALL.centerZ) * .78 });
  const grounder = event?.battedBallType === 'ground_ball' && !wall && !caught && !homer;
  const legs: Leg[] = [pitch, {
    kind: grounder ? 'ground' : 'flight', from: 'BAT', to: pickup, start: pitch.end, end: landAt,
    apex: flight?.apexY ?? preset.apex, endPoint: caught ? undefined : landing
  }];
  if (!caught && !homer) {
    legs.push({ kind: 'bounce', from: pickup, to: pickup, start: landAt, end: pickupAt, startPoint: landing });
  }
  const tagOutDp = caught && event?.outsAfter !== undefined && event?.outsBefore !== undefined && event.outsAfter - event.outsBefore >= 2;
  const relay = !homer && (!caught || kind === 'sac_fly' || tagOutDp);
  const receiveAt = relay ? pickupAt + 1.32 : pickupAt;
  if (relay) legs.push({
    kind: 'throw', from: pickup, to: tagOutDp ? 'C' : pickup === 'RF' ? '2B' : 'SS',
    start: pickupAt + .48, end: receiveAt
  });
  const go = pitch.end + .20;
  // Hold the last base for the broadcast cut from the relay to the runner.
  const batterArrival = caught ? go + 1.38 : Math.max(go + preset.bags * 1.55, receiveAt + 1.12);
  const leadArrival = kind === 'sac_fly' ? receiveAt + 1.08 : batterArrival;
  const finish = Math.max(receiveAt, batterArrival, leadArrival);
  return {
    kind, pickup, fieldAt, legs, pickupAt, receiveAt, batterArrival, leadArrival,
    finish, duration: finish + .72, unassisted: false,
    outfield: {
      bags: preset.bags, catchClip, call: event?.specialPowerTriggered?.calloutText ?? (tagOutDp ? 'OUT AT HOME!' : preset.call),
      callColor: event?.specialPowerTriggered?.vfxColor ?? (tagOutDp ? '#C1394C' : caught ? '#167457' : '#E7A516'), caught, wall
    }
  };
}

export function outfieldDefenderAt(play: DiamondPlay, outfield: NonNullable<DiamondPlay['outfield']>,
  actor: Actor, start: Vec3, time: number) {
  const { pickup, fieldAt, pickupAt } = play;
  const contact = play.legs[0].end;
  let clip: CharacterAnimClip = 'field_ready';
  let local = time;
  let stop = start;
  let arrive = pickupAt;
  const receiver = play.legs.find(leg => leg.kind === 'throw' && leg.to === actor);
  if (actor === pickup) {
    stop = fieldAt;
    // A routine fly sometimes lands exactly at the nominal defensive spot.
    if (Math.hypot(start.x - stop.x, start.z - stop.z) < 1.6) start = { ...start, x: start.x + 2.8, z: start.z + 1.3 };
  } else if (receiver) {
    stop = { x: fieldAt.x * .4, y: .04, z: fieldAt.z * .61 };
    arrive = pickupAt + .1;
  } else if (outfield.bags > 0 && (actor === '1B' || actor === '2B' || actor === '3B')) {
    const bag = BASE_PATH_VERTICES[actor === '1B' ? 1 : actor === '2B' ? 2 : 3];
    // On a relay home the third baseman backs up inside the diamond and leaves the runner's lane clear.
    stop = actor === '3B' && play.plateDecision
      ? {x:bag.x+2.15, y:.04, z:bag.z+.45}
      : {x:bag.x + (actor === '3B' ? .85 : -.85), y:.04, z:bag.z-.65};
  } else if (isOutfielder(actor)) {
    // The adjacent outfielder shades behind the play to back up a miss.
    const cover = actor === 'CF' || (pickup === 'CF' && actor === (fieldAt.x < 0 ? 'LF' : 'RF'));
    if (cover) stop = { x: start.x + (fieldAt.x - start.x) * .38, y: .04, z: Math.min(start.z, fieldAt.z) - 2 };
  }
  const go = contact + .14;
  const chase = Math.max(0, Math.min(1, (time - go) / (arrive - go)));
  const u = chase*chase*(3-2*chase);
  const pos = { x: start.x + (stop.x - start.x) * u, y: start.y, z: start.z + (stop.z - start.z) * u };
  let yaw = headingToward(pos, BASE_PATH_VERTICES[0]);
  if (time > go && time < arrive && start !== stop) {
    yaw = headingToward(start, stop);
    clip = 'field_run';
    local = time - go;
  }
  if (actor === pickup && play.kind !== 'home_run') {
    const action = outfield.caught ? outfield.catchClip : 'field_scoop';
    const reach = action === 'field_dive' || action === 'field_high_jump'
      ? CLIP_DURATIONS[action] * GLOVE_CONTACT_PHASE[action] : .28;
    if (time >= pickupAt - reach && time < pickupAt + .42) {
      clip = action;
      local = Math.min(time - pickupAt + reach, CLIP_DURATIONS[action] - .01);
      yaw = headingToward(pos, BASE_PATH_VERTICES[0]);
    }
    const toss = play.legs.find(leg => leg.kind === 'throw' && leg.from === actor);
    if (toss && time >= toss.start - .19 && time < toss.start + .46) {
      clip = 'field_throw';
      local = time - toss.start + .19;
    }
  }
  if (receiver && time >= receiver.end - .26) {
    clip = 'field_receive';
    local = Math.min(.55, time - receiver.end + .26);
    yaw = headingToward(pos, fieldAt);
  }
  const relay = receiver && play.legs.find(l=>l.from===actor && l.to==='C' && l.start>=receiver.end);
  if (relay && time>=relay.start-.20) {
    clip = 'field_throw';
    local = Math.min(.63,time-relay.start+.20);
    yaw = headingToward(pos,BASE_PATH_VERTICES[0]);
  }
  return { pos, yaw, clip, local };
}

export function runBases(start: Vec3, from: number, to: number, time: number, go: number, arrive: number) {
  const span = to - from;
  if (span <= 0 || time < go) return { pos: start, yaw: headingToward(start, BASE_PATH_VERTICES[0]), clip: 'runner_lead' as const, local: time };
  const progress = Math.max(0, Math.min(1, (time - go) / (arrive - go))) * span;
  const index = Math.min(span - 1, Math.floor(progress));
  const a = index === 0 ? start : BASE_PATH_VERTICES[from + index];
  const b = BASE_PATH_VERTICES[from + index + 1];
  const u = progress - index;
  // Bow outside the baseline on multi-base hits; the path still touches every bag.
  const dx = b.x-a.x, dz = b.z-a.z;
  const bow = span > 1 ? Math.sin(Math.PI*u)*.15 : 0;
  const pos = { x: a.x + dx*u - dz*bow, y:.04, z:a.z + dz*u + dx*bow };
  const tangent = span > 1 ? .15*Math.PI*Math.cos(Math.PI*u) : 0;
  return {
    pos, yaw: time >= arrive ? headingToward(pos, BASE_PATH_VERTICES[0]) : Math.atan2(dx-dz*tangent,dz+dx*tangent),
    clip: time >= arrive ? 'runner_lead' as const : 'field_run' as const, local: Math.max(0, time - go)
  };
}
