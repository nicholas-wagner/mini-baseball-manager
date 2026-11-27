import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GameSceneController } from './gameSceneController';
import { generateSixTierWorld } from '../../engine/league/seasonEngine';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import { choreographPlayEvent } from './eventChoreographer';
import type { GameDayWeather } from '../../engine/simulation/weather';
import type { PlayEvent } from '../../engine/models/playEvent';
import { createMiniBallpark } from '../ballpark/ballparkBuilder';

const render = vi.hoisted(() => vi.fn<(scene: THREE.Scene, camera: THREE.Camera) => void>());
vi.mock('three', async importOriginal => ({
  ...await importOriginal<typeof THREE>(),
  WebGLRenderer: class {
    domElement = document.createElement('canvas');
    setPixelRatio() { }
    setSize() { }
    render = render;
    dispose() { }
  },
}));

const [home, away] = generateSixTierWorld(1994, {
  city: 'Sandlot', clubName: 'Comets', mascot: 'Rocket', monogram: 'SC',
  primaryColor: '#ee4444', secondaryColor: '#123456', accentColor: '#ffdd44',
}).leagues.rookie;
const session = createGameSession(away, home, 1994, 'regular', 5);
const event: PlayEvent = {
  type: 'pitch_thrown', seq: 1, inning: 1, half: 'TOP', outsBefore: 0, outsAfter: 0,
  awayScore: 0, homeScore: 0, balls: 1, strikes: 0, basesAfter: [null, null, null],
  commentary: '', isClutchMoment: false, outcome: 'ball',
};
function weather(condition: GameDayWeather['condition'], windDirection: GameDayWeather['windDirection']): GameDayWeather {
  return { condition, windDirection, windMph: 14, isNightGame: condition === 'floodlight_night', rainDelayRisk: 0 };
}
function mount() {
  let tick!: FrameRequestCallback;
  vi.stubGlobal('ResizeObserver', class { observe() { } disconnect() { } });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { tick = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { });
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const host = document.createElement('div');
  Object.defineProperties(host, { clientWidth: { value: 360 }, clientHeight: { value: 220 } });
  const game = new GameSceneController(host);
  const frame = (sec: number) => { tick(sec * 1000); return render.mock.lastCall![0]; };
  return { game, frame };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); render.mockClear(); });

it('places clouds at the same position after one second on 60 and 120 Hz displays', () => {
  const park = createMiniBallpark();
  try {
    const cloud = park.group.getObjectByName('drifting cloud')!;
    const at = (hz: number) => {
      for (let i = 0; i <= hz; i++) park.update(i / hz, .2);
      return cloud.position.x;
    };
    const start = cloud.position.x;
    const sixty = at(60);
    expect(sixty).not.toBeCloseTo(start);
    expect(at(120)).toBeCloseTo(sixty);
  } finally { park.dispose(); }
});

it('lifts the section behind home together on a hit and settles back into the same idle motion', () => {
  const park = createMiniBallpark();
  try {
    const shirts = park.group.children.find(node => node instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    const heights = (time: number) => {
      park.update(time, .2);
      const matrix = new THREE.Matrix4();
      return [0, shirts.count - 1].map(i => {
        shirts.getMatrixAt(i, matrix);
        return matrix.elements[13];
      });
    };
    const rest = heights(1.4);
    const settled = heights(3);
    park.cheerBehindHome(1);
    const reaction = heights(1.4);
    expect(reaction[0] - rest[0]).toBeGreaterThan(.45);
    expect(reaction[1]).toBe(rest[1]);
    expect(heights(3)).toEqual(settled);
  } finally { park.dispose(); }
});

it('changes the horizon, lights, wind and drizzle together, including a reduced-motion toggle', () => {
  const { game, frame } = mount();
  try {
    const scene = frame(0);
    const palette = () => [
      (scene.background as THREE.Color).getHex(),
      (scene.fog as THREE.Fog).color.getHex(),
      (scene.getObjectByName('painted horizon') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.color.getHex(),
      (scene.getObjectByProperty('type', 'DirectionalLight') as THREE.DirectionalLight).color.getHex(),
      (scene.getObjectByProperty('type', 'HemisphereLight') as THREE.HemisphereLight).color.getHex(),
    ];
    const day = palette();
    for (const condition of ['golden_sunset', 'floodlight_night', 'drizzle'] as const) {
      game.setWeather(weather(condition, 'blowing_in'));
      frame(.5);
      expect(palette().every((c, i) => c !== day[i])).toBe(true);
      expect(scene.getObjectByName('lamp halo')!.visible).toBe(condition === 'floodlight_night');
      expect(scene.getObjectByName('drizzle')!.visible).toBe(condition === 'drizzle');
    }
    const pennant = scene.getObjectByName('outfield pennant')!;
    const incoming = pennant.rotation.y;
    game.setWeather(weather('drizzle', 'blowing_out'));
    frame(.51);
    expect(Math.cos(incoming - pennant.rotation.y)).toBeLessThan(-.8);
    game.setCameraOverride('broadcast_diamond', true);
    frame(.6);
    expect(scene.getObjectByName('drizzle')!.visible).toBe(false);
    game.setWeather(null);
    expect(palette()).toEqual(day);
  } finally { game.dispose(); }
});

it('keeps the original target at the called spot through a miss and clears it after reception', () => {
  const { game, frame } = mount();
  try {
    const step = choreographPlayEvent(event, 1);
    step.play!.pitchTarget = 'bury_offspeed';
    game.syncMatchup(away, home, session, step, event);
    const plate = step.play!.legs[0].end;
    const scale = step.durationMs / (step.play!.duration * 1000);
    const scene = frame(.1);
    const target = scene.getObjectByName('called pitch target')!;
    expect(target.visible).toBe(true);
    const pos = target.position.clone();
    frame((plate + .12) * scale);
    expect(target.visible).toBe(true);
    expect(target.position.distanceTo(pos)).toBeLessThan(.02);
    expect(scene.getObjectByName('catcher')!.scale.y).toBe(1);
    frame((plate + .5) * scale);
    expect(target.visible).toBe(false);
  } finally { game.dispose(); }
});

it('starts a barrel wave at contact, celebrates the homer at the wall, and suppresses bursts in steady mode', () => {
  const { game, frame } = mount();
  const homer: PlayEvent = {
    ...event, type: 'ball_in_play', outcome: 'home_run', specialPowerTriggered: {
      actor: 'batter', powerId: 'eagle_soar', calloutText: 'EAGLE SOAR!', vfxColor: '#ffaa20',
    }
  };
  const step = choreographPlayEvent(homer, 1);
  try {
    game.syncMatchup(away, home, session, step, homer);
    const scene = frame(.01);
    const visible = (name: string) => scene.getObjectByName(name)!.visible;
    expect(visible('home run fireworks')).toBe(false);
    const contact = step.play!.legs[0].end;
    frame(contact + .02);
    expect(visible('barrel wave')).toBe(true);
    expect(visible('power aura')).toBe(true);
    frame(step.play!.legs[1].end + .03);
    expect(visible('home run fireworks')).toBe(true);
    frame(step.play!.legs[1].end + .52);
    const camera = render.mock.lastCall![1];
    camera.updateMatrixWorld();
    const stars = scene.getObjectByName('home run fireworks') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    let onScreen = 0;
    for (let i = 0; i < stars.count; i++) {
      stars.getMatrixAt(i, matrix);
      const p = new THREE.Vector3().setFromMatrixPosition(matrix).project(camera);
      if (Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) < 1) onScreen++;
    }
    expect(onScreen).toBeGreaterThan(stars.count / 2);
    game.setCameraOverride(null, true);
    frame(step.play!.legs[1].end + .54);
    expect(visible('home run fireworks')).toBe(false);
  } finally { game.dispose(); }
});

it('selects the delivery from the occupied bases before the play, even when a single fills first', () => {
  const single = {...event, outcome: 'single' as const, basesAfter: ['hitter',null,null] as PlayEvent['basesAfter']};
  for (const outcome of ['ball','single','ground_out'] as const) {
    const pitch = {...single, type: outcome === 'ball' ? 'pitch_thrown' as const : 'ball_in_play' as const, outcome};
    const empty = choreographPlayEvent(pitch,1,[null,null,null]).play!;
    const occupied = choreographPlayEvent(pitch,1,[null,'runner',null]).play!;
    expect(empty.legs[0].start).toBeCloseTo(.76,2);
    expect(occupied.legs[0].start).toBeCloseTo(.50,2);
    expect(occupied.legs[0].end - occupied.legs[0].start).toBeCloseTo(empty.legs[0].end - empty.legs[0].start);
  }
});

it('sets from the stretch before a pitch, checks the runner and shakes off then nods to ready', () => {
  const {game, frame} = mount();
  try {
    game.syncMatchup(away,home,session);
    const pitcher = frame(.1).getObjectByName('pitcher')!;
    const head = pitcher.getObjectByName('painted head')!.parent!;
    const body = pitcher.getObjectByName('painted uniform') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
    const windup = body.material.uniforms.sheet.value;
    game.syncMatchup(away,home,{...session, bases:['runner',null,null]});
    frame(.2);
    const stretch = body.material.uniforms.sheet.value;
    expect(stretch).not.toBe(windup);
    const yaw = head.rotation.y;
    frame(1.2);
    expect(Math.abs(head.rotation.y-yaw)).toBeGreaterThan(.08);
    game.triggerPitcherShakeOff();
    frame(1.28);
    const first = head.rotation.y;
    frame(1.43);
    expect(first * head.rotation.y).toBeLessThan(0);
    frame(1.78);
    expect(Math.abs(head.rotation.x)).toBeGreaterThan(.03);
    frame(3.4);
    expect(head.rotation.x).toBe(0);
    expect(body.material.uniforms.sheet.value).toBe(stretch);
  } finally { game.dispose(); }
});
