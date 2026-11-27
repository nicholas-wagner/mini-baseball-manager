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
