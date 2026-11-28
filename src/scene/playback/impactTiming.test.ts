import { expect, it } from 'vitest';
import { barrelReplayTime, clutchReplayTime, clutchSlowMoScale, clutchSlowMoWindow, crowdReaction, decayExcitement } from './impactTiming';
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

it.each(['walkoff', 'robbery', 'called_third', 'swinging_third', 'relief'] as const)(
  'slows the ball and players through the decisive frame of a %s', moment => {
    const play = diamondPlay(moment === 'walkoff' ? 'single' : moment === 'robbery' ? 'fly_out'
      : moment === 'relief' ? 'swinging_third' : moment);
    const impact = moment === 'robbery' ? play.pickupAt : play.legs[0].end;
    if (moment === 'robbery') play.outfield!.robbedHomeRun = true;
    else if (moment === 'relief') play.reliefStrikeout = true;
    else play.ending = { kind: moment === 'walkoff' ? 'walkoff' : 'third_out', start: play.finish, scorer: 'BAT' };
    const lead = moment === 'walkoff' ? .175 : moment === 'robbery' ? .14 : .10;
    const speed = moment === 'walkoff' || moment === 'robbery' ? .38 : .42;
    const window = clutchSlowMoWindow(play)!;
    expect(window.start).toBeCloseTo(impact - lead);
    expect(window.end - window.start).toBeCloseTo(.35);
    expect(window.scale).toBe(speed);
    const scale = (t: number) => clutchSlowMoScale(play, t, false);
    expect(scale(window.start)).toBe(1);
    expect(scale(window.start + .025)).toBeLessThan(1);
    expect(scale(window.start + .025)).toBeGreaterThan(speed);
    expect(scale(impact)).toBeCloseTo(speed);
    expect(scale(window.end)).toBe(1);
    const clock = (t: number) => clutchReplayTime(play, t, false);
    expect(clock(impact)).toBeCloseTo(impact);
    expect((clock(impact + .001) - clock(impact - .001)) / .002).toBeCloseTo(speed, 2);
    let previous = 0;
    for (let t = 0; t < play.duration; t += .012) {
      expect(clock(t)).toBeGreaterThanOrEqual(previous);
      expect(clutchSlowMoScale(play, t, true)).toBe(1);
      expect(clutchReplayTime(play, t, true)).toBe(t);
      previous = clock(t);
    }
    expect(clock(play.duration)).toBe(play.duration);
  });

it.each(['single', 'home_run', 'fly_out', 'ground_out', 'called_third', 'swinging_third', 'steal_safe'] as const)(
  'keeps routine %s playback at normal speed', kind => {
    const play = diamondPlay(kind);
    if (kind === 'steal_safe') play.ending = { kind: 'walkoff', start: play.finish, scorer: 'RUN' };
    expect(clutchSlowMoWindow(play)).toBeNull();
    expect(clutchSlowMoScale(play, play.pickupAt, false)).toBe(1);
  });
