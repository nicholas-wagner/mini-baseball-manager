import { describe, expect, it } from 'vitest';
import { LEAGUE_TIER_ORDER } from '../models/club';
import {
  advanceOffseasonWorld,
  computeTierStandings,
  generateSixTierWorld,
  generateTierSchedule,
  getTierLeagueLeaders,
  simulateBestOfThreePlayoffs,
  simulateSeriesRound,
} from './seasonEngine';

describe('6-Tier Pyramid & 21-Game Season Engine (TASK-024)', () => {
  it('generates 48 unique themed clubs (8 per tier across all 6 tiers) deterministically from seed', () => {
    const worldA = generateSixTierWorld(1994, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });
    const worldB = generateSixTierWorld(1994, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });

    expect(worldA.humanClubId).toBe(worldB.humanClubId);
    const allClubIds = new Set<string>();
    const allClubNames = new Set<string>();
    for (const tier of LEAGUE_TIER_ORDER) {
      expect(worldA.leagues[tier]).toHaveLength(8);
      for (const club of worldA.leagues[tier]) {
        allClubIds.add(club.id);
        allClubNames.add(`${club.city} ${club.name}`);
      }
    }
    expect(allClubIds.size).toBe(48);
    expect(allClubNames.size).toBe(48);
    expect(worldA.leagues.rookie[0].isHuman).toBe(true);
    expect(worldA.leagues.rookie[0].name).toBe('Comets');
  });

  it('builds a balanced 7-series (21-game) round-robin schedule where every club plays all 7 rivals once', () => {
    const world = generateSixTierWorld(2025, {
      city: 'Harbor',
      clubName: 'Waves',
      mascot: 'Shark',
      monogram: 'HW',
      primaryColor: '#1D63B8',
      secondaryColor: '#0F2B46',
      accentColor: '#FFD166',
    });
    const schedule = generateTierSchedule(world.leagues.rookie.map((c) => c.id));
    expect(schedule).toHaveLength(7);

    const opponentsByClub = new Map<string, Set<string>>();
    for (const series of schedule) {
      expect(series.matchups).toHaveLength(4);
      for (const match of series.matchups) {
        expect(match.gamesCount).toBe(3);
        expect(match.homeClubId).not.toBe(match.awayClubId);
        if (!opponentsByClub.has(match.homeClubId)) opponentsByClub.set(match.homeClubId, new Set());
        if (!opponentsByClub.has(match.awayClubId)) opponentsByClub.set(match.awayClubId, new Set());
        opponentsByClub.get(match.homeClubId)!.add(match.awayClubId);
        opponentsByClub.get(match.awayClubId)!.add(match.homeClubId);
      }
    }

    for (const club of world.leagues.rookie) {
      expect(opponentsByClub.get(club.id)?.size).toBe(7);
    }
  });

  it('simulates a full 21-game tier season, computes standings/leaders, crowns Best-of-3 playoff champion, and runs promotion/relegation cleanly', () => {
    const world = generateSixTierWorld(777, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });

    // Simulate all 7 three-game series in Rookie & Low-A (using 5-inning fast sim for speed)
    let leagues = world.leagues;
    for (let sIdx = 0; sIdx < 7; sIdx += 1) {
      const roundRookie = simulateSeriesRound(leagues.rookie, sIdx, 7000 + sIdx * 100, 5);
      const roundLowA = simulateSeriesRound(leagues.low_a, sIdx, 8000 + sIdx * 100, 5);
      leagues = {
        ...leagues,
        rookie: roundRookie.clubs,
        low_a: roundLowA.clubs,
      };
    }

    // Every club in Rookie and Low-A played exactly 21 games
    for (const club of leagues.rookie) {
      expect(club.wins + club.losses).toBe(21);
    }
    const rookieStandings = computeTierStandings(leagues.rookie);
    expect(rookieStandings).toHaveLength(8);
    expect(rookieStandings[0].wins).toBeGreaterThanOrEqual(rookieStandings[7].wins);
    expect(rookieStandings[0].gamesBack).toBe(0);

    const leaders = getTierLeagueLeaders(leagues.rookie);
    expect(leaders.battingAvg[0].value).toBeGreaterThanOrEqual(0);
    expect(leaders.homeRuns.length).toBeGreaterThan(0);
    expect(leaders.strikeouts.length).toBeGreaterThan(0);

    // Best-of-3 4-team playoffs crowns a valid champion from top 4
    const playoffs = simulateBestOfThreePlayoffs(leagues.rookie, 9100, 5);
    expect(playoffs.semifinals).toHaveLength(2);
    expect(playoffs.championClubId).toBeTruthy();
    const top4Ids = rookieStandings.slice(0, 4).map((r) => r.clubId);
    expect(top4Ids).toContain(playoffs.championClubId);

    // Offseason promotion/relegation moves Rookie champion UP to Low-A and Low-A last place DOWN to Rookie,
    // resets seasonal wins/losses, and increments player careerService.seasonsPlayed!
    const rookieChampId = playoffs.championClubId;
    const lowABottomId = computeTierStandings(leagues.low_a)[7].clubId;
    const samplePlayerBefore = leagues.rookie[0].roster[0];

    const offseason = advanceOffseasonWorld(leagues, 9999, {
      rookie: rookieChampId,
    });
    expect(offseason.leagues.low_a.some((c) => c.id === rookieChampId)).toBe(true);
    expect(offseason.leagues.rookie.some((c) => c.id === lowABottomId)).toBe(true);
    expect(offseason.transitions.length).toBeGreaterThanOrEqual(2);

    // Every tier still has exactly 8 clubs, 0-0 records for new season, and +1 seasonsPlayed!
    for (const tier of LEAGUE_TIER_ORDER) {
      expect(offseason.leagues[tier]).toHaveLength(8);
      for (const club of offseason.leagues[tier]) {
        expect(club.leagueTier).toBe(tier);
        expect(club.wins).toBe(0);
        expect(club.losses).toBe(0);
      }
    }

    const allPlayersAfter = Object.values(offseason.leagues).flatMap((list) =>
      list.flatMap((c) => c.roster),
    );
    const samePlayerAfter = allPlayersAfter.find((p) => p.id === samplePlayerBefore.id)!;
    expect(samePlayerAfter.careerService.seasonsPlayed).toBe(
      samplePlayerBefore.careerService.seasonsPlayed + 1,
    );
  });
});
