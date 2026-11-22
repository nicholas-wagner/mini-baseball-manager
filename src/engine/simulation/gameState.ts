import type { FieldPosition } from '../handedness/types';
import type { Club, LineupSlot } from '../models/club';
import type { PlayEvent } from '../models/playEvent';
import type {
  GamePressureLevel,
  Player,
  PitchType,
  PlayerSeasonStats,
} from '../models/player';
import {
  SPECIAL_ABILITY_HYPE_COST,
  type AbilityCooldownState,
} from '../rpg/abilityCooldowns';
import {
  computeSituationLeverage,
  evaluateClubhouseMentalAura,
  type SituationLeverageResult,
} from '../rpg/mentalAndLeverage';

export type HalfInning = 'TOP' | 'BOT';

export type BaseState = [string | null, string | null, string | null];

export interface BatterBoxLine {
  playerId: string;
  plateAppearances: number;
  atBats: number;
  hits: number;
  runs: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbis: number;
  walks: number;
  strikeouts: number;
  sacFlies: number;
  stolenBases: number;
  groundBalls: number;
  lineDrives: number;
  flyBalls: number;
  popUps: number;
  putouts: number;
  assists: number;
  errors: number;
}

export interface PitcherBoxLine {
  playerId: string;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRunsAllowed: number;
  pitchesThrown: number;
  strikesThrown: number;
  ballsThrown: number;
  groundBalls: number;
  lineDrives: number;
  flyBalls: number;
  popUps: number;
  decision: 'W' | 'L' | 'SV' | null;
}

export interface GameBoxScore {
  awayBatters: Record<string, BatterBoxLine>;
  homeBatters: Record<string, BatterBoxLine>;
  awayPitchers: Record<string, PitcherBoxLine>;
  homePitchers: Record<string, PitcherBoxLine>;
  inningRuns: { inning: number; away: number; home: number }[];
}

export interface TeamGameSide {
  clubId: string;
  isHuman: boolean;
  city: string;
  name: string;
  mascot: string;
  lineup: readonly LineupSlot[];
  playersById: Readonly<Record<string, Player>>;
  rotationIds: readonly string[];
  bullpenIds: readonly string[];
  usedPitcherIds: readonly string[];
  activePitcherId: string;
  pitcherFatigue: number;
  lineupIndex: number;
  score: number;
  hits: number;
  errors: number;
  hypeGauge: number;
  clubhouseHypeMultiplier: number;
}

export interface GameSessionState {
  rngSeed: number;
  stepCounter: number;
  status: 'in_progress' | 'completed';
  gamePressureLevel: GamePressureLevel;
  inning: number;
  half: HalfInning;
  outs: number;
  balls: number;
  strikes: number;
  bases: BaseState;
  atBatPitchHistory: PitchType[];
  abilityCooldowns: AbilityCooldownState;
  away: TeamGameSide;
  home: TeamGameSide;
  eventSeq: number;
  boxScore: GameBoxScore;
  winnerClubId: string | null;
}

export interface GameSessionResult {
  finalState: GameSessionState;
  events: PlayEvent[];
  awayScore: number;
  homeScore: number;
  winnerClubId: string;
  boxScore: GameBoxScore;
  playerStatDeltas: Record<string, PlayerSeasonStats>;
}

function createEmptyBatterLine(playerId: string): BatterBoxLine {
  return {
    playerId,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    runs: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbis: 0,
    walks: 0,
    strikeouts: 0,
    sacFlies: 0,
    stolenBases: 0,
    groundBalls: 0,
    lineDrives: 0,
    flyBalls: 0,
    popUps: 0,
    putouts: 0,
    assists: 0,
    errors: 0,
  };
}

export function createEmptyPitcherLine(playerId: string): PitcherBoxLine {
  return {
    playerId,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    pitchesThrown: 0,
    strikesThrown: 0,
    ballsThrown: 0,
    groundBalls: 0,
    lineDrives: 0,
    flyBalls: 0,
    popUps: 0,
    decision: null,
  };
}

export function createTeamGameSide(club: Club): TeamGameSide {
  const playersById: Record<string, Player> = {};
  for (const player of club.roster) {
    playersById[player.id] = player;
  }
  const starterId =
    club.rotationIds[club.rotationCursor % Math.max(1, club.rotationIds.length)] ??
    club.roster[club.roster.length - 1].id;

  return {
    clubId: club.id,
    isHuman: club.isHuman,
    city: club.city,
    name: club.name,
    mascot: club.mascot,
    lineup: club.lineup,
    playersById,
    rotationIds: club.rotationIds,
    bullpenIds: club.bullpenIds,
    usedPitcherIds: [starterId],
    activePitcherId: starterId,
    pitcherFatigue: 0,
    lineupIndex: 0,
    score: 0,
    hits: 0,
    errors: 0,
    hypeGauge: 25,
    clubhouseHypeMultiplier: evaluateClubhouseMentalAura(club.roster).hypeGainMultiplier,
  };
}

function initBatterMap(side: TeamGameSide): Record<string, BatterBoxLine> {
  const map: Record<string, BatterBoxLine> = {};
  for (const slot of side.lineup) {
    map[slot.playerId] = createEmptyBatterLine(slot.playerId);
  }
  return map;
}

export function createEmptyBoxScore(away: TeamGameSide, home: TeamGameSide): GameBoxScore {
  return {
    awayBatters: initBatterMap(away),
    homeBatters: initBatterMap(home),
    awayPitchers: { [away.activePitcherId]: createEmptyPitcherLine(away.activePitcherId) },
    homePitchers: { [home.activePitcherId]: createEmptyPitcherLine(home.activePitcherId) },
    inningRuns: [{ inning: 1, away: 0, home: 0 }],
  };
}

export function getBattingSide(state: GameSessionState): TeamGameSide {
  return state.half === 'TOP' ? state.away : state.home;
}

export function getFieldingSide(state: GameSessionState): TeamGameSide {
  return state.half === 'TOP' ? state.home : state.away;
}

export function getCurrentBatter(state: GameSessionState): Player {
  const batting = getBattingSide(state);
  const slot = batting.lineup[batting.lineupIndex % batting.lineup.length];
  return batting.playersById[slot.playerId];
}

export function getCurrentPitcher(state: GameSessionState): Player {
  const fielding = getFieldingSide(state);
  return fielding.playersById[fielding.activePitcherId];
}

export function getDefenderAtPosition(
  side: TeamGameSide,
  position: Exclude<FieldPosition, 'SP' | 'RP'>,
): Player {
  const slot = side.lineup.find((entry) => entry.defensivePosition === position);
  if (slot) return side.playersById[slot.playerId];
  return side.playersById[side.lineup[0].playerId];
}

/** Computes real-time Leverage Index for the active game state. */
export function getCurrentLeverage(state: GameSessionState): SituationLeverageResult {
  return computeSituationLeverage({
    inning: state.inning,
    outs: state.outs,
    bases: state.bases,
    scoreDiff: state.home.score - state.away.score,
    gamePressureLevel: state.gamePressureLevel,
  });
}

/** Detects RISP, high Leverage Index, close late-inning pressure, or Special Ability Hype readiness. */
export function isClutchSituation(state: GameSessionState): boolean {
  const hasRisp = state.bases[1] !== null || state.bases[2] !== null;
  const closeLate = state.inning >= 7 && Math.abs(state.away.score - state.home.score) <= 2;
  const powerReady =
    state.away.hypeGauge >= SPECIAL_ABILITY_HYPE_COST ||
    state.home.hypeGauge >= SPECIAL_ABILITY_HYPE_COST;
  const highLeverage = getCurrentLeverage(state).leverageIndex >= 1.6;
  return hasRisp || closeLate || powerReady || highLeverage;
}

/** Advances runners only when forced on a walk/intentional walk. */
export function advanceWalkRunners(
  bases: BaseState,
  batterId: string,
): { basesAfter: BaseState; runsScoredIds: string[] } {
  const [first, second, third] = bases;
  if (first === null) {
    return { basesAfter: [batterId, second, third], runsScoredIds: [] };
  }
  if (second === null) {
    return { basesAfter: [batterId, first, third], runsScoredIds: [] };
  }
  if (third === null) {
    return { basesAfter: [batterId, first, second], runsScoredIds: [] };
  }
  return { basesAfter: [batterId, first, second], runsScoredIds: [third] };
}

function compactIds(ids: readonly (string | null)[]): string[] {
  return ids.filter((id): id is string => id !== null);
}

function advanceOnSingle(bases: BaseState, batterId: string): { basesAfter: BaseState; runsScoredIds: string[] } {
  return {
    basesAfter: [batterId, bases[0], null],
    runsScoredIds: compactIds([bases[2], bases[1]]),
  };
}

function advanceOnDouble(bases: BaseState, batterId: string): { basesAfter: BaseState; runsScoredIds: string[] } {
  return {
    basesAfter: [null, batterId, bases[0]],
    runsScoredIds: compactIds([bases[2], bases[1]]),
  };
}

function advanceOnTriple(bases: BaseState, batterId: string): { basesAfter: BaseState; runsScoredIds: string[] } {
  return {
    basesAfter: [null, null, batterId],
    runsScoredIds: compactIds([bases[2], bases[1], bases[0]]),
  };
}

function advanceOnHomeRun(bases: BaseState, batterId: string): { basesAfter: BaseState; runsScoredIds: string[] } {
  return {
    basesAfter: [null, null, null],
    runsScoredIds: compactIds([bases[2], bases[1], bases[0], batterId]),
  };
}

const HIT_ADVANCER_MAP: Readonly<
  Record<1 | 2 | 3 | 4, (bases: BaseState, batterId: string) => { basesAfter: BaseState; runsScoredIds: string[] }>
> = {
  1: advanceOnSingle,
  2: advanceOnDouble,
  3: advanceOnTriple,
  4: advanceOnHomeRun,
};

/** Advances baserunners for a 1B, 2B, 3B, or HR hit outcome. */
export function advanceHitRunners(
  bases: BaseState,
  batterId: string,
  totalBases: 1 | 2 | 3 | 4,
): { basesAfter: BaseState; runsScoredIds: string[] } {
  return HIT_ADVANCER_MAP[totalBases](bases, batterId);
}
