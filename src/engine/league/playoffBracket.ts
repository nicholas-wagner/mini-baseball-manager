import { generateStaffHiringPool, hireStaffMember } from '../gm/coaches';
import type { Club, LeagueTierId } from '../models/club';
import type { StaffMember } from '../models/manager';
import type { GameLengthInnings, GamePressureLevel } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import type { RetiredLegendCoachCandidate } from '../rpg/lifecycle';
import { simFullGame } from '../simulation/baseballEngine';

export type PlayoffSeriesId = 'semifinal_a' | 'semifinal_b' | 'championship';

export interface PlayoffSeriesGameLog {
  gameNumber: number;
  awayClubId: string;
  homeClubId: string;
  awayScore: number;
  homeScore: number;
  winnerClubId: string;
}

export interface PlayoffSeriesState {
  id: PlayoffSeriesId;
  label: string;
  highSeedRank: number;
  lowSeedRank: number;
  highSeedClubId: string;
  lowSeedClubId: string;
  highSeedName: string;
  lowSeedName: string;
  highSeedWins: number;
  lowSeedWins: number;
  winnerClubId: string | null;
  games: PlayoffSeriesGameLog[];
}

export interface PlayoffBracketState {
  tier: LeagueTierId;
  seasonNumber: number;
  semifinalA: PlayoffSeriesState;
  semifinalB: PlayoffSeriesState;
  championship: PlayoffSeriesState | null;
  championClubId: string | null;
}

export interface HumanPlayoffMatchup {
  seriesId: PlayoffSeriesId;
  seriesLabel: string;
  gameNumber: number;
  opponentClubId: string;
  opponentName: string;
  humanWins: number;
  opponentWins: number;
  pressureLevel: GamePressureLevel;
}

function sortByStandings(clubs: readonly Club[]): Club[] {
  return [...clubs].sort((a, b) => {
    const pctA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
    const pctB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
    if (pctB !== pctA) return pctB - pctA;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });
}

function makeSeries(
  id: PlayoffSeriesId,
  label: string,
  highRank: number,
  lowRank: number,
  highClub: Pick<Club, 'id' | 'name'>,
  lowClub: Pick<Club, 'id' | 'name'>,
): PlayoffSeriesState {
  return {
    id,
    label,
    highSeedRank: highRank,
    lowSeedRank: lowRank,
    highSeedClubId: highClub.id,
    lowSeedClubId: lowClub.id,
    highSeedName: highClub.name,
    lowSeedName: lowClub.name,
    highSeedWins: 0,
    lowSeedWins: 0,
    winnerClubId: null,
    games: [],
  };
}

/** Builds a 4-team Best-of-3 Postseason Bracket (#1 vs #4, #2 vs #3 -> Championship). */
export function createPlayoffBracketFromClubs(
  tierClubs: readonly Club[],
  tier: LeagueTierId,
  seasonNumber: number,
): PlayoffBracketState {
  const ranked = sortByStandings(tierClubs);
  const [c1, c2, c3, c4] = ranked;
  return {
    tier,
    seasonNumber,
    semifinalA: makeSeries('semifinal_a', 'Semifinal A (#1 vs #4)', 1, 4, c1, c4),
    semifinalB: makeSeries('semifinal_b', 'Semifinal B (#2 vs #3)', 2, 3, c2, c3),
    championship: null,
    championClubId: null,
  };
}

function getSeriesWinnerInfo(series: PlayoffSeriesState): { id: string; name: string; rank: number } | null {
  if (!series.winnerClubId) return null;
  return series.winnerClubId === series.highSeedClubId
    ? { id: series.highSeedClubId, name: series.highSeedName, rank: series.highSeedRank }
    : { id: series.lowSeedClubId, name: series.lowSeedName, rank: series.lowSeedRank };
}

function applyGameToSeries(
  series: PlayoffSeriesState,
  winnerClubId: string,
  awayScore: number,
  homeScore: number,
): PlayoffSeriesState {
  if (series.winnerClubId) return series;
  const highWon = winnerClubId === series.highSeedClubId;
  const highSeedWins = series.highSeedWins + (highWon ? 1 : 0);
  const lowSeedWins = series.lowSeedWins + (highWon ? 0 : 1);
  const gameNumber = series.games.length + 1;
  const nextWinner =
    highSeedWins >= 2
      ? series.highSeedClubId
      : lowSeedWins >= 2
        ? series.lowSeedClubId
        : null;

  return {
    ...series,
    highSeedWins,
    lowSeedWins,
    winnerClubId: nextWinner,
    games: [
      ...series.games,
      {
        gameNumber,
        awayClubId: series.lowSeedClubId,
        homeClubId: series.highSeedClubId,
        awayScore,
        homeScore,
        winnerClubId,
      },
    ],
  };
}

function maybeCreateChampionshipSeries(
  semifinalA: PlayoffSeriesState,
  semifinalB: PlayoffSeriesState,
  current: PlayoffSeriesState | null,
): PlayoffSeriesState | null {
  if (current || !semifinalA.winnerClubId || !semifinalB.winnerClubId) return current;
  const winA = getSeriesWinnerInfo(semifinalA)!;
  const winB = getSeriesWinnerInfo(semifinalB)!;
  const [hi, lo] = winA.rank <= winB.rank ? [winA, winB] : [winB, winA];
  return makeSeries('championship', 'Championship Series (Best-of-3)', hi.rank, lo.rank, hi, lo);
}

/** Records a completed playoff game result and advances the bracket to Finals / Champion cleanly. */
export function recordPlayoffGameResult(
  bracket: PlayoffBracketState,
  seriesId: PlayoffSeriesId,
  winnerClubId: string,
  awayScore: number,
  homeScore: number,
): PlayoffBracketState {
  const semifinalA =
    seriesId === 'semifinal_a'
      ? applyGameToSeries(bracket.semifinalA, winnerClubId, awayScore, homeScore)
      : bracket.semifinalA;
  const semifinalB =
    seriesId === 'semifinal_b'
      ? applyGameToSeries(bracket.semifinalB, winnerClubId, awayScore, homeScore)
      : bracket.semifinalB;
  const updatedChamp =
    seriesId === 'championship' && bracket.championship
      ? applyGameToSeries(bracket.championship, winnerClubId, awayScore, homeScore)
      : bracket.championship;
  const championship = maybeCreateChampionshipSeries(semifinalA, semifinalB, updatedChamp);

  return {
    ...bracket,
    semifinalA,
    semifinalB,
    championship,
    championClubId: championship?.winnerClubId ?? bracket.championClubId,
  };
}

function getActiveSeriesForClub(
  bracket: PlayoffBracketState,
  clubId: string,
): PlayoffSeriesState | null {
  const candidates = [bracket.semifinalA, bracket.semifinalB, bracket.championship].filter(
    (s): s is PlayoffSeriesState => Boolean(s && !s.winnerClubId),
  );
  return (
    candidates.find((s) => s.highSeedClubId === clubId || s.lowSeedClubId === clubId) ?? null
  );
}

/** Returns the human club's next playable playoff game if still alive in the bracket. */
export function getNextHumanPlayoffMatchup(
  bracket: PlayoffBracketState,
  humanClubId: string,
): HumanPlayoffMatchup | null {
  const series = getActiveSeriesForClub(bracket, humanClubId);
  if (!series) return null;
  const isHigh = series.highSeedClubId === humanClubId;
  return {
    seriesId: series.id,
    seriesLabel: series.label,
    gameNumber: series.games.length + 1,
    opponentClubId: isHigh ? series.lowSeedClubId : series.highSeedClubId,
    opponentName: isHigh ? series.lowSeedName : series.highSeedName,
    humanWins: isHigh ? series.highSeedWins : series.lowSeedWins,
    opponentWins: isHigh ? series.lowSeedWins : series.highSeedWins,
    pressureLevel: series.id === 'championship' ? 'elimination_championship' : 'playoff_game',
  };
}

function pickNextUnfinishedSeries(bracket: PlayoffBracketState): PlayoffSeriesState | null {
  if (!bracket.semifinalA.winnerClubId) return bracket.semifinalA;
  if (!bracket.semifinalB.winnerClubId) return bracket.semifinalB;
  if (bracket.championship && !bracket.championship.winnerClubId) return bracket.championship;
  return null;
}

/** Deterministically simulates the next unfinished game in the Best-of-3 Postseason Bracket. */
export function simNextPlayoffBracketGame(
  bracket: PlayoffBracketState,
  clubsById: Readonly<Record<string, Club>>,
  seed: number,
  regulationInnings: GameLengthInnings = 7,
): { bracket: PlayoffBracketState; summary: string | null } {
  const series = pickNextUnfinishedSeries(bracket);
  if (!series) {
    return { bracket, summary: null };
  }
  const awayClub = clubsById[series.lowSeedClubId];
  const homeClub = clubsById[series.highSeedClubId];
  if (!awayClub || !homeClub) {
    return { bracket, summary: null };
  }

  const pressure: GamePressureLevel =
    series.id === 'championship' ? 'elimination_championship' : 'playoff_game';
  const result = simFullGame(awayClub, homeClub, seed, regulationInnings, pressure);
  const nextBracket = recordPlayoffGameResult(
    bracket,
    series.id,
    result.winnerClubId,
    result.awayScore,
    result.homeScore,
  );
  const winnerName =
    result.winnerClubId === homeClub.id ? homeClub.name : awayClub.name;
  const gameNum = series.games.length + 1;
  return {
    bracket: nextBracket,
    summary: `${series.label} Game ${gameNum}: ${winnerName} wins (${awayClub.name} ${result.awayScore} @ ${homeClub.name} ${result.homeScore})!`,
  };
}

/** Converts a retiring club legend into a hireable Club Legend coaching StaffMember. */
export function buildCoachStaffFromRetiredLegend(
  legend: RetiredLegendCoachCandidate,
): StaffMember {
  const rng = createSeededRng(legend.portraitSeed ^ 0x51a7f3);
  return generateStaffHiringPool(rng, 'majors', [legend])[0];
}

/** Hires a retiring club legend directly onto the club's dugout coaching staff. */
export function hireRetiredLegendCoachForClub(
  club: Club,
  legend: RetiredLegendCoachCandidate,
): { hired: boolean; reason?: string; club: Club; staff: StaffMember } {
  const staff = buildCoachStaffFromRetiredLegend(legend);
  const res = hireStaffMember(club, staff);
  return {
    hired: res.hired,
    reason: res.reason,
    club: res.club,
    staff,
  };
}
