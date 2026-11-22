import type { Club } from '../models/club';
import type { PlayEvent, TacticalCall } from '../models/playEvent';
import { createEmptySeasonStats, type PitchType, type PlayerSeasonStats } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  advanceHitRunners,
  advanceWalkRunners,
  createEmptyBoxScore,
  createEmptyPitcherLine,
  createTeamGameSide,
  getBattingSide,
  getCurrentBatter,
  getCurrentPitcher,
  getDefenderAtPosition,
  getFieldingSide,
  isClutchSituation,
  type BaseState,
  type BatterBoxLine,
  type GameBoxScore,
  type GameSessionResult,
  type GameSessionState,
  type PitcherBoxLine,
  type TeamGameSide,
} from './gameState';
import { resolveSinglePitch, type PitchResolution } from './pitchResolver';

export interface StepPitchOptions {
  requestedPitchType?: PitchType;
}

export function createGameSession(
  awayClub: Club,
  homeClub: Club,
  seed: number,
): GameSessionState {
  const away = createTeamGameSide(awayClub);
  const home = createTeamGameSide(homeClub);
  return {
    rngSeed: seed >>> 0,
    stepCounter: 0,
    status: 'in_progress',
    inning: 1,
    half: 'TOP',
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: [null, null, null],
    atBatPitchHistory: [],
    away,
    home,
    eventSeq: 0,
    boxScore: createEmptyBoxScore(away, home),
    winnerClubId: null,
  };
}

function makeEvent(
  state: GameSessionState,
  partial: Omit<
    PlayEvent,
    'seq' | 'inning' | 'half' | 'outsBefore' | 'outsAfter' | 'balls' | 'strikes' | 'awayScore' | 'homeScore' | 'basesAfter' | 'isClutchMoment'
  > & { outsBefore: number },
): PlayEvent {
  state.eventSeq += 1;
  return {
    seq: state.eventSeq,
    inning: state.inning,
    half: state.half,
    outsBefore: partial.outsBefore,
    outsAfter: state.outs,
    balls: state.balls,
    strikes: state.strikes,
    awayScore: state.away.score,
    homeScore: state.home.score,
    basesAfter: [...state.bases] as BaseState,
    batterId: partial.batterId,
    pitcherId: partial.pitcherId,
    outcome: partial.outcome,
    isClutchMoment: isClutchSituation(state),
    specialPowerTriggered: partial.specialPowerTriggered,
    ballFlight: partial.ballFlight,
    fieldingHighlight: partial.fieldingHighlight,
    pitchThrown: partial.pitchThrown,
    commentary: partial.commentary,
    soundCue: partial.soundCue,
    type: partial.type,
    xpAwards: partial.xpAwards,
  };
}

function cloneBoxScore(box: GameBoxScore): GameBoxScore {
  return {
    awayBatters: structuredClone(box.awayBatters),
    homeBatters: structuredClone(box.homeBatters),
    awayPitchers: structuredClone(box.awayPitchers),
    homePitchers: structuredClone(box.homePitchers),
    inningRuns: box.inningRuns.map((row) => ({ ...row })),
  };
}

function getBatterLines(state: GameSessionState): Record<string, BatterBoxLine> {
  return state.half === 'TOP' ? state.boxScore.awayBatters : state.boxScore.homeBatters;
}

function getPitcherLines(state: GameSessionState): Record<string, PitcherBoxLine> {
  return state.half === 'TOP' ? state.boxScore.homePitchers : state.boxScore.awayPitchers;
}

function recordRunsScored(
  state: GameSessionState,
  batting: TeamGameSide,
  pitcherLine: PitcherBoxLine,
  batterLine: BatterBoxLine,
  runsScoredIds: readonly string[],
  earned: boolean,
): void {
  const count = runsScoredIds.length;
  if (count === 0) return;

  batting.score += count;
  const batterMap = getBatterLines(state);
  for (const runnerId of runsScoredIds) {
    if (batterMap[runnerId]) {
      batterMap[runnerId].runs += 1;
    }
  }
  batterLine.rbis += count;
  pitcherLine.runsAllowed += count;
  if (earned) {
    pitcherLine.earnedRuns += count;
  }

  let row = state.boxScore.inningRuns.find((entry) => entry.inning === state.inning);
  if (!row) {
    row = { inning: state.inning, away: 0, home: 0 };
    state.boxScore.inningRuns.push(row);
  }
  if (state.half === 'TOP') row.away += count;
  else row.home += count;
}

function applyCountPitch(
  state: GameSessionState,
  res: PitchResolution,
  batterId: string,
  pitcherId: string,
): PlayEvent {
  const outsBefore = state.outs;
  if (res.outcome === 'ball') {
    state.balls += 1;
  } else if (res.outcome === 'called_strike' || res.outcome === 'swinging_strike') {
    state.strikes += 1;
  } else if (res.outcome === 'foul' && state.strikes < 2) {
    state.strikes += 1;
  }

  const batting = getBattingSide(state);
  batting.hypeGauge = Math.min(100, batting.hypeGauge + 4);
  if (res.pitchThrown) {
    state.atBatPitchHistory.push(res.pitchThrown.pitchType);
  }

  return makeEvent(state, {
    type: 'pitch_thrown',
    outsBefore,
    batterId,
    pitcherId,
    outcome: res.outcome,
    pitchThrown: res.pitchThrown,
    commentary: res.commentary,
    soundCue: res.soundCue,
  });
}

function applyStealAttempt(
  state: GameSessionState,
  res: PitchResolution,
  batterId: string,
  pitcherId: string,
): PlayEvent {
  const outsBefore = state.outs;
  const runnerId = state.bases[0];
  const battingLines = getBatterLines(state);
  const pitcherLine = getPitcherLines(state)[pitcherId];

  if (res.stealSuccess && runnerId) {
    state.bases = [null, runnerId, state.bases[2]];
    if (battingLines[runnerId]) battingLines[runnerId].stolenBases += 1;
  } else if (runnerId) {
    state.bases = [null, state.bases[1], state.bases[2]];
    state.outs += 1;
    pitcherLine.outsRecorded += 1;
  }

  return makeEvent(state, {
    type: 'stolen_base_attempt',
    outsBefore,
    batterId,
    pitcherId,
    fieldingHighlight: res.fieldingHighlight,
    commentary: res.commentary,
    soundCue: res.soundCue,
  });
}

function updateHitStats(
  batting: TeamGameSide,
  batterLine: BatterBoxLine,
  pitcherLine: PitcherBoxLine,
  res: PitchResolution,
): void {
  batting.hits += 1;
  batterLine.hits += 1;
  pitcherLine.hitsAllowed += 1;
  if (res.totalBases === 2) batterLine.doubles += 1;
  if (res.totalBases === 3) batterLine.triples += 1;
  if (res.totalBases === 4) {
    batterLine.homeRuns += 1;
    pitcherLine.homeRunsAllowed += 1;
  }
}

function applyRunnerMovementForPlateOutcome(
  state: GameSessionState,
  res: PitchResolution,
  batterId: string,
  batterLine: BatterBoxLine,
  pitcherLine: PitcherBoxLine,
): void {
  const batting = getBattingSide(state);
  const fielding = getFieldingSide(state);

  if (res.outcome === 'walk') {
    const walked = advanceWalkRunners(state.bases, batterId);
    state.bases = walked.basesAfter;
    batterLine.walks += 1;
    pitcherLine.walks += 1;
    recordRunsScored(state, batting, pitcherLine, batterLine, walked.runsScoredIds, true);
    return;
  }

  batterLine.atBats += 1;
  if (res.outcome === 'fielding_error') {
    fielding.errors += 1;
    batterLine.errors += 1;
    const errAdvance = advanceWalkRunners(state.bases, batterId);
    state.bases = errAdvance.basesAfter;
    recordRunsScored(state, batting, pitcherLine, batterLine, errAdvance.runsScoredIds, false);
    return;
  }

  if (res.totalBases) {
    updateHitStats(batting, batterLine, pitcherLine, res);
    const advanced = advanceHitRunners(state.bases, batterId, res.totalBases);
    state.bases = advanced.basesAfter;
    recordRunsScored(state, batting, pitcherLine, batterLine, advanced.runsScoredIds, true);
    return;
  }

  state.outs += res.outsAdded;
  pitcherLine.outsRecorded += res.outsAdded;
  if (res.outcome === 'strikeout') {
    batterLine.strikeouts += 1;
    pitcherLine.strikeouts += 1;
  } else if (res.advanceOnOut === 'double_play') {
    state.bases = [null, state.bases[1], state.bases[2]];
  } else if (res.advanceOnOut === 'sac_fly' && state.bases[2]) {
    const scoringId = state.bases[2];
    state.bases = [state.bases[0], state.bases[1], null];
    batterLine.atBats -= 1;
    recordRunsScored(state, batting, pitcherLine, batterLine, [scoringId], true);
  }
}

function applyPlateComplete(
  state: GameSessionState,
  res: PitchResolution,
  batterId: string,
  pitcherId: string,
): PlayEvent {
  const outsBefore = state.outs;
  const batting = getBattingSide(state);
  const fielding = getFieldingSide(state);
  const batterLine = getBatterLines(state)[batterId];
  const pitcherLine = getPitcherLines(state)[pitcherId];

  applyRunnerMovementForPlateOutcome(state, res, batterId, batterLine, pitcherLine);

  state.balls = 0;
  state.strikes = 0;
  state.atBatPitchHistory = [];
  batting.lineupIndex = (batting.lineupIndex + 1) % batting.lineup.length;

  if (res.specialPowerTriggered) {
    if (res.specialPowerTriggered.actor === 'batter') batting.hypeGauge = 15;
    else fielding.hypeGauge = 15;
  } else {
    batting.hypeGauge = Math.min(100, batting.hypeGauge + (res.totalBases ? 16 : 6));
    fielding.hypeGauge = Math.min(100, fielding.hypeGauge + (res.outsAdded > 0 ? 14 : 4));
  }

  const eventType =
    res.outcome === 'walk' || res.outcome === 'strikeout' ? 'pitch_thrown' : 'ball_in_play';

  return makeEvent(state, {
    type: eventType,
    outsBefore,
    batterId,
    pitcherId,
    outcome: res.outcome,
    specialPowerTriggered: res.specialPowerTriggered,
    ballFlight: res.ballFlight,
    fieldingHighlight: res.fieldingHighlight,
    pitchThrown: res.pitchThrown,
    commentary: res.commentary,
    soundCue: res.soundCue,
  });
}

function maybeSwapReliever(state: GameSessionState, events: PlayEvent[]): void {
  const fielding = getFieldingSide(state);
  if (fielding.pitcherFatigue < 82) return;

  const nextRelieverId = fielding.bullpenIds.find(
    (id) => !fielding.usedPitcherIds.includes(id),
  );
  if (!nextRelieverId) return;

  fielding.usedPitcherIds = [...fielding.usedPitcherIds, nextRelieverId];
  fielding.activePitcherId = nextRelieverId;
  fielding.pitcherFatigue = 0;
  state.atBatPitchHistory = [];
  const pitcherLines = getPitcherLines(state);
  pitcherLines[nextRelieverId] = createEmptyPitcherLine(nextRelieverId);

  const reliever = fielding.playersById[nextRelieverId];
  events.push(
    makeEvent(state, {
      type: 'pitching_change',
      outsBefore: state.outs,
      pitcherId: nextRelieverId,
      commentary: `Bullpen call! ${reliever.name} (${reliever.throws}HP) trots in to pitch.`,
      soundCue: 'organ_charge',
    }),
  );
}

/** Manually brings an unused reliever from the bullpen into the active game session. */
export function manualSwapPitcher(
  session: GameSessionState,
  sideKey: 'away' | 'home',
  relieverId: string,
): { nextSession: GameSessionState; event: PlayEvent | null } {
  if (session.status !== 'in_progress') {
    return { nextSession: session, event: null };
  }
  const currentSide = sideKey === 'away' ? session.away : session.home;
  const available =
    currentSide.bullpenIds.includes(relieverId) &&
    !currentSide.usedPitcherIds.includes(relieverId);
  if (!available) {
    return { nextSession: session, event: null };
  }

  const next = cloneSessionForStep(session);
  next.stepCounter = session.stepCounter;
  const targetSide = sideKey === 'away' ? next.away : next.home;
  targetSide.usedPitcherIds = [...targetSide.usedPitcherIds, relieverId];
  targetSide.activePitcherId = relieverId;
  targetSide.pitcherFatigue = 0;
  next.atBatPitchHistory = [];

  const pitcherMap =
    sideKey === 'away' ? next.boxScore.awayPitchers : next.boxScore.homePitchers;
  pitcherMap[relieverId] = createEmptyPitcherLine(relieverId);

  const reliever = targetSide.playersById[relieverId];
  const event = makeEvent(next, {
    type: 'pitching_change',
    outsBefore: next.outs,
    pitcherId: relieverId,
    commentary: `Manager calls the pen — ${reliever.name} (${reliever.throws}HP) takes the mound!`,
    soundCue: 'organ_charge',
  });
  return { nextSession: next, event };
}

function assignPitcherDecisions(state: GameSessionState, winnerClubId: string): void {
  const winningPitchers = Object.values(
    winnerClubId === state.home.clubId ? state.boxScore.homePitchers : state.boxScore.awayPitchers,
  ).filter((line) => line.pitchesThrown > 0 || line.outsRecorded > 0);
  const losingPitchers = Object.values(
    winnerClubId === state.home.clubId ? state.boxScore.awayPitchers : state.boxScore.homePitchers,
  ).filter((line) => line.pitchesThrown > 0 || line.outsRecorded > 0);

  if (winningPitchers.length > 0) {
    const topWinner = [...winningPitchers].sort((a, b) => b.outsRecorded - a.outsRecorded)[0];
    topWinner.decision = 'W';
    const margin = Math.abs(state.away.score - state.home.score);
    const closer = winningPitchers[winningPitchers.length - 1];
    if (margin <= 3 && closer.playerId !== topWinner.playerId) {
      closer.decision = 'SV';
    }
  }
  if (losingPitchers.length > 0) {
    const topLoser = [...losingPitchers].sort((a, b) => b.runsAllowed - a.runsAllowed)[0];
    topLoser.decision = 'L';
  }
}

function completeGame(state: GameSessionState, events: PlayEvent[], reason: string): void {
  const winnerClubId = state.home.score > state.away.score ? state.home.clubId : state.away.clubId;
  state.status = 'completed';
  state.winnerClubId = winnerClubId;
  assignPitcherDecisions(state, winnerClubId);
  events.push(
    makeEvent(state, {
      type: 'game_end',
      outsBefore: state.outs,
      commentary: `${reason} Final: ${state.away.name} ${state.away.score}, ${state.home.name} ${state.home.score}!`,
      soundCue: 'crowd_cheer',
    }),
  );
}

function rotateToNextHalfInning(state: GameSessionState): void {
  state.outs = 0;
  state.balls = 0;
  state.strikes = 0;
  state.atBatPitchHistory = [];

  if (state.half === 'TOP') {
    state.half = 'BOT';
  } else {
    state.half = 'TOP';
    state.inning += 1;
    if (!state.boxScore.inningRuns.some((r) => r.inning === state.inning)) {
      state.boxScore.inningRuns.push({ inning: state.inning, away: 0, home: 0 });
    }
  }

  const batting = getBattingSide(state);
  const prevIdx = (batting.lineupIndex + batting.lineup.length - 1) % batting.lineup.length;
  state.bases = state.inning >= 11 ? [null, batting.lineup[prevIdx].playerId, null] : [null, null, null];
}

function getThreeOutFinishReason(state: GameSessionState): string | null {
  if (state.inning < 9) return null;
  if (state.half === 'TOP' && state.home.score > state.away.score) {
    return `${state.home.city} closes it out!`;
  }
  if (state.half === 'BOT' && state.home.score !== state.away.score) {
    return 'Ballgame over!';
  }
  return null;
}

function advanceHalfOrFinish(state: GameSessionState, events: PlayEvent[]): void {
  if (state.half === 'BOT' && state.inning >= 9 && state.home.score > state.away.score) {
    completeGame(state, events, 'Walk-off victory!');
    return;
  }
  if (state.outs < 3) return;

  const halfLabel = state.half === 'TOP' ? 'top' : 'bottom';
  events.push(
    makeEvent(state, {
      type: 'inning_end',
      outsBefore: state.outs,
      commentary: `End of the ${halfLabel} of inning ${state.inning}.`,
    }),
  );

  const finishReason = getThreeOutFinishReason(state);
  if (finishReason) {
    completeGame(state, events, finishReason);
    return;
  }

  rotateToNextHalfInning(state);
  events.push(
    makeEvent(state, {
      type: 'inning_start',
      outsBefore: 0,
      commentary: `${state.half === 'TOP' ? 'Top' : 'Bottom'} of inning ${state.inning}.`,
    }),
  );
}

function cloneSessionForStep(session: GameSessionState): GameSessionState {
  return {
    ...session,
    stepCounter: session.stepCounter + 1,
    bases: [...session.bases] as BaseState,
    atBatPitchHistory: [...session.atBatPitchHistory],
    away: { ...session.away },
    home: { ...session.home },
    boxScore: cloneBoxScore(session.boxScore),
  };
}

function emitOpeningEventsIfNeeded(state: GameSessionState, events: PlayEvent[]): void {
  if (state.eventSeq !== 0) return;
  events.push(
    makeEvent(state, {
      type: 'game_start',
      outsBefore: 0,
      commentary: `Play ball! ${state.away.city} ${state.away.name} at ${state.home.city} ${state.home.name}!`,
      soundCue: 'organ_charge',
    }),
    makeEvent(state, {
      type: 'inning_start',
      outsBefore: 0,
      commentary: 'Top of inning 1.',
    }),
  );
}

function dispatchPitchResolution(
  next: GameSessionState,
  resolution: PitchResolution,
  batterId: string,
  pitcherId: string,
): PlayEvent {
  if (resolution.kind === 'pitch_event') {
    return applyCountPitch(next, resolution, batterId, pitcherId);
  }
  if (resolution.kind === 'steal_attempt') {
    return applyStealAttempt(next, resolution, batterId, pitcherId);
  }
  return applyPlateComplete(next, resolution, batterId, pitcherId);
}

/** Advances the deterministic baseball simulation by one pitch or tactical action. */
export function stepPitch(
  session: GameSessionState,
  tacticalCall: TacticalCall = 'normal',
  options?: StepPitchOptions,
): { nextSession: GameSessionState; events: PlayEvent[] } {
  if (session.status === 'completed') {
    return { nextSession: session, events: [] };
  }

  const next = cloneSessionForStep(session);
  const events: PlayEvent[] = [];
  emitOpeningEventsIfNeeded(next, events);

  const stepSeed = (next.rngSeed ^ Math.imul(next.stepCounter, 0x9e3779b1)) >>> 0;
  const rng = createSeededRng(stepSeed);
  const batter = getCurrentBatter(next);
  const pitcher = getCurrentPitcher(next);
  const fielding = getFieldingSide(next);
  const batting = getBattingSide(next);
  const firstBaseRunner = next.bases[0] ? batting.playersById[next.bases[0]] : null;

  if (tacticalCall !== 'steal' && tacticalCall !== 'intentional_walk') {
    getPitcherLines(next)[pitcher.id].pitchesThrown += 1;
    fielding.pitcherFatigue = Math.min(100, fielding.pitcherFatigue + 1.45);
  }

  const defenderPos = rng.pick(['SS', '2B', 'CF', 'LF', 'RF'] as const);
  const resolution = resolveSinglePitch({
    rng,
    batter,
    pitcher,
    catcher: getDefenderAtPosition(fielding, 'C'),
    defender: getDefenderAtPosition(fielding, defenderPos),
    defenderPos,
    firstBaseRunner,
    balls: next.balls,
    strikes: next.strikes,
    outs: next.outs,
    bases: next.bases,
    pitcherFatigue: fielding.pitcherFatigue,
    battingHype: batting.hypeGauge,
    fieldingHype: fielding.hypeGauge,
    tacticalCall,
    atBatPitchHistory: next.atBatPitchHistory,
    requestedPitchType: options?.requestedPitchType,
  });

  events.push(dispatchPitchResolution(next, resolution, batter.id, pitcher.id));
  advanceHalfOrFinish(next, events);
  if (next.status === 'in_progress' && next.balls === 0 && next.strikes === 0) {
    maybeSwapReliever(next, events);
  }

  return { nextSession: next, events };
}

/** Advances the simulation until the current plate appearance concludes or inning swaps. */
export function stepAtBat(
  session: GameSessionState,
  tacticalCall: TacticalCall = 'normal',
  options?: StepPitchOptions,
): { nextSession: GameSessionState; events: PlayEvent[] } {
  if (session.status === 'completed') {
    return { nextSession: session, events: [] };
  }

  const startHalf = session.half;
  const startInning = session.inning;
  const startBatterIdx = getBattingSide(session).lineupIndex;
  const events: PlayEvent[] = [];
  let current = session;
  let activeCall = tacticalCall;

  for (let i = 0; i < 20; i += 1) {
    const step = stepPitch(current, activeCall, options);
    current = step.nextSession;
    events.push(...step.events);
    activeCall = activeCall === 'steal' ? 'normal' : activeCall;

    const currentBatterIdx = getBattingSide(current).lineupIndex;
    const paResolved =
      current.status === 'completed' ||
      current.half !== startHalf ||
      current.inning !== startInning ||
      currentBatterIdx !== startBatterIdx;
    if (paResolved) break;
  }

  return { nextSession: current, events };
}

/** Simulates forward until reaching a high-leverage Clutch Moment or game completion. */
export function simUntilClutchOrEnd(
  session: GameSessionState,
): { nextSession: GameSessionState; events: PlayEvent[] } {
  const events: PlayEvent[] = [];
  let current = session;
  for (let i = 0; i < 400 && current.status === 'in_progress'; i += 1) {
    const step = stepAtBat(current);
    current = step.nextSession;
    events.push(...step.events);
    if (current.status === 'completed' || isClutchSituation(current)) break;
  }
  return { nextSession: current, events };
}

function mergeBatterLineToDelta(line: BatterBoxLine): PlayerSeasonStats {
  const stat = createEmptySeasonStats();
  const participated = line.atBats > 0 || line.walks > 0 || line.stolenBases > 0;
  stat.games = participated ? 1 : 0;
  stat.atBats = line.atBats;
  stat.hits = line.hits;
  stat.doubles = line.doubles;
  stat.triples = line.triples;
  stat.homeRuns = line.homeRuns;
  stat.rbis = line.rbis;
  stat.walks = line.walks;
  stat.strikeouts = line.strikeouts;
  stat.stolenBases = line.stolenBases;
  stat.errors = line.errors;
  return stat;
}

function mergePitcherLineToDelta(
  existing: PlayerSeasonStats | undefined,
  line: PitcherBoxLine,
): PlayerSeasonStats {
  const stat = existing ?? createEmptySeasonStats();
  if (line.pitchesThrown > 0 || line.outsRecorded > 0) stat.games = 1;
  stat.inningsPitchedOuts += line.outsRecorded;
  stat.earnedRuns += line.earnedRuns;
  stat.pitchingStrikeouts += line.strikeouts;
  stat.pitchingWalks += line.walks;
  if (line.decision === 'W') stat.wins += 1;
  if (line.decision === 'L') stat.losses += 1;
  if (line.decision === 'SV') stat.saves += 1;
  return stat;
}

export function buildPlayerStatDeltas(box: GameBoxScore): Record<string, PlayerSeasonStats> {
  const deltas: Record<string, PlayerSeasonStats> = {};
  for (const list of [Object.values(box.awayBatters), Object.values(box.homeBatters)]) {
    for (const line of list) {
      deltas[line.playerId] = mergeBatterLineToDelta(line);
    }
  }
  for (const list of [Object.values(box.awayPitchers), Object.values(box.homePitchers)]) {
    for (const line of list) {
      deltas[line.playerId] = mergePitcherLineToDelta(deltas[line.playerId], line);
    }
  }
  return deltas;
}

/** Simulates a complete 9+ inning baseball game deterministically from seed. */
export function simFullGame(
  awayClub: Club,
  homeClub: Club,
  seed: number,
): GameSessionResult {
  let state = createGameSession(awayClub, homeClub, seed);
  const events: PlayEvent[] = [];

  for (let i = 0; i < 1200 && state.status === 'in_progress'; i += 1) {
    const step = stepPitch(state);
    state = step.nextSession;
    events.push(...step.events);
  }

  return {
    finalState: state,
    events,
    awayScore: state.away.score,
    homeScore: state.home.score,
    winnerClubId: state.winnerClubId ?? state.home.clubId,
    boxScore: state.boxScore,
    playerStatDeltas: buildPlayerStatDeltas(state.boxScore),
  };
}

function addStats(base: PlayerSeasonStats, delta: PlayerSeasonStats): PlayerSeasonStats {
  return {
    games: base.games + delta.games,
    atBats: base.atBats + delta.atBats,
    hits: base.hits + delta.hits,
    doubles: base.doubles + delta.doubles,
    triples: base.triples + delta.triples,
    homeRuns: base.homeRuns + delta.homeRuns,
    rbis: base.rbis + delta.rbis,
    walks: base.walks + delta.walks,
    strikeouts: base.strikeouts + delta.strikeouts,
    stolenBases: base.stolenBases + delta.stolenBases,
    inningsPitchedOuts: base.inningsPitchedOuts + delta.inningsPitchedOuts,
    earnedRuns: base.earnedRuns + delta.earnedRuns,
    pitchingStrikeouts: base.pitchingStrikeouts + delta.pitchingStrikeouts,
    pitchingWalks: base.pitchingWalks + delta.pitchingWalks,
    wins: base.wins + delta.wins,
    losses: base.losses + delta.losses,
    saves: base.saves + delta.saves,
    errors: base.errors + delta.errors,
  };
}

/** Applies completed game stat deltas and win/loss streak updates immutably to a club. */
export function applyGameStatDeltasToClub(
  club: Club,
  deltas: Readonly<Record<string, PlayerSeasonStats>>,
  won: boolean,
): Club {
  const nextStreak = won
    ? club.streak > 0
      ? club.streak + 1
      : 1
    : club.streak < 0
      ? club.streak - 1
      : -1;

  return {
    ...club,
    wins: club.wins + (won ? 1 : 0),
    losses: club.losses + (won ? 0 : 1),
    streak: nextStreak,
    rotationCursor: (club.rotationCursor + 1) % Math.max(1, club.rotationIds.length),
    roster: club.roster.map((player) => {
      const delta = deltas[player.id];
      if (!delta) return player;
      return {
        ...player,
        seasonStats: addStats(player.seasonStats, delta),
        careerStats: addStats(player.careerStats, delta),
      };
    }),
  };
}
