import { expect, it } from 'vitest';
import { createBallparkVfxSystem } from './vfxSystem';

it('also supports immediate flight playback from a scene event', () => {
  const vfx = createBallparkVfxSystem();
  try {
    expect(vfx.launchBall('fastball').cameraShake).toBeGreaterThan(0);
    vfx.update(0.15);
    expect(vfx.ball.group.visible).toBe(true);
    vfx.update(0.6);
    expect(vfx.ball.group.visible).toBe(false);
  } finally {
    vfx.dispose();
  }
});

it('keeps the contact caption legible and above the mitt on the compact field', async () => {
  const { PerspectiveCamera, Sprite, Vector3 } = await import('three');
  const camera = new PerspectiveCamera(42, 340/215, .2, 180);
  camera.position.set(0, 1, 16);
  camera.lookAt(0, 1, 0);
  camera.updateMatrixWorld();
  const mitt = new Vector3(0, 1, 0);
  const vfx = createBallparkVfxSystem();
  try {
    vfx.spawnComicCallout('STRIKE TWO!', mitt, '#167457', 'contact');
    vfx.update(.3, camera, 215);
    const caption = vfx.group.children.filter(c => c instanceof Sprite).at(-1)!;
    const pxPerUnit = 215 / (2 * 16 * Math.tan(42 * Math.PI / 360));
    expect(caption.scale.x * pxPerUnit * 44 / 512).toBeGreaterThanOrEqual(12);
    expect((caption.position.y - mitt.y - caption.scale.y/2) * pxPerUnit).toBeGreaterThan(5);
  } finally { vfx.dispose(); }
});

it('sweeps a tapered ribbon through the barrel in either box and clears it in reduced motion', () => {
  const vfx=createBallparkVfxSystem();
  try {
    const arc=vfx.group.getObjectByName('swing arc') as import('three').Mesh;
    const barrel={x:-.3,y:.94,z:.1};
    vfx.drawSwingArc(barrel,'R',-.055);
    expect(arc.visible).toBe(true);
    const early = {...arc.geometry.drawRange};
    vfx.drawSwingArc(barrel,'R',.04);
    expect(arc.geometry.drawRange).not.toEqual(early);
    expect(arc.position.toArray()).toEqual([barrel.x,barrel.y,barrel.z]);
    const sign=arc.scale.x;
    vfx.drawSwingArc(barrel,'L',.04);
    expect(arc.scale.x).toBe(-sign);
    vfx.setReducedMotion(true);
    expect(arc.visible).toBe(false);
    vfx.drawSwingArc(barrel,'R',0);
    expect(arc.visible).toBe(false);
  } finally {vfx.dispose();}
});
