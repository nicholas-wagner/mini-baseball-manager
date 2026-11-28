import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import type { PlayEvent } from '../models/playEvent';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession } from '../simulation/baseballEngine';
import {
  createEmptyFranchiseRecords,
  detectLiveRecordBreaker,
  updateClubFranchiseRecordsAfterGame,
  type ClubFranchiseRecords,
} from './clubRecords';

function makeFixture() {
  const awayClub = createClub(createSeededRng(8101), {
    id: 'away-club',
    isHuman: false,
    city: 'Maple',
    name: 'Lumberjacks',
    mascot: 'Bear',
    colors: { primary: '#2A9D8F', secondary: '#181B2C', accent: '#FFD166', monogram: 'ML' },
    leagueTier: 'rookie',
  });
  const homeClub = createClub(createSeededRng(8102), {
    id: 'home-club',
    isHuman: true,
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'rookie',
  });
  const session = createGameSession(awayClub, homeClub, 8103, 'regular', 5);
  return { awayClub, homeClub, session };
}

function makeEvent(overrides: Partial<PlayEvent>): PlayEvent {
  return {
    seq: 20,
    type: 'ball_in_play',
    inning: 2,
    half: 'BOT',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 0,
    homeScore: 1,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: 'Big play!',
    ...overrides,
  };
}

describe('Persistent Club Franchise Records & Live Record-Breaker Alert (TASK-124 Part C)', () => {
  it('initializes clean empty franchise records', () => {
    expect(createEmptyFranchiseRecords()).toEqual({
      longestHomeRunFt: null,
      mostSingleGameStrikeouts: null,
      mostSingleGameHits: null,
      longestWinStreak: null,
      currentWinStreak: 0,
      mostSeasonHomeRuns: null,
      mostSeasonStolenBases: null,
    });
  });

  it('detects live inaugural and surpassed HR distance, single-game K, and single-game Hit records for human club only', () => {
    const { homeClub, session } = makeFixture();
    const humanBatter = homeClub.roster.find((p) => p.id === homeClub.lineup[0].playerId)!;
    const humanPitcher = homeClub.roster.find((p) => p.id === session.home.activePitcherId)!;

    // Inaugural HR below 400 FT does not spam
    const shortHr = makeEvent({
      half: 'BOT',
      outcome: 'home_run',
      batterId: humanBatter.id,
      hrStatcast: { distanceFt: 378, exitVeloMph: 101, landmarkCall: 'NO-DOUBT HOME RUN!' },
    });
    expect(detectLiveRecordBreaker(undefined, shortHr, session, homeClub, 1)).toBeNull();

    // Inaugural HR >= 400 FT celebrates NEW CLUB RECORD!
    const moonshotHr = makeEvent({
      half: 'BOT',
      outcome: 'home_run',
      batterId: humanBatter.id,
      hrStatcast: { distanceFt: 428, exitVeloMph: 112, landmarkCall: 'NO-DOUBT HOME RUN!' },
    });
    const inauguralAlert = detectLiveRecordBreaker(undefined, moonshotHr, session, homeClub, 1);
    expect(inauguralAlert).not.toBeNull();
    expect(inauguralAlert?.value).toBe(428);
    expect(inauguralAlert?.headline).toContain('NEW CLUB RECORD: 428 FT MOONSHOT!');

    // Surpassing existing HR record requires strictly exceeding value
    const existingRecords: ClubFranchiseRecords = {
      ...createEmptyFranchiseRecords(),
      longestHomeRunFt: {
        value: 430,
        holderName: 'Old Slugger',
        holderId: 'old-1',
        season: 1,
        detail: '430 FT',
      },
      mostSingleGameStrikeouts: {
        value: 8,
        holderName: 'Old Ace',
        holderId: 'old-2',
        season: 1,
        detail: '8 Ks',
      },
      mostSingleGameHits: {
        value: 4,
        holderName: 'Old Bat',
        holderId: 'old-3',
        season: 1,
        detail: '4 H',
      },
    };
    expect(detectLiveRecordBreaker(existingRecords, moonshotHr, session, homeClub, 2)).toBeNull();
    const recordHr = makeEvent({
      half: 'BOT',
      outcome: 'home_run',
      batterId: humanBatter.id,
      hrStatcast: { distanceFt: 444, exitVeloMph: 115, landmarkCall: 'UPPER DECK CRUSHER!' },
    });
    expect(detectLiveRecordBreaker(existingRecords, recordHr, session, homeClub, 2)?.value).toBe(444);

    // Opponent HR must NOT fire human club record
    const cpuHr = makeEvent({
      half: 'TOP',
      outcome: 'home_run',
      batterId: session.away.lineup[0].playerId,
      hrStatcast: { distanceFt: 465, exitVeloMph: 117, landmarkCall: 'UPPER DECK CRUSHER!' },
    });
    expect(detectLiveRecordBreaker(undefined, cpuHr, session, homeClub, 1)).toBeNull();

    // Single-game Strikeouts (inaugural >= 7, existing > 8)
    const sevenKSession = {
      ...session,
      boxScore: {
        ...session.boxScore,
        homePitchers: {
          ...session.boxScore.homePitchers,
          [humanPitcher.id]: { ...session.boxScore.homePitchers[humanPitcher.id], strikeouts: 7 },
        },
      },
    };
    const kEvent = makeEvent({
      half: 'TOP',
      type: 'pitch_thrown',
      outcome: 'strikeout',
      outsAfter: 1,
      pitcherId: humanPitcher.id,
    });
    expect(detectLiveRecordBreaker(undefined, kEvent, sevenKSession, homeClub, 1)?.value).toBe(7);
    expect(detectLiveRecordBreaker(existingRecords, kEvent, sevenKSession, homeClub, 2)).toBeNull();

    const nineKSession = {
      ...sevenKSession,
      boxScore: {
        ...sevenKSession.boxScore,
        homePitchers: {
          ...sevenKSession.boxScore.homePitchers,
          [humanPitcher.id]: { ...sevenKSession.boxScore.homePitchers[humanPitcher.id], strikeouts: 9 },
        },
      },
    };
    expect(detectLiveRecordBreaker(existingRecords, kEvent, nineKSession, homeClub, 2)?.value).toBe(9);

    // Single-game Hits (inaugural >= 4, existing > 4)
    const fourHitSession = {
      ...session,
      boxScore: {
        ...session.boxScore,
        homeBatters: {
          ...session.boxScore.homeBatters,
          [humanBatter.id]: { ...session.boxScore.homeBatters[humanBatter.id], hits: 4 },
        },
      },
    };
    const hitEvent = makeEvent({
      half: 'BOT',
      outcome: 'single',
      batterId: humanBatter.id,
    });
    expect(detectLiveRecordBreaker(undefined, hitEvent, fourHitSession, homeClub, 1)?.value).toBe(4);
    expect(detectLiveRecordBreaker(existingRecords, hitEvent, fourHitSession, homeClub, 2)).toBeNull();

    const fiveHitSession = {
      ...fourHitSession,
      boxScore: {
        ...fourHitSession.boxScore,
        homeBatters: {
          ...fourHitSession.boxScore.homeBatters,
          [humanBatter.id]: { ...fourHitSession.boxScore.homeBatters[humanBatter.id], hits: 5 },
        },
      },
    };
    expect(detectLiveRecordBreaker(existingRecords, hitEvent, fiveHitSession, homeClub, 2)?.value).toBe(5);
  });

  it('persists post-game franchise records across wins, losses, and season totals without downgrading records', () => {
    const { homeClub, session } = makeFixture();
    const humanBatter = homeClub.roster.find((p) => p.id === homeClub.lineup[0].playerId)!;
    const humanPitcher = homeClub.roster.find((p) => p.id === session.home.activePitcherId)!;

    const clubWithStats = {
      ...homeClub,
      roster: homeClub.roster.map((p) =>
        p.id === humanBatter.id
          ? { ...p, seasonStats: { ...p.seasonStats, homeRuns: 6, stolenBases: 9 } }
          : p,
      ),
    };
    const bigGameSession = {
      ...session,
      boxScore: {
        ...session.boxScore,
        homeBatters: {
          ...session.boxScore.homeBatters,
          [humanBatter.id]: { ...session.boxScore.homeBatters[humanBatter.id], hits: 4, homeRuns: 2 },
        },
        homePitchers: {
          ...session.boxScore.homePitchers,
          [humanPitcher.id]: { ...session.boxScore.homePitchers[humanPitcher.id], strikeouts: 9 },
        },
      },
    };
    const events: PlayEvent[] = [
      makeEvent({
        seq: 30,
        half: 'BOT',
        outcome: 'home_run',
        batterId: humanBatter.id,
        hrStatcast: { distanceFt: 436, exitVeloMph: 113, landmarkCall: 'NO-DOUBT HOME RUN!' },
      }),
    ];

    const afterWin1 = updateClubFranchiseRecordsAfterGame(undefined, {
      club: clubWithStats,
      session: bigGameSession,
      humanWon: true,
      season: 1,
      events,
    });

    expect(afterWin1.records.longestHomeRunFt?.value).toBe(436);
    expect(afterWin1.records.longestHomeRunFt?.holderId).toBe(humanBatter.id);
    expect(afterWin1.records.mostSingleGameStrikeouts?.value).toBe(9);
    expect(afterWin1.records.mostSingleGameHits?.value).toBe(4);
    expect(afterWin1.records.currentWinStreak).toBe(1);
    expect(afterWin1.records.longestWinStreak?.value).toBe(1);
    expect(afterWin1.records.mostSeasonHomeRuns?.value).toBe(6);
    expect(afterWin1.records.mostSeasonStolenBases?.value).toBe(9);
    expect(afterWin1.brokenHeadlines.length).toBeGreaterThanOrEqual(4);

    // Second consecutive win grows win streak to 2 without overwriting higher HR/K/Hit records
    const afterWin2 = updateClubFranchiseRecordsAfterGame(afterWin1.records, {
      club: clubWithStats,
      session,
      humanWon: true,
      season: 1,
    });
    expect(afterWin2.records.currentWinStreak).toBe(2);
    expect(afterWin2.records.longestWinStreak?.value).toBe(2);
    expect(afterWin2.records.longestHomeRunFt?.value).toBe(436);
    expect(afterWin2.records.mostSingleGameStrikeouts?.value).toBe(9);
    expect(afterWin2.brokenHeadlines).toHaveLength(1);

    // Loss resets currentWinStreak to 0 while preserving longestWinStreak = 2
    const afterLoss = updateClubFranchiseRecordsAfterGame(afterWin2.records, {
      club: clubWithStats,
      session,
      humanWon: false,
      season: 1,
    });
    expect(afterLoss.records.currentWinStreak).toBe(0);
    expect(afterLoss.records.longestWinStreak?.value).toBe(2);
    expect(afterLoss.brokenHeadlines).toHaveLength(0);
  });
});
