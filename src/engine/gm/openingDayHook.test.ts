import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import { buildFirstPitchCoachTip, selectClubSpotlightTrio } from './openingDayHook';

function makeClub(seed = 1994) {
  return generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  }).leagues.rookie[0];
}

describe('Opening Day First-Time Hook Engine (Spotlight Trio & First-Pitch Coach Tip)', () => {
  it('picks 3 distinct memorable stars (Captain hitter, Staff Ace pitcher, Speedster) with kid-friendly taglines', () => {
    const club = makeClub(1994);
    const trio = selectClubSpotlightTrio(club);

    expect(trio).toHaveLength(3);
    const ids = new Set(trio.map((t) => t.player.id));
    expect(ids.size).toBe(3);

    expect(trio[0].roleBadge).toMatch(/captain/i);
    expect(trio[1].roleBadge).toMatch(/ace/i);
    expect(trio[2].roleBadge).toMatch(/speed/i);
    for (const star of trio) {
      expect(star.tagline.length).toBeGreaterThan(6);
    }
  });

  it('handles tiny or pitcher-only fallback rosters safely without crashing', () => {
    const club = makeClub(2026);
    const tiny = {
      ...club,
      rotationIds: [],
      roster: club.roster.slice(0, 2),
    };
    const trio = selectClubSpotlightTrio(tiny);
    expect(trio.length).toBeGreaterThanOrEqual(1);
    expect(trio.length).toBeLessThanOrEqual(2);

    const pitchersOnly = {
      ...club,
      rotationIds: [],
      roster: club.roster.filter((p) => p.position === 'SP' || p.position === 'RP').slice(0, 3),
    };
    const pitcherTrio = selectClubSpotlightTrio(pitchersOnly);
    expect(pitcherTrio.length).toBeGreaterThanOrEqual(1);

    const empty = { ...club, rotationIds: [], roster: [] };
    expect(selectClubSpotlightTrio(empty)).toEqual([]);
  });

  it('returns a friendly first-pitch Coach Pops tip before Pitch #1 of Opening Day and hides it afterward', () => {
    const pitchingTip = buildFirstPitchCoachTip({
      isOpeningDay: true,
      isBatting: false,
      hasThrownPitch: false,
    });
    expect(pitchingTip).toMatch(/heat|trick|corner|smart watch/i);

    const battingTip = buildFirstPitchCoachTip({
      isOpeningDay: true,
      isBatting: true,
      hasThrownPitch: false,
    });
    expect(battingTip).toMatch(/contact|swing|power|smart watch/i);

    expect(
      buildFirstPitchCoachTip({
        isOpeningDay: true,
        isBatting: true,
        hasThrownPitch: true,
      }),
    ).toBeNull();

    expect(
      buildFirstPitchCoachTip({
        isOpeningDay: false,
        isBatting: false,
        hasThrownPitch: false,
      }),
    ).toBeNull();
  });
});
