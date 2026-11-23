import { createCatalogDraw } from '../catalog/playerCatalog';
import type { SeriesGameplanId } from '../gm/gmSeasonPulse';
import { generateMarketPool } from '../gm/marketTiers';
import type { Player } from '../models/player';
import { createClub } from '../gm/rosterFactory';
import {
  createClubWithStartingPreset,
  type StartingRosterPreset,
} from '../gm/rosterPresets';
import {
  LEAGUE_TIER_ORDER,
  type Club,
  type LeagueTierId,
} from '../models/club';
import {
  createEmptySeasonStats,
  isPitcherPosition,
  type GameLengthInnings,
} from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { advanceCareerServiceForSeason } from '../rpg/careerExperience';
import {
  applyOffseasonCareerArc,
  evaluateClubMentorshipAura,
} from '../rpg/lifecycle';
import { applyGameStatDeltasToClub, simFullGame } from '../simulation/baseballEngine';
import {
  computeBattingSabermetrics,
  computePitchingSabermetrics,
} from '../simulation/sabermetrics';
import { AI_CLUB_CATALOG } from './clubCatalog';

export interface HumanClubSeedInput {
  city: string;
  clubName: string;
  mascot: string;
  monogram: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  startingPreset?: StartingRosterPreset;
}

export interface SeriesMatchup {
  homeClubId: string;
  awayClubId: string;
  gamesCount: 3;
}

export interface ScheduledSeriesRound {
  seriesIndex: number; // 0..6 (7 three-game series = 21 games)
  matchups: readonly SeriesMatchup[];
}

export interface HumanScheduledSeries {
  seriesIndex: number; // 0..6
  seriesNumber: number; // 1..7
  opponent: Club;
  isHome: boolean;
  gamesCount: 3;
  hostBallparkId: Club['stadium']['ballparkId'];
  status: 'completed' | 'current' | 'upcoming';
}

export interface HumanSeriesGameLog {
  gameNumber: number;
  humanScore: number;
  opponentScore: number;
  won: boolean;
  isHome: boolean;
}

export interface StandingsRow {
  rank: number;
  clubId: string;
  clubName: string;
  isHuman: boolean;
  wins: number;
  losses: number;
  winPct: number;
  gamesBack: number;
  streak: number;
}

export interface LeagueLeaderEntry {
  playerId: string;
  playerName: string;
  clubName: string;
  value: number;
}

export interface TierLeagueLeaders {
  battingAvg: readonly LeagueLeaderEntry[];
  homeRuns: readonly LeagueLeaderEntry[];
  ops: readonly LeagueLeaderEntry[];
  strikeouts: readonly LeagueLeaderEntry[];
  era: readonly LeagueLeaderEntry[];
}

export interface PlayoffSeriesResult {
  round: 'semifinal_1' | 'semifinal_2' | 'championship';
  higherSeedId: string;
  lowerSeedId: string;
  higherSeedWins: number;
  lowerSeedWins: number;
  winnerClubId: string;
}

export interface TierPlayoffResult {
  semifinals: readonly [PlayoffSeriesResult, PlayoffSeriesResult];
  championship: PlayoffSeriesResult;
  championClubId: string;
}

export interface TierPromotionTransition {
  clubId: string;
  clubName: string;
  fromTier: LeagueTierId;
  toTier: LeagueTierId;
  direction: 'promoted' | 'relegated';
}

export interface OffseasonAdvanceResult {
  leagues: Record<LeagueTierId, Club[]>;
  transitions: readonly TierPromotionTransition[];
}

/** Generates a complete 48-club, 6-tier baseball world deterministically from seed. */
export function generateSixTierWorld(
  worldSeed: number,
  humanInput: HumanClubSeedInput,
): { humanClubId: string; leagues: Record<LeagueTierId, Club[]>; freeAgents: Player[] } {
  const drawIdentity = createCatalogDraw(createSeededRng(worldSeed ^ 0x1994bace));
  const humanOpts = {
    drawIdentity,
    id: `club-human-${worldSeed}`,
    city: humanInput.city.trim() || 'Sandlot',
    name: humanInput.clubName.trim() || 'Comets',
    mascot: humanInput.mascot.trim() || 'Rocket Dog',
    colors: {
      primary: humanInput.primaryColor,
      secondary: humanInput.secondaryColor,
      accent: humanInput.accentColor,
      monogram: humanInput.monogram.trim().toUpperCase().slice(0, 2) || 'SC',
    },
    leagueTier: 'rookie' as const,
    isHuman: true,
  };
  const humanClub = humanInput.startingPreset
    ? createClubWithStartingPreset(createSeededRng(worldSeed), humanOpts, humanInput.startingPreset)
    : createClub(createSeededRng(worldSeed), humanOpts);

  const leagues = {} as Record<LeagueTierId, Club[]>;
  LEAGUE_TIER_ORDER.forEach((tier, tierIdx) => {
    const templates = AI_CLUB_CATALOG[tier];
    const aiClubs = templates.map((tpl, clubIdx) =>
      createClub(createSeededRng(worldSeed + (tierIdx + 1) * 1000 + clubIdx * 17), {
        drawIdentity,
        id: `club-ai-${tier}-${clubIdx + 1}`,
        city: tpl.city,
        name: tpl.name,
        mascot: tpl.mascot,
        colors: {
          primary: tpl.primary,
          secondary: tpl.secondary,
          accent: tpl.accent,
          monogram: tpl.monogram,
        },
        leagueTier: tier,
        isHuman: false,
        aiArchetype: tpl.archetype,
      }),
    );
    leagues[tier] = tier === 'rookie' ? [humanClub, ...aiClubs] : aiClubs;
  });

  const freeAgents = generateMarketPool(createSeededRng(worldSeed + 505), 'rookie', 12, drawIdentity);
  return { humanClubId: humanClub.id, leagues, freeAgents };
}

/** Generates a balanced 7-series (21-game) circle-method round-robin schedule for an 8-club tier. */
export function generateTierSchedule(clubIds: readonly string[]): readonly ScheduledSeriesRound[] {
  const ids = [...clubIds];
  if (ids.length < 2) return [];
  const fixed = ids[0];
  const rotating = ids.slice(1);
  const rounds: ScheduledSeriesRound[] = [];

  for (let round = 0; round < rotating.length; round += 1) {
    const order = [fixed, ...rotating];
    const half = Math.floor(order.length / 2);
    const matchups: SeriesMatchup[] = [];
    for (let i = 0; i < half; i += 1) {
      const a = order[i];
      const b = order[order.length - 1 - i];
      const swapHome = (round + i) % 2 === 1;
      matchups.push({
        homeClubId: swapHome ? b : a,
        awayClubId: swapHome ? a : b,
        gamesCount: 3,
      });
    }
    rounds.push({ seriesIndex: round, matchups });
    const last = rotating.pop()!;
    rotating.unshift(last);
  }
  return rounds;
}

function resolveHumanSeriesStatus(
  seriesIndex: number,
  currentSeriesIndex: number,
): HumanScheduledSeries['status'] {
  if (seriesIndex < currentSeriesIndex) return 'completed';
  if (seriesIndex === currentSeriesIndex) return 'current';
  return 'upcoming';
}

function buildHumanSeriesEntry(
  round: ScheduledSeriesRound,
  byId: ReadonlyMap<string, Club>,
  humanClub: Club,
  currentSeriesIndex: number,
): HumanScheduledSeries | null {
  const match = round.matchups.find(
    (m) => m.homeClubId === humanClub.id || m.awayClubId === humanClub.id,
  );
  if (!match) return null;
  const isHome = match.homeClubId === humanClub.id;
  const opponent = byId.get(isHome ? match.awayClubId : match.homeClubId);
  if (!opponent) return null;
  return {
    seriesIndex: round.seriesIndex,
    seriesNumber: round.seriesIndex + 1,
    opponent,
    isHome,
    gamesCount: match.gamesCount,
    hostBallparkId: (isHome ? humanClub : opponent).stadium.ballparkId,
    status: resolveHumanSeriesStatus(round.seriesIndex, currentSeriesIndex),
  };
}

/** Projects the predetermined 7-series (21-game) Home & Away schedule for the human club. */
export function getHumanSeasonSchedule(
  tierClubs: readonly Club[],
  humanClubId: string,
  currentSeriesIndex: number,
): { entries: readonly HumanScheduledSeries[]; nextSeries: HumanScheduledSeries | null } {
  const byId = new Map(tierClubs.map((c) => [c.id, c]));
  const humanClub = byId.get(humanClubId);
  if (!humanClub) return { entries: [], nextSeries: null };

  const rounds = generateTierSchedule(tierClubs.map((c) => c.id));
  const entries = rounds
    .map((round) => buildHumanSeriesEntry(round, byId, humanClub, currentSeriesIndex))
    .filter((entry): entry is HumanScheduledSeries => entry !== null);

  const nextSeries = entries.find((entry) => entry.status === 'current') ?? null;
  return { entries, nextSeries };
}

/** Computes sorted league standings with win percentage and games back. */
export function computeTierStandings(clubs: readonly Club[]): readonly StandingsRow[] {
  const sorted = [...clubs].sort((a, b) => {
    const pctA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0.5;
    const pctB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0.5;
    if (pctB !== pctA) return pctB - pctA;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.id.localeCompare(b.id);
  });

  const leader = sorted[0];
  return sorted.map((club, idx) => {
    const games = club.wins + club.losses;
    const gb = leader
      ? ((leader.wins - club.wins) + (club.losses - leader.losses)) / 2
      : 0;
    return {
      rank: idx + 1,
      clubId: club.id,
      clubName: `${club.city} ${club.name}`,
      isHuman: club.isHuman,
      wins: club.wins,
      losses: club.losses,
      winPct: games > 0 ? club.wins / games : 0,
      gamesBack: Math.max(0, gb),
      streak: club.streak,
    };
  });
}

function topFive(entries: LeagueLeaderEntry[], ascending = false): readonly LeagueLeaderEntry[] {
  return [...entries]
    .sort((a, b) => (ascending ? a.value - b.value : b.value - a.value))
    .slice(0, 5);
}

function collectPlayerLeaderEntries(
  club: Club,
  buckets: {
    avgList: LeagueLeaderEntry[];
    hrList: LeagueLeaderEntry[];
    opsList: LeagueLeaderEntry[];
    kList: LeagueLeaderEntry[];
    eraList: LeagueLeaderEntry[];
  },
): void {
  const clubName = `${club.city} ${club.name}`;
  for (const p of club.roster) {
    if (isPitcherPosition(p.position)) {
      const pitch = computePitchingSabermetrics(p.seasonStats);
      buckets.kList.push({
        playerId: p.id,
        playerName: p.name,
        clubName,
        value: p.seasonStats.pitchingStrikeouts,
      });
      if (p.seasonStats.inningsPitchedOuts >= 9) {
        buckets.eraList.push({
          playerId: p.id,
          playerName: p.name,
          clubName,
          value: Number(pitch.era.toFixed(2)),
        });
      }
      continue;
    }

    const bat = computeBattingSabermetrics(p.seasonStats);
    buckets.hrList.push({
      playerId: p.id,
      playerName: p.name,
      clubName,
      value: p.seasonStats.homeRuns,
    });
    if (p.seasonStats.atBats >= 5) {
      buckets.avgList.push({
        playerId: p.id,
        playerName: p.name,
        clubName,
        value: Number(bat.avg.toFixed(3)),
      });
      buckets.opsList.push({
        playerId: p.id,
        playerName: p.name,
        clubName,
        value: Number(bat.ops.toFixed(3)),
      });
    }
  }
}

/** Aggregates batting and pitching league leaderboards across an 8-club tier. */
export function getTierLeagueLeaders(clubs: readonly Club[]): TierLeagueLeaders {
  const buckets = {
    avgList: [] as LeagueLeaderEntry[],
    hrList: [] as LeagueLeaderEntry[],
    opsList: [] as LeagueLeaderEntry[],
    kList: [] as LeagueLeaderEntry[],
    eraList: [] as LeagueLeaderEntry[],
  };
  for (const club of clubs) {
    collectPlayerLeaderEntries(club, buckets);
  }

  return {
    battingAvg: topFive(buckets.avgList),
    homeRuns: topFive(buckets.hrList),
    ops: topFive(buckets.opsList),
    strikeouts: topFive(buckets.kList),
    era: topFive(buckets.eraList, true),
  };
}

function buildHumanGameLog(
  gameNumber: number,
  humanIsHome: boolean,
  homeWon: boolean,
  homeScore: number,
  awayScore: number,
): HumanSeriesGameLog {
  return {
    gameNumber,
    humanScore: humanIsHome ? homeScore : awayScore,
    opponentScore: humanIsHome ? awayScore : homeScore,
    won: humanIsHome ? homeWon : !homeWon,
    isHome: humanIsHome,
  };
}

function findHumanOpponentId(away: Club, home: Club): string | null {
  if (home.isHuman) return away.id;
  if (away.isHuman) return home.id;
  return null;
}

function simulateMatchupGames(
  map: Map<string, Club>,
  match: SeriesMatchup,
  matchIdx: number,
  seed: number,
  regulationInnings: GameLengthInnings,
  humanGameplan: SeriesGameplanId,
  humanGamesAlreadyPlayed: number,
  humanGamesOut: HumanSeriesGameLog[],
): { simulated: number; humanOpponentId: string | null } {
  const initialAway = map.get(match.awayClubId);
  const initialHome = map.get(match.homeClubId);
  if (!initialAway || !initialHome) return { simulated: 0, humanOpponentId: null };

  const humanOpponentId = findHumanOpponentId(initialAway, initialHome);
  const startGame = humanOpponentId ? Math.max(0, humanGamesAlreadyPlayed) : 0;
  let simulated = 0;

  for (let g = startGame; g < match.gamesCount; g += 1) {
    const away = map.get(match.awayClubId)!;
    const home = map.get(match.homeClubId)!;
    const result = simFullGame(
      away,
      home,
      seed + matchIdx * 31 + g * 7,
      regulationInnings,
      'regular',
      away.isHuman ? humanGameplan : 'balanced',
      home.isHuman ? humanGameplan : 'balanced',
    );
    const homeWon = result.winnerClubId === home.id;
    map.set(home.id, applyGameStatDeltasToClub(home, result.playerStatDeltas, homeWon));
    map.set(away.id, applyGameStatDeltasToClub(away, result.playerStatDeltas, !homeWon));
    if (humanOpponentId) {
      humanGamesOut.push(
        buildHumanGameLog(g + 1, home.isHuman, homeWon, result.homeScore, result.awayScore),
      );
    }
    simulated += 1;
  }
  return { simulated, humanOpponentId };
}

/** Simulates one full 3-game series round (4 matchups × 3 games) for an 8-club tier. */
export function simulateSeriesRound(
  clubs: readonly Club[],
  seriesIndex: number,
  seed: number,
  regulationInnings: GameLengthInnings = 9,
  humanGameplan: SeriesGameplanId = 'balanced',
  humanGamesAlreadyPlayed = 0,
): {
  clubs: Club[];
  gamesSimulated: number;
  humanGames: readonly HumanSeriesGameLog[];
  humanOpponentId: string | null;
} {
  const schedule = generateTierSchedule(clubs.map((c) => c.id));
  const round = schedule[seriesIndex % schedule.length];
  if (!round) {
    return { clubs: [...clubs], gamesSimulated: 0, humanGames: [], humanOpponentId: null };
  }

  const map = new Map(clubs.map((c) => [c.id, c]));
  const humanGames: HumanSeriesGameLog[] = [];
  let gamesSimulated = 0;
  let humanOpponentId: string | null = null;

  round.matchups.forEach((match, matchIdx) => {
    const res = simulateMatchupGames(
      map,
      match,
      matchIdx,
      seed,
      regulationInnings,
      humanGameplan,
      humanGamesAlreadyPlayed,
      humanGames,
    );
    gamesSimulated += res.simulated;
    if (res.humanOpponentId) humanOpponentId = res.humanOpponentId;
  });

  return {
    clubs: clubs.map((c) => map.get(c.id)!),
    gamesSimulated,
    humanGames,
    humanOpponentId,
  };
}

function playBestOfThree(
  higher: Club,
  lower: Club,
  round: PlayoffSeriesResult['round'],
  seed: number,
  regulationInnings: GameLengthInnings,
): PlayoffSeriesResult {
  let higherWins = 0;
  let lowerWins = 0;
  let gameIdx = 0;

  while (higherWins < 2 && lowerWins < 2) {
    const higherIsHome = gameIdx !== 1;
    const away = higherIsHome ? lower : higher;
    const home = higherIsHome ? higher : lower;
    const result = simFullGame(away, home, seed + gameIdx * 19, regulationInnings);
    if (result.winnerClubId === higher.id) higherWins += 1;
    else lowerWins += 1;
    gameIdx += 1;
  }

  return {
    round,
    higherSeedId: higher.id,
    lowerSeedId: lower.id,
    higherSeedWins: higherWins,
    lowerSeedWins: lowerWins,
    winnerClubId: higherWins >= 2 ? higher.id : lower.id,
  };
}

/** Runs the 4-team Best-of-3 Playoffs for an 8-club tier and crowns the tier champion. */
export function simulateBestOfThreePlayoffs(
  clubs: readonly Club[],
  seed: number,
  regulationInnings: GameLengthInnings = 9,
): TierPlayoffResult {
  const standings = computeTierStandings(clubs);
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const seed1 = byId.get(standings[0].clubId)!;
  const seed2 = byId.get(standings[1].clubId)!;
  const seed3 = byId.get(standings[2].clubId)!;
  const seed4 = byId.get(standings[3].clubId)!;

  const semi1 = playBestOfThree(seed1, seed4, 'semifinal_1', seed + 11, regulationInnings);
  const semi2 = playBestOfThree(seed2, seed3, 'semifinal_2', seed + 47, regulationInnings);

  const champHigh = byId.get(semi1.winnerClubId)!;
  const champLow = byId.get(semi2.winnerClubId)!;
  const championship = playBestOfThree(
    champHigh,
    champLow,
    'championship',
    seed + 97,
    regulationInnings,
  );

  return {
    semifinals: [semi1, semi2],
    championship,
    championClubId: championship.winnerClubId,
  };
}

function resetClubForNewSeason(club: Club, targetTier: LeagueTierId, seed: number): Club {
  const rng = createSeededRng(seed);
  const mentorship = evaluateClubMentorshipAura(club.roster);
  return {
    ...club,
    leagueTier: targetTier,
    wins: 0,
    losses: 0,
    streak: 0,
    rotationCursor: 0,
    roster: club.roster.map((player) => {
      const aged = {
        ...player,
        age: player.age + 1,
        fatigue: 0,
        careerService: advanceCareerServiceForSeason(player.careerService, player.careerStats),
        seasonStats: createEmptySeasonStats(),
      };
      return applyOffseasonCareerArc(rng, aged, {
        mentorshipGrowthBonus: mentorship.offseasonGrowthBonus,
      }).player;
    }),
  };
}

/** Executes 6-tier Promotion/Relegation, resets seasonal stats, and advances every player's career service. */
export function advanceOffseasonWorld(
  leagues: Readonly<Record<LeagueTierId, Club[]>>,
  seed: number,
  championsByTier?: Partial<Record<LeagueTierId, string>>,
): OffseasonAdvanceResult {
  const buckets: Record<LeagueTierId, Club[]> = {
    rookie: [...leagues.rookie],
    low_a: [...leagues.low_a],
    high_a: [...leagues.high_a],
    aa: [...leagues.aa],
    aaa: [...leagues.aaa],
    majors: [...leagues.majors],
  };

  const champions: Record<LeagueTierId, string> = {} as Record<LeagueTierId, string>;
  const relegated: Record<LeagueTierId, string> = {} as Record<LeagueTierId, string>;

  LEAGUE_TIER_ORDER.forEach((tier, idx) => {
    const standings = computeTierStandings(buckets[tier]);
    champions[tier] =
      championsByTier?.[tier] ??
      simulateBestOfThreePlayoffs(buckets[tier], seed + idx * 101, 5).championClubId;
    relegated[tier] = standings[standings.length - 1].clubId;
  });

  const transitions: TierPromotionTransition[] = [];
  for (let i = 0; i < LEAGUE_TIER_ORDER.length - 1; i += 1) {
    const lowerTier = LEAGUE_TIER_ORDER[i];
    const upperTier = LEAGUE_TIER_ORDER[i + 1];
    const promotedClub = buckets[lowerTier].find((c) => c.id === champions[lowerTier]);
    const droppedClub = buckets[upperTier].find((c) => c.id === relegated[upperTier]);
    if (!promotedClub || !droppedClub) continue;

    buckets[lowerTier] = [
      ...buckets[lowerTier].filter((c) => c.id !== promotedClub.id),
      droppedClub,
    ];
    buckets[upperTier] = [
      ...buckets[upperTier].filter((c) => c.id !== droppedClub.id),
      promotedClub,
    ];
    transitions.push(
      {
        clubId: promotedClub.id,
        clubName: `${promotedClub.city} ${promotedClub.name}`,
        fromTier: lowerTier,
        toTier: upperTier,
        direction: 'promoted',
      },
      {
        clubId: droppedClub.id,
        clubName: `${droppedClub.city} ${droppedClub.name}`,
        fromTier: upperTier,
        toTier: lowerTier,
        direction: 'relegated',
      },
    );
  }

  const nextLeagues = {} as Record<LeagueTierId, Club[]>;
  LEAGUE_TIER_ORDER.forEach((tier, tierIdx) => {
    nextLeagues[tier] = buckets[tier].map((club, clubIdx) =>
      resetClubForNewSeason(club, tier, seed + tierIdx * 709 + clubIdx * 37),
    );
  });
  return { leagues: nextLeagues, transitions };
}
