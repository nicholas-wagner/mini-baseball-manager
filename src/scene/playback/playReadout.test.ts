import { expect, it } from 'vitest';
import type { PlayEvent } from '../../engine/models/playEvent';
import { choreographPlayEvent } from './eventChoreographer';
import { playReadout, decisionDelayMs, scoringDetail } from './playReadout';

const event: PlayEvent = {
  seq: 9,
  type: 'pitch_thrown',
  inning: 1,
  half: 'TOP',
  outsBefore: 0,
  outsAfter: 0,
  balls: 2,
  strikes: 2,
  awayScore: 0,
  homeScore: 0,
  basesAfter: [null, null, null],
  isClutchMoment: false,
  commentary: '',
  outcome: 'called_strike',
};

it('reveals the actual numbered call at the catch, scaled with watch speed', () => {
  expect(playReadout(event)).toMatchObject({ label: 'Strike two', lamp: 'strikes' });
  const slow = choreographPlayEvent(event, 1),
    fast = choreographPlayEvent(event, 4);
  expect(decisionDelayMs(slow)).toBeGreaterThan(0);
  expect(decisionDelayMs(slow)).toBeLessThan(slow.durationMs);
  expect(decisionDelayMs(fast)).toBeLessThan(decisionDelayMs(slow));
});

it('marks the actual batter destination even when a single advances on a throw', () => {
  expect(
    playReadout({ ...event, outcome: 'single', batterId: 'b', basesAfter: [null, 'b', null] }),
  ).toMatchObject({ label: 'Single', base: 2 });
  expect(playReadout({ ...event, outcome: 'fly_out' })).toMatchObject({
    label: 'Fly out',
    lamp: 'outs',
  });
  expect(playReadout({ ...event, outcome: undefined, type: 'pitching_change' })).toBeNull();
});

it('scores a groundout only when the recorded defender made the replay throw to first', () => {
  const out: PlayEvent = {...event, batterId: 'b', outcome: 'ground_out', outsAfter: 1,
    fieldingHighlight: {fielderId:'ss', fielderPos:'SS', anim:'field_run'}};
  const play = choreographPlayEvent(out, 1).play;
  expect(scoringDetail(out, play)).toBe('Shortstop to first · 6–3');
  expect(scoringDetail({...out, fieldingHighlight:undefined}, play)).toBeUndefined();
  expect(scoringDetail({...out, outcome:'double_play'}, play)).toBeUndefined();
  expect(scoringDetail({...out, fieldingHighlight:{...out.fieldingHighlight!, fielderPos:'3B'}}, play)).toBeUndefined();
});

it('holds the umpire signal with the runner still short of first, then resumes the run-through', async () => {
  const { diamondPlay } = await import('./diamondPlay');
  const { forceReplayTime } = await import('./firstAtBatPresentation');
  const play = diamondPlay('ground_out');
  const caught = play.finish + .14;
  expect(forceReplayTime(caught, play.finish)).toBeCloseTo(caught);
  expect(forceReplayTime(caught + .30, play.finish)).toBeCloseTo(caught);
  expect(caught).toBeLessThan(play.batterArrival);
  expect(forceReplayTime(play.duration + .48, play.finish)).toBeCloseTo(play.duration);
});
