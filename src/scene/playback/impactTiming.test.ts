import { expect, it } from 'vitest';
import { barrelReplayTime, crowdReaction, decayExcitement } from './impactTiming';
import { actorAt, diamondPlay } from './diamondPlay';
import { paintedMotion } from '../characters/paintedMotion';
import { CLIP_DURATIONS } from '../characters/animationState';

it('holds barrel contact for 60 real milliseconds at different replay speeds and arrives on schedule', () => {
  const play = diamondPlay('single');
  const contact = play.legs[0].end;
  for (const rate of [1, 2, 4]) {
    expect(barrelReplayTime(play, contact + .059 * rate, rate)).toBeCloseTo(contact);
    expect(barrelReplayTime(play, contact + .065 * rate, rate)).toBeGreaterThan(contact);
    expect(barrelReplayTime(play, play.legs[1].end, rate)).toBe(play.legs[1].end);
  }
  expect(barrelReplayTime(diamondPlay('called_pitch'), contact + .03, 1)).toBe(contact + .03);
});

it('reserves the strongest cheer for walkoffs, stands behind home for hits and decays independently of refresh rate', () => {
  for (const kind of ['single', 'double', 'triple', 'bunt_single', 'home_run', 'called_third', 'swinging_third', 'steal_safe'] as const) {
    const play = diamondPlay(kind);
    const cue = crowdReaction(play)!;
    expect(cue.level).toBeGreaterThan(.35);
    expect(cue.stand).toBe(['single', 'double', 'triple', 'bunt_single', 'home_run'].includes(kind));
    expect(cue.at).toBeGreaterThanOrEqual(play.legs[0].end);
  }
  const walkoff = diamondPlay('single');
  walkoff.ending = { kind: 'walkoff', start: walkoff.batterArrival, scorer: 'RUN' };
  expect(crowdReaction(walkoff)!.level).toBe(1);
  expect(crowdReaction(diamondPlay('ball_pitch'))).toBeUndefined();
  expect(decayExcitement(decayExcitement(1, .4), .6)).toBeCloseTo(decayExcitement(1, 1));
  expect(decayExcitement(1, 1)).toBeLessThan(1);
});

it('finishes a swing on the turned shoulder and lets the starter pump a fist after strike three', () => {
  for (const clip of ['bat_swing', 'bat_bomb'] as const) {
    const finish = paintedMotion('batter', clip, CLIP_DURATIONS[clip] * .96);
    expect(finish.cel).toBe(2);
    expect(Math.abs(finish.lean)).toBeGreaterThan(.03);
  }
  const k = diamondPlay('swinging_third');
  expect(actorAt(k, 'P', k.finish + .52, 'R').clip).toBe('pitch_fist_pump');
});
