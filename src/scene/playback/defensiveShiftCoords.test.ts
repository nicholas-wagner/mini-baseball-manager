import { describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { createClub } from '../../engine/gm/rosterFactory';
import { createSeededRng } from '../../engine/rng/seededRng';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import type { PlayEvent } from '../../engine/models/playEvent';
import { GameSceneController } from './gameSceneController';
import { choreographPlayEvent, DIAMOND_DEFENDER_COORDS } from './eventChoreographer';
import { BASE_PATH_VERTICES, OUTFIELD_STARTS } from './diamondLayout';
import { getShiftDefenderCoords } from './defensiveShiftCoords';

describe('TASK-118 — Pure 3D Defensive Shift Coordinates (defensiveShiftCoords)', () => {
  it('matches DIAMOND_DEFENDER_COORDS and OUTFIELD_STARTS exactly for standard alignment with empty bases', () => {
    const coords = getShiftDefenderCoords('standard');
    for (const entry of DIAMOND_DEFENDER_COORDS) {
      expect(coords[entry.pos]).toEqual({ x: entry.x, y: entry.y, z: entry.z });
    }
    expect(coords.LF).toEqual(OUTFIELD_STARTS.LF);
    expect(coords.CF).toEqual(OUTFIELD_STARTS.CF);
    expect(coords.RF).toEqual(OUTFIELD_STARTS.RF);
  });

  it('brings all 4 infielders noticeably closer to home plate on infield_in', () => {
    const standard = getShiftDefenderCoords('standard');
    const infieldIn = getShiftDefenderCoords('infield_in');

    for (const pos of ['1B', '2B', 'SS', '3B'] as const) {
      const dz = infieldIn[pos].z - standard[pos].z;
      expect(dz).toBeGreaterThanOrEqual(2.8);
      expect(dz).toBeLessThanOrEqual(3.4);
    }
    // Outfielders remain unchanged on infield_in
    expect(infieldIn.LF).toEqual(standard.LF);
    expect(infieldIn.CF).toEqual(standard.CF);
    expect(infieldIn.RF).toEqual(standard.RF);
  });

  it('pushes outfielders deeper toward the warning track and widens 1B/3B toward the foul lines on no_doubles', () => {
    const standard = getShiftDefenderCoords('standard');
    const noDoubles = getShiftDefenderCoords('no_doubles');

    for (const pos of ['LF', 'CF', 'RF'] as const) {
      expect(noDoubles[pos].z).toBeCloseTo(standard[pos].z - 3.6, 5);
    }
    expect(Math.abs(noDoubles['1B'].x) - Math.abs(standard['1B'].x)).toBeCloseTo(1.4, 5);
    expect(Math.abs(noDoubles['3B'].x) - Math.abs(standard['3B'].x)).toBeCloseTo(1.4, 5);
  });

  it('charges 1B/3B aggressively toward home, shades 2B toward 1B, and moves SS toward 2B on bunt_defense', () => {
    const standard = getShiftDefenderCoords('standard');
    const bunt = getShiftDefenderCoords('bunt_defense');

    expect(bunt['1B'].z - standard['1B'].z).toBeCloseTo(4.4, 5);
    expect(bunt['3B'].z - standard['3B'].z).toBeCloseTo(4.4, 5);
    expect(Math.abs(bunt['1B'].x)).toBeLessThan(Math.abs(standard['1B'].x));
    expect(Math.abs(bunt['3B'].x)).toBeLessThan(Math.abs(standard['3B'].x));

    // 2B shades toward 1B (+x, +z); SS shades toward 2B (closer to x=0)
    expect(bunt['2B'].x).toBeGreaterThan(standard['2B'].x);
    expect(bunt['2B'].z).toBeGreaterThan(standard['2B'].z);
    expect(Math.abs(bunt.SS.x)).toBeLessThan(Math.abs(standard.SS.x));
  });

  it('shifts 1B to hold the bag whenever bases[0] is occupied and returns fresh immutable vectors', () => {
    const withRunner1B = getShiftDefenderCoords('standard', ['runner-1', null, null]);
    expect(withRunner1B['1B']).toEqual({ x: 9.2, y: 0.04, z: -10.1 });

    const noRunner1B = getShiftDefenderCoords('standard', [null, 'runner-2', null]);
    expect(noRunner1B['1B']).toEqual({ x: 8.8, y: 0.04, z: -11.4 });

    // Mutating returned object never corrupts subsequent calls
    withRunner1B['1B'].x = 999;
    expect(getShiftDefenderCoords('standard', ['runner-1', null, null])['1B'].x).toBe(9.2);
  });
});

const render = vi.hoisted(() => vi.fn<(scene: THREE.Scene) => void>());
vi.mock('three', async importOriginal => ({
  ...await importOriginal<typeof THREE>(),
  WebGLRenderer: class {
    domElement = document.createElement('canvas');
    setPixelRatio() {}
    setSize() {}
    render = render;
    dispose() {}
  },
}));

function withGame(check: (game: GameSceneController, tick: FrameRequestCallback, scene: THREE.Scene) => void) {
  let tick!: FrameRequestCallback;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => { tick = frame; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const game = new GameSceneController(document.createElement('div'));
  try {
    tick(0);
    check(game, tick, render.mock.lastCall![0]);
  } finally {
    game.dispose();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
}

it('glides idle rigs into a live shift and snaps them back in reduced motion', () => {
  withGame((game, tick, scene) => {
    const rig = scene.getObjectByName('CF')!;
    const standard = rig.position.z;
    game.setDefensiveShift('no_doubles');
    tick(16);
    expect(rig.position.z).toBeLessThan(standard);
    expect(rig.position.z).toBeGreaterThan(getShiftDefenderCoords('no_doubles').CF.z);
    game.setCameraOverride(null, true);
    game.setDefensiveShift('standard');
    tick(32);
    expect(rig.position.z).toBe(standard);
  });
});

it('holds first while the correct runner dives back to second and applies the next shift after the tag', () => {
  const club = (id: string, seed: number) => createClub(createSeededRng(seed), {
    id, city: 'Bay', name: id, mascot: 'Gull', leagueTier: 'rookie', isHuman: false,
    colors: { primary: '#123456', secondary: '#eeeeee', accent: '#ffdd55', monogram: 'B' },
  });
  const away = club('away', 7), home = club('home', 8);
  const session = createGameSession(away, home, 117);
  const before: PlayEvent['basesAfter'] = [away.roster[1].id, away.roster[2].id, null];
  const event: PlayEvent = { seq: 1, inning: 1, half: 'TOP', type: 'pickoff', outcome: 'pickoff_out',
    pickoffBase: 2, balls: 0, strikes: 0, outsBefore: 0, outsAfter: 1, homeScore: 0, awayScore: 0,
    basesAfter: [before[0], null, null], isClutchMoment: false, commentary: '' };
  const step = choreographPlayEvent(event, 1, before);
  withGame((game, tick, scene) => {
    game.setCameraOverride(null, true);
    game.setDefensiveShift('no_doubles');
    game.syncMatchup(away, home, session, step, event);
    const atBag = (base: 1 | 2) => scene.children.find(node => node.visible && node.position.equals(BASE_PATH_VERTICES[base]))!;
    const firstRunner = atBag(1), secondRunner = atBag(2);
    tick(100);
    expect(firstRunner.position.equals(BASE_PATH_VERTICES[1])).toBe(true);
    expect(secondRunner.position.distanceTo(BASE_PATH_VERTICES[2])).toBeGreaterThan(1);
    const firstBase = scene.getObjectByName('1B')!;
    const center = scene.getObjectByName('CF')!;
    expect(firstBase.position.equals(getShiftDefenderCoords('no_doubles', before)['1B'])).toBe(true);
    game.setDefensiveShift('standard');
    tick(500);
    expect(center.position.z).toBe(getShiftDefenderCoords('no_doubles').CF.z);
    tick(step.durationMs + 100);
    expect(secondRunner.position.equals(BASE_PATH_VERTICES[2])).toBe(true);
    expect(center.position.z).toBe(getShiftDefenderCoords('standard').CF.z);
  });
});
