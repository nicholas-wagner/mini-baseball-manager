import { Group, Mesh, InstancedMesh, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { diamondCamera, diamondPlay } from '../playback/diamondPlay';
import { renderDiamondPlay } from '../playback/renderDiamondPlay';
import { createBallparkVfxSystem } from './vfxSystem';
import { shouldTriggerSplashHit, stageSplashHit } from '../playback/outfieldPlay';
import { createStadiumCelebration } from './stadiumCelebration';

function makeCast() {
  const rig = {
    root: new Group(), logicalYaw: 0, updatePose: vi.fn(), setCatchHeight: vi.fn(),
    preparePlayback: vi.fn(), updateAppearance: vi.fn(), dispose: vi.fn(), batGripAt: () => new Vector3(),
    releasePoint: () => new Vector3(), contactAt: () => new Vector3(.4, 1, 0),
  };
  return { P: rig, C: rig, BAT: rig, RUN: rig, LF: rig, CF: rig, RF: rig, SS: rig, '1B': rig, '2B': rig, '3B': rig };
}

describe('Bayfront splash hits', () => {
  it('requires the cove and a landing strictly to the right of the cutoff', () => {
    expect(shouldTriggerSplashHit(true, 6.01)).toBe(true);
    expect(shouldTriggerSplashHit(true, 6)).toBe(false);
    expect(shouldTriggerSplashHit(true, -12)).toBe(false);
    expect(shouldTriggerSplashHit(false, 18)).toBe(false);
  });

  it('ends the home-run flight at water level without changing other replays', () => {
    const homer = diamondPlay('home_run');
    const landing = homer.legs[1].endPoint!;
    const cove = stageSplashHit(homer, true);
    expect(cove.splashHit).toBe(true);
    expect(cove.legs[1].endPoint).toMatchObject({ x: landing.x, z: landing.z });
    expect(cove.legs[1].endPoint!.y).toBeLessThan(.2);
    expect(landing.y).toBeGreaterThan(1);
    expect(stageSplashHit(homer, false)).toBe(homer);
    const hit = diamondPlay('double');
    expect(stageSplashHit(hit, true)).toBe(hit);
  });

  it('holds a view from the water side of the wall while the fountain rises', () => {
    const cove = stageSplashHit(diamondPlay('home_run'), true);
    const landing = cove.legs[1].endPoint!;
    const shot = diamondCamera(cove, cove.pickupAt + .4, 'R');
    expect(shot.position.z).toBeLessThan(landing.z);
    expect(shot.lookAt.x).toBeCloseTo(landing.x);
    expect(shot.lookAt.z).toBeCloseTo(landing.z);
  });

  it('shows one splash call and keeps the home-run fireworks on the landing frame', () => {
    const play = stageSplashHit(diamondPlay('home_run'), true);
    const vfx = createBallparkVfxSystem();
    const cast = makeCast();
    const caption = vi.spyOn(vfx, 'spawnComicCallout');
    const splash = vi.spyOn(vfx.celebration, 'splashDown');
    const camera = new PerspectiveCamera();
    const land = play.legs[1].end;
    try {
      for (const t of [land - .02, land, land + .02]) {
        renderDiamondPlay(play, cast, 'R', t, t - .02, camera, 240, vfx);
      }
      expect(splash).toHaveBeenCalledExactlyOnceWith(play.legs[1].endPoint);
      expect(caption).toHaveBeenCalledExactlyOnceWith('SPLASH HIT!', play.legs[1].endPoint, '#00B4D8', true);
      expect(vfx.celebration.group.getObjectByName('home run fireworks')?.visible).toBe(true);
    } finally { vfx.dispose(); }
  });

  it('launches a reusable fountain at impact, rains back down and cleans up its GPU resources', () => {
    const fx = createStadiumCelebration();
    const at = { x: 14, y: .14, z: -49 };
    fx.splashDown(at);
    const drops = fx.group.getObjectByName('splash fountain') as InstancedMesh;
    const disposed = vi.fn();
    drops.addEventListener('dispose', disposed);
    drops.geometry.addEventListener('dispose', disposed);
    const material = Array.isArray(drops.material) ? drops.material[0] : drops.material;
    material.addEventListener('dispose', disposed);
    try {
      expect(drops.visible).toBe(true);
      expect(drops.position.toArray()).toEqual([at.x, at.y, at.z]);
      const height = () => {
        const matrix = new Matrix4();
        drops.getMatrixAt(0, matrix);
        return matrix.elements[13];
      };
      fx.update(.45);
      const rising = height();
      expect(rising).toBeGreaterThan(1);
      fx.update(.65);
      expect(height()).toBeLessThan(rising);
      fx.update(1);
      expect(drops.visible).toBe(false);
      fx.splashDown({ ...at, x: 21 });
      expect(drops.visible).toBe(true);
      expect(drops.position.x).toBe(21);
      fx.setReducedMotion(true);
      fx.splashDown(at);
      expect(drops.visible).toBe(false);
    } finally { fx.dispose(); }
    expect(disposed).toHaveBeenCalledTimes(3);
  });
});

it('pops the moonshot caption on the flight and the splash call at the water', () => {
  const play = stageSplashHit(diamondPlay('home_run'), true);
  play.hrStatcast = { distanceFt: 442, exitVeloMph: 111 };
  const vfx = createBallparkVfxSystem(), cast = makeCast(), camera = new PerspectiveCamera();
  const caption = vi.spyOn(vfx, 'spawnComicCallout');
  const pop = play.legs[0].end + .55;
  try {
    for (const [prev, t] of [[pop - .01, pop + .01], [pop + .01, pop + .02], [pop + .02, play.pickupAt]]) {
      renderDiamondPlay(play, cast, 'L', t, prev, camera, 240, vfx);
    }
    expect(caption.mock.calls.map(call => call[0])).toEqual(['442 FT · 111 MPH!', 'SPLASH HIT!']);
    const [, point, color] = caption.mock.calls[0];
    expect(color).toBe('#FFC300');
    expect(point.y).toBeGreaterThan(1);
    expect(point.z).toBeLessThan(0);
  } finally { vfx.dispose(); }
});

it('splinters once at the barrel, sparkles for the favorite hitter, and leaves the intact bat hidden', () => {
  const play = { ...diamondPlay('single'), brokenBat: true, favoriteSparkle: true };
  const vfx = createBallparkVfxSystem(), cast = makeCast(), camera = new PerspectiveCamera();
  const snap = vi.spyOn(vfx, 'triggerBrokenBat'), stars = vi.spyOn(vfx.celebration, 'starSparkle');
  const caption = vi.spyOn(vfx, 'spawnComicCallout');
  const plate = play.legs[0].end;
  try {
    for (const [prev, t] of [[0, plate - .01], [plate - .01, plate], [plate, plate + .35]]) {
      renderDiamondPlay(play, cast, 'L', t, prev, camera, 240, vfx);
    }
    const origin = new Vector3(.4, 1, 0);
    expect(snap).toHaveBeenCalledExactlyOnceWith(origin, 'L');
    expect(stars).toHaveBeenCalledExactlyOnceWith(origin);
    expect(caption).toHaveBeenCalledExactlyOnceWith('SNAP!', origin, '#F4A261', 'contact');
    expect(vfx.droppedBat.visible).toBe(false);
  } finally { vfx.dispose(); }
});

it('opens a reusable ring of colored stars, floats it up, then retires the instances', () => {
  const fx = createStadiumCelebration();
  const at = { x: 4, y: 1.8, z: -13 };
  fx.starSparkle(at);
  const stars = fx.group.getObjectByName('favorite stars') as InstancedMesh;
  const matrix = new Matrix4();
  const point = () => { stars.getMatrixAt(0, matrix); return new Vector3().setFromMatrixPosition(matrix); };
  const disposed = vi.fn();
  stars.addEventListener('dispose', disposed);
  stars.geometry.addEventListener('dispose', disposed);
  const paint = Array.isArray(stars.material) ? stars.material[0] : stars.material;
  paint.addEventListener('dispose', disposed);
  try {
    expect(stars.position).toMatchObject(at);
    expect(stars.count).toBeGreaterThan(3);
    const initial = point();
    fx.update(.25);
    expect(point().y).toBeGreaterThan(initial.y);
    expect(Math.hypot(point().x, point().z)).toBeGreaterThan(Math.hypot(initial.x, initial.z));
    fx.update(2);
    expect(stars.visible).toBe(false);
    fx.starSparkle(at);
    expect(stars.visible).toBe(true);
    fx.setReducedMotion(true);
    fx.starSparkle(at);
    expect(stars.visible).toBe(false);
  } finally { fx.dispose(); }
  expect(disposed).toHaveBeenCalledTimes(3);
});

it('throws the two bat halves on handed arcs, resets them and suppresses debris in steady mode', () => {
  const vfx = createBallparkVfxSystem();
  const at = { x: 0, y: 1, z: 0 };
  const disposed = vi.fn();
  try {
    vfx.triggerBrokenBat(at, 'R');
    const pieces = vfx.group.getObjectByName('broken bat')!;
    const handle = pieces.getObjectByName('broken handle')!, barrel = pieces.getObjectByName('broken barrel')!;
    expect(pieces.getObjectByName('wood chips')).toBeInstanceOf(InstancedMesh);
    vfx.update(.25);
    const first = handle.position.clone(), spin = barrel.rotation.z;
    expect(first.distanceTo(barrel.position)).toBeGreaterThan(.3);
    vfx.update(.15);
    expect(barrel.rotation.z).not.toBeCloseTo(spin);
    vfx.clear();
    expect(pieces.visible).toBe(false);
    vfx.triggerBrokenBat(at, 'L');
    vfx.update(.25);
    expect(handle.position.x).toBeCloseTo(-first.x);
    vfx.update(.65);
    for (const half of [handle, barrel]) {
      const longAxis = new Vector3(0, 1, 0).applyQuaternion(half.quaternion);
      expect(longAxis.y).toBeCloseTo(0);
      expect(half.position.y + at.y).toBeCloseTo(.08);
      (half as Mesh).geometry.addEventListener('dispose', disposed);
    }
    vfx.update(2);
    expect(pieces.visible).toBe(false);
    vfx.triggerBrokenBat(at, 'L');
    vfx.setReducedMotion(true);
    vfx.triggerBrokenBat(at, 'R');
    expect(pieces.visible).toBe(false);
  } finally { vfx.dispose(); }
  expect(disposed).toHaveBeenCalledTimes(2);
});
