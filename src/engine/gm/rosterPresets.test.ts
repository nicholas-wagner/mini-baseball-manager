import { describe, expect, it } from 'vitest';
import { computePlayerOverall, isPitcherPosition, type Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { createClub, validateLineup, type CreateClubOptions } from './rosterFactory';
import {
  createClubWithStartingPreset,
  ROOKIE_PARITY_TARGET_OVR,
  STARTING_ROSTER_PRESETS,
  type StartingRosterPreset,
} from './rosterPresets';

const BASE_OPTS: CreateClubOptions = {
  id: 'club-preset-test',
  city: 'Sandlot',
  name: 'Comets',
  mascot: 'Rocket Dog',
  colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
  leagueTier: 'rookie',
  isHuman: true,
};

function avgOvr(roster: readonly Player[]): number {
  return roster.reduce((sum, p) => sum + computePlayerOverall(p), 0) / roster.length;
}

function avgRating(roster: readonly Player[], pick: (p: Player) => number): number {
  return roster.reduce((sum, p) => sum + pick(p), 0) / roster.length;
}

describe('Fair Rookie-Ball Starting Roster Presets (TASK-064)', () => {
  it('exposes all 6 requested starting presets and keeps every club inside the same fair Rookie OVR parity band', () => {
    const presetIds = STARTING_ROSTER_PRESETS.map((p) => p.id);
    expect(presetIds).toEqual([
      'balanced',
      'all_rookies',
      'veterans',
      'good_defense',
      'good_hitting',
      'good_pitching',
    ]);

    const rivalAvg = avgOvr(createClub(createSeededRng(700), { ...BASE_OPTS, isHuman: false }).roster);

    for (const preset of presetIds) {
      const club = createClubWithStartingPreset(createSeededRng(1994), BASE_OPTS, preset);
      expect(club.leagueTier).toBe('rookie');
      expect(club.roster).toHaveLength(18);
      expect(validateLineup(club).valid).toBe(true);

      const teamAvg = avgOvr(club.roster);
      expect(Math.abs(teamAvg - ROOKIE_PARITY_TARGET_OVR)).toBeLessThanOrEqual(2.2);
      expect(Math.abs(teamAvg - rivalAvg)).toBeLessThanOrEqual(3.5);
    }
  });

  it('produces authentic strategic trade-offs across All Rookies, Veterans, Good Defense, Good Hitting, and Good Pitching', () => {
    const build = (preset: StartingRosterPreset) =>
      createClubWithStartingPreset(createSeededRng(2026), BASE_OPTS, preset);

    const rookies = build('all_rookies');
    const veterans = build('veterans');
    const defense = build('good_defense');
    const hitting = build('good_hitting');
    const pitching = build('good_pitching');

    // All Rookies: 100% rookie marketTier, young, fast XP growth
    expect(rookies.roster.every((p) => p.marketTier === 'rookie')).toBe(true);
    expect(avgRating(rookies.roster, (p) => p.age)).toBeLessThan(22);

    // Veterans: significantly older, higher career experience, slower XP growth
    expect(avgRating(veterans.roster, (p) => p.age)).toBeGreaterThan(30);
    expect(avgRating(veterans.roster, (p) => p.careerService.experienceScore)).toBeGreaterThan(
      avgRating(rookies.roster, (p) => p.careerService.experienceScore) + 35,
    );

    // Good Defense > Good Hitting in fielding & range, while Good Hitting > Good Defense in hitting
    const defHitters = defense.roster.filter((p) => !isPitcherPosition(p.position));
    const hitHitters = hitting.roster.filter((p) => !isPitcherPosition(p.position));
    const pitHitters = pitching.roster.filter((p) => !isPitcherPosition(p.position));
    const hitPitchers = hitting.roster.filter((p) => isPitcherPosition(p.position));
    const pitPitchers = pitching.roster.filter((p) => isPitcherPosition(p.position));

    expect(avgRating(defHitters, (p) => p.ratings.fielding + p.ratings.range)).toBeGreaterThan(
      avgRating(hitHitters, (p) => p.ratings.fielding + p.ratings.range),
    );
    expect(avgRating(hitHitters, (p) => p.ratings.contact + p.ratings.power)).toBeGreaterThan(
      avgRating(pitHitters, (p) => p.ratings.contact + p.ratings.power),
    );
    expect(avgRating(pitPitchers, (p) => p.ratings.velocity + p.ratings.control)).toBeGreaterThan(
      avgRating(hitPitchers, (p) => p.ratings.velocity + p.ratings.control),
    );
  });
});
