import { matchBossClubProfile } from '../league/bossClubs';
import type { Club } from '../models/club';
import { isScoringOrHitOutcome, type PlayEvent } from '../models/playEvent';
import { createEmptySeasonStats, type Player, type PlayerSeasonStats } from '../models/player';
import { getPlayerBuildIdentity } from '../rpg/skillTrees';
import {
  getBattingSide,
  getCurrentBatter,
  type BatterBoxLine,
  type GameSessionState,
  type PitcherBoxLine,
  type TeamGameSide,
} from './gameState';
import { computeBattingSabermetrics, formatRate3 } from './sabermetrics';

export interface BroadcastStatSlipData {
  id: string;
  kind: 'batter_card' | 'pitcher_spotlight' | 'milestone';
  kicker: string;
  title: string;
  statLine: string;
  accentHex: string;
  badgeText?: string;
}

export interface BroadcastStatSlipParams {
  session: GameSessionState;
  lastEvent: PlayEvent | null;
  awayClub: Club;
  homeClub: Club;
}

const STRIKEOUT_MILESTONES: ReadonlySet<number> = new Set([5, 7, 10]);
const CAREER_HIT_MILESTONES: ReadonlySet<number> = new Set([1, 10, 25, 50, 100]);

function lookupPlayer(side: TeamGameSide, club: Club, playerId: string | undefined): Player | null {
  if (!playerId) return null;
  return side.playersById[playerId] ?? club.roster.find((p) => p.id === playerId) ?? null;
}

function formatPlayerTitle(player: Player, posOverride?: string): string {
  return `#${player.jerseyNumber} ${player.name} · ${posOverride ?? player.position}`;
}

function formatTodayBatterBox(line: BatterBoxLine | undefined): string {
  if (!line || line.plateAppearances === 0) return '0-0 · First AB';
  const parts = [`${line.hits}-${line.atBats}`];
  if (line.homeRuns > 0) {
    parts.push(line.homeRuns === 1 ? 'HR' : `${line.homeRuns} HR`);
  }
  if (line.rbis > 0) parts.push(`${line.rbis} RBI`);
  if (line.walks > 0 && line.hits === 0) parts.push(`${line.walks} BB`);
  return parts.join(', ');
}

function boxLineToSeasonStats(line: BatterBoxLine): PlayerSeasonStats {
  return {
    ...createEmptySeasonStats(),
    plateAppearances: line.plateAppearances,
    atBats: line.atBats,
    hits: line.hits,
    doubles: line.doubles,
    triples: line.triples,
    homeRuns: line.homeRuns,
    rbis: line.rbis,
    walks: line.walks,
    strikeouts: line.strikeouts,
    sacFlies: line.sacFlies,
  };
}

function resolveBattingRateStats(player: Player, boxLine: BatterBoxLine | undefined): PlayerSeasonStats {
  if (player.seasonStats.atBats > 0) return player.seasonStats;
  if (player.careerStats.atBats > 0) return player.careerStats;
  if (boxLine && boxLine.atBats > 0) return boxLineToSeasonStats(boxLine);
  return player.seasonStats;
}

function formatBuildIdentityTag(player: Player): string | null {
  const identity = getPlayerBuildIdentity(player);
  if (identity.spentSp <= 0) return null;
  const icon = identity.shortTag.split(' ')[0];
  return `${icon} ${identity.label}`;
}

function formatPitcherTodayLine(line: PitcherBoxLine | undefined): string {
  if (!line) return '0.0 IP, 0 K, 0 ER';
  const ip = `${Math.floor(line.outsRecorded / 3)}.${line.outsRecorded % 3}`;
  return `${ip} IP, ${line.strikeouts} K, ${line.earnedRuns} ER · ${line.pitchesThrown} P`;
}

function resolveEventSides(params: BroadcastStatSlipParams, event: PlayEvent) {
  const top = event.half === 'TOP';
  return {
    battingSide: top ? params.session.away : params.session.home,
    fieldingSide: top ? params.session.home : params.session.away,
    battingClub: top ? params.awayClub : params.homeClub,
    fieldingClub: top ? params.homeClub : params.awayClub,
    batterBox: top ? params.session.boxScore.awayBatters : params.session.boxScore.homeBatters,
    pitcherBox: top ? params.session.boxScore.homePitchers : params.session.boxScore.awayPitchers,
  };
}

function tryRobberyOrWebGemSlip(
  params: BroadcastStatSlipParams,
  event: PlayEvent,
): BroadcastStatSlipData | null {
  const hl = event.fieldingHighlight;
  if (!hl || (!hl.robbedHomeRun && !hl.webGem)) return null;
  const { fieldingSide, fieldingClub } = resolveEventSides(params, event);
  const fielder = lookupPlayer(fieldingSide, fieldingClub, hl.fielderId);
  if (!fielder) return null;

  if (hl.robbedHomeRun) {
    return {
      id: `milestone-robbery-${event.seq}-${fielder.id}`,
      kind: 'milestone',
      kicker: 'HR ROBBED AT THE WALL!',
      title: formatPlayerTitle(fielder, hl.fielderPos),
      statLine: `Leaps at the wall to steal a homer! · ${fieldingClub.name}`,
      accentHex: fieldingClub.colors.primary,
      badgeText: '🧤 ROBBERY',
    };
  }
  return {
    id: `milestone-webgem-${event.seq}-${fielder.id}`,
    kind: 'milestone',
    kicker: 'WEB GEM!',
    title: formatPlayerTitle(fielder, hl.fielderPos),
    statLine: `Diving stop robs a base hit! · ${fieldingClub.name}`,
    accentHex: fieldingClub.colors.primary,
    badgeText: '✨ WEB GEM',
  };
}

function tryHomeRunSlip(
  params: BroadcastStatSlipParams,
  event: PlayEvent,
): BroadcastStatSlipData | null {
  if (event.outcome !== 'home_run') return null;
  const { battingSide, battingClub, batterBox } = resolveEventSides(params, event);
  const batter = lookupPlayer(battingSide, battingClub, event.batterId);
  if (!batter) return null;

  const line = batterBox[batter.id];
  const hrsToday = line?.homeRuns ?? 1;
  const saber = computeBattingSabermetrics(resolveBattingRateStats(batter, line));
  return {
    id: `milestone-hr-${event.seq}-${batter.id}`,
    kind: 'milestone',
    kicker: hrsToday >= 2 ? 'MULTI-HR GAME!' : 'MOONSHOT!',
    title: formatPlayerTitle(batter),
    statLine: `${formatTodayBatterBox(line)} · ${formatRate3(saber.avg)} AVG`,
    accentHex: battingClub.colors.primary,
    badgeText: hrsToday >= 2 ? `💣 ${hrsToday} HR` : '💣 HOME RUN',
  };
}

function tryPickoffSlip(
  params: BroadcastStatSlipParams,
  event: PlayEvent,
): BroadcastStatSlipData | null {
  if (event.outcome !== 'pickoff_out') return null;
  const { fieldingSide, fieldingClub, pitcherBox } = resolveEventSides(params, event);
  const pitcher = lookupPlayer(fieldingSide, fieldingClub, event.pitcherId ?? fieldingSide.activePitcherId);
  if (!pitcher) return null;

  const baseLabel = event.pickoffBase === 2 ? '2B' : '1B';
  return {
    id: `milestone-pickoff-${event.seq}-${pitcher.id}`,
    kind: 'milestone',
    kicker: 'PICKED OFF!',
    title: formatPlayerTitle(pitcher),
    statLine: `Snap throw to ${baseLabel} nails the runner! · ${formatPitcherTodayLine(pitcherBox[pitcher.id])}`,
    accentHex: fieldingClub.colors.primary,
    badgeText: '⚡ PICKOFF',
  };
}

function tryStrikeoutGemSlip(
  params: BroadcastStatSlipParams,
  event: PlayEvent,
): BroadcastStatSlipData | null {
  if (event.outcome !== 'strikeout') return null;
  const { fieldingSide, fieldingClub, pitcherBox } = resolveEventSides(params, event);
  const pitcher = lookupPlayer(fieldingSide, fieldingClub, event.pitcherId ?? fieldingSide.activePitcherId);
  if (!pitcher) return null;

  const line = pitcherBox[pitcher.id];
  const ks = line?.strikeouts ?? 0;
  if (!STRIKEOUT_MILESTONES.has(ks)) return null;

  return {
    id: `milestone-k-${event.seq}-${pitcher.id}-${ks}`,
    kind: 'pitcher_spotlight',
    kicker: `PITCHING GEM: ${ks} Ks TODAY!`,
    title: formatPlayerTitle(pitcher),
    statLine: formatPitcherTodayLine(line),
    accentHex: fieldingClub.colors.primary,
    badgeText: `🔥 ${ks} Ks`,
  };
}

function tryCareerHitMilestoneSlip(
  params: BroadcastStatSlipParams,
  event: PlayEvent,
): BroadcastStatSlipData | null {
  if (!event.outcome || !isScoringOrHitOutcome(event.outcome)) return null;
  const { battingSide, battingClub, batterBox } = resolveEventSides(params, event);
  const batter = lookupPlayer(battingSide, battingClub, event.batterId);
  if (!batter) return null;

  const line = batterBox[batter.id];
  const totalCareerHits = batter.careerStats.hits + (line?.hits ?? 1);
  if (!CAREER_HIT_MILESTONES.has(totalCareerHits)) return null;

  const badgeText = totalCareerHits === 1 ? '⭐ 1ST HIT' : `⭐ ${totalCareerHits}TH HIT`;
  const kicker = totalCareerHits === 1 ? 'FIRST CAREER HIT!' : 'MILESTONE!';
  return {
    id: `milestone-hit-${event.seq}-${batter.id}-${totalCareerHits}`,
    kind: 'milestone',
    kicker,
    title: formatPlayerTitle(batter),
    statLine: `Career Hit #${totalCareerHits} · Today: ${formatTodayBatterBox(line)}`,
    accentHex: battingClub.colors.primary,
    badgeText,
  };
}

function buildPriorityMilestoneSlip(
  params: BroadcastStatSlipParams,
): BroadcastStatSlipData | null {
  const event = params.lastEvent;
  if (!event) return null;
  return (
    tryHomeRunSlip(params, event) ??
    tryRobberyOrWebGemSlip(params, event) ??
    tryPickoffSlip(params, event) ??
    tryStrikeoutGemSlip(params, event) ??
    tryCareerHitMilestoneSlip(params, event)
  );
}

function resolveBatterBadge(batter: Player, isBoss: boolean): string | undefined {
  if (isBoss) return '👑 BOSS';
  if (batter.formState === 'blazing' || batter.formState === 'hot') return '🔥 HOT';
  if (batter.formState === 'cold' || batter.formState === 'frozen') return '🧊 COLD';
  return undefined;
}

function buildBatterStatLine(batter: Player, line: BatterBoxLine | undefined): string {
  const saber = computeBattingSabermetrics(resolveBattingRateStats(batter, line));
  const buildTag = formatBuildIdentityTag(batter);
  const statParts = [
    formatTodayBatterBox(line),
    `${formatRate3(saber.avg)} AVG`,
    `${formatRate3(saber.ops)} OPS`,
  ];
  if (buildTag) statParts.push(buildTag);
  return statParts.join(' · ');
}

function buildNewBatterSlip(params: BroadcastStatSlipParams): BroadcastStatSlipData | null {
  const { session, awayClub, homeClub } = params;
  if (session.status !== 'in_progress' || session.balls !== 0 || session.strikes !== 0) {
    return null;
  }

  const battingSide = getBattingSide(session);
  const isTop = session.half === 'TOP';
  const battingClub = isTop ? awayClub : homeClub;
  const batter = getCurrentBatter(session);
  const slot = battingSide.lineup[battingSide.lineupIndex % battingSide.lineup.length];
  const line = (isTop ? session.boxScore.awayBatters : session.boxScore.homeBatters)[batter.id];
  const boss = matchBossClubProfile(battingClub);

  return {
    id: `batter-${session.inning}-${session.half}-${battingSide.lineupIndex}-${batter.id}`,
    kind: 'batter_card',
    kicker: boss ? 'BOSS SHOWDOWN' : 'AT THE PLATE',
    title: formatPlayerTitle(batter, slot?.defensivePosition ?? batter.position),
    statLine: buildBatterStatLine(batter, line),
    accentHex: boss ? boss.accentHex : battingClub.colors.primary,
    badgeText: resolveBatterBadge(batter, Boolean(boss)),
  };
}

/** Builds a 90s TV broadcast lower-third slip for milestones or new at-bat introductions. */
export function buildBroadcastStatSlip(
  params: BroadcastStatSlipParams,
): BroadcastStatSlipData | null {
  return buildPriorityMilestoneSlip(params) ?? buildNewBatterSlip(params);
}
