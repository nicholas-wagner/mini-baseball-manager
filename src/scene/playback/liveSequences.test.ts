import { describe, expect, it } from 'vitest';
import { ALL_PITCH_TYPES } from '../../engine/models/player';
import { actorAt, diamondPlay, sampleLeg } from './diamondPlay';
import { choreographPlayEvent } from './eventChoreographer';
import { labSequence } from './labSequence';
import type { PlayEvent } from '../../engine/models/playEvent';

const event: PlayEvent = {
  seq: 1,
  type: 'ball_in_play',
  inning: 9,
  half: 'BOT',
  outsBefore: 1,
  outsAfter: 1,
  balls: 0,
  strikes: 0,
  awayScore: 0,
  homeScore: 1,
  basesAfter: ['hitter', null, null],
  isClutchMoment: false,
  commentary: '',
  outcome: 'single',
};
describe('live ball and team sequences', () => {
  it('shows the actual arsenal, mirrors lateral break, and keeps every pitch on its endpoints', () => {
    const a = { x: 0, y: 1, z: -10 },
      b = { x: 0, y: 1, z: 0 };
    const midpoints = ALL_PITCH_TYPES.map((pitchType) => {
      const leg = diamondPlay('called_pitch', undefined, {
        ...event,
        pitchThrown: {
          pitchType,
          mph: 88,
          isFavoritePitch: false,
          isWeakPitchForPitcher: false,
          batterAffinity: 'neutral',
        },
      }).legs[0];
      expect(sampleLeg(leg, a, b, 0, 'L')).toEqual(a);
      expect(sampleLeg(leg, a, b, 1, 'R')).toEqual(b);
      const right = sampleLeg(leg, a, b, 0.65, 'R'),
        left = sampleLeg(leg, a, b, 0.65, 'L');
      expect(left.x).toBeCloseTo(-right.x);
      return JSON.stringify(right);
    });
    expect(new Set(midpoints).size).toBe(8);
  });
  it('runs a three-pitch at-bat with two returns and an early swing on the change', () => {
    const plays = labSequence('battery_reel');
    expect(plays.map((p) => p.legs[0].pitch?.pitchType)).toEqual(['four_seam', 'changeup', 'slider']);
    expect(plays[0].legs.at(-1)?.to).toBe('P');
    expect(plays[1].legs[0].end).toBeGreaterThan(plays[0].legs[0].end);
    expect(actorAt(plays[1], 'BAT', plays[1].pickupAt - 0.25, 'R').clip).toBe('bat_swing');
  });
  it('relays a scoring hit home and features the actual scoring runner', () => {
    const p = choreographPlayEvent(event, 1, [null, 'scored', null], { walkoff: true }).play!;
    expect(p.scorerBase).toBe(2);
    expect(p.legs.at(-1)?.to).toBe('C');
    expect(p.ending?.kind).toBe('walkoff');
    expect(choreographPlayEvent(event, 1, [null, null, null]).play?.legs.at(-1)?.to).not.toBe('C');
  });
  it('keeps the first-base cover, third-out exchange and bullpen handoff playable', () => {
    const cover = labSequence('cover_first')[0];
    expect(cover.legs.at(-1)?.to).toBe('P');
    expect(actorAt(cover, 'P', cover.receiveAt, 'L').clip).toBe('field_receive');
    const retired = labSequence('third_out')[0];
    expect(retired.legs.slice(-2).map((l) => l.to)).toEqual(['SS', '2B']);
    expect(labSequence('bullpen')[0].legs.at(-1)?.to).toBe('P');
  });
});

it('pushes off after fair contact and leaves the bat in the box', () => {
  const play = diamondPlay('single');
  const go = play.legs[0].end + 0.2;
  for (const side of ['L', 'R'] as const) {
    expect(actorAt(play, 'BAT', go - 0.06, side).clip).toBe('bat_swing');
    expect(actorAt(play, 'BAT', go + 0.04, side).clip).toBe('runner_push');
    expect(actorAt(play, 'BAT', go + 0.6, side).clip).toBe('field_run');
  }
});

it('holds the safe slide and shows the caught runner the ball', () => {
  const safe = diamondPlay('steal_safe'),
    out = diamondPlay('steal_out');
  expect(actorAt(safe, 'RUN', safe.finish + 0.5, 'L').clip).toBe('slide_safe');
  expect(actorAt(out, out.pickup, out.finish + 0.5, 'R').clip).toBe('field_pop');
  expect(actorAt(out, 'RUN', out.finish + 0.5, 'R').pos).toEqual(actorAt(out, 'RUN', out.finish, 'R').pos);
});

it('does not feature a scoring runner when an inning ends with an unchanged score', () => {
  const play = choreographPlayEvent(
    { ...event, type: 'ball_in_play', outcome: 'fly_out', outsAfter: 3 },
    1,
    [null, null, 'still-on-third'],
    { runsScored: 0 },
  ).play!;
  expect(play.scorerBase).toBeUndefined();
  expect(play.ending?.kind).toBe('third_out');
});

it('shows a walk-off steal at home with the stealing runner as the winner', () => {
  const play = choreographPlayEvent(
    { ...event, type: 'stolen_base_attempt', outcome: undefined, basesAfter: [null, null, null] },
    1,
    [null, null, 'winner'],
    { walkoff: true, runsScored: 1 },
  ).play!;
  expect(play.ending).toMatchObject({ kind: 'walkoff', scorer: 'RUN', start: play.leadArrival });
});
