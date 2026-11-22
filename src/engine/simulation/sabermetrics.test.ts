import { describe, expect, it } from 'vitest';
import { createEmptySeasonStats } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  computeBattingSabermetrics,
  computeFieldingSabermetrics,
  computePitchingSabermetrics,
  formatRate3,
  rollBattedBallProfile,
  sampleBattedBallType,
} from './sabermetrics';

describe('Batted-Ball Profiles, Fielder Range/FPCT & Full Sabermetrics (TASK-059)', () => {
  it('computes exact batter AVG, OBP, SLG, OPS, ISO, BABIP, BB%, K%, and GB/LD/FB/PopUp rates with zero-safe defaults', () => {
    const empty = computeBattingSabermetrics(createEmptySeasonStats());
    expect(empty.avg).toBe(0);
    expect(empty.ops).toBe(0);
    expect(formatRate3(empty.avg)).toBe('.000');

    const line = {
      ...createEmptySeasonStats(),
      games: 10,
      plateAppearances: 45,
      atBats: 40,
      hits: 12,
      doubles: 3,
      triples: 1,
      homeRuns: 2,
      walks: 4,
      sacFlies: 1,
      strikeouts: 8,
      groundBalls: 12,
      lineDrives: 8,
      flyBalls: 10,
      popUps: 2,
    };
    const m = computeBattingSabermetrics(line);
    // AVG = 12/40 = 0.300
    expect(m.avg).toBeCloseTo(0.3, 3);
    // OBP = (12+4)/(40+4+1) = 16/45 = 0.356
    expect(m.obp).toBeCloseTo(16 / 45, 3);
    // TB = 6*1 + 3*2 + 1*3 + 2*4 = 23 -> SLG = 23/40 = 0.575
    expect(m.slg).toBeCloseTo(0.575, 3);
    expect(m.ops).toBeCloseTo(16 / 45 + 0.575, 3);
    expect(m.iso).toBeCloseTo(0.275, 3);
    // BABIP = (12 - 2) / (40 - 8 - 2 + 1) = 10/31
    expect(m.babip).toBeCloseTo(10 / 31, 3);
    expect(m.bbRate).toBeCloseTo(4 / 45, 3);
    expect(m.kRate).toBeCloseTo(8 / 45, 3);
    expect(m.gbRate).toBeCloseTo(12 / 32, 3);
    expect(m.ldRate).toBeCloseTo(8 / 32, 3);
    expect(m.fbRate).toBeCloseTo(10 / 32, 3);
    expect(m.popUpRate).toBeCloseTo(2 / 32, 3);
    expect(formatRate3(0.3)).toBe('.300');
    expect(formatRate3(1.05)).toBe('1.050');
  });

  it('computes exact pitcher ERA, WHIP, K/9, BB/9, HR/9, Strike%, and fielder FPCT / Range Factor', () => {
    const emptyP = computePitchingSabermetrics(createEmptySeasonStats());
    expect(emptyP.era).toBe(0);
    expect(emptyP.whip).toBe(0);
    expect(emptyP.ipDisplay).toBe('0.0');

    const pitcherLine = {
      ...createEmptySeasonStats(),
      games: 3,
      inningsPitchedOuts: 27, // 9.0 IP
      hitsAllowed: 7,
      homeRunsAllowed: 1,
      earnedRuns: 3,
      pitchingStrikeouts: 10,
      pitchingWalks: 2,
      pitchesThrown: 120,
      strikesThrown: 81,
      ballsThrown: 39,
      groundBalls: 10,
      lineDrives: 3,
      flyBalls: 5,
      popUps: 2,
    };
    const p = computePitchingSabermetrics(pitcherLine);
    expect(p.ipDisplay).toBe('9.0');
    expect(p.era).toBeCloseTo(3.0, 2);
    expect(p.whip).toBeCloseTo(1.0, 2);
    expect(p.kPer9).toBeCloseTo(10.0, 2);
    expect(p.bbPer9).toBeCloseTo(2.0, 2);
    expect(p.hrPer9).toBeCloseTo(1.0, 2);
    expect(p.strikeRate).toBeCloseTo(81 / 120, 3);
    expect(p.gbRate).toBeCloseTo(0.5, 2);
    expect(p.popUpRate).toBeCloseTo(0.1, 2);

    const emptyF = computeFieldingSabermetrics(createEmptySeasonStats());
    expect(emptyF.fpct).toBe(1);
    expect(emptyF.chances).toBe(0);

    const fielderLine = {
      ...createEmptySeasonStats(),
      games: 10,
      putouts: 24,
      assists: 15,
      errors: 1,
    };
    const f = computeFieldingSabermetrics(fielderLine);
    expect(f.chances).toBe(40);
    expect(f.fpct).toBeCloseTo(39 / 40, 4);
    expect(f.rangeFactorPerGame).toBeCloseTo(3.9, 2);
  });

  it('rolls role-accurate batted-ball profiles and statistically separates GB%, LD%, FB%, and PopUp% distributions', () => {
    const rng = createSeededRng(5900);
    const sluggerProfile = rollBattedBallProfile(rng, '1B', 'power_slugger');
    const speedProfile = rollBattedBallProfile(rng, 'CF', 'speed_smallball');
    const sinkerProfile = rollBattedBallProfile(rng, 'SP', 'crafty_tactician', 'two_seam');
    const contactProfile = rollBattedBallProfile(rng, '2B', 'contact_technician');

    expect(sluggerProfile.fbRateBias).toBeGreaterThan(speedProfile.fbRateBias);
    expect(sinkerProfile.gbRateBias).toBeGreaterThan(0);
    expect(contactProfile.ldRateBias).toBeGreaterThan(0);

    const sampleRates = (
      batter: typeof sluggerProfile,
      pitcher: typeof sinkerProfile,
      pitch: 'two_seam' | 'four_seam',
    ) => {
      const counts = { ground_ball: 0, line_drive: 0, fly_ball: 0, pop_up: 0 };
      const r = createSeededRng(7777);
      for (let i = 0; i < 1200; i += 1) {
        counts[sampleBattedBallType(r, batter, pitcher, pitch)] += 1;
      }
      return counts;
    };

    const gbHeavy = sampleRates(speedProfile, sinkerProfile, 'two_seam');
    const fbHeavy = sampleRates(sluggerProfile, { tendency: 'flyball', gbRateBias: -8, ldRateBias: 0, fbRateBias: 8, popUpRateBias: 4 }, 'four_seam');
    const ldHeavy = sampleRates(contactProfile, { tendency: 'balanced', gbRateBias: 0, ldRateBias: 4, fbRateBias: 0, popUpRateBias: 0 }, 'four_seam');

    expect(gbHeavy.ground_ball).toBeGreaterThan(fbHeavy.ground_ball);
    expect(fbHeavy.fly_ball + fbHeavy.pop_up).toBeGreaterThan(gbHeavy.fly_ball + gbHeavy.pop_up);
    expect(ldHeavy.line_drive).toBeGreaterThan(gbHeavy.line_drive);
    expect(fbHeavy.pop_up).toBeGreaterThan(0);
  });
});
