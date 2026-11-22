import type { PlayEvent } from '../models/playEvent';
import { isPitcherPosition, type Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { manualSwapPitcher } from './baseballEngine';
import {
  getCurrentLeverage,
  isClutchSituation,
  type BaseState,
  type BatterBoxLine,
  type GameSessionState,
} from './gameState';

export type MoundVisitApproach = 'calm_breath' | 'fire_up_crowd' | 'quick_hook';

export interface DugoutActionResult {
  applied: boolean;
  reason?: string;
  nextSession: GameSessionState;
  event: PlayEvent | null;
}

export interface ArgueCallResult {
  ejected: boolean;
  hypeGained: number;
  headline: string;
  nextSession: GameSessionState;
  event: PlayEvent;
}

function createEmptySubLine(playerId: string): BatterBoxLine {
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
    caughtStealing: 0,
    groundBalls: 0,
    lineDrives: 0,
    flyBalls: 0,
    popUps: 0,
    putouts: 0,
    assists: 0,
    errors: 0,
  };
}

function cloneForDugoutMove(session: GameSessionState): GameSessionState {
  return {
    ...session,
    bases: [...session.bases] as BaseState,
    atBatPitchHistory: [...session.atBatPitchHistory],
    away: { ...session.away, lineup: session.away.lineup.map((s) => ({ ...s })) },
    home: { ...session.home, lineup: session.home.lineup.map((s) => ({ ...s })) },
    boxScore: {
      awayBatters: { ...session.boxScore.awayBatters },
      homeBatters: { ...session.boxScore.homeBatters },
      awayPitchers: { ...session.boxScore.awayPitchers },
      homePitchers: { ...session.boxScore.homePitchers },
      inningRuns: session.boxScore.inningRuns.map((r) => ({ ...r })),
    },
  };
}

function buildDugoutEvent(
  state: GameSessionState,
  commentary: string,
  soundCue: PlayEvent['soundCue'],
  callout: { text: string; color: string },
): PlayEvent {
  state.eventSeq += 1;
  return {
    seq: state.eventSeq,
    type: 'manager_power_used',
    inning: state.inning,
    half: state.half,
    outsBefore: state.outs,
    outsAfter: state.outs,
    balls: state.balls,
    strikes: state.strikes,
    awayScore: state.away.score,
    homeScore: state.home.score,
    basesAfter: [...state.bases] as BaseState,
    isClutchMoment: isClutchSituation(state),
    leverageIndex: getCurrentLeverage(state).leverageIndex,
    commentary,
    soundCue,
    specialPowerTriggered: {
      actor: 'manager',
      powerId: 'dugout_drama',
      calloutText: callout.text,
      vfxColor: callout.color,
    },
  };
}

/** Lists unused position players on the bench eligible to pinch-hit or pinch-run. */
export function getAvailableBenchPlayers(
  session: GameSessionState,
  sideKey: 'away' | 'home',
): Player[] {
  const side = sideKey === 'away' ? session.away : session.home;
  const boxMap =
    sideKey === 'away' ? session.boxScore.awayBatters : session.boxScore.homeBatters;
  const activeIds = new Set<string>([
    ...side.lineup.map((s) => s.playerId),
    ...Object.keys(boxMap),
  ]);
  return Object.values(side.playersById).filter(
    (p) => !isPitcherPosition(p.position) && !activeIds.has(p.id),
  );
}

/** Substitutes a bench hitter into the active batting slot immediately. */
export function applyPinchHitter(
  session: GameSessionState,
  sideKey: 'away' | 'home',
  benchPlayerId: string,
): DugoutActionResult {
  const bench = getAvailableBenchPlayers(session, sideKey);
  const sub = bench.find((p) => p.id === benchPlayerId);
  if (!sub || session.status !== 'in_progress') {
    return { applied: false, reason: 'Selected bench player is unavailable.', nextSession: session, event: null };
  }
  const next = cloneForDugoutMove(session);
  const side = sideKey === 'away' ? next.away : next.home;
  const boxMap = sideKey === 'away' ? next.boxScore.awayBatters : next.boxScore.homeBatters;
  const prevSlot = side.lineup[side.lineupIndex];
  const prevName = side.playersById[prevSlot.playerId]?.name ?? 'Batter';
  side.lineup = side.lineup.map((slot, idx) =>
    idx === side.lineupIndex ? { ...slot, playerId: sub.id } : slot,
  );
  boxMap[sub.id] = createEmptySubLine(sub.id);

  const event = buildDugoutEvent(
    next,
    `Pinch-hit move! ${sub.name} (${sub.bats}) grabs a bat for ${prevName}!`,
    'ui_pop',
    { text: `PINCH HITTER: ${sub.name.toUpperCase()}!`, color: '#FFC300' },
  );
  return { applied: true, nextSession: next, event };
}

const BASE_LABELS = ['1B', '2B', '3B'] as const;

/** Substitutes a fast bench player onto 1B/2B/3B as a Pinch Runner. */
export function applyPinchRunner(
  session: GameSessionState,
  sideKey: 'away' | 'home',
  baseIndex: 0 | 1 | 2,
  benchPlayerId: string,
): DugoutActionResult {
  const runnerId = session.bases[baseIndex];
  const sub = getAvailableBenchPlayers(session, sideKey).find((p) => p.id === benchPlayerId);
  if (!runnerId || !sub || session.status !== 'in_progress') {
    return { applied: false, reason: 'No active runner or bench burner available.', nextSession: session, event: null };
  }

  const next = cloneForDugoutMove(session);
  const side = sideKey === 'away' ? next.away : next.home;
  const boxMap = sideKey === 'away' ? next.boxScore.awayBatters : next.boxScore.homeBatters;
  const prevName = side.playersById[runnerId]?.name ?? 'Runner';
  next.bases[baseIndex] = sub.id;
  side.lineup = side.lineup.map((slot) =>
    slot.playerId === runnerId ? { ...slot, playerId: sub.id } : slot,
  );
  boxMap[sub.id] = createEmptySubLine(sub.id);

  const baseLabel = BASE_LABELS[baseIndex];
  const event = buildDugoutEvent(
    next,
    `Pinch-runner alert at ${baseLabel}! Speedster ${sub.name} (SPD ${sub.ratings.speed}) replaces ${prevName}!`,
    'steal_burst',
    { text: `PINCH RUNNER AT ${baseLabel}!`, color: '#2FB356' },
  );
  return { applied: true, nextSession: next, event };
}

/** Runs a 1-per-game Manager Mound Visit: Calm Breath, Fire Up Crowd, or Quick Hook. */
export function applyMoundVisit(
  session: GameSessionState,
  sideKey: 'away' | 'home',
  approach: MoundVisitApproach,
  relieverId?: string,
): DugoutActionResult {
  if (session.status !== 'in_progress') {
    return { applied: false, reason: 'Game already completed.', nextSession: session, event: null };
  }
  if (approach === 'quick_hook' && relieverId) {
    const swapped = manualSwapPitcher(session, sideKey, relieverId);
    if (!swapped.event) {
      return { applied: false, reason: 'Reliever unavailable for quick hook.', nextSession: session, event: null };
    }
    return { applied: true, nextSession: swapped.nextSession, event: swapped.event };
  }

  const next = cloneForDugoutMove(session);
  const side = sideKey === 'away' ? next.away : next.home;
  const pitcherName = side.playersById[side.activePitcherId]?.name ?? 'Pitcher';

  if (approach === 'calm_breath') {
    side.pitcherFatigue = Math.max(0, side.pitcherFatigue - 14);
    side.hypeGauge = Math.min(100, side.hypeGauge + 10);
    const event = buildDugoutEvent(
      next,
      `Mound Visit! Skipper calms ${pitcherName} down (+14% Endurance, +10 Hype).`,
      'ui_pop',
      { text: 'MOUND VISIT: CALM BREATH!', color: '#4CC3FF' },
    );
    return { applied: true, nextSession: next, event };
  }

  side.pitcherFatigue = Math.min(100, side.pitcherFatigue + 4);
  side.hypeGauge = Math.min(100, side.hypeGauge + 25);
  const event = buildDugoutEvent(
    next,
    `Mound Visit! Skipper pumps up ${pitcherName} and the bleachers (+25 Hype)!`,
    'stadium_stomp_clap',
    { text: 'MOUND VISIT: CROWD ROAR!', color: '#FFC300' },
  );
  return { applied: true, nextSession: next, event };
}

/** Retro 90s "Kick Dirt / Argue the Call!" gamble: 55% Dugout Spark (+35 Hype) vs 45% Funny Ejection! */
export function resolveArgueCallGamble(
  rng: SeededRng,
  session: GameSessionState,
  sideKey: 'away' | 'home',
): ArgueCallResult {
  const next = cloneForDugoutMove(session);
  const side = sideKey === 'away' ? next.away : next.home;
  const ejected = rng.chance(0.45);
  const hypeGained = ejected ? 28 : 35;
  side.hypeGauge = Math.min(100, side.hypeGauge + hypeGained);

  const headline = ejected
    ? 'YOU’RE OUTTA HERE! Skipper kicks dirt on home plate & gets tossed — clubhouse erupts (+28 Hype)!'
    : 'FIRED UP THE DUGOUT! Skipper wins the crowd without getting tossed (+35 Hype)!';

  const event = buildDugoutEvent(
    next,
    headline,
    ejected ? 'ump_strike_call' : 'stadium_stomp_clap',
    ejected
      ? { text: '🚨 SKIPPER EJECTED!!', color: '#E63946' }
      : { text: '🔥 DUGOUT FIRED UP!', color: '#FFC300' },
  );

  return { ejected, hypeGained, headline, nextSession: next, event };
}
