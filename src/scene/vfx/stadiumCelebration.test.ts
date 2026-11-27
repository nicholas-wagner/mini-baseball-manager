import { Group, InstancedMesh, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { diamondCamera, diamondPlay } from '../playback/diamondPlay';
import { renderDiamondPlay } from '../playback/renderDiamondPlay';
import { createBallparkVfxSystem } from './vfxSystem';
import { shouldTriggerSplashHit, stageSplashHit } from '../playback/outfieldPlay';
import { createStadiumCelebration } from './stadiumCelebration';

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
    const rig = {
      root: new Group(), logicalYaw: 0, updatePose: vi.fn(), setCatchHeight: vi.fn(),
      preparePlayback: vi.fn(), updateAppearance: vi.fn(), dispose: vi.fn(), batGripAt: () => new Vector3(),
      releasePoint: () => new Vector3(), contactAt: () => new Vector3()
    };
    const cast = { P: rig, C: rig, BAT: rig, RUN: rig, LF: rig, CF: rig, RF: rig, SS: rig, '1B': rig, '2B': rig, '3B': rig };
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
