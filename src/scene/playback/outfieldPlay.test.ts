import { describe, expect, it } from 'vitest';
import { actorAt, diamondPlay, sampleLeg } from './diamondPlay';
import { BASE_PATH_VERTICES } from './diamondLayout';
import { choreographPlayEvent } from './eventChoreographer';
import type { PlayEvent } from '../../engine/models/playEvent';

const fly: PlayEvent = {
  type: 'ball_in_play', outcome: 'fly_out', seq: 2, inning: 1, half: 'TOP',
  outsBefore: 0, outsAfter: 1, balls: 0, strikes: 0, homeScore: 0, awayScore: 0,
  basesAfter: [null, null, null], isClutchMoment: false, commentary: '',
  battedBallType: 'fly_ball', fieldingHighlight: { fielderPos: 'LF', fielderId: '7', anim: 'field_run' },
  ballFlight: { style: 'line_drive', landingX: -15, landingZ: -27, apexY: 10, durationSec: 1.25 },
};
describe('outfield playback', () => {
  it('tracks the named outfielder and catches the fly aloft at its recorded landing point', () => {
    const play = choreographPlayEvent(fly, 1).outfield!;
    expect(play.pickup).toBe('LF');
    expect(play.fieldAt).toMatchObject({ x: -15, z: -27 });
    expect(play.legs).toHaveLength(2);
    const atCatch = actorAt(play, 'LF', play.pickupAt, 'R');
    expect(atCatch.clip).toBe('field_pop');
    expect(atCatch.pos).toEqual(play.fieldAt);
    expect(actorAt(play, 'LF', 0, 'R').pos).not.toEqual(atCatch.pos);
    expect(sampleLeg(play.legs[1], { x: 0, y: 1, z: 0 }, atCatch.pos, .5).y).toBeGreaterThan(8);
    expect(choreographPlayEvent(fly, 4).durationMs).toBeLessThan(choreographPlayEvent(fly, 1).durationMs);
  });
  it.each([['single', 1], ['double', 2], ['triple', 3], ['home_run', 4]] as const)(
    'carries the batter around each bag on a %s', (kind, bags) => {
      const play = diamondPlay(kind);
      for (let i = 1; i <= bags; i++) {
        const go = play.legs[0].end + .2;
        const t = go + (play.batterArrival - go) * i / bags;
        const pos = actorAt(play, 'BAT', t, 'L').pos;
        expect(pos.x).toBeCloseTo(BASE_PATH_VERTICES[i].x);
        expect(pos.z).toBeCloseTo(BASE_PATH_VERTICES[i].z);
      }
      if (kind === 'home_run') expect(play.legs[1].endPoint!.z).toBeLessThan(-43);
      else {
        const [flight, bounce, relay] = play.legs.slice(1);
        expect(bounce.startPoint).toEqual(flight.endPoint);
        expect(actorAt(play, play.pickup, bounce.end, 'R').clip).toBe('field_scoop');
        expect(relay.kind).toBe('throw');
      }
    });
  it('uses a diving glove for an outfield liner and preserves infield line outs and popups', () => {
    expect(actorAt(diamondPlay('line_out'), 'RF', diamondPlay('line_out').pickupAt, 'L').clip).toBe('field_dive');
    const infield = { fielderPos: 'SS', fielderId: '6', anim: 'field_dive' } as const;
    expect(choreographPlayEvent({ ...fly, outcome: 'line_out', fieldingHighlight: infield }, 1).outfield).toBeUndefined();
    expect(choreographPlayEvent({ ...fly, battedBallType: 'pop_up', fieldingHighlight: infield }, 1).infield).toBe('pop_up');
  });
});

it('keeps the runner on third until a sacrifice fly is caught, then follows the tag home', () => {
  const play = diamondPlay('sac_fly');
  expect(actorAt(play, 'RUN', play.pickupAt, 'R').pos).toEqual(BASE_PATH_VERTICES[3]);
  expect(actorAt(play, 'RUN', play.pickupAt + .35, 'R').clip).toBe('field_run');
  expect(actorAt(play, 'RUN', play.leadArrival, 'R').pos).toEqual(BASE_PATH_VERTICES[4]);
  expect(play.leadArrival).toBeGreaterThan(play.receiveAt);
});

it('rebounds an extra-base hit into play on the field side of the yellow rail', () => {
  const play = diamondPlay('triple');
  const wall = play.legs[1].endPoint!;
  expect(Math.hypot(wall.x, wall.z + 3)).toBeCloseTo(39.65);
  expect(wall.y).toBeGreaterThan(.5);
  expect(Math.hypot(play.fieldAt.x, play.fieldAt.z + 3)).toBeLessThan(38);
  expect(play.batterArrival).toBeGreaterThan(play.receiveAt + .5);
});

it('puts a clean single past the edge of the infield dirt even straight up the middle', () => {
  const play = choreographPlayEvent({ ...fly, outcome: 'single', battedBallType: 'line_drive',
    fieldingHighlight: undefined, ballFlight: { ...fly.ballFlight!, landingX: 0, landingZ: -21 } }, 1).outfield!;
  const landing = play.legs[1].endPoint!;
  expect(landing.x).toBe(0);
  expect(Math.hypot(landing.x, landing.z + 10.5)).toBeGreaterThan(15.2);
  expect(play.fieldAt.z).toBeLessThan(landing.z);
});

it('lets the batter keep running until the fly is actually caught', () => {
  const play = diamondPlay('fly_out');
  const before = actorAt(play, 'BAT', play.pickupAt - .15, 'R');
  const caught = actorAt(play, 'BAT', play.pickupAt, 'R');
  expect(before.clip).toBe('field_run');
  expect(caught.pos.x).toBeGreaterThan(before.pos.x);
  expect(actorAt(play, 'BAT', play.duration, 'R').pos).toEqual(caught.pos);
});
