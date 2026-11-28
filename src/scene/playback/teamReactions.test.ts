import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClub } from '../../engine/gm/rosterFactory';
import type { PlayEvent } from '../../engine/models/playEvent';
import { createSeededRng } from '../../engine/rng/seededRng';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import { createMiniBallpark } from '../ballpark/ballparkBuilder';
import { createBallparkVfxSystem } from '../vfx/vfxSystem';
import { BASE_PATH_VERTICES } from './diamondLayout';
import { actorAt, diamondPlay } from './diamondPlay';
import { choreographPlayEvent } from './eventChoreographer';
import { GameSceneController } from './gameSceneController';
import * as replayRenderer from './renderDiamondPlay';
import { renderDiamondPlay, type DiamondCast } from './renderDiamondPlay';
import {
  computeStadiumWaveLift,
  railReaction,
  selectLiveActorMood,
  toPortraitMood,
} from './teamReactions';

const render = vi.hoisted(() => vi.fn<(scene: THREE.Scene, camera: THREE.Camera) => void>());

vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three')>()),
  WebGLRenderer: class {
    domElement = document.createElement('canvas');
    setPixelRatio() {}
    setSize() {}
    render = render;
    dispose() {}
  },
}));

function makeMockCast() {
  const makeRig = () => ({
    root: new THREE.Group(),
    logicalYaw: 0,
    updatePose: vi.fn(),
    setCatchHeight: vi.fn(),
    preparePlayback: vi.fn(),
    updateAppearance: vi.fn(),
    dispose: vi.fn(),
    batGripAt: () => new THREE.Vector3(0, 1, 0),
    releasePoint: () => new THREE.Vector3(0, 1.4, -10),
    contactAt: () => new THREE.Vector3(0.2, 1.1, 0),
  });
  const cast: DiamondCast = {
    P: makeRig(),
    C: makeRig(),
    BAT: makeRig(),
    RUN: makeRig(),
    LF: makeRig(),
    CF: makeRig(),
    RF: makeRig(),
    SS: makeRig(),
    '1B': makeRig(),
    '2B': makeRig(),
    '3B': makeRig(),
  };
  return cast;
}

function makeBaseEvent(overrides: Partial<PlayEvent> = {}): PlayEvent {
  return {
    seq: 1,
    type: 'ball_in_play',
    inning: 5,
    half: 'BOT',
    outsBefore: 1,
    outsAfter: 1,
    balls: 1,
    strikes: 2,
    awayScore: 2,
    homeScore: 2,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: '',
    outcome: 'home_run',
    ...overrides,
  };
}

function mountController() {
  let tick!: FrameRequestCallback;
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    tick = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const host = document.createElement('div');
  Object.defineProperties(host, { clientWidth: { value: 420 }, clientHeight: { value: 260 } });
  const controller = new GameSceneController(host);
  const frame = (sec: number) => {
    tick(sec * 1000);
    return render.mock.lastCall![0];
  };
  return { controller, frame };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  render.mockClear();
});

describe('computeStadiumWaveLift', () => {
  it('peaks sequentially from left field (-25) to center (0) to right field (+25)', () => {
    const samplePeak = (fanX: number) => {
      let bestLift = -1;
      let bestAge = -1;
      for (let age = 0; age <= 2.4; age += 0.02) {
        const lift = computeStadiumWaveLift(fanX, age, false);
        if (lift > bestLift) {
          bestLift = lift;
          bestAge = age;
        }
      }
      return { bestLift, bestAge };
    };

    const left = samplePeak(-25);
    const center = samplePeak(0);
    const right = samplePeak(25);

    expect(left.bestAge).toBeLessThan(center.bestAge);
    expect(center.bestAge).toBeLessThan(right.bestAge);
    expect(left.bestLift).toBeGreaterThan(0.8);
    expect(left.bestLift).toBeLessThanOrEqual(0.95);
    expect(center.bestLift).toBeGreaterThan(0.8);
    expect(center.bestLift).toBeLessThanOrEqual(0.95);
    expect(right.bestLift).toBeGreaterThan(0.8);
    expect(right.bestLift).toBeLessThanOrEqual(0.95);

    // When wave crests in center, far wings are low
    expect(computeStadiumWaveLift(0, center.bestAge, false)).toBeGreaterThan(
      computeStadiumWaveLift(-25, center.bestAge, false) + 0.5,
    );
    expect(computeStadiumWaveLift(0, center.bestAge, false)).toBeGreaterThan(
      computeStadiumWaveLift(25, center.bestAge, false) + 0.5,
    );
  });

  it('returns 0 outside the wave window and under reducedMotion', () => {
    expect(computeStadiumWaveLift(0, -0.1, false)).toBe(0);
    expect(computeStadiumWaveLift(0, 2.5, false)).toBe(0);
    expect(computeStadiumWaveLift(-25, 2.5, false)).toBe(0);
    expect(computeStadiumWaveLift(25, Number.POSITIVE_INFINITY, false)).toBe(0);
    expect(computeStadiumWaveLift(0, 1.2, true)).toBe(0);
    expect(computeStadiumWaveLift(-25, 0.35, true)).toBe(0);
  });

  it('sweeps instanced bleacher fans left-to-right via BallparkEnvironment.triggerWave', () => {
    const park = createMiniBallpark();
    try {
      const shirts = park.group.children.find(
        (node): node is THREE.InstancedMesh => node instanceof THREE.InstancedMesh,
      )!;
      const matrix = new THREE.Matrix4();
      const readPositions = (timeSec: number) => {
        park.update(timeSec, 0.2);
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < shirts.count; i += 1) {
          shirts.getMatrixAt(i, matrix);
          pts.push({ x: matrix.elements[12], y: matrix.elements[13] });
        }
        return pts;
      };

      const baseline = readPositions(5.0);
      let leftIdx = 0;
      let rightIdx = 0;
      for (let i = 1; i < baseline.length; i += 1) {
        if (baseline[i].x < baseline[leftIdx].x) leftIdx = i;
        if (baseline[i].x > baseline[rightIdx].x) rightIdx = i;
      }

      const restEarly = readPositions(5.32);
      const restLate = readPositions(7.08);

      park.triggerWave(5.0);
      const waveEarly = readPositions(5.32);
      const waveLate = readPositions(7.08);

      expect(waveEarly[leftIdx].y - restEarly[leftIdx].y).toBeGreaterThan(0.5);
      expect(waveEarly[rightIdx].y - restEarly[rightIdx].y).toBeLessThan(0.1);
      expect(waveLate[rightIdx].y - restLate[rightIdx].y).toBeGreaterThan(0.5);
      expect(waveLate[leftIdx].y - restLate[leftIdx].y).toBeLessThan(0.1);

      // Reduced motion suppresses the wave lift
      park.setWeather(null, true);
      const steadyAtRest = readPositions(10.0);
      park.triggerWave(10.0);
      const steadyDuringWave = readPositions(11.2);
      expect(steadyDuringWave[leftIdx].y).toBeCloseTo(steadyAtRest[leftIdx].y, 5);
    } finally {
      park.dispose();
    }
  });
});

describe('selectLiveActorMood', () => {
  it('returns focused for pitcher and batter before contact in high-leverage moments', () => {
    const play = diamondPlay('home_run');
    const beforeContact = play.legs[0].end - 0.15;

    expect(selectLiveActorMood({ actor: 'P', play, time: beforeContact, isHighLeverage: true })).toBe('focused');
    expect(selectLiveActorMood({ actor: 'BAT', play, time: beforeContact, isHighLeverage: true })).toBe('focused');
    expect(selectLiveActorMood({ actor: 'CF', play, time: beforeContact, isHighLeverage: true })).toBeUndefined();
    expect(selectLiveActorMood({ actor: 'P', play, time: beforeContact, isHighLeverage: false })).toBeUndefined();
    expect(toPortraitMood('focused')).toBe('determined');
    expect(toPortraitMood('happy')).toBe('happy');
    expect(toPortraitMood(undefined)).toBeUndefined();
  });

  it('returns happy for batter/runner after hits, home runs, steals safe, and walkoffs', () => {
    const hr = diamondPlay('home_run');
    expect(selectLiveActorMood({ actor: 'BAT', play: hr, time: hr.legs[0].end + 0.1 })).toBe('happy');
    expect(selectLiveActorMood({ actor: 'P', play: hr, time: hr.legs[0].end + 0.1 })).toBeUndefined();

    const single = diamondPlay('single');
    expect(selectLiveActorMood({ actor: 'BAT', play: single, time: single.legs[0].end + 0.05 })).toBe('happy');

    const steal = diamondPlay('steal_safe');
    expect(selectLiveActorMood({ actor: 'RUN', play: steal, time: steal.leadArrival + 0.05 })).toBe('happy');

    const walkoff = diamondPlay('sac_fly');
    walkoff.ending = { kind: 'walkoff', start: walkoff.leadArrival, scorer: 'RUN' };
    expect(selectLiveActorMood({ actor: 'RUN', play: walkoff, time: walkoff.ending.start + 0.1 })).toBe('happy');
  });

  it('returns happy for fielder and pitcher after HR robberies, web gems, strikeouts, and pickoff outs', () => {
    const robberyEvent = makeBaseEvent({
      outcome: 'fly_out',
      outsAfter: 2,
      fieldingHighlight: {
        fielderId: 'cf-1',
        fielderPos: 'CF',
        anim: 'field_high_jump',
        robbedHomeRun: true,
        webGem: true,
      },
    });
    const robbery = diamondPlay('fly_out', 'CF', robberyEvent);
    expect(selectLiveActorMood({ actor: 'CF', play: robbery, time: robbery.pickupAt + 0.05 })).toBe('happy');
    expect(selectLiveActorMood({ actor: 'P', play: robbery, time: robbery.pickupAt + 0.05 })).toBe('happy');
    expect(selectLiveActorMood({ actor: 'BAT', play: robbery, time: robbery.pickupAt + 0.05 })).toBeUndefined();

    const diveEvent = makeBaseEvent({
      outcome: 'line_out',
      outsAfter: 2,
      fieldingHighlight: {
        fielderId: 'ss-1',
        fielderPos: 'SS',
        anim: 'field_dive',
        webGem: true,
      },
    });
    const webGem = diamondPlay('infield_liner', 'SS', diveEvent);
    expect(selectLiveActorMood({ actor: 'SS', play: webGem, time: webGem.pickupAt + 0.05 })).toBe('happy');
    expect(selectLiveActorMood({ actor: 'P', play: webGem, time: webGem.pickupAt + 0.05 })).toBe('happy');

    const strikeout = diamondPlay('swinging_third');
    expect(selectLiveActorMood({ actor: 'P', play: strikeout, time: strikeout.finish + 0.1 })).toBe('happy');
    expect(selectLiveActorMood({ actor: 'BAT', play: strikeout, time: strikeout.finish + 0.1 })).toBeUndefined();

    const pickoff = diamondPlay('pickoff_out', undefined, undefined, 1);
    expect(selectLiveActorMood({ actor: 'P', play: pickoff, time: pickoff.finish + 0.05 })).toBe('happy');
    expect(selectLiveActorMood({ actor: '1B', play: pickoff, time: pickoff.finish + 0.05 })).toBe('happy');
    expect(selectLiveActorMood({ actor: 'RUN', play: pickoff, time: pickoff.finish + 0.05 })).toBeUndefined();
  });
});

describe('home run dugout celebration styles & live mood rendering', () => {
  it('drives synchronized hopping dance-line poses from railReaction on dugout_dance_line homers', () => {
    const danceHr = { ...diamondPlay('home_run'), hrCelebration: 'dugout_dance_line' as const };
    const t = danceHr.pickupAt + 0.25;
    const pose0 = railReaction(danceHr, t, 0);
    const pose1 = railReaction(danceHr, t, 1);

    expect(pose0).toBeDefined();
    expect(pose1).toBeDefined();
    expect(pose0!.clip).toBe('celebrate_hr');
    expect(pose1!.clip).toBe('celebrate_hr');
    expect(pose0!.pos.y).toBeGreaterThan(0.04);
    expect(pose1!.pos.y).toBeGreaterThan(0.04);
    expect(pose0!.pos.x).not.toBeCloseTo(pose1!.pos.x, 3);
    expect(pose0!.local).not.toBeCloseTo(pose1!.local, 3);

    // Before the ball clears the fence, dance line hasn't started yet
    expect(railReaction(danceHr, danceHr.pickupAt - 0.1, 0)).toBeUndefined();
  });

  it('gives the batter a joyful helmet_tip curtain call at home plate', () => {
    const curtainHr = { ...diamondPlay('home_run'), hrCelebration: 'curtain_call' as const };
    const pose = actorAt(curtainHr, 'BAT', curtainHr.batterArrival + 0.12, 'R');
    expect(pose.clip).toBe('helmet_tip');
    expect(pose.pos).toEqual(BASE_PATH_VERTICES[0]);
  });

  it('triggers golden starSparkle at home plate for helmet_high_five and extra confetti for mascot_confetti', () => {
    const camera = new THREE.PerspectiveCamera(40, 1.5, 0.2, 180);

    // helmet_high_five -> home plate starSparkle
    const highFiveHr = { ...diamondPlay('home_run'), hrCelebration: 'helmet_high_five' as const };
    const vfx1 = createBallparkVfxSystem();
    const cast1 = makeMockCast();
    const sparkleSpy = vi.spyOn(vfx1.celebration, 'starSparkle');
    try {
      renderDiamondPlay(
        highFiveHr,
        cast1,
        'R',
        highFiveHr.batterArrival + 0.02,
        highFiveHr.batterArrival - 0.02,
        camera,
        240,
        vfx1,
      );
      expect(sparkleSpy).toHaveBeenCalledTimes(1);
      expect(sparkleSpy.mock.calls[0][0].x).toBeCloseTo(BASE_PATH_VERTICES[0].x, 3);
      expect(sparkleSpy.mock.calls[0][0].z).toBeCloseTo(BASE_PATH_VERTICES[0].z, 3);
    } finally {
      vfx1.dispose();
    }

    // mascot_confetti -> mascot cannon fires on wall clear even without stadium upgrade + encore at home plate
    const confettiHr = {
      ...diamondPlay('home_run'),
      mascotCannon: false,
      hrCelebration: 'mascot_confetti' as const,
    };
    const vfx2 = createBallparkVfxSystem();
    const cast2 = makeMockCast();
    const homerSpy = vi.spyOn(vfx2.celebration, 'homer');
    const confettiSpy = vi.spyOn(vfx2.celebration, 'confettiBurst');
    try {
      renderDiamondPlay(
        confettiHr,
        cast2,
        'R',
        confettiHr.legs[1].end + 0.02,
        confettiHr.legs[1].end - 0.02,
        camera,
        240,
        vfx2,
      );
      expect(homerSpy).toHaveBeenCalledWith(true);

      renderDiamondPlay(
        confettiHr,
        cast2,
        'R',
        confettiHr.batterArrival + 0.02,
        confettiHr.batterArrival - 0.02,
        camera,
        240,
        vfx2,
      );
      expect(confettiSpy).toHaveBeenCalledTimes(1);
    } finally {
      vfx2.dispose();
    }
  });

  it('passes focused and happy PortraitMood values to rig.updatePose during renderDiamondPlay', () => {
    const play = { ...diamondPlay('home_run'), highLeverage: true };
    const cast = makeMockCast();
    const vfx = createBallparkVfxSystem();
    const camera = new THREE.PerspectiveCamera(40, 1.5, 0.2, 180);
    try {
      const pre = play.legs[0].end - 0.1;
      renderDiamondPlay(play, cast, 'R', pre, pre - 0.02, camera, 240, vfx);
      expect(cast.P.updatePose).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Number),
        'determined',
        expect.anything(),
        expect.any(Boolean),
        expect.any(Boolean),
      );
      expect(cast.BAT.updatePose).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Number),
        'determined',
        expect.anything(),
        expect.any(Boolean),
        expect.any(Boolean),
      );

      const post = play.legs[0].end + 0.1;
      renderDiamondPlay(play, cast, 'R', post, post - 0.02, camera, 240, vfx);
      expect(cast.BAT.updatePose).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Number),
        'happy',
        expect.anything(),
        expect.any(Boolean),
        expect.any(Boolean),
      );
    } finally {
      vfx.dispose();
    }
  });
});

describe('GameSceneController Wave 2 API', () => {
  const makeClub = (id: string, seed: number) =>
    createClub(createSeededRng(seed), {
      id,
      city: 'Bay',
      name: id,
      mascot: 'Gull',
      leagueTier: 'rookie',
      isHuman: id === 'home',
      colors: { primary: '#123456', secondary: '#eeeeee', accent: '#ffdd55', monogram: 'B' },
    });

  it('wires setFavoritePlayerIds, setHrCelebration, and triggerStadiumWave on GameSceneController', () => {
    const { controller, frame } = mountController();
    const draw = vi.spyOn(replayRenderer, 'renderDiamondPlay');
    const away = makeClub('away', 41);
    const home = makeClub('home', 42);
    const session = createGameSession(away, home, 999);
    const batterId = session.home.lineup[0].playerId;
    const cfSlot = session.away.lineup.find((s) => s.defensivePosition === 'CF')!;

    try {
      // 1. Favorite batter + custom HR celebration
      controller.setFavoritePlayerIds([batterId]);
      controller.setHrCelebration('curtain_call');
      const hrEvent = makeBaseEvent({ outcome: 'home_run', batterId, isClutchMoment: true });
      const hrStep = choreographPlayEvent(hrEvent, 1, [null, null, null]);
      controller.syncMatchup(away, home, session, hrStep, hrEvent);
      frame(0.1);
      const [hrPlay] = draw.mock.lastCall!;
      expect(hrPlay.favoriteSparkle).toBe(true);
      expect(hrPlay.hrCelebration).toBe('curtain_call');
      expect(hrPlay.highLeverage).toBe(true);

      // 2. Favorite fielder on a catch/out
      controller.setFavoritePlayerIds([cfSlot.playerId]);
      const catchEvent = makeBaseEvent({
        outcome: 'fly_out',
        batterId,
        outsAfter: 2,
        fieldingHighlight: {
          fielderId: cfSlot.playerId,
          fielderPos: 'CF',
          anim: 'field_run',
        },
      });
      const catchStep = choreographPlayEvent(catchEvent, 1, [null, null, null]);
      controller.syncMatchup(away, home, session, catchStep, catchEvent);
      frame(0.2);
      const [catchPlay] = draw.mock.lastCall!;
      expect(catchPlay.favoriteSparkle).toBe(true);
      expect(catchPlay.hrCelebration).toBeUndefined();

      // 3. Clearing favorites removes favoriteSparkle
      controller.setFavoritePlayerIds([]);
      controller.syncMatchup(away, home, session, hrStep, hrEvent);
      frame(0.3);
      const [unstarredPlay] = draw.mock.lastCall!;
      expect(unstarredPlay.favoriteSparkle).toBeUndefined();

      // 4. triggerStadiumWave lifts stadium fans cleanly without throwing
      controller.syncMatchup(away, home, session);
      const sceneBefore = frame(1.0);
      const shirts = sceneBefore.children
        .flatMap((c) => c.children)
        .find((node): node is THREE.InstancedMesh => node instanceof THREE.InstancedMesh)!;
      const matrix = new THREE.Matrix4();
      let leftIdx = 0;
      let minX = Infinity;
      for (let i = 0; i < shirts.count; i += 1) {
        shirts.getMatrixAt(i, matrix);
        if (matrix.elements[12] < minX) {
          minX = matrix.elements[12];
          leftIdx = i;
        }
      }
      const baseY = (() => {
        shirts.getMatrixAt(leftIdx, matrix);
        return matrix.elements[13];
      })();

      controller.triggerStadiumWave();
      frame(1.32);
      shirts.getMatrixAt(leftIdx, matrix);
      const waveY = matrix.elements[13];
      expect(waveY - baseY).toBeGreaterThan(0.45);
    } finally {
      controller.dispose();
    }
  });
});
