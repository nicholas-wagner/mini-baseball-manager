import type { Club } from '../models/club';
import type { PlayEvent } from '../models/playEvent';
import {
  computePlayerOverall,
  isPitcherPosition,
  type GameLengthInnings,
  type GamePressureLevel,
  type Player,
} from '../models/player';
import { fatigueToEndurance } from '../rpg/pitcherEndurance';
import { createGameSession, stepPitch } from '../simulation/baseballEngine';
import {
  getBattingSide,
  getCurrentBatter,
  getCurrentLeverage,
  getCurrentPitcher,
  getFieldingSide,
  type BatterBoxLine,
  type GameSessionState,
  type PitcherBoxLine,
} from '../simulation/gameState';
import type { SeriesGameplanId } from './gmSeasonPulse';

export const SERIES_SWEEP_BONUS_CASH = 1_500;

export interface ClutchMomentInput {
  awayClub: Club;
  homeClub: Club;
  seed: number;
  regulationInnings: GameLengthInnings;
  awayGameplan?: SeriesGameplanId;
  homeGameplan?: SeriesGameplanId;
  pressureLevel?: GamePressureLevel;
}

export interface ClutchMomentLaunch {
  session: GameSessionState;
  events: readonly PlayEvent[];
  recapHeadline: string;
}

export interface SeriesStakesSummary {
  wins: number;
  losses: number;
  gamesPlayed: number;
  badgeText: string;
  summaryLine: string;
  isSweepOpportunity: boolean;
  isRubberMatch: boolean;
  sweepBonusCash: number;
}

export interface LiveBroadcastLowerThird {
  batterName: string;
  batterLineText: string;
  onDeckName: string;
  pitcherName: string;
  pitchCount: number;
  endurancePct: number;
  enduranceTone: 'fresh' | 'tiring' | 'gassed';
  pitcherLineText: string;
}

export interface PreGameProbableMatchup {
  humanStarter: Player;
  opponentStarter: Player;
  opponentStarHitter: Player;
  matchupNote: string;
}

function describeScoreStatus(session: GameSessionState): string {
  const humanSide = session.home.isHuman ? session.home : session.away;
  const rivalSide = session.home.isHuman ? session.away : session.home;
  if (humanSide.score === rivalSide.score) {
    return `Tied ${humanSide.score}-${rivalSide.score}`;
  }
  if (humanSide.score > rivalSide.score) {
    return `Leading ${humanSide.score}-${rivalSide.score}`;
  }
  return `Trailing ${humanSide.score}-${rivalSide.score}`;
}

function describeOccupiedBases(session: GameSessionState): string {
  const labels = session.bases
    .map((b, idx) => (b ? `${idx + 1}B` : null))
    .filter((v): v is string => v !== null);
  return labels.length > 0 ? ` • Runners on ${labels.join(' & ')}` : '';
}

function isClutchJumpStop(session: GameSessionState, targetInning: number): boolean {
  if (session.inning >= session.regulationInnings) return true;
  if (session.inning < targetInning) return false;
  const diff = Math.abs(session.away.score - session.home.score);
  const { leverageIndex } = getCurrentLeverage(session);
  return leverageIndex >= 1.3 || diff <= 2;
}

/** Fast-sims early innings and hands control to the manager at the biggest late-inning spot. */
export function createClutchMomentSession(input: ClutchMomentInput): ClutchMomentLaunch {
  const {
    awayClub,
    homeClub,
    seed,
    regulationInnings,
    awayGameplan = 'balanced',
    homeGameplan = 'balanced',
    pressureLevel = 'regular',
  } = input;

  let current = createGameSession(
    awayClub,
    homeClub,
    seed,
    pressureLevel,
    regulationInnings,
    awayGameplan,
    homeGameplan,
  );
  let lastPlayable = current;
  const allEvents: PlayEvent[] = [];
  const targetInning = Math.max(2, regulationInnings - 1);

  for (let i = 0; i < 450; i += 1) {
    if (current.status === 'completed') break;
    if (isClutchJumpStop(current, targetInning)) break;
    const step = stepPitch(current, 'normal');
    if (step.nextSession.status === 'in_progress') {
      lastPlayable = step.nextSession;
    }
    current = step.nextSession;
    allEvents.push(...step.events);
  }

  const finalSession = current.status === 'in_progress' ? current : lastPlayable;
  const scoreText = describeScoreStatus(finalSession);
  const basesText = describeOccupiedBases(finalSession);
  const outsText = `${finalSession.outs} Out${finalSession.outs === 1 ? '' : 's'}`;
  const recapHeadline = `Clutch Jump-In: ${finalSession.half} ${finalSession.inning} (${scoreText} • ${outsText}${basesText}) — Take over!`;

  return {
    session: finalSession,
    events: allEvents.slice(-8),
    recapHeadline,
  };
}

const SERIES_STAKES_TABLE: Readonly<
  Record<
    string,
    {
      badgeText: string;
      summaryLine: string;
      isSweepOpportunity?: boolean;
      isRubberMatch?: boolean;
      sweepBonusCash?: number;
    }
  >
> = {
  '0-0': {
    badgeText: 'Series Opener (0-0)',
    summaryLine: 'Game 1 of 3 — set the tone early!',
  },
  '3-0': {
    badgeText: '🧹 3-0 SWEEP!',
    summaryLine: `Dominant 3-0 series sweep (+$${SERIES_SWEEP_BONUS_CASH.toLocaleString()} bonus)!`,
    sweepBonusCash: SERIES_SWEEP_BONUS_CASH,
  },
  '2-0': {
    badgeText: '🧹 SWEEP CHANCE (2-0)',
    summaryLine: `Win Game 3 for a 3-0 Sweep (+$${SERIES_SWEEP_BONUS_CASH.toLocaleString()} Cash & Foil Pack)!`,
    isSweepOpportunity: true,
    sweepBonusCash: SERIES_SWEEP_BONUS_CASH,
  },
  '1-1': {
    badgeText: '🔥 RUBBER MATCH (1-1)',
    summaryLine: 'Winner of Game 3 takes the series!',
    isRubberMatch: true,
  },
  '0-2': {
    badgeText: '💪 SALVAGE FINALE (0-2)',
    summaryLine: 'Avoid the sweep and steal a crucial win in Game 3!',
  },
};

/** Computes live 3-game series drama labels & 3-0 sweep rewards. */
export function evaluateSeriesStakes(wins: number, losses: number): SeriesStakesSummary {
  const gamesPlayed = wins + losses;
  const preset = SERIES_STAKES_TABLE[`${wins}-${losses}`];
  if (preset) {
    return {
      wins,
      losses,
      gamesPlayed,
      badgeText: preset.badgeText,
      summaryLine: preset.summaryLine,
      isSweepOpportunity: preset.isSweepOpportunity ?? false,
      isRubberMatch: preset.isRubberMatch ?? false,
      sweepBonusCash: preset.sweepBonusCash ?? 0,
    };
  }
  const leading = wins > losses;
  const badgeText =
    gamesPlayed >= 3
      ? `${leading ? 'W' : 'L'} ${wins}-${losses}`
      : `${leading ? 'Series Lead' : 'Series Trail'} ${wins}-${losses}`;
  return {
    wins,
    losses,
    gamesPlayed,
    badgeText,
    summaryLine: leading
      ? 'Take Game 2 to clinch the series!'
      : 'Win Game 2 to force a Rubber Match!',
    isSweepOpportunity: false,
    isRubberMatch: false,
    sweepBonusCash: 0,
  };
}

function formatBatterBroadcastLine(line: BatterBoxLine | undefined): string {
  if (!line || line.plateAppearances === 0) return '0-0 (1st AB)';
  const parts = [`${line.hits}-${line.atBats}`];
  if (line.homeRuns > 0) parts.push(`${line.homeRuns} HR`);
  if (line.rbis > 0) parts.push(`${line.rbis} RBI`);
  if (line.walks > 0) parts.push(`${line.walks} BB`);
  return parts.join(', ');
}

function formatPitcherBroadcastStats(line: PitcherBoxLine | undefined): {
  pitchCount: number;
  pitcherLineText: string;
} {
  if (!line) return { pitchCount: 0, pitcherLineText: '0.0 IP, 0 K, 0 ER' };
  const ip = `${Math.floor(line.outsRecorded / 3)}.${line.outsRecorded % 3}`;
  return {
    pitchCount: line.pitchesThrown,
    pitcherLineText: `${ip} IP, ${line.strikeouts} K, ${line.earnedRuns} ER`,
  };
}

function resolveEnduranceTone(endurancePct: number): 'fresh' | 'tiring' | 'gassed' {
  if (endurancePct <= 35) return 'gassed';
  if (endurancePct <= 65) return 'tiring';
  return 'fresh';
}

/** Projects live TV broadcast lower-third: batter line, on-deck hitter, pitch count & endurance. */
export function buildLiveBroadcastLowerThird(session: GameSessionState): LiveBroadcastLowerThird {
  const battingSide = getBattingSide(session);
  const fieldingSide = getFieldingSide(session);
  const batter = getCurrentBatter(session);
  const pitcher = getCurrentPitcher(session);
  const onDeckSlot = battingSide.lineup[(battingSide.lineupIndex + 1) % battingSide.lineup.length];
  const onDeckName = battingSide.playersById[onDeckSlot.playerId].name;

  const batterBox =
    session.half === 'TOP' ? session.boxScore.awayBatters : session.boxScore.homeBatters;
  const pitcherBox =
    session.half === 'TOP' ? session.boxScore.homePitchers : session.boxScore.awayPitchers;
  const pitcherStats = formatPitcherBroadcastStats(pitcherBox[pitcher.id]);
  const endurancePct = fatigueToEndurance(fieldingSide.pitcherFatigue);

  return {
    batterName: batter.name,
    batterLineText: formatBatterBroadcastLine(batterBox[batter.id]),
    onDeckName,
    pitcherName: pitcher.name,
    pitchCount: pitcherStats.pitchCount,
    endurancePct,
    enduranceTone: resolveEnduranceTone(endurancePct),
    pitcherLineText: pitcherStats.pitcherLineText,
  };
}

function getScheduledStarter(club: Club): Player {
  const starterId =
    club.rotationIds[club.rotationCursor % Math.max(1, club.rotationIds.length)];
  return (
    club.roster.find((p) => p.id === starterId) ??
    club.roster.find((p) => isPitcherPosition(p.position)) ??
    club.roster[0]
  );
}

function getTopHitter(club: Club): Player {
  const hitters = club.roster.filter((p) => !isPitcherPosition(p.position));
  const pool = hitters.length > 0 ? hitters : club.roster;
  return [...pool].sort((a, b) => computePlayerOverall(b) - computePlayerOverall(a))[0];
}

/** Projects today's probable pitching matchup and rival star slugger for pre-game scouting. */
export function buildPreGameProbableMatchup(
  humanClub: Club,
  opponentClub: Club,
): PreGameProbableMatchup {
  const humanStarter = getScheduledStarter(humanClub);
  const opponentStarter = getScheduledStarter(opponentClub);
  const opponentStarHitter = getTopHitter(opponentClub);
  const oppOvr = computePlayerOverall(opponentStarter);
  const hand = `${opponentStarter.throws}HP`;
  const matchupNote =
    oppOvr >= 74
      ? `Tough ${hand} ace (${oppOvr} OVR) on the mound — inspect their card to pick your best Gameplan!`
      : `Facing ${hand} starter (${oppOvr} OVR) and slugger ${opponentStarHitter.name} — tap any card to scout!`;

  return {
    humanStarter,
    opponentStarter,
    opponentStarHitter,
    matchupNote,
  };
}
