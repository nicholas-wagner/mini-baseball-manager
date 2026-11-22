import { expect, it } from 'vitest';
import { sampleFieldingPlay } from './fieldingShowcase';
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
