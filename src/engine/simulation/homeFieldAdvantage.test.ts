import { describe, expect, it } from 'vitest';
import {
  adjustAwayPitcherCrowdPenalty,
  evaluateHomeFieldAdvantage,
} from './homeFieldAdvantage';

describe('Home-Field Advantage & Fired-Up Crowd Momentum (TASK-147)', () => {
  it('provides subtle baseline home comfort when quiet and escalates strongly when the crowd gets fired up', () => {
    const quiet = evaluateHomeFieldAdvantage({
      inning: 2,
      maxInnings: 9,
      homeScore: 0,
      awayScore: 7,
      runnersOnBase: 0,
      outs: 0,
      homeAttendanceRatio: 0.25,
      homeTeamHype: 25,
    });
    expect(quiet.tier).toBe('quiet');
    expect(quiet.badgeLabel).toBeNull();
    expect(quiet.homeBatterClutchDelta).toBe(1);
    expect(quiet.awayPitcherControlPenalty).toBe(0);

    const roaring = evaluateHomeFieldAdvantage({
      inning: 9,
      maxInnings: 9,
      homeScore: 4,
      awayScore: 4,
      runnersOnBase: 2,
      outs: 2,
      homeAttendanceRatio: 0.95,
      homeTeamHype: 85,
      promoActive: true,
      homeRallyStreak: 2,
      stadiumWaveBoost: 12,
      isPlayoffs: true,
    });
    expect(roaring.tier).toBe('deafening');
    expect(roaring.badgeLabel).toContain('DEAFENING');
    expect(roaring.homeBatterClutchDelta).toBe(4);
    expect(roaring.homePitcherComposureDelta).toBe(3);
    expect(roaring.awayPitcherControlPenalty).toBe(-2);
    expect(roaring.homeHypeGainMultiplier).toBeGreaterThan(1.1);
    expect(roaring.bleacherExcitement).toBeGreaterThanOrEqual(0.88);
  });

  it('softens visiting pitcher crowd pressure for Ice Veins and Cagey Veterans while pressuring Pressure Wilters', () => {
    expect(adjustAwayPitcherCrowdPenalty(-2, 'steady', 'seasoned')).toBe(-2);
    expect(adjustAwayPitcherCrowdPenalty(-2, 'ice_veins', 'rookie_green')).toBe(-1);
    expect(adjustAwayPitcherCrowdPenalty(-2, 'steady', 'cagey_veteran')).toBe(-1);
    expect(adjustAwayPitcherCrowdPenalty(-2, 'pressure_wilt', 'rookie_green')).toBe(-3);
    expect(adjustAwayPitcherCrowdPenalty(0, 'pressure_wilt', 'rookie_green')).toBe(0);
  });
});
