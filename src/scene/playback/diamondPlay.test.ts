import { describe, expect, it } from 'vitest';
import { actorAt, diamondPlay, selectDiamondPlay, sampleLeg } from './diamondPlay';

describe('infield playback', () => {
  it('fields a chopper before throwing the batter out at first', () => {
    const play = diamondPlay('ground_out');
    expect(play.legs.map(l => [l.from, l.to])).toEqual([['P', 'BAT'], ['BAT', 'SS'], ['SS', '1B']]);
    expect(play.legs[1].kind).toBe('ground');
    expect(play.legs[2].end).toBeLessThan(play.batterArrival);
  });
  it('lets a first baseman who fields a live grounder take the bag unassisted', () => {
    const play = diamondPlay('ground_out','1B');
    expect(play.unassisted).toBe(true);
    expect(play.legs.map(l => l.to)).toEqual(['BAT','1B']);
    expect(play.finish).toBeGreaterThan(play.pickupAt);
    expect(play.finish).toBeLessThan(play.batterArrival);
  });
  it('turns two distinct forces in order ahead of the corresponding runners', () => {
    const play = diamondPlay('double_play');
    const [feed, relay] = play.legs.slice(-2);
    expect([feed.from, feed.to, relay.from, relay.to]).toEqual(['SS', '2B', '2B', '1B']);
    expect(feed.end).toBeLessThan(play.leadArrival);
    expect(relay.start).toBeGreaterThan(feed.end);
    expect(relay.end).toBeLessThan(play.batterArrival);
  });
  it('sends only a pop-up out to the infield pop replay and lets the ball descend into a glove', () => {
    expect(selectDiamondPlay('fly_out','pop_up')).toBe('pop_up');
    expect(selectDiamondPlay('fly_out','fly_ball')).toBeUndefined();
    const lob = diamondPlay('pop_up').legs[1];
    expect(lob.to).toBe('2B');
    const a = { x: 0, y: 1, z: 0 }, b = { x: 2, y: 1.2, z: -13 };
    expect(sampleLeg(lob, a, b, 0)).toEqual(a);
    expect(sampleLeg(lob, a, b, 0.5).y).toBeGreaterThan(6);
    expect(sampleLeg(lob, a, b, 1)).toEqual(b);
  });
});

it('lets the bunter reach first before the throw, and shows an error escaping the first glove', () => {
  const bunt = diamondPlay('bunt_single');
  expect(bunt.batterArrival).toBeLessThan(bunt.legs.at(-1)!.end);
  expect(actorAt(bunt, 'BAT', bunt.legs[0].end, 'L').clip).toBe('bat_bunt');
  const error = diamondPlay('fielding_error');
  expect(error.legs.map(leg => leg.kind)).toContain('bounce');
  expect(error.legs.at(-1)!.end).toBeLessThan(error.duration);
});

it('plays a live infield liner into the glove of the named infielder', () => {
  expect(selectDiamondPlay('line_out','line_drive','SS')).toBe('infield_liner');
  expect(selectDiamondPlay('line_out','line_drive','LF')).toBeUndefined();
  const liner = diamondPlay('infield_liner','3B');
  expect(liner.legs).toHaveLength(2);
  expect(liner.legs[1].to).toBe('3B');
  expect(actorAt(liner,'3B',liner.finish,'R').clip).toBe('field_receive');
});

it('renders a bunt pop-up with a bunt stance, a high pop-up arc, and the catcher or pitcher running under it to catch', () => {
  const baseEvent = {
    seq: 12,
    type: 'ball_in_play' as const,
    inning: 2,
    half: 'BOT' as const,
    outsBefore: 0,
    outsAfter: 1,
    balls: 0,
    strikes: 1,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null] as [string | null, string | null, string | null],
    isClutchMoment: false,
    commentary: 'Batter pops the bunt up — Catcher tracks it down!',
    outcome: 'fly_out' as const,
    battedBallType: 'pop_up' as const,
    ballFlight: { style: 'ninja_bunt' as const, landingX: -1.4, landingZ: -1.8, apexY: 6.4, durationSec: 1.35 },
  };

  // Catcher pop-up
  const catcherPop = diamondPlay('pop_up', 'C', baseEvent);
  expect(catcherPop.buntAttempt).toBe(true);
  expect(catcherPop.pickup).toBe('C');
  expect(catcherPop.legs[1].kind).toBe('pop');
  expect(actorAt(catcherPop, 'BAT', catcherPop.legs[0].end, 'R').clip).toBe('bat_bunt');
  expect(actorAt(catcherPop, 'BAT', catcherPop.legs[0].end, 'L').clip).toBe('bat_bunt');
  const midFlightC = (catcherPop.legs[0].end + catcherPop.pickupAt) * 0.5;
  expect(actorAt(catcherPop, 'C', midFlightC, 'R').clip).toBe('field_run');
  expect(actorAt(catcherPop, 'C', catcherPop.finish, 'R').clip).toBe('field_pop');
  expect(actorAt(catcherPop, 'C', catcherPop.finish, 'R').pos).toEqual(catcherPop.fieldAt);

  // Pitcher pop-up
  const pitcherPop = diamondPlay('pop_up', 'SP', baseEvent);
  expect(pitcherPop.buntAttempt).toBe(true);
  expect(pitcherPop.pickup).toBe('P');
  expect(pitcherPop.legs[1].kind).toBe('pop');
  expect(actorAt(pitcherPop, 'BAT', pitcherPop.legs[0].end, 'R').clip).toBe('bat_bunt');
  const midFlightP = (pitcherPop.legs[0].end + pitcherPop.pickupAt) * 0.5;
  expect(actorAt(pitcherPop, 'P', midFlightP, 'R').clip).toBe('field_run');
  expect(actorAt(pitcherPop, 'P', pitcherPop.finish, 'R').clip).toBe('field_pop');
  expect(actorAt(pitcherPop, 'P', pitcherPop.finish, 'R').pos).toEqual(pitcherPop.fieldAt);

  // High pop-up ball arc (not a grounder or flat liner)
  const apex = sampleLeg(catcherPop.legs[1], { x: 0, y: 1, z: 0 }, catcherPop.fieldAt, 0.5);
  expect(apex.y).toBeGreaterThan(6);
});

it('keeps the batter in bat_bunt (not bat_swing) on a bunt whiff or bunt foul', () => {
  const buntWhiff = diamondPlay('missed_pitch', undefined, {
    seq: 13,
    type: 'pitch_thrown',
    inning: 1,
    half: 'TOP',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 1,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: 'Squares and whiffs on the bunt!',
    outcome: 'swinging_strike',
    mathBreakdown: {
      effContact: 55,
      effPower: 60,
      effStuff: 70,
      effControl: 60,
      zonePct: 98,
      hitPct: 18,
      diceRoll: 1,
      activeModifiers: ['Bunt (C 55)', 'Bunt Whiff'],
    },
  });
  expect(buntWhiff.buntAttempt).toBe(true);
  expect(actorAt(buntWhiff, 'BAT', buntWhiff.legs[0].end, 'R').clip).toBe('bat_bunt');
});
