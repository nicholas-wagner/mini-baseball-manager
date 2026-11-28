import { PerspectiveCamera } from 'three';
import { createClub } from '../../engine/gm/rosterFactory';
import { createSeededRng } from '../../engine/rng/seededRng';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import { useGameStore } from '../../store/gameStore';
import { GameSceneController } from './gameSceneController';
import * as replayRenderer from './renderDiamondPlay';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import { createPaintedPlayerRig } from '../characters/paintedPlayer';
import { createBallparkVfxSystem } from '../vfx/vfxSystem';
import { renderDiamondPlay, type DiamondCast } from './renderDiamondPlay';
import { describe, expect, it, vi } from 'vitest';
import { actorAt, diamondPlay, diamondCamera, selectDiamondPlay, sampleLeg } from './diamondPlay';
import type { PlayEvent } from '../../engine/models/playEvent';
import { BASE_PATH_VERTICES } from './diamondLayout';
import { choreographPlayEvent } from './eventChoreographer';

vi.mock('three', async importOriginal => ({
  ...await importOriginal<typeof import('three')>(),
  WebGLRenderer: class {
    domElement = document.createElement('canvas');
    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose() {}
  },
}));

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

describe.each(['pickoff_out', 'pickoff_safe'] as const)('%s replay', outcome => {
  it.each([1, 2] as const)('snaps the ball from the mound to bag %i', pickoffBase => {
    const before: PlayEvent['basesAfter'] = ['first-runner', 'second-runner', null];
    const event: PlayEvent = { type: 'pickoff', outcome, pickoffBase, seq: 1, inning: 1, half: 'TOP',
      outsBefore: 0, outsAfter: Number(outcome === 'pickoff_out'), balls: 2, strikes: 1,
      homeScore: 0, awayScore: 0, basesAfter: [...before], isClutchMoment: false, commentary: '' };
    if (outcome === 'pickoff_out') event.basesAfter[pickoffBase - 1] = null;
    const step = choreographPlayEvent(event, 1, before, { humanBatting: true });
    const play = step.play!;
    const bag = BASE_PATH_VERTICES[pickoffBase];
    const cover = pickoffBase === 1 ? '1B' : '2B';
    expect(step.ballStyle).toBeNull();
    expect(step.callout?.text).toBe(outcome === 'pickoff_safe' ? 'SAFE BACK!' : 'PICKED OFF!');
    expect(play.legs).toEqual([{ from: 'P', to: cover, start: .24, end: .62, kind: 'throw' }]);
    const at = (time: number) => actorAt(play, 'RUN', time, 'L');
    expect(actorAt(play, 'P', 0, 'L').clip).toBe('pitch_stretch_set');
    expect(actorAt(play, 'P', .24, 'L').clip).toBe('field_throw');
    expect(actorAt(play, 'P', .22, 'L').yaw).not.toBe(0);
    expect(actorAt(play, cover, play.receiveAt, 'L').clip).toBe('field_receive');
    expect(actorAt(play, cover, play.finish, 'L').clip).toBe('field_tag');
    expect(at(0).pos).not.toEqual(bag);
    expect(at(.5).clip).toBe('runner_slide');
    expect(at(play.leadArrival + .01).pos).toEqual(bag);
    expect(outcome === 'pickoff_safe' ? play.leadArrival < play.finish : play.leadArrival > play.finish).toBe(true);
    if (outcome === 'pickoff_safe') expect(at(play.duration).clip).toBe('slide_safe');
    const focus = diamondCamera(play, play.finish, 'L').lookAt;
    expect(Math.hypot(focus.x - bag.x, focus.z - bag.z)).toBeLessThan(.6);
    if (pickoffBase === 2) {
      const short = choreographPlayEvent({ ...event, fieldingHighlight: {
        fielderPos: 'SS', fielderId: 'short', anim: 'field_run',
      } }, 1, before);
      expect(short.play!.legs[0].to).toBe('SS');
    }
  });
});

it.each(['robbery', 'dive', 'pickoff_out', 'pickoff_safe'] as const)('renders the %s at the glove or bag', kind => {
  const pickoff = kind === 'pickoff_out' || kind === 'pickoff_safe';
  const event: PlayEvent = {
    seq: 1, type: pickoff ? 'pickoff' : 'ball_in_play', outcome: pickoff ? kind : 'fly_out',
    pickoffBase: pickoff ? 2 : undefined, inning: 2, half: 'TOP', outsBefore: 2,
    outsAfter: kind === 'pickoff_safe' ? 2 : 3, balls: 0, strikes: 0, homeScore: 0, awayScore: 0,
    basesAfter: [null, kind === 'pickoff_safe' ? 'runner' : null, null], isClutchMoment: false, commentary: '',
    fieldingHighlight: pickoff ? undefined : { fielderPos: 'CF', fielderId: 'center', webGem: true,
      robbedHomeRun: kind === 'robbery', anim: kind === 'robbery' ? 'field_high_jump' : 'field_dive' },
  };
  const play = choreographPlayEvent(event, 1, [null, 'runner', null]).play!;
  const options = { traits: createPortraitTraits(117), team: { primary: '#123456', secondary: '#eeeeee', accent: '#ffdd55', monogram: 'W' }, jerseyNumber: 8 };
  const cast = {} as DiamondCast;
  for (const actor of ['P', 'C', 'BAT', 'RUN', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const) {
    const role = actor === 'P' ? 'pitcher' : actor === 'C' ? 'catcher' : actor === 'BAT' ? 'batter' : 'fielder';
    cast[actor] = createPaintedPlayerRig({ ...options, role }, 0, actor === 'RUN');
  }
  const camera = new PerspectiveCamera(40, 1.5, .2, 180);
  const vfx = createBallparkVfxSystem();
  const caption = vi.spyOn(vfx, 'spawnComicCallout');
  const sparkle = vi.spyOn(vfx.celebration, 'starSparkle');
  const chalk = vi.spyOn(vfx, 'kickChalk');
  const impact = vi.spyOn(vfx, 'impact');
  const signal = vi.spyOn(vfx.umpire, 'signal');
  try {
    const when = pickoff ? play.finish : play.pickupAt;
    renderDiamondPlay(play, cast, 'R', when, when - .01, camera, 240, vfx);
    expect(sparkle).toHaveBeenCalledTimes(pickoff ? 0 : 1);
    if (pickoff) {
      expect(vfx.umpire.sprite.visible).toBe(true);
      expect(signal).toHaveBeenCalledWith(kind === 'pickoff_safe', 0);
      expect(caption).toHaveBeenCalledExactlyOnceWith(kind === 'pickoff_safe' ? 'SAFE BACK!' : 'PICKED OFF!',
        expect.anything(), kind === 'pickoff_safe' ? '#167457' : '#C1394C', 'contact');
      renderDiamondPlay(play, cast, 'R', play.leadArrival, play.leadArrival - .01, camera, 240, vfx);
      expect(chalk).toHaveBeenCalledExactlyOnceWith(play.fieldAt);
    } else if (kind === 'robbery') {
      const [pocket] = impact.mock.calls[0];
      expect(caption).toHaveBeenCalledExactlyOnceWith('ROBBED!!', pocket, '#FF4D6D', 'contact');
      expect(impact).toHaveBeenCalledExactlyOnceWith(pocket, '#FFD166');
      expect(chalk).not.toHaveBeenCalled();
      expect(pocket.y).toBeGreaterThan(3.42); // Top of the yellow home-run rail.
      const before = diamondCamera(play, when - .001, 'R');
      const at = diamondCamera(play, when, 'R');
      expect(Math.abs(at.position.z - before.position.z)).toBeLessThan(.05);
    } else {
      const [pocket] = impact.mock.calls[0];
      expect(caption).toHaveBeenCalledExactlyOnceWith('WEB GEM!', pocket, '#00B4D8', 'contact');
      expect(chalk).toHaveBeenCalledExactlyOnceWith(pocket);
    }
  } finally {
    Object.values(cast).forEach(rig => rig.dispose());
    vfx.dispose();
  }
});

it('plays a starred batter’s walkoff from the live clock, with matching audio and reduced-motion timing', () => {
  let tick!: FrameRequestCallback;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { tick = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const draw = vi.spyOn(replayRenderer, 'renderDiamondPlay');
  const makeClub = (id: string, seed: number) => createClub(createSeededRng(seed), {
    id, city: 'Bay', name: id, mascot: 'Gull', leagueTier: 'rookie', isHuman: false,
    colors: { primary: '#123456', secondary: '#eeeeee', accent: '#ffdd55', monogram: 'B' },
  });
  const away = makeClub('away', 7), home = makeClub('home', 8);
  const session = createGameSession(away, home, 123);
  const batterId = session.home.lineup[0].playerId;
  const event: PlayEvent = { seq: 1, type: 'ball_in_play', outcome: 'single', inning: 9, half: 'BOT',
    outsBefore: 1, outsAfter: 1, balls: 0, strikes: 0, homeScore: 1, awayScore: 0, batterId,
    basesAfter: [batterId, null, null], isClutchMoment: true, commentary: '' };
  const step = choreographPlayEvent(event, 1, [null, null, 'winning-runner'], { walkoff: true });
  step.durationMs = step.play!.duration * 1000;
  const contact = step.play!.legs[0].end;
  const saved = useGameStore.getState().favoritePlayerIds;
  const controller = new GameSceneController(document.createElement('div'));
  const cue = vi.fn();
  controller.setOnAudioCue(cue);
  try {
    useGameStore.setState({ favoritePlayerIds: [batterId] });
    const broken = { ...event, brokenBat: true };
    let start = 0;
    for (const reduced of [false, true]) {
      controller.setCameraOverride(null, reduced);
      controller.syncMatchup(away, home, session, step, broken);
      tick((start + contact - .01) * 1000);
      const fx = draw.mock.lastCall![7];
      const update = vi.spyOn(fx, 'update');
      tick((start + contact + .01) * 1000);
      const [play, , , time] = draw.mock.lastCall!;
      expect(play).toMatchObject({ favoriteSparkle: true, brokenBat: true });
      expect(time - contact).toBeCloseTo(.01 * (reduced ? 1 : .38), 6);
      expect(update.mock.lastCall![0]).toBeCloseTo(.02 * (reduced ? 1 : .38), 6);
      expect(cue.mock.calls.filter(([name]) => name === 'broken_bat')).toHaveLength(1);
      expect(fx.group.getObjectByName('favorite stars')!.visible).toBe(!reduced);
      cue.mockClear();
      start += contact + .01;
    }
  } finally {
    controller.dispose();
    useGameStore.setState({ favoritePlayerIds: saved });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
