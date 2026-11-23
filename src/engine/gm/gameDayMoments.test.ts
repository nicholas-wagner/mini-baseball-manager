import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import { createGameSession, stepAtBat } from '../simulation/baseballEngine';
import {
  buildLiveBroadcastLowerThird,
  buildPreGameProbableMatchup,
  createClutchMomentSession,
  evaluateSeriesStakes,
  SERIES_SWEEP_BONUS_CASH,
} from './gameDayMoments';

function makeWorld(seed = 1994) {
  return generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  });
}

describe('Game Day Moments Engine (Clutch Entry, Series Stakes, Broadcast Lower-Third & Probable Matchup)', () => {
  it('jumps straight into a playable late-inning clutch moment with a 1-line broadcast recap', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];

    const clutch = createClutchMomentSession({
      awayClub: rival,
      homeClub: human,
      seed: 1994,
      regulationInnings: 5,
      awayGameplan: 'balanced',
      homeGameplan: 'swing_fences',
    });

    expect(clutch.session.status).toBe('in_progress');
    expect(clutch.session.inning).toBeGreaterThanOrEqual(4);
    expect(clutch.events.length).toBeGreaterThan(0);
    expect(clutch.recapHeadline).toMatch(/TOP|BOT/);
    expect(clutch.recapHeadline).toMatch(/out/i);
  });

  it('also works cleanly for Road Trip clutch moments (human is AWAY) and 9-inning classic games', () => {
    const world = makeWorld(2025);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[2];

    const roadClutch = createClutchMomentSession({
      awayClub: human,
      homeClub: rival,
      seed: 4444,
      regulationInnings: 9,
      awayGameplan: 'small_ball',
      homeGameplan: 'balanced',
    });

    expect(roadClutch.session.status).toBe('in_progress');
    expect(roadClutch.session.away.isHuman).toBe(true);
    expect(roadClutch.session.inning).toBeGreaterThanOrEqual(7);
    expect(roadClutch.recapHeadline.length).toBeGreaterThan(12);
  });

  it('evaluates all 3-game series stakes states including Opener, Sweep Chance, Rubber Match, and Salvage Finale', () => {
    const opener = evaluateSeriesStakes(0, 0);
    expect(opener.badgeText).toMatch(/opener/i);
    expect(opener.isSweepOpportunity).toBe(false);
    expect(opener.isRubberMatch).toBe(false);

    const upOne = evaluateSeriesStakes(1, 0);
    expect(upOne.badgeText).toMatch(/1-0/);

    const downOne = evaluateSeriesStakes(0, 1);
    expect(downOne.badgeText).toMatch(/0-1/);

    const rubber = evaluateSeriesStakes(1, 1);
    expect(rubber.isRubberMatch).toBe(true);
    expect(rubber.badgeText).toMatch(/rubber match/i);

    const sweepChance = evaluateSeriesStakes(2, 0);
    expect(sweepChance.isSweepOpportunity).toBe(true);
    expect(sweepChance.sweepBonusCash).toBe(SERIES_SWEEP_BONUS_CASH);
    expect(sweepChance.badgeText).toMatch(/sweep chance/i);

    const salvage = evaluateSeriesStakes(0, 2);
    expect(salvage.badgeText).toMatch(/salvage/i);

    const sweptDone = evaluateSeriesStakes(3, 0);
    expect(sweptDone.badgeText).toMatch(/sweep/i);

    const lostDone = evaluateSeriesStakes(1, 2);
    expect(lostDone.badgeText).toMatch(/1-2/);

    const wonDone = evaluateSeriesStakes(2, 1);
    expect(wonDone.badgeText).toMatch(/W 2-1/);
  });

  it('covers leading/trailing/tied clutch recaps, multi-hit HR/RBI/BB lower-third lines, and elite ace scouting notes', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];

    // Exercise multiple seeds to cover Leading, Trailing, Tied & occupied-base clutch recaps
    const recaps = [101, 202, 303, 404, 505, 606].map(
      (seed) =>
        createClutchMomentSession({
          awayClub: rival,
          homeClub: human,
          seed,
          regulationInnings: 5,
        }).recapHeadline,
    );
    expect(recaps.every((r) => r.includes('Clutch Jump-In'))).toBe(true);

    // Exercise BOT half lower-third with HR + RBI + BB batter line AND missing pitcher line fallback
    const baseSession = createGameSession(rival, human, 1994, 'regular', 5);
    const homeBatterId = baseSession.home.lineup[0].playerId;
    const botSession = {
      ...baseSession,
      half: 'BOT' as const,
      boxScore: {
        ...baseSession.boxScore,
        homeBatters: {
          ...baseSession.boxScore.homeBatters,
          [homeBatterId]: {
            ...baseSession.boxScore.homeBatters[homeBatterId],
            plateAppearances: 4,
            atBats: 3,
            hits: 2,
            homeRuns: 1,
            rbis: 2,
            walks: 1,
          },
        },
        awayPitchers: {},
      },
    };
    const lowerBot = buildLiveBroadcastLowerThird(botSession);
    expect(lowerBot.batterLineText).toBe('2-3, 1 HR, 2 RBI, 1 BB');
    expect(lowerBot.pitchCount).toBe(0);
    expect(lowerBot.pitcherLineText).toBe('0.0 IP, 0 K, 0 ER');

    // Exercise high-OVR Majors ace scouting note (>= 74 OVR) + empty-rotation fallback safely
    const majorsClub = world.leagues.majors[0];
    const boostedAceClub = {
      ...majorsClub,
      roster: majorsClub.roster.map((p) => ({
        ...p,
        ratings: { ...p.ratings, velocity: 95, movement: 95, control: 95, stamina: 95, clutch: 95 },
      })),
    };
    const acePreview = buildPreGameProbableMatchup(
      { ...human, rotationIds: [] },
      boostedAceClub,
    );
    expect(acePreview.matchupNote).toMatch(/tough/i);
    expect(acePreview.humanStarter).toBeTruthy();

    // Exercise fallback when a club has only pitchers on roster
    const pitchersOnly = {
      ...rival,
      rotationIds: [],
      roster: rival.roster.filter((p) => p.position === 'SP'),
    };
    expect(buildPreGameProbableMatchup(human, pitchersOnly).opponentStarHitter).toBeTruthy();
  });

  it('projects live TV Broadcast Lower-Third with batter today line, on-deck batter, pitch count, and endurance tone', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];
    const session = createGameSession(rival, human, 1994, 'regular', 5);

    const opening = buildLiveBroadcastLowerThird(session);
    expect(opening.batterName).toBeTruthy();
    expect(opening.batterNickname).toBeTruthy();
    expect(opening.batterForm).toBeTruthy();
    expect(opening.pitcherNickname).toBeTruthy();
    expect(opening.pitcherForm).toBeTruthy();
    expect(opening.onDeckName).toBeTruthy();
    expect(opening.onDeckName).not.toBe(opening.batterName);
    expect(opening.batterLineText).toMatch(/0-0/);
    expect(opening.pitchCount).toBe(0);
    expect(opening.endurancePct).toBe(100);
    expect(opening.enduranceTone).toBe('fresh');

    // Step an at-bat and simulate tiring & gassed endurance thresholds
    const stepped = stepAtBat(session, 'normal').nextSession;
    const afterAb = buildLiveBroadcastLowerThird(stepped);
    expect(afterAb.pitchCount).toBeGreaterThan(0);

    const tiring = buildLiveBroadcastLowerThird({
      ...stepped,
      home: { ...stepped.home, pitcherFatigue: 55 },
      away: { ...stepped.away, pitcherFatigue: 55 },
    });
    expect(tiring.enduranceTone).toBe('tiring');

    const gassed = buildLiveBroadcastLowerThird({
      ...stepped,
      home: { ...stepped.home, pitcherFatigue: 75 },
      away: { ...stepped.away, pitcherFatigue: 75 },
    });
    expect(gassed.enduranceTone).toBe('gassed');
  });

  it('builds Pre-Game Probable Pitching Matchup matching createGameSession starters plus top rival slugger', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];
    const session = createGameSession(rival, human, 1994, 'regular', 5);

    const preview = buildPreGameProbableMatchup(human, rival);
    expect(preview.humanStarter.id).toBe(session.home.activePitcherId);
    expect(preview.opponentStarter.id).toBe(session.away.activePitcherId);
    expect(preview.opponentStarHitter.position).not.toBe('SP');
    expect(preview.opponentStarHitter.position).not.toBe('RP');
    expect(preview.matchupNote.length).toBeGreaterThan(10);
  });
});
