import { expect, it } from 'vitest';
import { choreographPlayEvent } from './eventChoreographer';
import { actorAt, diamondCamera } from './diamondPlay';
import { BASE_PATH_VERTICES } from './diamondLayout';
import type { PlayEvent } from '../../engine/models/playEvent';

it.each(['held', 'safe', 'out'] as const)(
  'follows the runner to third and shows the recorded %s decision',
  (result) => {
    const event: PlayEvent = {
      type: 'ball_in_play',
      outcome: 'single',
      seq: 1,
      inning: 2,
      half: 'TOP',
      balls: 0,
      strikes: 0,
      outsBefore: 2,
      outsAfter: result === 'out' ? 3 : 2,
      awayScore: Number(result === 'safe'),
      homeScore: 0,
      basesAfter: ['bat', null, result === 'held' ? 'runner' : null],
      isClutchMoment: false,
      commentary: '',
      thirdBase: {
        runnerId: 'runner',
        position: 'LF',
        arm: 65,
        odds: 61,
        close: true,
        result,
      },
    };
    const play = choreographPlayEvent(event, 1, [null, 'runner', null], {
      runsScored: Number(result === 'safe'),
    }).play!;
    expect(actorAt(play, 'RUN', play.pickupAt, 'R').pos).toEqual(
      BASE_PATH_VERTICES[3],
    );
    const third = actorAt(play,'3B',play.pickupAt,'R').pos;
    const runner = actorAt(play,'RUN',play.pickupAt,'R').pos;
    const camera = diamondCamera(play, play.pickupAt, 'R');
    const dx = camera.position.x - runner.x, dz = camera.position.z - runner.z;
    const separation = Math.abs((third.x-runner.x)*dz - (third.z-runner.z)*dx)/Math.hypot(dx,dz);
    expect(separation).toBeGreaterThan(1.5);
    const relay = play.legs.find((l) => l.kind === 'throw' && l.to === 'C');
    if (result === 'held') {
      expect(relay).toBeUndefined();
      return;
    }
    expect(play.leadArrival < relay!.end).toBe(result === 'safe');
    expect(diamondCamera(play, relay!.end, 'R').lookAt.z).toBeGreaterThan(-2);
    expect(actorAt(play, 'RUN', play.leadArrival, 'R').pos).toEqual(
      BASE_PATH_VERTICES[4],
    );
  },
);
