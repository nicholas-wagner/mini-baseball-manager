import { describe, expect, it } from 'vitest';
import { createGameSession } from '../simulation/baseballEngine';
import { computeLiveActionCue } from '../simulation/liveActionAdvisor';
import {
  generateSixTierWorld,
  getHumanSeasonSchedule,
  simulateSeriesRound,
} from './seasonEngine';

describe('Predetermined 7-Series Season Schedule (Home & Away) + Road Game Live Advisor', () => {
  it('builds a predetermined 7-series Home/Away schedule matching every rival in the league', () => {
    const world = generateSixTierWorld(1994, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });
    const tierClubs = world.leagues.rookie;

    const sched0 = getHumanSeasonSchedule(tierClubs, world.humanClubId, 0);
    expect(sched0.entries).toHaveLength(7);
    expect(sched0.nextSeries?.seriesIndex).toBe(0);
    expect(sched0.nextSeries?.isHome).toBe(true);

    // Every rival club appears exactly once across the 7 predetermined series, alternating Home & Away
    const uniqueOpps = new Set(sched0.entries.map((e) => e.opponent.id));
    expect(uniqueOpps.size).toBe(7);
    expect(uniqueOpps.has(world.humanClubId)).toBe(false);
    expect(sched0.entries[1].isHome).toBe(false);
    expect(sched0.entries[1].hostBallparkId).toBe(sched0.entries[1].opponent.stadium.ballparkId);
    expect(sched0.entries[0].hostBallparkId).toBe(
      tierClubs.find((c) => c.id === world.humanClubId)!.stadium.ballparkId,
    );

    // Advancing to Series 2 marks Series 1 completed & Series 2 current (Road Trip!)
    const sched1 = getHumanSeasonSchedule(tierClubs, world.humanClubId, 1);
    expect(sched1.entries[0].status).toBe('completed');
    expect(sched1.entries[1].status).toBe('current');
    expect(sched1.nextSeries?.seriesIndex).toBe(1);
    expect(sched1.nextSeries?.isHome).toBe(false);

    // After Series 7 completes, regular season nextSeries is null
    const schedDone = getHumanSeasonSchedule(tierClubs, world.humanClubId, 7);
    expect(schedDone.nextSeries).toBeNull();
    expect(schedDone.entries.every((e) => e.status === 'completed')).toBe(true);

    // Unknown club returns empty schedule safely
    expect(getHumanSeasonSchedule(tierClubs, 'nonexistent-club', 0)).toEqual({
      entries: [],
      nextSeries: null,
    });
  });

  it('respects humanGamesAlreadyPlayed in simulateSeriesRound without duplicating games', () => {
    const world = generateSixTierWorld(2026, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      startingPreset: 'balanced',
    });
    const tierClubs = world.leagues.rookie;

    // Home series (round 0) with 2 human games already played -> 1 human game + 9 AI games = 10 total
    const partial = simulateSeriesRound(tierClubs, 0, 500, 5, 'swing_fences', 2);
    expect(partial.gamesSimulated).toBe(10);
    const humanAfterPartial = partial.clubs.find((c) => c.id === world.humanClubId)!;
    expect(humanAfterPartial.wins + humanAfterPartial.losses).toBe(1);

    // Road series (round 1, human is AWAY) with 3 human games already played -> 0 human games + 9 AI games = 9
    const aiOnly = simulateSeriesRound(partial.clubs, 1, 600, 5, 'small_ball', 3);
    expect(aiOnly.gamesSimulated).toBe(9);
    const humanAfterRoad = aiOnly.clubs.find((c) => c.id === world.humanClubId)!;
    expect(humanAfterRoad.wins + humanAfterRoad.losses).toBe(1);

    // Empty tier safely returns 0 simulated games
    expect(simulateSeriesRound([], 0, 1)).toEqual({ clubs: [], gamesSimulated: 0 });
  });

  it('automatically flips Coach Pops turn cues for Road Games where human is AWAY (bats TOP, pitches BOT)', () => {
    const world = generateSixTierWorld(1994, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });
    const human = world.leagues.rookie.find((c) => c.id === world.humanClubId)!;
    const rival = world.leagues.rookie.find((c) => c.id !== world.humanClubId)!;

    // Road game: human is AWAY, rival is HOME
    const roadSession = createGameSession(human, rival, 777);
    const topCue = computeLiveActionCue({
      session: roadSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(topCue.kind).toBe('default_batting');
    expect(topCue.turnLabel).toMatch(/your turn to bat/i);

    const botCue = computeLiveActionCue({
      session: { ...roadSession, half: 'BOT' },
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(botCue.kind).toBe('default_pitching');
    expect(botCue.turnLabel).toMatch(/your turn to pitch/i);
  });
});
