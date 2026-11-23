import { describe, expect, it } from 'vitest';
import { actorAt, diamondPlay } from './diamondPlay';
import { BASE_PATH_VERTICES as bags } from './diamondLayout';
import { PLATE_AND_STEALS, stealFrom } from './plateAndSteals';

describe('plate and steal replays', () => {
  it.each(['L', 'R'] as const)('keeps bat contact and glove reception distinct for a %s hitter', side => {
    const foul = diamondPlay('foul_back');
    const [pitch, deflection] = foul.legs;
    expect(pitch.to).toBe('BAT');
    expect(deflection.from).toBe('BAT');
    expect(deflection.start).toBe(pitch.end);
    expect(deflection.endPoint!.z).toBeGreaterThan(1);
    expect(actorAt(foul, 'BAT', pitch.end, side).clip).toBe('bat_swing');
    for (const kind of ['called_third','swinging_third','ball_four'] as const) {
      const play = diamondPlay(kind);
      expect(play.legs.map(leg => leg.to)).toEqual(['C']);
      expect(actorAt(play,'BAT',play.finish,side).clip).toBe(kind === 'swinging_third' ? 'bat_swing' : 'bat_stance');
    }
    const walk = diamondPlay('ball_four');
    expect(actorAt(walk,'BAT',walk.duration,side).pos).toEqual(bags[1]);
    expect(actorAt(walk,'RUN',walk.duration,side).pos).toEqual(bags[2]);
  });

  it.each([1,2,3] as const)('stages the foot and tag in the correct order stealing from bag %i', base => {
    const safe = diamondPlay('steal_safe',undefined,undefined,base);
    const out = diamondPlay('steal_out',undefined,undefined,base);
    expect(safe.leadArrival).toBeLessThan(safe.finish);
    expect(out.leadArrival).toBeGreaterThan(out.finish);
    expect(safe.legs.map(l=>l.to)).toEqual(base === 3 ? ['C'] : ['C',base === 1 ? '2B' : '3B']);
    const safeStop = actorAt(safe,'RUN',safe.finish,'R');
    const outStop = actorAt(out,'RUN',out.finish,'R');
    expect(safeStop.clip).toBe('runner_slide');
    expect(outStop.pos).toEqual(actorAt(out,'RUN',out.duration,'R').pos);
    const goal = bags[base+1];
    const distance = (p: typeof goal) => Math.hypot(goal.x-p.x,goal.z-p.z);
    expect(distance(outStop.pos)).toBeGreaterThan(distance(safeStop.pos)+.75);
    expect(actorAt(out,out.pickup,out.finish,'L').clip).toBe('field_tag');
  });

  it('uses the actual lead runner when baserunners break together', () => {
    expect(stealFrom(['trail','lead',null],[null,'trail','lead'])).toBe(2);
    expect(stealFrom(['one','two','three'],['one','two',null])).toBe(3);
    expect(stealFrom(['one',null,null],['one',null,null])).toBeUndefined();
    for (const kind of PLATE_AND_STEALS) expect(diamondPlay(kind).duration).toBeGreaterThan(diamondPlay(kind).finish);
  });
});
