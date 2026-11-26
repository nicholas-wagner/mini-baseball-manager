import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import type { PitcherRole, Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  applyPitcherRoleShape,
  evaluatePitcherRoleSituation,
  rollPitcherRole,
  selectBestBullpenReliever,
} from './pitcherRoles';

describe('Specialized Pitching Staff Roles (TASK-058)', () => {
  it('assigns starter for SP and all 6 relief roles for RP while strictly limiting LOOGY to LHP', () => {
    const rng = createSeededRng(2026058);
    expect(rollPitcherRole(rng, 'SP', 'R', 'workhorse_ace')).toBe('starter');
    expect(rollPitcherRole(rng, 'SP', 'L', 'crafty_tactician')).toBe('starter');

    const seenRhp = new Set<PitcherRole>();
    const seenLhp = new Set<PitcherRole>();
    for (let i = 0; i < 120; i += 1) {
      const rRole = rollPitcherRole(rng, 'RP', 'R', i % 3 === 0 ? 'flame_closer' : 'balanced_regular');
      expect(rRole).not.toBe('loogy');
      expect(rRole).not.toBe('starter');
      seenRhp.add(rRole);

      const lRole = rollPitcherRole(rng, 'RP', 'L', i % 3 === 0 ? 'southpaw_specialist' : 'balanced_regular');
      expect(lRole).not.toBe('starter');
      seenLhp.add(lRole);
    }

    expect(seenLhp.has('loogy')).toBe(true);
    expect(seenRhp.has('closer')).toBe(true);
    expect(seenRhp.has('setup_man')).toBe(true);
    expect(seenRhp.has('fireman')).toBe(true);
    expect(seenRhp.has('long_reliever')).toBe(true);
    expect(seenRhp.has('short_reliever')).toBe(true);
  });

  it('shapes stamina and stuff per role and evaluates role-fit bonuses/penalties cleanly', () => {
    const baseRp = createPlayer(createSeededRng(101), { position: 'RP', tier: 'aa' });
    const longRatings = applyPitcherRoleShape(baseRp.ratings, 'long_reliever');
    const closerRatings = applyPitcherRoleShape(baseRp.ratings, 'closer');
    expect(longRatings.stamina).toBeGreaterThan(closerRatings.stamina);

    const closer: Player = { ...baseRp, pitcherRole: 'closer', throws: 'R' };
    const setup: Player = { ...baseRp, pitcherRole: 'setup_man', throws: 'R' };
    const fireman: Player = { ...baseRp, pitcherRole: 'fireman', throws: 'R' };
    const loogy: Player = { ...baseRp, pitcherRole: 'loogy', throws: 'L' };
    const longRp: Player = { ...baseRp, pitcherRole: 'long_reliever', throws: 'R' };

    // Closer shines in 9th-inning save spot, rusts slightly in 6-run blowout
    const saveEval = evaluatePitcherRoleSituation(closer, {
      inning: 9,
      lead: 2,
      hasRunnersOn: false,
      leverageIndex: 2.1,
      batterEffectiveSide: 'R',
    });
    const mopupEval = evaluatePitcherRoleSituation(closer, {
      inning: 6,
      lead: 6,
      hasRunnersOn: false,
      leverageIndex: 0.45,
      batterEffectiveSide: 'R',
    });
    expect(saveEval.roleFit).toBe('ideal');
    expect(saveEval.stuffDelta).toBeGreaterThan(0);
    expect(mopupEval.roleFit).toBe('misused');
    expect(mopupEval.controlDelta).toBeLessThan(0);

    // Setup Man thrives in 7th/8th close game
    const setupEval = evaluatePitcherRoleSituation(setup, {
      inning: 8,
      lead: 1,
      hasRunnersOn: false,
      leverageIndex: 1.7,
      batterEffectiveSide: 'R',
    });
    expect(setupEval.roleFit).toBe('ideal');
    expect(setupEval.stuffDelta).toBeGreaterThan(0);

    // Fireman thrives entering high-LI jam with runners on
    const firemanEval = evaluatePitcherRoleSituation(fireman, {
      inning: 6,
      lead: 1,
      hasRunnersOn: true,
      leverageIndex: 2.2,
      batterEffectiveSide: 'R',
    });
    expect(firemanEval.roleFit).toBe('ideal');
    expect(firemanEval.stuffDelta).toBeGreaterThanOrEqual(5);

    // LOOGY dominates LHB and loses slight control vs RHB
    const loogyVsL = evaluatePitcherRoleSituation(loogy, {
      inning: 7,
      lead: 1,
      hasRunnersOn: true,
      leverageIndex: 1.6,
      batterEffectiveSide: 'L',
    });
    const loogyVsR = evaluatePitcherRoleSituation(loogy, {
      inning: 7,
      lead: 1,
      hasRunnersOn: true,
      leverageIndex: 1.6,
      batterEffectiveSide: 'R',
    });
    expect(loogyVsL.roleFit).toBe('ideal');
    expect(loogyVsL.stuffDelta).toBeGreaterThan(loogyVsR.stuffDelta);

    // Long reliever burns fatigue slower than short/closer arms
    const longEval = evaluatePitcherRoleSituation(longRp, {
      inning: 4,
      lead: -4,
      hasRunnersOn: false,
      leverageIndex: 0.6,
      batterEffectiveSide: 'R',
    });
    expect(longEval.fatiguePerPitchMultiplier).toBeLessThan(saveEval.fatiguePerPitchMultiplier);
  });

  it('selects the ideal bullpen arm for save spots, high-LI jams, LHB matchups, and early-inning bridges', () => {
    const template = createPlayer(createSeededRng(202), { position: 'RP', tier: 'aa' });
    const pen: Player[] = [
      { ...template, id: 'rp-long', pitcherRole: 'long_reliever', throws: 'R' },
      { ...template, id: 'rp-loogy', pitcherRole: 'loogy', throws: 'L' },
      { ...template, id: 'rp-setup', pitcherRole: 'setup_man', throws: 'R' },
      { ...template, id: 'rp-fire', pitcherRole: 'fireman', throws: 'R' },
      { ...template, id: 'rp-close', pitcherRole: 'closer', throws: 'R' },
    ];

    expect(
      selectBestBullpenReliever(pen, {
        inning: 9,
        lead: 2,
        hasRunnersOn: false,
        leverageIndex: 2.0,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-close');

    expect(
      selectBestBullpenReliever(pen, {
        inning: 6,
        lead: 1,
        hasRunnersOn: true,
        leverageIndex: 2.3,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-fire');

    expect(
      selectBestBullpenReliever(pen, {
        inning: 7,
        lead: 1,
        hasRunnersOn: false,
        leverageIndex: 1.5,
        batterEffectiveSide: 'L',
      })?.id,
    ).toBe('rp-loogy');

    expect(
      selectBestBullpenReliever(pen, {
        inning: 8,
        lead: 1,
        hasRunnersOn: false,
        leverageIndex: 1.5,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-setup');

    expect(
      selectBestBullpenReliever(pen, {
        inning: 4,
        lead: -5,
        hasRunnersOn: false,
        leverageIndex: 0.5,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-long');
  });

  it('scales closer, setup, fireman, and long-reliever windows cleanly for 5-inning and 7-inning games', () => {
    const template = createPlayer(createSeededRng(303), { position: 'RP', tier: 'aa' });
    const pen: Player[] = [
      { ...template, id: 'rp-long', pitcherRole: 'long_reliever', throws: 'R' },
      { ...template, id: 'rp-setup', pitcherRole: 'setup_man', throws: 'R' },
      { ...template, id: 'rp-close', pitcherRole: 'closer', throws: 'R' },
    ];

    // 5-inning game: 5th inning 2-run lead is a true Save Spot for Closer!
    const closer5 = evaluatePitcherRoleSituation(pen[2], {
      inning: 5,
      regulationInnings: 5,
      lead: 2,
      hasRunnersOn: false,
      leverageIndex: 2.1,
      batterEffectiveSide: 'R',
    });
    expect(closer5.roleFit).toBe('ideal');
    expect(
      selectBestBullpenReliever(pen, {
        inning: 5,
        regulationInnings: 5,
        lead: 2,
        hasRunnersOn: false,
        leverageIndex: 2.1,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-close');

    // 5-inning game: 4th inning 1-run lead is ideal Setup spot!
    const setup5 = evaluatePitcherRoleSituation(pen[1], {
      inning: 4,
      regulationInnings: 5,
      lead: 1,
      hasRunnersOn: false,
      leverageIndex: 1.5,
      batterEffectiveSide: 'R',
    });
    expect(setup5.roleFit).toBe('ideal');
    expect(
      selectBestBullpenReliever(pen, {
        inning: 4,
        regulationInnings: 5,
        lead: 1,
        hasRunnersOn: false,
        leverageIndex: 1.5,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-setup');

    // 7-inning game: 7th inning save spot selects Closer and 6th selects Setup!
    expect(
      selectBestBullpenReliever(pen, {
        inning: 7,
        regulationInnings: 7,
        lead: 1,
        hasRunnersOn: false,
        leverageIndex: 2.0,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-close');
    expect(
      selectBestBullpenReliever(pen, {
        inning: 6,
        regulationInnings: 7,
        lead: 2,
        hasRunnersOn: false,
        leverageIndex: 1.4,
        batterEffectiveSide: 'R',
      })?.id,
    ).toBe('rp-setup');
  });
});
