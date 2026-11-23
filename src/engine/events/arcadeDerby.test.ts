import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng/seededRng';
import {
  DERBY_PITCH_COUNT,
  DERBY_WIN_CASH,
  resolveDerbyTimingSwing,
  rollDerbyRivalTarget,
} from './arcadeDerby';

describe('Playable 30-Second Arcade Home Run Derby Engine', () => {
  it('launches monster 415+ ft home runs on dead-center perfect timing and misses outside the sweet spot', () => {
    const perfect = resolveDerbyTimingSwing({
      batterPower: 75,
      timingCursor: 50,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      rng: createSeededRng(1994),
    });
    expect(perfect.outcome).toBe('home_run');
    expect(perfect.distanceFt).toBeGreaterThanOrEqual(415);
    expect(perfect.ratingBadge).toMatch(/perfect/i);

    const miss = resolveDerbyTimingSwing({
      batterPower: 90,
      timingCursor: 5,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      rng: createSeededRng(1994),
    });
    expect(miss.outcome).toBe('out');
    expect(miss.distanceFt).toBeLessThan(280);
    expect(miss.ratingBadge).toMatch(/miss|early|late/i);
  });

  it('scales solid barrel swings by batter power and distinguishes early vs late misses plus normal swing safety', () => {
    const strongBarrel = resolveDerbyTimingSwing({
      batterPower: 88,
      timingCursor: 66,
      pitchSpeedMph: 86,
      swingStyle: 'normal',
      rng: createSeededRng(2025),
    });
    expect(['home_run', 'warning_track']).toContain(strongBarrel.outcome);
    expect(strongBarrel.distanceFt).toBeGreaterThanOrEqual(340);

    const weakBarrel = resolveDerbyTimingSwing({
      batterPower: 32,
      timingCursor: 32,
      pitchSpeedMph: 92,
      swingStyle: 'normal',
      rng: createSeededRng(77),
    });
    expect(['home_run', 'warning_track']).toContain(weakBarrel.outcome);

    const lateMiss = resolveDerbyTimingSwing({
      batterPower: 60,
      timingCursor: 95,
      pitchSpeedMph: 86,
      swingStyle: 'normal',
      rng: createSeededRng(88),
    });
    expect(lateMiss.outcome).toBe('out');
    expect(lateMiss.ratingBadge).toMatch(/late/i);
  });

  it('deterministically rolls winnable 5-pitch rival Derby targets scaled by league tier', () => {
    expect(DERBY_PITCH_COUNT).toBe(5);
    expect(DERBY_WIN_CASH).toBeGreaterThanOrEqual(1000);

    const rookieRival = rollDerbyRivalTarget(createSeededRng(1994), 'rookie');
    expect(rookieRival.rivalName.length).toBeGreaterThan(3);
    expect(rookieRival.targetHomeRuns).toBeGreaterThanOrEqual(1);
    expect(rookieRival.targetHomeRuns).toBeLessThanOrEqual(3);

    const majorsRival = rollDerbyRivalTarget(createSeededRng(1994), 'majors');
    expect(majorsRival.targetHomeRuns).toBeGreaterThanOrEqual(2);
    expect(majorsRival.targetHomeRuns).toBeLessThanOrEqual(4);
  });
});
