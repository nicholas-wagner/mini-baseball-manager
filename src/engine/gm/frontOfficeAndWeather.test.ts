import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  callUpAcademyProspect,
  runAcademyPassiveDevelopment,
  stashProspectInAcademy,
} from '../gm/academy';
import {
  evaluateTradeProposal,
  executeTradeProposal,
  generateDeadlineTradeOffer,
} from '../gm/tradeEngine';
import { generateSandlotGazetteIssue } from '../events/newspaper';
import {
  evaluateWeatherSimulationImpact,
  rollGameDayWeather,
} from '../simulation/weather';

describe('Milestone 7 Front Office (TASK-039, TASK-040, TASK-042) + Dynamic Weather (TASK-037)', () => {
  it('evaluates multi-player trade fair value, executes legal swaps & generates Trade Deadline offers (TASK-039)', () => {
    const rng = createSeededRng(3901);
    const clubA = createClub(rng, {
      id: 'c-a',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'aa',
      isHuman: true,
    });
    const clubB = createClub(rng, {
      id: 'c-b',
      city: 'Harbor',
      name: 'Sharks',
      mascot: 'Shark',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'HS' },
      leagueTier: 'aa',
      isHuman: false,
      aiArchetype: 'mashers',
    });

    const starB = [...clubB.roster].sort((a, b) => b.ratings.power - a.ratings.power)[0];
    const weakA = [...clubA.roster].sort((a, b) => a.ratings.power - b.ratings.power)[0];
    const strongA = [...clubA.roster].sort((a, b) => b.ratings.power - a.ratings.power)[0];
    const secondA = [...clubA.roster].sort((a, b) => b.ratings.power - a.ratings.power)[1];
    // Trim 1 bench contract from clubA so it sits comfortably under AA Salary Cap
    const capReadyClubA = { ...clubA, roster: clubA.roster.slice(0, 17) };
    const capReadyClubB = { ...clubB, roster: clubB.roster.slice(0, 17) };
    const safeStrongA = capReadyClubA.roster.find((p) => p.id === strongA.id) ?? capReadyClubA.roster[0];
    const safeSecondA =
      capReadyClubA.roster.find((p) => p.id === secondA.id && p.id !== safeStrongA.id) ??
      capReadyClubA.roster[1];
    const safeStarB = capReadyClubB.roster.find((p) => p.id === starB.id) ?? capReadyClubB.roster[0];

    // Unbalanced lowball offer rejected
    const lopsided = evaluateTradeProposal(capReadyClubA, capReadyClubB, {
      outgoingPlayerIds: [weakA.id],
      incomingPlayerIds: [safeStarB.id],
      cashSweetener: 0,
    });
    expect(lopsided.accepted).toBe(false);

    // Fair 2-for-1 multi-player package + cash sweetener accepted & swaps rosters cleanly
    const fairExec = executeTradeProposal(capReadyClubA, capReadyClubB, {
      outgoingPlayerIds: [safeStrongA.id, safeSecondA.id],
      incomingPlayerIds: [safeStarB.id],
      cashSweetener: 3500,
    });
    expect(fairExec.executed).toBe(true);
    expect(fairExec.clubA.roster.some((p) => p.id === safeStarB.id)).toBe(true);
    expect(fairExec.clubB.roster.some((p) => p.id === safeStrongA.id)).toBe(true);
    expect(fairExec.clubB.roster.some((p) => p.id === safeSecondA.id)).toBe(true);

    // Deadline AI trade offer generator
    const offer = generateDeadlineTradeOffer(rng, clubA, clubB);
    expect(offer).not.toBeNull();
    expect(offer?.incomingPlayerIds.length).toBeGreaterThanOrEqual(1);
  });

  it('stashes youth in 6-slot Prospect Academy, runs passive training & grants Rookie Debut call-up boost (TASK-040)', () => {
    const rng = createSeededRng(4001);
    const club = createClub(rng, {
      id: 'c-acad',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const prospect = createPlayer(rng, { position: 'CF', tier: 'rookie', marketTier: 'rookie' });

    const stashed = stashProspectInAcademy(club, prospect);
    expect(stashed.stashed).toBe(true);
    expect(stashed.club.academyProspects).toHaveLength(1);

    const trained = runAcademyPassiveDevelopment(rng, stashed.club);
    expect(trained.club.academyProspects[0].xp).toBeGreaterThan(prospect.xp);

    const calledUp = callUpAcademyProspect(trained.club, prospect.id);
    expect(calledUp.calledUp).toBe(true);
    expect(calledUp.debutBoostBanner).toMatch(/ROOKIE DEBUT/i);
    expect(calledUp.club.roster.some((p) => p.id === prospect.id)).toBe(true);
    expect(calledUp.club.economy.teamHype).toBeGreaterThan(trained.club.economy.teamHype);
  });

  it('publishes retro 90s "The Sandlot Gazette" issues & simulates weather/wind/dome impacts (TASK-042, TASK-037)', () => {
    const rng = createSeededRng(4201);
    const club = createClub(rng, {
      id: 'c-gaz',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const issue = generateSandlotGazetteIssue({
      seasonNumber: 2,
      seriesIndex: 4,
      humanClub: { ...club, streak: 5, wins: 11, losses: 4 },
      rivalryHeadline: 'Comets walk off Bayou Bandits in 10th!',
    });
    expect(issue.headline.length).toBeGreaterThan(10);
    expect(issue.subhead.length).toBeGreaterThan(10);
    expect(issue.spotlightPlayerId).toBeTruthy();

    // Indoor dome always stays clear & windless; outdoor parks roll wind/sunset/night/drizzle
    const domeWeather = rollGameDayWeather(rng, { isDome: true, hasNightLights: true });
    expect(domeWeather.condition).toBe('dome_controlled');
    expect(domeWeather.windMph).toBe(0);

    const windOutImpact = evaluateWeatherSimulationImpact({
      condition: 'sunny',
      windDirection: 'blowing_out',
      windMph: 16,
      isNightGame: false,
      rainDelayRisk: 0,
    });
    const windInImpact = evaluateWeatherSimulationImpact({
      condition: 'drizzle',
      windDirection: 'blowing_in',
      windMph: 16,
      isNightGame: true,
      rainDelayRisk: 0.2,
    });
    expect(windOutImpact.hrCarryMultiplier).toBeGreaterThan(windInImpact.hrCarryMultiplier + 0.2);
    expect(windInImpact.pitcherControlPenalty).toBeLessThan(0);
  });
});
