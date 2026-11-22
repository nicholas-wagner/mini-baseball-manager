import { describe, expect, it } from 'vitest';
import { createClub, type CreateClubOptions } from '../gm/rosterFactory';
import type { BatsHand, ThrowsHand } from '../handedness/types';
import type { Club } from '../models/club';
import type { PlayEvent } from '../models/playEvent';
import type { Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  applyGameStatDeltasToClub,
  createGameSession,
  manualSwapPitcher,
  simFullGame,
  simUntilClutchOrEnd,
  stepAtBat,
  stepHalfInning,
  stepPitch,
} from './baseballEngine';
import {
  advanceWalkRunners,
  isClutchSituation,
  type BaseState,
  type GameSessionState,
} from './gameState';

const AWAY_OPTS: CreateClubOptions = {
  id: 'club-away-rockets',
  city: 'Rocketville',
  name: 'Rockets',
  mascot: 'Comet Dog',
  colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'RK' },
  leagueTier: 'aa',
  isHuman: false,
};

const HOME_OPTS: CreateClubOptions = {
  id: 'club-home-waves',
  city: 'Baytown',
  name: 'Waves',
  mascot: 'Surf Shark',
  colors: { primary: '#1D63B8', secondary: '#0F2B46', accent: '#00E5FF', monogram: 'BW' },
  leagueTier: 'aa',
  isHuman: true,
};

function makeMatchupClubs(
  batterBats: BatsHand,
  pitcherThrows: ThrowsHand,
  seed: number,
): { away: Club; home: Club } {
  const away = createClub(createSeededRng(seed), AWAY_OPTS);
  const home = createClub(createSeededRng(seed + 1), HOME_OPTS);

  const normalizePlayer = (p: Player): Player => ({
    ...p,
    bats: batterBats,
    throws: pitcherThrows,
    ratings: {
      contact: 72,
      power: 72,
      gapPower: 72,
      eye: 70,
      bunt: 75,
      velocity: 72,
      movement: 72,
      control: 72,
      stamina: 80,
      speed: 75,
      fielding: 74,
      range: 74,
      arm: 74,
      clutch: 72,
      luck: 50,
      popularity: 70,
      potential: 80,
    },
  });

  return {
    away: { ...away, roster: away.roster.map(normalizePlayer) },
    home: { ...home, roster: home.roster.map(normalizePlayer) },
  };
}

describe('TASK-014 — Seeded Pitch-by-Pitch Baseball Simulation Engine', () => {
  it('simulates identical full games and stepPitch streams for the same seed', () => {
    const away = createClub(createSeededRng(100), AWAY_OPTS);
    const home = createClub(createSeededRng(200), HOME_OPTS);

    const runA = simFullGame(away, home, 1994);
    const runB = simFullGame(away, home, 1994);

    expect(runA).toEqual(runB);
    expect(runA.winnerClubId).toBeTruthy();
    expect(runA.awayScore).not.toBe(runA.homeScore);
    expect(runA.events.length).toBeGreaterThan(20);
    expect(runA.events[0].type).toBe('game_start');
    expect(runA.events[runA.events.length - 1].type).toBe('game_end');

    let session = createGameSession(away, home, 1994);
    const streamedEvents: PlayEvent[] = [];
    let guard = 0;
    while (session.status === 'in_progress' && guard < 1000) {
      const step = stepPitch(session);
      session = step.nextSession;
      streamedEvents.push(...step.events);
      guard += 1;
    }

    expect(session.status).toBe('completed');
    expect(session.away.score).toBe(runA.awayScore);
    expect(session.home.score).toBe(runA.homeScore);
    expect(streamedEvents.length).toBe(runA.events.length);
  });

  it('enforces exact baseball rules: force-walks, 2-strike fouls, 3-out half swaps, bottom-9 skip, walk-off, and extra innings', () => {
    // 1. Force-walk math
    const openFirst = advanceWalkRunners([null, 'r2', null], 'b1');
    expect(openFirst.basesAfter).toEqual(['b1', 'r2', null]);
    expect(openFirst.runsScoredIds).toEqual([]);

    const forceSecond = advanceWalkRunners(['r1', null, 'r3'], 'b1');
    expect(forceSecond.basesAfter).toEqual(['b1', 'r1', 'r3']);
    expect(forceSecond.runsScoredIds).toEqual([]);

    const loaded = advanceWalkRunners(['r1', 'r2', 'r3'], 'b1');
    expect(loaded.basesAfter).toEqual(['b1', 'r1', 'r2']);
    expect(loaded.runsScoredIds).toEqual(['r3']);

    // 2. Intentional walk advances cleanly on 1 pitch action
    const away = createClub(createSeededRng(301), AWAY_OPTS);
    const home = createClub(createSeededRng(302), HOME_OPTS);
    const startSession = createGameSession(away, home, 777);
    const ibbStep = stepPitch(startSession, 'intentional_walk');
    expect(ibbStep.nextSession.bases[0]).not.toBeNull();
    expect(ibbStep.nextSession.balls).toBe(0);
    expect(ibbStep.nextSession.strikes).toBe(0);
    expect(ibbStep.events.some((e) => e.outcome === 'walk')).toBe(true);

    // 3. Home team ahead after TOP 9 skips BOT 9
    const homeAheadTop9: GameSessionState = {
      ...startSession,
      inning: 9,
      half: 'TOP',
      outs: 2,
      away: { ...startSession.away, score: 2 },
      home: { ...startSession.home, score: 5 },
    };
    let checkSkip = homeAheadTop9;
    let safety = 0;
    while (checkSkip.status === 'in_progress' && safety < 25) {
      checkSkip = stepAtBat(checkSkip, 'power').nextSession;
      safety += 1;
    }
    if (checkSkip.away.score < checkSkip.home.score) {
      expect(checkSkip.half).toBe('TOP');
      expect(checkSkip.inning).toBe(9);
      expect(checkSkip.winnerClubId).toBe(home.id);
    }

    // 4. Tied after 9 forces extra innings (>= 10) and eventually settles cleanly
    const tiedTop10Input: GameSessionState = {
      ...startSession,
      inning: 10,
      half: 'TOP',
      outs: 0,
      away: { ...startSession.away, score: 3 },
      home: { ...startSession.home, score: 3 },
    };
    let extras = tiedTop10Input;
    let extrasSafety = 0;
    while (extras.status === 'in_progress' && extrasSafety < 300) {
      extras = stepAtBat(extras).nextSession;
      extrasSafety += 1;
    }
    expect(extras.status).toBe('completed');
    expect(extras.inning).toBeGreaterThanOrEqual(10);
    expect(extras.away.score).not.toBe(extras.home.score);
  });

  it('produces immediate walk-off finish in BOT 9 when home takes the lead', () => {
    const away = createClub(createSeededRng(401), AWAY_OPTS);
    const home = createClub(createSeededRng(402), HOME_OPTS);
    const baseSession = createGameSession(away, home, 999);
    const runnerOnThird = home.lineup[8].playerId;

    const loadedBot9: GameSessionState = {
      ...baseSession,
      inning: 9,
      half: 'BOT',
      outs: 0,
      bases: ['r1', 'r2', runnerOnThird] as BaseState,
      away: { ...baseSession.away, score: 4 },
      home: { ...baseSession.home, score: 4 },
    };

    // Walk-off win via intentional walk forces runner from 3B home in BOT 9
    const walkOff = stepPitch(loadedBot9, 'intentional_walk');
    expect(walkOff.nextSession.status).toBe('completed');
    expect(walkOff.nextSession.home.score).toBe(5);
    expect(walkOff.nextSession.winnerClubId).toBe(home.id);
    expect(walkOff.events.some((e) => e.type === 'game_end')).toBe(true);
  });

  it('gives opposite-hand and switch hitters a statistical platoon edge over 1,500 simulated PAs', () => {
    const countOnBaseHits = (bats: BatsHand, throws: ThrowsHand): number => {
      const { away, home } = makeMatchupClubs(bats, throws, 8800);
      let session = createGameSession(away, home, 12345);
      let onBaseHits = 0;

      for (let pa = 0; pa < 1500; pa += 1) {
        if (session.status === 'completed' || session.outs >= 2) {
          session = createGameSession(away, home, 12345 + pa);
        }
        const res = stepAtBat(session);
        session = res.nextSession;
        const paEnd = res.events.find(
          (e) =>
            e.outcome === 'single' ||
            e.outcome === 'double' ||
            e.outcome === 'triple' ||
            e.outcome === 'home_run' ||
            e.outcome === 'bunt_single' ||
            e.outcome === 'walk',
        );
        if (paEnd) onBaseHits += 1;
      }
      return onBaseHits;
    };

    const oppositeHand = countOnBaseHits('L', 'R');
    const sameHand = countOnBaseHits('L', 'L');
    const switchVsLeft = countOnBaseHits('S', 'L');

    expect(oppositeHand).toBeGreaterThan(sameHand);
    expect(switchVsLeft).toBeGreaterThan(sameHand);
  });

  it('respects LHP pickoffHoldBonus on steals and supports bunt, contact, and power calls', () => {
    const runStealTrials = (pitcherThrows: ThrowsHand): number => {
      const { away, home } = makeMatchupClubs('R', pitcherThrows, 5100);
      let steals = 0;
      for (let i = 0; i < 500; i += 1) {
        const base = createGameSession(away, home, 5000 + i);
        const withRunner: GameSessionState = {
          ...base,
          outs: 0,
          bases: [away.lineup[0].playerId, null, null],
        };
        const res = stepPitch(withRunner, 'steal');
        if (res.events.some((e) => e.type === 'stolen_base_attempt' && e.outsAfter === 0)) {
          steals += 1;
        }
      }
      return steals;
    };

    const vsRightySteals = runStealTrials('R');
    const vsLeftySteals = runStealTrials('L');
    expect(vsRightySteals).toBeGreaterThan(vsLeftySteals);

    // Bunt tactical call emits ninja_bunt ballFlight on bunt hits
    const away = createClub(createSeededRng(600), AWAY_OPTS);
    const home = createClub(createSeededRng(601), HOME_OPTS);
    let sawBuntOutcome = false;
    let sawBuntFlight = false;
    for (let i = 0; i < 40; i += 1) {
      const res = stepPitch(createGameSession(away, home, 6000 + i), 'bunt');
      for (const ev of res.events) {
        if (ev.outcome === 'bunt_single' || ev.outcome === 'bunt_out') sawBuntOutcome = true;
        if (ev.ballFlight?.style === 'ninja_bunt') sawBuntFlight = true;
      }
    }
    expect(sawBuntOutcome).toBe(true);
    expect(sawBuntFlight).toBe(true);
  });

  it('halts simUntilClutchOrEnd on RISP, late close innings, hype ready, or completion and updates club stats', () => {
    const away = createClub(createSeededRng(701), AWAY_OPTS);
    const home = createClub(createSeededRng(702), HOME_OPTS);

    const baseSession = createGameSession(away, home, 2025);
    expect(isClutchSituation(baseSession)).toBe(false);
    expect(
      isClutchSituation({ ...baseSession, bases: [null, 'runner-2b', null] }),
    ).toBe(true);
    expect(
      isClutchSituation({
        ...baseSession,
        inning: 8,
        away: { ...baseSession.away, score: 3 },
        home: { ...baseSession.home, score: 4 },
      }),
    ).toBe(true);
    expect(
      isClutchSituation({
        ...baseSession,
        away: { ...baseSession.away, hypeGauge: 100 },
      }),
    ).toBe(true);

    const paused = simUntilClutchOrEnd(baseSession);
    expect(
      paused.nextSession.status === 'completed' || isClutchSituation(paused.nextSession),
    ).toBe(true);

    const full = simFullGame(away, home, 2025);
    const updatedHome = applyGameStatDeltasToClub(
      home,
      full.playerStatDeltas,
      full.winnerClubId === home.id,
    );

    const homeWon = full.winnerClubId === home.id;
    expect(updatedHome.wins).toBe(homeWon ? 1 : 0);
    expect(updatedHome.losses).toBe(homeWon ? 0 : 1);
    expect(updatedHome.streak).toBe(homeWon ? 1 : -1);
    const totalGamesPlayed = updatedHome.roster.reduce(
      (sum, p) => sum + p.seasonStats.games,
      0,
    );
    expect(totalGamesPlayed).toBeGreaterThanOrEqual(10);

    // Manual bullpen pitching swap updates activePitcherId and emits pitching_change
    const freshSession = createGameSession(away, home, 2026);
    const relieverId = home.bullpenIds[0];
    const swapResult = manualSwapPitcher(freshSession, 'home', relieverId);
    expect(swapResult.nextSession.home.activePitcherId).toBe(relieverId);
    expect(swapResult.nextSession.home.usedPitcherIds).toContain(relieverId);
    expect(swapResult.event?.type).toBe('pitching_change');

    // Invalid or duplicate reliever ID returns unchanged session with null event
    const noopSwap = manualSwapPitcher(swapResult.nextSession, 'home', relieverId);
    expect(noopSwap.event).toBeNull();
  });

  it('emits pitchThrown strictly from pitcher arsenal, honors requestedPitchType, and rewards batter favoritePitch over weakPitch', () => {
    const away = createClub(createSeededRng(910), AWAY_OPTS);
    const home = createClub(createSeededRng(911), HOME_OPTS);

    const session = createGameSession(away, home, 3030);
    const homePitcher = session.home.playersById[session.home.activePitcherId];
    const ownedPitches = homePitcher.pitchArsenal!.repertoire.map((slot) => slot.pitchType);
    const chosenPitch = ownedPitches[ownedPitches.length - 1];

    const manual = stepPitch(session, 'normal', { requestedPitchType: chosenPitch });
    const pitchEvent = manual.events.find((ev) => ev.pitchThrown !== undefined);
    expect(pitchEvent?.pitchThrown?.pitchType).toBe(chosenPitch);
    expect(pitchEvent?.pitchThrown?.mph).toBeGreaterThanOrEqual(62);

    // Statistical check: throwing batter's favoritePitch yields more hits than throwing batter's weakPitch
    const runMatchupHits = (target: 'favorite' | 'weak'): number => {
      const { away: clubA, home: clubH } = makeMatchupClubs('R', 'R', 9500);
      const forcedPitch = target === 'favorite' ? 'curveball' : 'slider';
      const riggedAway: Club = {
        ...clubA,
        roster: clubA.roster.map((p) => ({
          ...p,
          batterPitchProfile: {
            favoritePitch: 'curveball',
            weakPitch: 'slider',
            pitchRecognition: { curveball: 16, slider: -16, four_seam: 0 },
          },
        })),
      };
      const riggedHome: Club = {
        ...clubH,
        roster: clubH.roster.map((p) =>
          p.pitchArsenal
            ? {
                ...p,
                pitchArsenal: {
                  repertoire: [
                    { pitchType: 'four_seam', mastery: 72 },
                    { pitchType: 'curveball', mastery: 72 },
                    { pitchType: 'slider', mastery: 72 },
                    { pitchType: 'changeup', mastery: 70 },
                  ],
                  favoritePitch: 'four_seam',
                  weakestPitch: 'changeup',
                },
              }
            : p,
        ),
      };

      let hits = 0;
      for (let i = 0; i < 600; i += 1) {
        const s = createGameSession(riggedAway, riggedHome, 40000 + i);
        const res = stepAtBat(s, 'normal', { requestedPitchType: forcedPitch });
        if (
          res.events.some(
            (e) =>
              e.outcome === 'single' ||
              e.outcome === 'double' ||
              e.outcome === 'triple' ||
              e.outcome === 'home_run',
          )
        ) {
          hits += 1;
        }
      }
      return hits;
    };

    expect(runMatchupHits('favorite')).toBeGreaterThan(runMatchupHits('weak'));
  });

  it('enforces limited-use special ability charge caps and Hype drain across full games (TASK-056)', () => {
    const away = createClub(createSeededRng(920), AWAY_OPTS);
    const home = createClub(createSeededRng(921), HOME_OPTS);

    const allPlayers = new Map([...away.roster, ...home.roster].map((p) => [p.id, p]));
    let totalSpecialsAcrossGames = 0;

    for (let seed = 1000; seed < 1012; seed += 1) {
      const full = simFullGame(away, home, seed);
      const usesByActor = new Map<string, number>();

      for (const ev of full.events) {
        if (!ev.specialPowerTriggered) continue;
        totalSpecialsAcrossGames += 1;
        const actorId =
          ev.specialPowerTriggered.actor === 'batter' ? ev.batterId : ev.pitcherId;
        if (!actorId) continue;
        const count = (usesByActor.get(actorId) ?? 0) + 1;
        usesByActor.set(actorId, count);

        const player = allPlayers.get(actorId)!;
        const maxAllowed =
          ev.specialPowerTriggered.actor === 'pitcher'
            ? player.position === 'SP'
              ? 2
              : 1
            : player.level >= 12
              ? 2
              : 1;
        expect(count).toBeLessThanOrEqual(maxAllowed);
      }
    }

    expect(totalSpecialsAcrossGames).toBeGreaterThan(0);
  });

  it('gives ice_veins batters a statistical edge over pressure_wilt batters in critical playoff spots (TASK-057)', () => {
    const runPressureHits = (profile: 'ice_veins' | 'pressure_wilt'): number => {
      const { away, home } = makeMatchupClubs('R', 'R', 9600);
      const shapedAway: Club = {
        ...away,
        roster: away.roster.map((p) => ({
          ...p,
          pressureProfile: profile,
          mentalTraits: [profile === 'ice_veins' ? 'ice_veins' : 'pressure_wilt'],
          ratings: { ...p.ratings, clutch: profile === 'ice_veins' ? 85 : 42 },
        })),
      };
      const steadyHome: Club = {
        ...home,
        roster: home.roster.map((p) => ({
          ...p,
          pressureProfile: 'steady',
          mentalTraits: ['steady_hand'],
        })),
      };

      let hits = 0;
      for (let i = 0; i < 600; i += 1) {
        const base = createGameSession(shapedAway, steadyHome, 55000 + i, 'elimination_championship');
        const criticalSpot: GameSessionState = {
          ...base,
          inning: 9,
          outs: 2,
          bases: ['r1', 'r2', 'r3'],
          away: { ...base.away, score: 3 },
          home: { ...base.home, score: 3 },
        };
        const res = stepAtBat(criticalSpot);
        if (
          res.events.some(
            (e) =>
              e.outcome === 'single' ||
              e.outcome === 'double' ||
              e.outcome === 'triple' ||
              e.outcome === 'home_run',
          )
        ) {
          hits += 1;
        }
      }
      return hits;
    };

    expect(runPressureHits('ice_veins')).toBeGreaterThan(runPressureHits('pressure_wilt'));
  });

  it('supports 5-inning Blitz games, 1st-extra-inning 2B Ghost Runner, stepHalfInning, and pitcher velocity drop when fatigued (TASK-061, TASK-062)', () => {
    const away = createClub(createSeededRng(980), AWAY_OPTS);
    const home = createClub(createSeededRng(981), HOME_OPTS);

    // 1. 5-inning Blitz finishes at inning >= 5 and stays shorter than a 9-inning game
    const blitz = simFullGame(away, home, 2026, 5);
    expect(blitz.finalState.status).toBe('completed');
    expect(blitz.finalState.regulationInnings).toBe(5);
    expect(blitz.finalState.inning).toBeGreaterThanOrEqual(5);
    expect(blitz.awayScore).not.toBe(blitz.homeScore);

    // 2. Tied after BOT 5 places an automatic 2B Ghost Runner in TOP 6 immediately
    const baseBlitz = createGameSession(away, home, 2027, 'regular', 5);
    const tiedBot5TwoOuts: GameSessionState = {
      ...baseBlitz,
      inning: 5,
      half: 'BOT',
      outs: 2,
      away: { ...baseBlitz.away, score: 2 },
      home: { ...baseBlitz.home, score: 2 },
    };
    let extrasCheck = tiedBot5TwoOuts;
    for (let i = 0; i < 30 && extrasCheck.inning === 5 && extrasCheck.status === 'in_progress'; i += 1) {
      extrasCheck = stepAtBat(extrasCheck, 'normal').nextSession;
    }
    if (extrasCheck.inning === 6 && extrasCheck.half === 'TOP' && extrasCheck.outs === 0) {
      expect(extrasCheck.bases[1]).not.toBeNull();
    }

    // 3. stepHalfInning jumps cleanly from TOP 1 to BOT 1 in one call
    const halfStep = stepHalfInning(baseBlitz);
    expect(halfStep.nextSession.half).toBe('BOT');
    expect(halfStep.nextSession.inning).toBe(1);
    expect(halfStep.events.length).toBeGreaterThan(0);

    // 4. Fatigued pitcher throws slower radar-gun fastball mph than fresh pitcher (TASK-061)
    const freshStart = createGameSession(away, home, 4040, 'regular', 9);
    const tiredStart: GameSessionState = {
      ...freshStart,
      home: { ...freshStart.home, pitcherFatigue: 88 },
    };
    const freshStep = stepPitch(freshStart, 'normal', { requestedPitchType: 'four_seam' });
    const tiredStep = stepPitch(tiredStart, 'normal', { requestedPitchType: 'four_seam' });
    const freshMph = freshStep.events.find((e) => e.pitchThrown)?.pitchThrown?.mph ?? 0;
    const tiredMph = tiredStep.events.find((e) => e.pitchThrown)?.pitchThrown?.mph ?? 0;
    expect(freshMph).toBeGreaterThan(tiredMph);
  });
});
