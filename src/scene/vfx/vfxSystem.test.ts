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
