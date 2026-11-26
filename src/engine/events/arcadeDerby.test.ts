import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng/seededRng';
import {
  DERBY_PITCH_COUNT,
  DERBY_WIN_CASH,
  estimateDerbyHrDistanceFt,
  evaluateDerbyHotStreak,
  resolveDerbyTimingSwing,
  rollDerbyRivalTarget,
} from './arcadeDerby';

describe('Playable 30-Second Arcade Home Run Derby Engine', () => {
  it('launches monster 415–465 ft home runs on dead-center perfect timing and misses outside the sweet spot', () => {
    const perfect = resolveDerbyTimingSwing({
      batterPower: 75,
      timingCursor: 50,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      rng: createSeededRng(1994),
    });
    expect(perfect.outcome).toBe('home_run');
    expect(perfect.timingGrade).toBe('perfect');
    expect(perfect.distanceFt).toBeGreaterThanOrEqual(415);
    expect(perfect.distanceFt).toBeLessThanOrEqual(465);
    expect(perfect.estimatedHrDistanceFt).toBe(perfect.distanceFt);
    expect(perfect.ratingBadge).toMatch(/perfect/i);

    const miss = resolveDerbyTimingSwing({
      batterPower: 90,
      timingCursor: 5,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      rng: createSeededRng(1994),
    });
    expect(miss.outcome).toBe('out');
    expect(miss.timingGrade).toBe('miss');
    expect(miss.estimatedHrDistanceFt).toBeNull();
    expect(miss.distanceFt).toBeLessThan(280);
    expect(miss.ratingBadge).toMatch(/miss|early|late/i);
  });

  it('deterministically estimates HR distance inside 375–465 FT scaled by timing grade and batter power', () => {
    const lowSweet = estimateDerbyHrDistanceFt('sweet', 30, 82, 'normal', createSeededRng(1994));
    const highPerfect = estimateDerbyHrDistanceFt('perfect', 99, 94, 'power', createSeededRng(1994));
    const repeatPerfect = estimateDerbyHrDistanceFt('perfect', 99, 94, 'power', createSeededRng(1994));

    expect(lowSweet).toBeGreaterThanOrEqual(375);
    expect(lowSweet).toBeLessThanOrEqual(465);
    expect(highPerfect).toBeGreaterThanOrEqual(415);
    expect(highPerfect).toBeLessThanOrEqual(465);
    expect(highPerfect).toBeGreaterThan(lowSweet);
    expect(highPerfect).toBe(repeatPerfect);
  });

  it('tracks live Hot Streak Combo Multipliers (2x STREAK!, 3x ON FIRE!) and resets on non-HR swings', () => {
    const firstHr = resolveDerbyTimingSwing({
      batterPower: 80,
      timingCursor: 50,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      currentStreak: 0,
      rng: createSeededRng(101),
    });
    expect(firstHr.streakCount).toBe(1);
    expect(firstHr.comboMultiplier).toBe(1);
    expect(firstHr.comboBadge).toBeNull();

    const secondHr = resolveDerbyTimingSwing({
      batterPower: 80,
      timingCursor: 50,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      currentStreak: firstHr.streakCount,
      rng: createSeededRng(102),
    });
    expect(secondHr.streakCount).toBe(2);
    expect(secondHr.comboMultiplier).toBe(2);
    expect(secondHr.comboBadge).toMatch(/2x STREAK!/i);
    expect(secondHr.pointsEarned).toBeGreaterThan(firstHr.pointsEarned);

    const thirdHr = resolveDerbyTimingSwing({
      batterPower: 80,
      timingCursor: 50,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      currentStreak: secondHr.streakCount,
      rng: createSeededRng(103),
    });
    expect(thirdHr.streakCount).toBe(3);
    expect(thirdHr.comboMultiplier).toBe(3);
    expect(thirdHr.comboBadge).toMatch(/3x ON FIRE!/i);

    const broken = resolveDerbyTimingSwing({
      batterPower: 80,
      timingCursor: 95,
      pitchSpeedMph: 88,
      swingStyle: 'power',
      currentStreak: thirdHr.streakCount,
      rng: createSeededRng(104),
    });
    expect(broken.streakCount).toBe(0);
    expect(broken.comboMultiplier).toBe(1);
    expect(broken.comboBadge).toBeNull();

    const summary = evaluateDerbyHotStreak([firstHr, secondHr, thirdHr, broken]);
    expect(summary.currentStreak).toBe(0);
    expect(summary.bestStreak).toBe(3);
    expect(summary.comboMultiplier).toBe(1);
    expect(summary.totalPoints).toBe(
      firstHr.pointsEarned + secondHr.pointsEarned + thirdHr.pointsEarned + broken.pointsEarned,
    );

    const hotSummary = evaluateDerbyHotStreak([firstHr, secondHr, thirdHr]);
    expect(hotSummary.currentStreak).toBe(3);
    expect(hotSummary.comboMultiplier).toBe(3);
    expect(hotSummary.comboBadge).toMatch(/3x ON FIRE!/i);
    expect(hotSummary.tier).toBe('on_fire');
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
