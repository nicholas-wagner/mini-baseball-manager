import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { PlayEvent } from '../../engine/models/playEvent';
import { actorAt, buntRunnerPose, diamondCamera } from './diamondPlay';
import { BASE_PATH_VERTICES as bags } from './diamondLayout';
import { choreographPlayEvent } from './eventChoreographer';
import { describeBuntAdvance } from './sacrificeBunt';

const out: PlayEvent = {
  seq: 5, type: 'ball_in_play', outcome: 'bunt_out', inning: 2, half: 'TOP',
  outsBefore: 0, outsAfter: 1, balls: 0, strikes: 0, awayScore: 0, homeScore: 0,
  batterId: 'batter', basesAfter: [null, 'runner', null], isClutchMoment: false, commentary: '',
};

describe('a sacrifice bunt with the putout at first', () => {
  it('breaks from first on contact, runs through the throw and stops on second', () => {
    const play = choreographPlayEvent(out, 1, ['runner', null, null]).play!;
    const contact = play.legs[0].end;
    expect(play.buntAdvances).toEqual([1]);
    expect(buntRunnerPose(play, 1, contact - .1).clip).toBe('runner_lead');
    const running = buntRunnerPose(play, 1, play.pickupAt);
    expect(running.clip).toBe('field_run');
    expect(running.pos.x).toBeLessThan(bags[1].x);
    expect(running.pos.x).toBeGreaterThan(bags[2].x);
    expect(running.pos.z).toBeLessThan(bags[1].z);
    expect(play.finish).toBeLessThan(play.batterArrival);
    expect(actorAt(play, 'BAT', contact, 'R').clip).toBe('bat_bunt');
    expect(buntRunnerPose(play, 1, play.duration)).toMatchObject({pos:bags[2], clip:'runner_lead'});
    expect(diamondCamera(play, play.finish, 'R').lookAt.x).toBeGreaterThan(8);
    expect(diamondCamera(play, play.duration, 'R').lookAt.z).toBeCloseTo(bags[2].z);
    expect(describeBuntAdvance(play.buntAdvances!)).toMatch(/runner to second/i);
  });

  it('keeps the moving runner, batter and charged bunt in the same phone shot before the throw', () => {
    const play = choreographPlayEvent(out, 1, ['runner',null,null]).play!;
    const t = play.pickupAt;
    const shot = diamondCamera(play, t, 'R');
    const camera = new PerspectiveCamera(shot.fov, 1.5, .1, 100);
    camera.position.copy(shot.position);
    camera.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
    camera.updateMatrixWorld();
    for (const pos of [play.fieldAt, actorAt(play,'BAT',t,'R').pos, buntRunnerPose(play,1,t).pos, bags[2]]) {
      const screen = new Vector3(pos.x, .85, pos.z).project(camera);
      expect(Math.abs(screen.x)).toBeLessThan(.92);
      expect(Math.abs(screen.y)).toBeLessThan(.92);
    }
  });

  it.each(['SP','RP','C','3B','1B'] as const)('shows the recorded %s charging and throwing to first', pos => {
    const play = choreographPlayEvent({...out, fieldingHighlight:{fielderId:'charger', fielderPos:pos, anim:'field_run'}}, 1, ['runner',null,null]).play!;
    const charger = pos === 'SP' || pos === 'RP' ? 'P' : pos;
    expect(play.pickup).toBe(charger);
    const throwToFirst = play.legs[2];
    expect(throwToFirst).toMatchObject({from:charger, to:pos === '1B' ? 'P' : '1B', kind:'throw'});
    expect(actorAt(play, charger, play.pickupAt, 'R').clip).toBe('field_scoop');
    expect(actorAt(play, charger, throwToFirst.start, 'R').clip).toBe(pos === 'C' ? 'catch_throw' : 'field_throw');
  });

  it('moves each recorded runner once, including a scoring runner', () => {
    const play = choreographPlayEvent({...out, basesAfter:[null,'a','b'], awayScore:1},
      1, ['a','b','c'], {runsScored:1}).play!;
    expect(play.buntAdvances).toEqual([1,2,3]);
    for (const from of [1,2,3]) expect(buntRunnerPose(play,from,play.duration).pos).toEqual(bags[from+1]);
  });

  it('keeps a walk-off squeeze on the scoring runner until they touch home', () => {
    const play = choreographPlayEvent({...out, half:'BOT', basesAfter:[null,null,null], homeScore:1},
      1, [null,null,'winner'], {walkoff:true, runsScored:1}).play!;
    expect(play.ending).toMatchObject({scorer:'RUN',start:play.leadArrival});
    expect(actorAt(play,'RUN',play.pickupAt,'L').pos).toEqual(buntRunnerPose(play,3,play.pickupAt).pos);
  });

  it('never invents an advance for an unchanged base, a two-out bunt, or a caught pop-up', () => {
    for (const event of [
      {...out, basesAfter:['runner',null,null] as PlayEvent['basesAfter']},
      {...out, basesAfter:['batter','runner',null] as PlayEvent['basesAfter']},
      {...out, outsBefore:2, outsAfter:3, basesAfter:[null,null,null] as PlayEvent['basesAfter']},
      {...out, outcome:'fly_out' as const, battedBallType:'pop_up' as const},
    ]) expect(choreographPlayEvent(event, 1, ['runner',null,null]).play!.buntAdvances).toBeUndefined();
  });
});

it('lets the safe runner tip their helmet to the dugout after reaching second', () => {
  const play = choreographPlayEvent(out, 1, ['runner', null, null]).play!;
  const salute = buntRunnerPose(play, 1, play.leadArrival + .4);
  expect(salute).toMatchObject({clip:'helmet_tip', pos:bags[2]});
});
