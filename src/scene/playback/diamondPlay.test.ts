import { describe, expect, it } from 'vitest';
import { diamondPlay, selectDiamondPlay, sampleLeg } from './diamondPlay';

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
