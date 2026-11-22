import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { computePlayerOverall, type Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  applyCoEdAttributeTilt,
  computeRosterPopularityAttendanceMultiplier,
  evaluateCoEdClubhouseSynergy,
  evaluateCoEdPlayerTraitEffect,
  rollCoEdSpecialTrait,
} from './coEdArchetypes';

function makePopulation(presentation: 'male' | 'female', position: 'CF' | 'SP', count: number): Player[] {
  const rng = createSeededRng(presentation === 'male' ? 1111 : 2222);
  const out: Player[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = createPlayer(rng, { position, tier: 'aa' });
    const forced: Player = {
      ...base,
      traits: { ...base.traits, playerLook: presentation },
    };
    const tilted = applyCoEdAttributeTilt(
      base.ratings,
      base.statCaps,
      presentation,
      position,
    );
    out.push({
      ...forced,
      ratings: tilted,
      coEdTrait: rollCoEdSpecialTrait(rng, presentation, position),
    });
  }
  return out;
}

describe('Asymmetric Co-Ed Attributes, Complementary Traits & Roster-Mix Synergies (TASK-066)', () => {
  it('applies distinct classic male vs. female attribute tilts while keeping average OVR balanced', () => {
    const maleHitters = makePopulation('male', 'CF', 120);
    const femaleHitters = makePopulation('female', 'CF', 120);
    const malePitchers = makePopulation('male', 'SP', 120);
    const femalePitchers = makePopulation('female', 'SP', 120);

    const avg = (list: readonly Player[], fn: (p: Player) => number) =>
      list.reduce((s, p) => s + fn(p), 0) / list.length;

    // Equal overall competitiveness (within tight parity band)
    expect(Math.abs(avg(maleHitters, computePlayerOverall) - avg(femaleHitters, computePlayerOverall))).toBeLessThanOrEqual(3.5);
    expect(Math.abs(avg(malePitchers, computePlayerOverall) - avg(femalePitchers, computePlayerOverall))).toBeLessThanOrEqual(3.5);

    // Distinct hitter strengths: Male Power/Arm vs Female Contact/Eye/Speed/Fielding
    expect(avg(maleHitters, (p) => p.ratings.power)).toBeGreaterThan(avg(femaleHitters, (p) => p.ratings.power) + 6);
    expect(avg(femaleHitters, (p) => p.ratings.contact)).toBeGreaterThan(avg(maleHitters, (p) => p.ratings.contact) + 5);
    expect(avg(femaleHitters, (p) => p.ratings.eye)).toBeGreaterThan(avg(maleHitters, (p) => p.ratings.eye) + 5);
    expect(avg(femaleHitters, (p) => p.ratings.fielding)).toBeGreaterThan(avg(maleHitters, (p) => p.ratings.fielding) + 4);

    // Distinct pitcher strengths: Male Velocity vs Female Movement/Control
    expect(avg(malePitchers, (p) => p.ratings.velocity)).toBeGreaterThan(avg(femalePitchers, (p) => p.ratings.velocity) + 6);
    expect(avg(femalePitchers, (p) => p.ratings.movement)).toBeGreaterThan(avg(malePitchers, (p) => p.ratings.movement) + 5);
    expect(avg(femalePitchers, (p) => p.ratings.control)).toBeGreaterThan(avg(malePitchers, (p) => p.ratings.control) + 5);

    // Modest, balanced Popularity fan-draw bonus on female athletes
    expect(avg(femaleHitters, (p) => p.ratings.popularity)).toBeGreaterThan(avg(maleHitters, (p) => p.ratings.popularity) + 3);
    const femaleDraw = computeRosterPopularityAttendanceMultiplier(femaleHitters.slice(0, 18));
    const maleDraw = computeRosterPopularityAttendanceMultiplier(maleHitters.slice(0, 18));
    expect(femaleDraw).toBeGreaterThan(maleDraw);
    expect(femaleDraw - maleDraw).toBeLessThanOrEqual(0.08);
  });

  it('grants distinct complementary trait effects for male vs. female special traits', () => {
    const rng = createSeededRng(5050);
    const baseBatter = createPlayer(rng, { position: '1B', tier: 'aa' });
    const basePitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });

    const enforcerFx = evaluateCoEdPlayerTraitEffect(
      { ...baseBatter, coEdTrait: 'cleanup_enforcer' },
      { leverageIndex: 1.8, hasRisp: true },
    );
    expect(enforcerFx.powerDelta).toBeGreaterThan(0);

    const bravadoFx = evaluateCoEdPlayerTraitEffect(
      { ...baseBatter, coEdTrait: 'thunder_bravado' },
      { leverageIndex: 1.6, hasRisp: false },
    );
    expect(bravadoFx.powerDelta).toBeGreaterThan(0);
    expect(bravadoFx.chaseRateDelta).toBeGreaterThan(0);

    const poiseFx = evaluateCoEdPlayerTraitEffect(
      { ...baseBatter, coEdTrait: 'tactical_poise' },
      { leverageIndex: 1.9, hasRisp: false },
    );
    expect(poiseFx.eyeDelta).toBeGreaterThan(0);
    expect(poiseFx.controlDelta).toBeGreaterThan(0);

    const spinFx = evaluateCoEdPlayerTraitEffect(
      { ...basePitcher, coEdTrait: 'crafty_spin_wizard' },
      { leverageIndex: 1.2, hasRisp: false, pitchType: 'curveball' },
    );
    expect(spinFx.movementDelta).toBeGreaterThan(0);

    const ironFx = evaluateCoEdPlayerTraitEffect(
      { ...basePitcher, coEdTrait: 'iron_shoulder' },
      { leverageIndex: 1.2, hasRisp: false, pitchType: 'four_seam' },
    );
    expect(ironFx.fastballDrainScale).toBeLessThan(1);
  });

  it('classifies Balanced Co-Ed, Mostly-Male Splash, Mostly-Female Splash, All-Male, and All-Female clubhouse synergies', () => {
    const malePool = makePopulation('male', 'CF', 18);
    const femalePool = makePopulation('female', 'CF', 18);

    const allMale = evaluateCoEdClubhouseSynergy(malePool);
    expect(allMale.id).toBe('bash_bro_chaos');
    expect(allMale.powerDelta).toBeGreaterThan(0);
    expect(allMale.eyeDelta).toBeLessThan(0);

    const allFemale = evaluateCoEdClubhouseSynergy(femalePool);
    expect(allFemale.id).toBe('precision_swarm');
    expect(allFemale.contactDelta).toBeGreaterThan(0);
    expect(allFemale.powerDelta).toBeLessThan(0);

    const balanced = evaluateCoEdClubhouseSynergy([...malePool.slice(0, 9), ...femalePool.slice(0, 9)]);
    expect(balanced.id).toBe('balanced_harmony');
    expect(balanced.contactDelta).toBeGreaterThan(0);
    expect(balanced.powerDelta).toBeGreaterThan(0);
    expect(balanced.controlDelta).toBeGreaterThan(0);

    const mostlyMaleSplash = evaluateCoEdClubhouseSynergy([...malePool.slice(0, 16), ...femalePool.slice(0, 2)]);
    expect(mostlyMaleSplash.id).toBe('calm_in_storm');
    expect(mostlyMaleSplash.controlDelta).toBeGreaterThan(0);

    const mostlyFemaleSplash = evaluateCoEdClubhouseSynergy([...femalePool.slice(0, 16), ...malePool.slice(0, 2)]);
    expect(mostlyFemaleSplash.id).toBe('thunder_anchor');
    expect(mostlyFemaleSplash.powerDelta).toBeGreaterThan(0);
    expect(mostlyFemaleSplash.contactDelta).toBeGreaterThan(0);
  });
});
