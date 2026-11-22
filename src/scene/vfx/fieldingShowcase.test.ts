import { expect, it } from 'vitest';
import { catchPoint, sampleFieldingPlay } from './fieldingShowcase';
import { CLIP_DURATIONS } from '../characters/animationState';

it.each(['field_dive', 'field_high_jump'] as const)('%s runs, reaches, gathers and keeps possession after landing', clip => {
  const sample = (t: number) => sampleFieldingPlay(clip, 'R', t, 1.1);
  expect(sample(-0.1).clip).toBe('field_ready');
  expect(sample(0.32).clip).toBe('field_run');
  expect(sample(0.32).x).toBeGreaterThan(sample(0).x);
  expect(sample(1.099).caught).toBe(false);
  const catchFrame = sample(1.1);
  expect(catchFrame.clip).toBe(clip);
  expect(catchFrame.caught).toBe(true);
  expect(catchFrame.clipTime).toBeGreaterThan(CLIP_DURATIONS[clip] * 0.45);
  expect(sample(1.25).clipTime).toBe(catchFrame.clipTime);
  expect(sample(3).clip).toBe('field_ready');
  expect(sample(8).caught).toBe(true);
  expect(sample(8).x).toBe(sample(3).x);
  expect(sampleFieldingPlay(clip, 'L', 1.1, 1.1).x).toBeLessThan(sample(0).x);
});

it.each(['field_dive', 'field_high_jump'] as const)('aims the %s at the leading glove from either side of the billboard', clip => {
  for (const hand of ['R', 'L'] as const) {
    const at = sampleFieldingPlay(clip, hand, 1.1, 1.1);
    const front = catchPoint(clip, hand, 1.1, { x: at.x, y: 2, z: at.z + 4 });
    const rear = catchPoint(clip, hand, 1.1, { x: at.x, y: 2, z: at.z - 4 });
    expect(front.x).toBeCloseTo(rear.x);
    expect(front.y).toBeCloseTo(rear.y);
    expect((front.x - at.x) * (hand === 'R' ? 1 : -1)).toBeGreaterThan(0.48);
    expect(front.z).toBeCloseTo(at.z);
  }
});

it('raises a tall leaping player’s catch point with the painted glove', () => {
  const camera = {x: 11, y: 2, z: 0};
  const tall = catchPoint('field_high_jump', 'R', 1.1, camera, 1.16);
  const short = catchPoint('field_high_jump', 'R', 1.1, camera, 0.84);
  expect(tall.y - short.y).toBeGreaterThan(0.24);
});
