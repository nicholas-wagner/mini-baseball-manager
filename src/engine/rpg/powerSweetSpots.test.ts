import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  evaluateActivePowerSurge,
  getActivatablePowersForPlayer,
  getHeritageTacticalGuide,
  isPowerSweetSpotActive,
  resolveStarterSignaturePitchId,
  type PowerSituationContext,
} from './specialPowerEffects';

const TWO_STRIKE_RISP_LATE: PowerSituationContext = {
  balls: 3,
  strikes: 2,
  inning: 8,
  maxInnings: 9,
  scoreDiff: 1,
  runnersOnBase: 2,
  hasRisp: true,
};

const EMPTY_EARLY: PowerSituationContext = {
  balls: 0,
  strikes: 0,
  inning: 1,
  scoreDiff: 0,
  runnersOnBase: 0,
  hasRisp: false,
};

describe('Purposeful Nationality Powers, Sweet Spots & Starter Signature Pitches (TASK-134, TASK-135)', () => {
  it('evaluates all 5 power sweet spots accurately across live count and runner contexts', () => {
    expect(isPowerSweetSpotActive('two_strikes', undefined)).toBe(false);
    expect(isPowerSweetSpotActive('two_strikes', TWO_STRIKE_RISP_LATE)).toBe(true);
    expect(isPowerSweetSpotActive('risp', TWO_STRIKE_RISP_LATE)).toBe(true);
    expect(isPowerSweetSpotActive('bases_on', TWO_STRIKE_RISP_LATE)).toBe(true);
    expect(isPowerSweetSpotActive('late_close', TWO_STRIKE_RISP_LATE)).toBe(true);
    expect(isPowerSweetSpotActive('empty_bases', EMPTY_EARLY)).toBe(true);
    expect(isPowerSweetSpotActive('empty_bases', TWO_STRIKE_RISP_LATE)).toBe(false);

    for (const nat of ['USA', 'DOM', 'CAN', 'IRL', 'JPN', 'MEX'] as const) {
      const guide = getHeritageTacticalGuide(nat);
      expect(guide.battingEffectSummary.length).toBeGreaterThan(5);
      expect(guide.pitchingEffectSummary.length).toBeGreaterThan(5);
    }

    expect(resolveStarterSignaturePitchId({ specialistArchetype: 'balanced_regular', pitchArsenal: { favoritePitch: 'knuckleball', weakestPitch: 'cutter', repertoire: [] } })).toBe('ghost_knuckle');
    expect(resolveStarterSignaturePitchId({ specialistArchetype: 'balanced_regular', pitchArsenal: { favoritePitch: 'slider', weakestPitch: 'cutter', repertoire: [] } })).toBe('tornado_slider');
    expect(resolveStarterSignaturePitchId({ specialistArchetype: 'crafty_tactician', pitchArsenal: { favoritePitch: 'four_seam', weakestPitch: 'cutter', repertoire: [] } })).toBe('ice_veins');
    expect(resolveStarterSignaturePitchId({ specialistArchetype: 'flame_closer', pitchArsenal: { favoritePitch: 'four_seam', weakestPitch: 'cutter', repertoire: [] } })).toBe('blazing_comet');
  });

  it('amplifies heritage & capstone surges in Sweet Spots and grants every Rookie pitcher a Day-1 starter pitch', () => {
    const rng = createSeededRng(1345);
    const rookieSp = createPlayer(rng, { position: 'SP', tier: 'rookie', forcedNationalityId: 'JPN' });
    const rookieHitter = createPlayer(rng, { position: 'CF', tier: 'rookie', forcedNationalityId: 'DOM' });

    const pitcherOptions = getActivatablePowersForPlayer(
      { ...rookieSp, unlockedSkillIds: [], equippedPowerIds: [] },
      'pitcher',
      TWO_STRIKE_RISP_LATE,
    );
    expect(pitcherOptions.length).toBeGreaterThanOrEqual(2);
    expect(pitcherOptions[0].source).toBe('starter_pitch');

    // Starter pitch (0.72x scale) vs Full Capstone (1.0x scale) + sweet spot boost
    const starterSurge = evaluateActivePowerSurge(
      'blazing_comet',
      'pitcher',
      { ...rookieSp, unlockedSkillIds: [] },
      TWO_STRIKE_RISP_LATE,
    );
    const fullSurge = evaluateActivePowerSurge(
      'blazing_comet',
      'pitcher',
      { ...rookieSp, unlockedSkillIds: ['cap_blazing_comet'] },
      TWO_STRIKE_RISP_LATE,
    );
    expect(starterSurge.sweetSpotTriggered).toBe(true);
    expect(fullSurge.stuffDelta).toBeGreaterThan(starterSurge.stuffDelta);
    expect(fullSurge.impactSummary).toContain('MPH');

    // Non-sweet-spot capstone & batter capstone + heritage batter & pitcher surges
    const batterCap = evaluateActivePowerSurge(
      'moonshot_bomb',
      'batter',
      { ...rookieHitter, unlockedSkillIds: ['cap_moonshot_bomb'] },
      EMPTY_EARLY,
    );
    expect(batterCap.sweetSpotTriggered).toBe(false);
    expect(batterCap.impactSummary).toContain('PWR');

    const pitcherHeritage = evaluateActivePowerSurge(
      'heritage_jpn',
      'pitcher',
      { ...rookieSp, nationalityId: 'JPN', heritageTierUnlocked: 2 },
      TWO_STRIKE_RISP_LATE,
    );
    const batterHeritage = evaluateActivePowerSurge(
      'heritage_dom',
      'batter',
      { ...rookieHitter, nationalityId: 'DOM', heritageTierUnlocked: 2 },
      TWO_STRIKE_RISP_LATE,
    );
    const coldHeritage = evaluateActivePowerSurge(
      'heritage_dom',
      'batter',
      { ...rookieHitter, nationalityId: 'DOM', heritageTierUnlocked: 1 },
      EMPTY_EARLY,
    );
    expect(pitcherHeritage.sweetSpotTriggered).toBe(true);
    expect(batterHeritage.sweetSpotTriggered).toBe(true);
    expect(batterHeritage.powerDelta).toBeGreaterThan(coldHeritage.powerDelta);
  });
});
