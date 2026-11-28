import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE } from '../characters/animationState';
import { BALL_TRAJECTORY_PRESETS } from '../vfx/ballTrajectory';
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
    const preNodY = head.position.y;
    frame(1.43);
    expect(first * head.rotation.y).toBeLessThan(0);
    frame(1.78);
    // Pitcher nod stays collar-locked (vertical dip + tilt, zero 3D X plane pitch detachment).
    expect(head.rotation.x).toBe(0);
    expect(head.position.y).toBeLessThan(preNodY - 0.002);
    frame(3.4);
    expect(head.rotation.x).toBe(0);
    expect(body.material.uniforms.sheet.value).toBe(stretch);
  } finally { game.dispose(); }
});

it('carries the squared preview into the live bunt without reloading the bat', () => {
  const {game,frame} = mount();
  try {
    game.syncMatchup(away,home,session);
    game.setIdlePreview('bunt');
    const scene = frame(.67);
    const body = scene.getObjectByName('batter')!.getObjectByName('painted uniform') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
    expect(body.material.uniforms.cell.value.x).toBe(3);
    const bunt = {...event, type:'ball_in_play' as const, outcome:'bunt_single' as const};
    game.setPreview(null);
    game.syncMatchup(away,home,session,choreographPlayEvent(bunt,1),bunt);
    frame(.68);
    expect(body.material.uniforms.cell.value.x).toBe(3);
  } finally { game.dispose(); }
});

it.each(['foul','swinging_strike','strikeout','home_run','ball','called_strike','bunt_single'] as const)(
  'shows the handed swing ribbon only through a full swing on %s', outcome => {
    const {game,frame} = mount();
    const action: PlayEvent = {...event,outcome,type:outcome==='home_run'||outcome==='bunt_single'?'ball_in_play':'pitch_thrown'};
    const step = choreographPlayEvent(action,1), plate = step.play!.legs[0].end;
    try {
      game.syncMatchup(away,home,session,step,action);
      const arc = frame(plate+.03).getObjectByName('swing arc')!;
      expect(arc.visible).toBe(['foul','swinging_strike','strikeout','home_run'].includes(outcome));
      game.setCameraOverride(null,true);
      frame(plate+.04);
      expect(arc.visible).toBe(false);
      game.setCameraOverride(null,false);
      frame(plate+.40);
      expect(arc.visible).toBe(false);
    } finally { game.dispose(); }
  });

it.each(['bunt_out','bunt_single'] as const)('drops the squared bat horizontally at the hitter’s hands on a %s', outcome => {
  const { game, frame } = mount();
  const action: PlayEvent = {...event, outcome, type:'ball_in_play'};
  const step = choreographPlayEvent(action,1);
  const play = step.play!, scale = step.durationMs / (play.duration*1000);
  try {
    game.syncMatchup(away,home,session,step,action);
    const drop = play.legs[0].end+.2;
    const scene = frame((drop+.10)*scale);
    const bat = scene.getObjectsByProperty('name','bat barrel').find(node => node.visible && node.parent?.parent === scene)!;
    expect(bat).toBeDefined();
    const along = new THREE.Vector3(0,1,0).applyQuaternion(bat.quaternion);
    expect(Math.abs(along.y)).toBeLessThan(.24);
    expect(bat.position.y).toBeGreaterThan(.25);
    frame((drop+.75)*scale);
    expect(bat.position.y).toBeLessThan(.15);
  } finally { game.dispose(); }
});

it('times the slide-step and barrel smear together for a standalone pitch cue', () => {
  const {game,frame} = mount();
  const action: PlayEvent={...event,outcome:'swinging_strike'};
  const {durationMs,...step}=choreographPlayEvent(action,1,['runner',null,null]);
  const solo = {...step,play:undefined,close:undefined,ballStyle:'fastball' as const,durationMs};
  const release = CLIP_DURATIONS.pitch_stretch * PITCH_RELEASE_PHASE;
  const plate = release + BALL_TRAJECTORY_PRESETS.fastball.durationSec;
  const scale = solo.durationMs/1000/(plate+.42);
  try {
    game.syncMatchup(away,home,session,solo,action);
    const scene = frame((plate+.025)*scale);
    expect(scene.getObjectByName('swing arc')!.visible).toBe(true);
    frame((plate+.24)*scale);
    expect(scene.getObjectByName('swing arc')!.visible).toBe(false);
  } finally { game.dispose(); }
});

it('keeps the mound and batter breathing while the manager reads a completed pitch', () => {
  const {game,frame} = mount();
  const step = choreographPlayEvent(event,1);
  try {
    game.syncMatchup(away,home,session,step,event);
    const end = step.durationMs/1000;
    const scene = frame(end+.1);
    const height = (role: string) => scene.getObjectByName(role)!.getObjectByName('painted head')!.getWorldPosition(new THREE.Vector3()).y;
    const pitcher = height('pitcher'), batter = height('batter');
    frame(end+.67);
    expect(Math.abs(height('pitcher')-pitcher)).toBeGreaterThan(.001);
    expect(Math.abs(height('batter')-batter)).toBeGreaterThan(.001);
  } finally { game.dispose(); }
});
