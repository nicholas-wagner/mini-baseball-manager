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
      expect(actorAt(play,'BAT',play.finish,side).clip).toBe(kind === 'swinging_third' ? 'bat_swing' : kind === 'called_third' ? 'bat_take' : 'bat_stance');
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

it.each([false,true])('tracks the return into the glove then steps onto the rubber (stretch %s)', fromStretch => {
  const play = diamondPlay('called_pitch', undefined, undefined, undefined, undefined, fromStretch);
  const pitch = play.legs[0], back = play.legs[1];
  const at = (time: number) => actorAt(play,'P',time,'R');
  expect(at(pitch.start).clip).toBe(fromStretch ? 'pitch_stretch' : 'pitch_windup');
  expect(pitch.start).toBeCloseTo(fromStretch ? .50 : .76, 2);
  expect(at(back.end-.24).clip).toBe('field_ready');
  expect(at(back.end).clip).toBe('field_receive');
  expect(at(back.end+.12).local - at(back.end).local).toBeCloseTo(.12);
  expect(at(back.end).pos.z).toBeGreaterThan(at(0).pos.z);
  expect(at(play.duration).pos).toEqual(at(0).pos);
  expect(at(play.duration).clip).toBe(fromStretch ? 'pitch_stretch_set' : 'pitch_set');
});

it.each(['called_pitch','missed_pitch','ball_pitch','foul_back'] as const)('returns a %s to a ready battery', kind => {
  const play = diamondPlay(kind), plate = play.legs[0].end;
  const back = play.legs.find(l=>l.to==='P' && l.from==='C')!;
  expect(back).toBeDefined();
  expect(actorAt(play,'C',back.start,'L').clip).toBe('catch_throw');
  expect(actorAt(play,'C',plate+1.04,'L').clip).toBe('catch_target');
  expect(actorAt(play,'P',back.end,'L').clip).toBe('field_receive');
  const bat = (at: number) => actorAt(play,'BAT',plate+at,'R').clip;
  expect(bat(0)).toBe(kind === 'ball_pitch' || kind === 'called_pitch' ? 'bat_take' : 'bat_swing');
  if (kind === 'missed_pitch' || kind === 'foul_back') expect(bat(.55)).toBe('bat_recover');
  expect(bat(1.12)).toBe('bat_stance');
});

it.each(['called_third','swinging_third'] as const)('holds the %s slump through the end of the replay', kind => {
  const play = diamondPlay(kind);
  for (const at of [play.finish+.85,play.duration]) expect(actorAt(play,'BAT',at,'R').clip).toBe('bat_slump');
});

it('squares on release, cushions fair contact, pushes off and pulls back a missed bunt', () => {
  for (const kind of ['bunt_single','bunt_out','missed_pitch','called_pitch','foul_back'] as const) {
    const play = {...diamondPlay(kind), buntAttempt:true};
    const pitch = play.legs[0];
    const clip = (t: number) => actorAt(play,'BAT',t,'L').clip;
    expect(clip(pitch.start+.06)).toBe('bat_square');
    expect(clip(pitch.end-.03)).toBe('bat_bunt');
    if (kind.startsWith('bunt_')) {
      expect(clip(pitch.end+.035)).toBe('bat_bunt_tap');
      expect(clip(pitch.end+.22)).toBe('runner_push');
    } else {
      expect(clip(pitch.end+.24)).toBe('bat_bunt_pullback');
      expect(clip(pitch.end+.90)).toBe('bat_stance');
    }
  }
});

it.each(['steal_safe','steal_out'] as const)('shows a recorded swing through a %s', kind => {
  const event: import('../../engine/models/playEvent').PlayEvent = {
    type:'stolen_base_attempt', seq:2, inning:1, half:'TOP', outsBefore:0, outsAfter:Number(kind==='steal_out'),
    basesAfter:[null,'runner',null], awayScore:0, homeScore:0, balls:0, strikes:1, commentary:'', isClutchMoment:false,
    outcome:'swinging_strike',
  };
  const play = diamondPlay(kind,undefined,event,1);
  expect(actorAt(play,'BAT',play.legs[0].end,'R').clip).toBe('bat_swing');
  expect(actorAt(play,'RUN',play.legs[0].end,'R').clip).toBe('field_run');
});
