import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { LEAGUE_TIER_ORDER } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import {
  getStadiumTierProfile,
  scaleStadiumForLeagueTier,
  STADIUM_TIER_PROFILES,
  upgradeStadiumFacility,
} from './stadiumProgression';

describe('Sandlot-to-Pro Major League Stadium Progression (TASK-033)', () => {
  it('strictly increases stadium fan capacity and architectural grandeur from Rookie Sandlot to Majors', () => {
    let prevMax = 0;
    for (const tier of LEAGUE_TIER_ORDER) {
      const profile = getStadiumTierProfile(tier);
      expect(profile.minCapacity).toBeLessThan(profile.maxCapacity);
      expect(profile.maxCapacity).toBeGreaterThan(prevMax);
      prevMax = profile.maxCapacity;
    }

    expect(STADIUM_TIER_PROFILES.rookie.architectureClass).toBe('neighborhood_sandlot');
    expect(STADIUM_TIER_PROFILES.rookie.fenceStyle).toBe('chain_link');
    expect(STADIUM_TIER_PROFILES.rookie.minCapacity).toBe(500);
    expect(STADIUM_TIER_PROFILES.majors.architectureClass).toBe('major_league_cathedral');
    expect(STADIUM_TIER_PROFILES.majors.upperDeckCount).toBe(2);
    expect(STADIUM_TIER_PROFILES.majors.maxCapacity).toBe(45_000);
  });

  it('scales stadium capacity and baseline features upward upon promotion to higher leagues', () => {
    const club = createClub(createSeededRng(701), {
      id: 'club-promo',
      isHuman: true,
      city: 'Riverdale',
      name: 'Rockets',
      mascot: 'Rocket',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'RR' },
      leagueTier: 'rookie',
    });

    expect(club.stadium.capacity).toBeLessThanOrEqual(1_500);
    const highA = scaleStadiumForLeagueTier(club.stadium, 'high_a');
    expect(highA.capacity).toBeGreaterThanOrEqual(4_500);
    expect(highA.hasNightLights).toBe(true);

    const majors = scaleStadiumForLeagueTier(highA, 'majors');
    expect(majors.capacity).toBeGreaterThanOrEqual(28_000);
    expect(majors.seatingTier).toBe(4);
    expect(majors.hasJumbotron).toBe(true);
    expect(majors.hasMascotCannon).toBe(true);
  });

  it('purchases seating expansions and stadium facilities while enforcing tier gates, cash, and duplicates', () => {
    let club = createClub(createSeededRng(702), {
      id: 'club-upg',
      isHuman: true,
      city: 'Bay',
      name: 'Sluggers',
      mascot: 'Bat',
      colors: { primary: '#0096C7', secondary: '#181B2C', accent: '#FFD166', monogram: 'BS' },
      leagueTier: 'rookie',
    });

    // Night lights locked in rookie
    const lockedLights = upgradeStadiumFacility(club, 'night_lights');
    expect(lockedLights.upgraded).toBe(false);
    expect(lockedLights.reason).toContain('LOW_A');

    // Seating expansion works in rookie
    const expanded = upgradeStadiumFacility(club, 'seating_expansion');
    expect(expanded.upgraded).toBe(true);
    expect(expanded.club.stadium.capacity).toBeGreaterThan(club.stadium.capacity);
    expect(expanded.club.economy.cash).toBeLessThan(club.economy.cash);

    // Promote to AA with plenty of cash and buy all facilities
    club = {
      ...expanded.club,
      leagueTier: 'aa',
      stadium: { ...expanded.club.stadium, hasNightLights: false, hasJumbotron: false, hasMascotCannon: false },
      economy: { ...expanded.club.economy, cash: 50_000 },
    };

    const withLights = upgradeStadiumFacility(club, 'night_lights');
    expect(withLights.upgraded).toBe(true);
    expect(upgradeStadiumFacility(withLights.club, 'night_lights').upgraded).toBe(false);

    const withJumbo = upgradeStadiumFacility(withLights.club, 'jumbotron');
    expect(withJumbo.upgraded).toBe(true);
    expect(upgradeStadiumFacility(withJumbo.club, 'jumbotron').upgraded).toBe(false);

    const withCannon = upgradeStadiumFacility(withJumbo.club, 'mascot_cannon');
    expect(withCannon.upgraded).toBe(true);
    expect(upgradeStadiumFacility(withCannon.club, 'mascot_cannon').upgraded).toBe(false);

    // Insufficient cash rejection
    const broke = upgradeStadiumFacility(
      { ...club, economy: { ...club.economy, cash: 100 } },
      'jumbotron',
    );
    expect(broke.upgraded).toBe(false);

    // Maxed seating rejection
    const maxed = upgradeStadiumFacility(
      { ...club, stadium: { ...club.stadium, seatingTier: 4, capacity: 12_500 } },
      'seating_expansion',
    );
    expect(maxed.upgraded).toBe(false);

    // Unknown upgrade rejection
    expect(upgradeStadiumFacility(club, 'unknown' as never).upgraded).toBe(false);
  });
});
