import { describe, expect, it } from 'vitest';
import { validateLineup } from './rosterFactory';
import { generateSixTierWorld, simulateSeriesRound } from '../league/seasonEngine';
import { createGameSession } from '../simulation/baseballEngine';
import { computeLiveActionCue } from '../simulation/liveActionAdvisor';
import {
  autoTuneLineupForStarter,
  buildSeriesRecapReport,
  evaluatePreGameLineupCheck,
} from './seriesRecap';

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

describe('Series Recap, Pre-Game Platoon Lineup Check/Auto-Tuner & Arcade Pinch-Hit Cue', () => {
  it('builds a Post-Series Sports Page recap with 3 game scores, Series MVP, sweep headline & standings shift', () => {
    const world = makeWorld(1994);
    const prevTierClubs = world.leagues.rookie;
    const prevHuman = prevTierClubs[0];
    const sim = simulateSeriesRound(prevTierClubs, 0, 1994, 5, 'balanced', 0);
    const postHuman = sim.clubs.find((c) => c.id === prevHuman.id)!;
    const opponent = sim.clubs.find((c) => c.id === sim.humanOpponentId)!;

    expect(sim.humanGames).toHaveLength(3);

    const recap = buildSeriesRecapReport({
      seriesNumber: 1,
      prevHumanClub: prevHuman,
      postHumanClub: postHuman,
      opponentClub: opponent,
      prevTierClubs,
      postTierClubs: sim.clubs,
      humanGames: sim.humanGames,
      cashEarned: 2500,
      levelUps: [],
    });

    expect(recap.seriesNumber).toBe(1);
    expect(recap.gameLines).toHaveLength(3);
    expect(recap.seriesMvp.playerId).toBeTruthy();
    expect(recap.seriesMvp.playerName).toBeTruthy();
    expect(recap.standingsShiftText).toMatch(/#\d/);
    expect(recap.headline.length).toBeGreaterThan(8);

    // Explicitly verify 3-0 sweep & 0-3 loss headlines too
    const sweepRecap = buildSeriesRecapReport({
      seriesNumber: 2,
      prevHumanClub: prevHuman,
      postHumanClub: { ...postHuman, wins: 3, losses: 0 },
      opponentClub: opponent,
      prevTierClubs,
      postTierClubs: sim.clubs,
      humanGames: [
        { gameNumber: 1, humanScore: 5, opponentScore: 1, won: true, isHome: true },
        { gameNumber: 2, humanScore: 4, opponentScore: 2, won: true, isHome: true },
        { gameNumber: 3, humanScore: 6, opponentScore: 0, won: true, isHome: true },
      ],
      cashEarned: 4500,
      sweepBonusAwarded: true,
      levelUps: [],
    });
    expect(sweepRecap.headline).toMatch(/sweep/i);
    expect(sweepRecap.sweepBonusAwarded).toBe(true);

    const toughRecap = buildSeriesRecapReport({
      seriesNumber: 3,
      prevHumanClub: prevHuman,
      postHumanClub: { ...postHuman, wins: 0, losses: 3 },
      opponentClub: opponent,
      prevTierClubs,
      postTierClubs: sim.clubs,
      humanGames: [
        { gameNumber: 1, humanScore: 1, opponentScore: 5, won: false, isHome: false },
        { gameNumber: 2, humanScore: 2, opponentScore: 4, won: false, isHome: false },
        { gameNumber: 3, humanScore: 0, opponentScore: 3, won: false, isHome: false },
      ],
      cashEarned: 900,
      levelUps: [],
    });
    expect(toughRecap.headline).toMatch(/swept|tough/i);
  });

  it('detects cold top-order hitters and OOP defenders and auto-tunes a valid platoon-optimized lineup vs LHP/RHP', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];
    const rivalSp = rival.roster.find((p) => p.position === 'SP')!;

    // Make #1 hitter frozen and force an out-of-position spot to trigger warnings
    const firstId = human.lineup[0].playerId;
    const coldClub = {
      ...human,
      roster: human.roster.map((p) =>
        p.id === firstId ? { ...p, formState: 'frozen' as const, bats: 'L' as const } : p,
      ),
    };

    const check = evaluatePreGameLineupCheck(coldClub, { ...rivalSp, throws: 'L' });
    expect(check.needsAttention).toBe(true);
    expect(check.tips.length).toBeGreaterThanOrEqual(1);
    expect(check.starterThrows).toBe('L');

    // Auto-tune vs LHP and vs RHP — both must remain 100% legal lineups!
    const tunedL = autoTuneLineupForStarter(coldClub, 'L');
    expect(validateLineup({ ...coldClub, lineup: tunedL.lineup }).valid).toBe(true);
    expect(tunedL.summary).toMatch(/LHP/i);

    const tunedR = autoTuneLineupForStarter(coldClub, 'R');
    expect(validateLineup({ ...coldClub, lineup: tunedR.lineup }).valid).toBe(true);
    expect(tunedR.summary).toMatch(/RHP/i);
  });

  it('surfaces a contextual 1-tap Pinch-Hit upgrade cue in late close RISP spots when a cold/disadvantaged batter is up', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];
    const baseSession = createGameSession(rival, human, 1994, 'regular', 5);

    const batterId = baseSession.home.lineup[0].playerId;
    const activeIds = new Set(baseSession.home.lineup.map((s) => s.playerId));
    const benchHitter = Object.values(baseSession.home.playersById).find(
      (p) => p.position !== 'SP' && p.position !== 'RP' && !activeIds.has(p.id),
    )!;
    const oppPitcher = baseSession.away.playersById[baseSession.away.activePitcherId];

    // Make current batter frozen & weak while bench hitter is blazing & elite with opposite hand!
    const pinchSession = {
      ...baseSession,
      inning: 5,
      half: 'BOT' as const,
      outs: 1,
      bases: [null, baseSession.home.lineup[1].playerId, null] as [string | null, string | null, string | null],
      away: { ...baseSession.away, score: 3 },
      home: {
        ...baseSession.home,
        score: 2,
        hypeGauge: 10,
        playersById: {
          ...baseSession.home.playersById,
          [batterId]: {
            ...baseSession.home.playersById[batterId],
            formState: 'frozen' as const,
            bats: oppPitcher.throws,
            ratings: {
              ...baseSession.home.playersById[batterId].ratings,
              contact: 42,
              power: 40,
            },
          },
          [benchHitter.id]: {
            ...benchHitter,
            formState: 'blazing' as const,
            bats: oppPitcher.throws === 'R' ? ('L' as const) : ('R' as const),
            ratings: {
              ...benchHitter.ratings,
              contact: 88,
              power: 86,
            },
          },
        },
      },
    };

    const cue = computeLiveActionCue({
      session: pinchSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(cue.kind).toBe('pinch_hit_opportunity');
    expect(cue.suggestedAction?.type).toBe('pinch_hit');
    expect(cue.suggestedAction?.pinchHitterId).toBe(benchHitter.id);

    // Also exercise hot/cold/switch scoring and bottom-of-order mismatch + empty bench fallback
    const bottomMismatch = {
      ...pinchSession,
      home: {
        ...pinchSession.home,
        lineupIndex: 7,
        playersById: {
          ...pinchSession.home.playersById,
          [pinchSession.home.lineup[7].playerId]: {
            ...pinchSession.home.playersById[pinchSession.home.lineup[7].playerId],
            formState: 'cold' as const,
            bats: oppPitcher.throws,
            ratings: {
              ...pinchSession.home.playersById[pinchSession.home.lineup[7].playerId].ratings,
              contact: 35,
              power: 35,
            },
          },
          [benchHitter.id]: {
            ...benchHitter,
            formState: 'hot' as const,
            bats: 'S' as const,
            ratings: { ...benchHitter.ratings, contact: 90, power: 90 },
          },
        },
      },
    };
    expect(
      computeLiveActionCue({
        session: bottomMismatch,
        tacticalCall: 'normal',
        armedPowerId: null,
        moundVisitUsed: false,
      }).kind,
    ).toBe('pinch_hit_opportunity');

    // Empty bench falls back cleanly to clutch_moment
    const emptyBenchSession = {
      ...bottomMismatch,
      boxScore: {
        ...bottomMismatch.boxScore,
        homeBatters: Object.fromEntries(
          Object.keys(bottomMismatch.home.playersById).map((id) => [
            id,
            bottomMismatch.boxScore.homeBatters[batterId],
          ]),
        ),
      },
    };
    expect(
      computeLiveActionCue({
        session: emptyBenchSession,
        tacticalCall: 'normal',
        armedPowerId: null,
        moundVisitUsed: false,
      }).kind,
    ).not.toBe('pinch_hit_opportunity');
  });

  it('covers standings climb/drop/1st-place, 2-1 & 1-2 series headlines, HR/RBI/SB MVP tags, and OOP/same-hand/sharp lineup checks', () => {
    const world = makeWorld(2025);
    const prevTier = world.leagues.rookie.map((c, idx) => ({
      ...c,
      wins: idx === 0 ? 1 : 2,
      losses: idx === 0 ? 2 : 1,
    }));
    const prevHuman = prevTier[0];
    const opponent = prevTier[1];
    const slugger = prevHuman.roster.find((p) => p.position !== 'SP' && p.position !== 'RP')!;
    const boostedPostHuman = {
      ...prevHuman,
      wins: 6,
      losses: 2,
      roster: prevHuman.roster.map((p) =>
        p.id === slugger.id
          ? {
              ...p,
              seasonStats: {
                ...p.seasonStats,
                hits: p.seasonStats.hits + 5,
                homeRuns: p.seasonStats.homeRuns + 2,
                rbis: p.seasonStats.rbis + 4,
                stolenBases: p.seasonStats.stolenBases + 2,
              },
            }
          : p,
      ),
    };
    const climbedTier = prevTier.map((c) => (c.id === prevHuman.id ? boostedPostHuman : c));
    const climbedRecap = buildSeriesRecapReport({
      seriesNumber: 2,
      prevHumanClub: prevHuman,
      postHumanClub: boostedPostHuman,
      opponentClub: opponent,
      prevTierClubs: prevTier,
      postTierClubs: climbedTier,
      humanGames: [
        { gameNumber: 1, humanScore: 5, opponentScore: 2, won: true, isHome: true },
        { gameNumber: 2, humanScore: 2, opponentScore: 3, won: false, isHome: true },
        { gameNumber: 3, humanScore: 6, opponentScore: 4, won: true, isHome: true },
      ],
      cashEarned: 2400,
      levelUps: [],
    });
    expect(climbedRecap.headline).toMatch(/SERIES WIN \(2-1\)/);
    expect(climbedRecap.standingsShiftText).toMatch(/Climbed to #1/);
    expect(climbedRecap.seriesMvp.tagLine).toMatch(/HR.*RBI.*SB/);

    // Holding #1 and slipping down
    const holdingRecap = buildSeriesRecapReport({
      seriesNumber: 3,
      prevHumanClub: boostedPostHuman,
      postHumanClub: boostedPostHuman,
      opponentClub: opponent,
      prevTierClubs: climbedTier,
      postTierClubs: climbedTier,
      humanGames: [
        { gameNumber: 1, humanScore: 2, opponentScore: 4, won: false, isHome: false },
        { gameNumber: 2, humanScore: 4, opponentScore: 3, won: true, isHome: false },
        { gameNumber: 3, humanScore: 1, opponentScore: 3, won: false, isHome: false },
      ],
      cashEarned: 1100,
      levelUps: [],
    });
    expect(holdingRecap.headline).toMatch(/TOUGH SERIES \(1-2\)/);
    expect(holdingRecap.standingsShiftText).toMatch(/Holding #1/);

    const droppedTier = climbedTier.map((c) =>
      c.id === prevHuman.id ? { ...c, wins: 0, losses: 9 } : c,
    );
    const slippedRecap = buildSeriesRecapReport({
      seriesNumber: 4,
      prevHumanClub: boostedPostHuman,
      postHumanClub: droppedTier[0],
      opponentClub: opponent,
      prevTierClubs: climbedTier,
      postTierClubs: droppedTier,
      humanGames: [],
      cashEarned: 500,
      levelUps: [],
    });
    expect(slippedRecap.standingsShiftText).toMatch(/Slipped to #/);

    // Lineup check: sharp vs OOP + 6 same-hand bats
    const rivalSp = opponent.roster.find((p) => p.position === 'SP')!;
    const sharpClub = {
      ...prevHuman,
      roster: prevHuman.roster.map((p) => ({
        ...p,
        formState: 'hot' as const,
        bats: 'S' as const,
      })),
    };
    const sharpCheck = evaluatePreGameLineupCheck(sharpClub, { ...rivalSp, throws: 'R' });
    expect(sharpCheck.needsAttention).toBe(false);
    expect(sharpCheck.badgeText).toMatch(/Sharp/i);

    const oopAndSameHandClub = {
      ...prevHuman,
      lineup: prevHuman.lineup.map((slot, idx) =>
        idx === 0 ? { ...slot, defensivePosition: 'C' as const } : slot,
      ),
      roster: prevHuman.roster.map((p) => ({
        ...p,
        bats: 'R' as const,
        positionProficiency: { ...p.positionProficiency, C: 10 },
      })),
    };
    const warnCheck = evaluatePreGameLineupCheck(oopAndSameHandClub, { ...rivalSp, throws: 'R' });
    expect(warnCheck.needsAttention).toBe(true);
    expect(warnCheck.tips.join(' ')).toMatch(/out-of-position|same-hand/i);
  });
});
