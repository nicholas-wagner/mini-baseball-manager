import type { ThrowsHand } from '../handedness/types';
import {
  computeTierStandings,
  type HumanSeriesGameLog,
} from '../league/seasonEngine';
import type { Club, DefensiveLineupPosition, LineupSlot } from '../models/club';
import {
  isPitcherPosition,
  type FormState,
  type Player,
} from '../models/player';
import { evaluatePositionAssignment } from '../rpg/specialistsAndPositions';
import type { PlayerLevelUpEvent } from './managerActionInbox';
import { buildOptimalLineup, validateLineup } from './rosterFactory';

export interface SeriesRecapGameLine {
  gameNumber: number;
  label: string;
  won: boolean;
}

export interface SeriesMvpSummary {
  playerId: string;
  playerName: string;
  position: Player['position'];
  tagLine: string;
}

export interface SeriesRecapReport {
  seriesNumber: number;
  opponentName: string;
  isHome: boolean;
  wins: number;
  losses: number;
  headline: string;
  gameLines: readonly SeriesRecapGameLine[];
  seriesMvp: SeriesMvpSummary;
  cashEarned: number;
  sweepBonusAwarded: boolean;
  levelUps: readonly PlayerLevelUpEvent[];
  standingsShiftText: string;
}

export interface BuildSeriesRecapInput {
  seriesNumber: number;
  prevHumanClub: Club;
  postHumanClub: Club;
  opponentClub: Club;
  prevTierClubs: readonly Club[];
  postTierClubs: readonly Club[];
  humanGames: readonly HumanSeriesGameLog[];
  cashEarned: number;
  sweepBonusAwarded?: boolean;
  levelUps: readonly PlayerLevelUpEvent[];
}

export interface PreGameLineupCheck {
  needsAttention: boolean;
  badgeText: string;
  tips: readonly string[];
  starterThrows: ThrowsHand;
}

type NonDhDefensivePos = Exclude<DefensiveLineupPosition, 'DH'>;
const DEFENSIVE_SLOTS: readonly NonDhDefensivePos[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

const FORM_BONUS_MAP: Readonly<Record<FormState, number>> = {
  blazing: 9,
  hot: 5,
  neutral: 0,
  cold: -6,
  frozen: -10,
};

function buildRecapHeadline(
  clubName: string,
  opponentName: string,
  wins: number,
  losses: number,
  isHome: boolean,
): string {
  const prep = isHome ? 'vs' : '@';
  if (wins >= 3 && losses === 0) {
    return `🧹 SANDLOT SWEEP! ${clubName} Take All 3 ${prep} ${opponentName}!`;
  }
  if (wins > losses) {
    return `🏆 SERIES WIN (${wins}-${losses})! ${clubName} Top ${opponentName}`;
  }
  if (wins === 0 && losses >= 3) {
    return `📰 SWEPT (${wins}-${losses}) ${prep} ${opponentName} — Time to Regroup!`;
  }
  return `📰 TOUGH SERIES (${wins}-${losses}) ${prep} ${opponentName}`;
}

function statDelta(after: number, before: number): number {
  return Math.max(0, after - before);
}

function scorePitcherSeriesDelta(
  p0: Player['seasonStats'],
  p1: Player['seasonStats'],
): { score: number; tagLine: string } {
  const dOuts = statDelta(p1.inningsPitchedOuts, p0.inningsPitchedOuts);
  const dK = statDelta(p1.pitchingStrikeouts, p0.pitchingStrikeouts);
  const dEr = statDelta(p1.earnedRuns, p0.earnedRuns);
  const ip = `${Math.floor(dOuts / 3)}.${dOuts % 3}`;
  return {
    score: dOuts * 1.6 + dK * 3.2 - dEr * 2.5,
    tagLine: `${ip} IP • ${dK} K • ${dEr} ER`,
  };
}

function scoreBatterSeriesDelta(
  p0: Player['seasonStats'],
  p1: Player['seasonStats'],
): { score: number; tagLine: string } {
  const dHits = statDelta(p1.hits, p0.hits);
  const dHr = statDelta(p1.homeRuns, p0.homeRuns);
  const dRbi = statDelta(p1.rbis, p0.rbis);
  const dSb = statDelta(p1.stolenBases, p0.stolenBases);
  const parts = [`${dHits} H`];
  if (dHr > 0) parts.push(`${dHr} HR`);
  if (dRbi > 0) parts.push(`${dRbi} RBI`);
  if (dSb > 0) parts.push(`${dSb} SB`);
  return {
    score: dHits * 3 + dHr * 7 + dRbi * 2.5 + dSb * 2,
    tagLine: parts.join(' • '),
  };
}

function scorePlayerSeriesDelta(prev: Player | undefined, post: Player): { score: number; tagLine: string } {
  const p0 = prev?.seasonStats ?? post.seasonStats;
  return isPitcherPosition(post.position)
    ? scorePitcherSeriesDelta(p0, post.seasonStats)
    : scoreBatterSeriesDelta(p0, post.seasonStats);
}

function pickSeriesMvp(prevClub: Club, postClub: Club): SeriesMvpSummary {
  const prevById = new Map(prevClub.roster.map((p) => [p.id, p]));
  let bestPlayer = postClub.roster[0];
  let bestScore = -999;
  let bestTag = 'Clubhouse Leader';

  for (const player of postClub.roster) {
    const res = scorePlayerSeriesDelta(prevById.get(player.id), player);
    if (res.score > bestScore) {
      bestScore = res.score;
      bestPlayer = player;
      bestTag = res.tagLine;
    }
  }
  return {
    playerId: bestPlayer.id,
    playerName: bestPlayer.name,
    position: bestPlayer.position,
    tagLine: bestTag,
  };
}

function buildStandingsShiftText(
  prevTierClubs: readonly Club[],
  postTierClubs: readonly Club[],
  humanClubId: string,
): string {
  const prevRow = computeTierStandings(prevTierClubs).find((r) => r.clubId === humanClubId);
  const postRow = computeTierStandings(postTierClubs).find((r) => r.clubId === humanClubId);
  if (!postRow) return 'Standings Updated';
  const gbText = postRow.gamesBack === 0 ? '1st Place!' : `${postRow.gamesBack.toFixed(1)} GB`;
  if (prevRow && postRow.rank < prevRow.rank) {
    return `📈 Climbed to #${postRow.rank} (${gbText})`;
  }
  if (prevRow && postRow.rank > prevRow.rank) {
    return `📉 Slipped to #${postRow.rank} (${gbText})`;
  }
  return postRow.rank === 1 ? '🏆 Holding #1 in the League!' : `Standing #${postRow.rank} (${gbText})`;
}

/** Builds a retro 90s Sports-Page Series Recap card after completing or simming a 3-game series. */
export function buildSeriesRecapReport(input: BuildSeriesRecapInput): SeriesRecapReport {
  const {
    seriesNumber,
    prevHumanClub,
    postHumanClub,
    opponentClub,
    prevTierClubs,
    postTierClubs,
    humanGames,
    cashEarned,
    sweepBonusAwarded = false,
    levelUps,
  } = input;

  const wins = humanGames.filter((g) => g.won).length;
  const losses = humanGames.length - wins;
  const isHome = humanGames[0]?.isHome ?? true;
  const opponentName = `${opponentClub.city} ${opponentClub.name}`;
  const gameLines: SeriesRecapGameLine[] = humanGames.map((g) => ({
    gameNumber: g.gameNumber,
    label: `G${g.gameNumber}: ${g.won ? 'W' : 'L'} ${g.humanScore}-${g.opponentScore}`,
    won: g.won,
  }));

  return {
    seriesNumber,
    opponentName,
    isHome,
    wins,
    losses,
    headline: buildRecapHeadline(postHumanClub.name, opponentClub.name, wins, losses, isHome),
    gameLines,
    seriesMvp: pickSeriesMvp(prevHumanClub, postHumanClub),
    cashEarned,
    sweepBonusAwarded,
    levelUps,
    standingsShiftText: buildStandingsShiftText(prevTierClubs, postTierClubs, postHumanClub.id),
  };
}

function getPlatoonBonus(bats: Player['bats'], starterThrows: ThrowsHand): number {
  if (bats === 'S') return 4;
  return bats !== starterThrows ? 7 : -3;
}

function scoreHitterForStarter(player: Player, starterThrows: ThrowsHand): number {
  const { contact, power, eye, speed } = player.ratings;
  const base = contact * 0.36 + power * 0.32 + eye * 0.18 + speed * 0.14;
  return base + getPlatoonBonus(player.bats, starterThrows) + FORM_BONUS_MAP[player.formState] - player.fatigue * 0.12;
}

/** Audits the active lineup against today's probable starter for cold hitters, OOP spots, and platoon edges. */
export function evaluatePreGameLineupCheck(
  humanClub: Club,
  opponentStarter: Player,
): PreGameLineupCheck {
  const byId = new Map(humanClub.roster.map((p) => [p.id, p]));
  const starterThrows = opponentStarter.throws;
  const tips: string[] = [];

  let oopCount = 0;
  let sameHandCount = 0;
  let coldTopCount = 0;

  humanClub.lineup.forEach((slot, idx) => {
    const player = byId.get(slot.playerId);
    if (!player) return;
    if (evaluatePositionAssignment(player, slot.defensivePosition).isOutOfPosition) {
      oopCount += 1;
    }
    if (idx < 5 && (player.formState === 'cold' || player.formState === 'frozen')) {
      coldTopCount += 1;
    }
    if (player.bats === starterThrows) {
      sameHandCount += 1;
    }
  });

  if (oopCount > 0) tips.push(`${oopCount} out-of-position defender${oopCount > 1 ? 's' : ''}`);
  if (coldTopCount > 0) tips.push(`${coldTopCount} cold bat${coldTopCount > 1 ? 's' : ''} in top 5`);
  if (sameHandCount >= 5) tips.push(`${sameHandCount} same-hand bats vs ${starterThrows}HP`);

  return {
    needsAttention: tips.length > 0,
    badgeText:
      tips.length > 0
        ? `⚠️ ${tips.length} Lineup Tip${tips.length > 1 ? 's' : ''} vs ${starterThrows}HP`
        : `✅ Lineup Sharp vs ${starterThrows}HP`,
    tips,
    starterThrows,
  };
}

function pickBestSlotCandidate(
  pool: readonly Player[],
  usedIds: ReadonlySet<string>,
  pos: NonDhDefensivePos,
  starterThrows: ThrowsHand,
): Player | null {
  let best: Player | null = null;
  let bestScore = -9999;
  for (const player of pool) {
    if (usedIds.has(player.id)) continue;
    const posEval = evaluatePositionAssignment(player, pos);
    const posAdj = posEval.isOutOfPosition ? -26 : posEval.isFavorite ? 6 : 0;
    const score = scoreHitterForStarter(player, starterThrows) + posAdj;
    if (score > bestScore) {
      bestScore = score;
      best = player;
    }
  }
  return best;
}

/** Auto-tunes a legal 9-man batting order maximizing platoon & hot-form matchups against starterThrows. */
export function autoTuneLineupForStarter(
  club: Club,
  starterThrows: ThrowsHand,
): { lineup: LineupSlot[]; summary: string } {
  const hitters = club.roster.filter((p) => !isPitcherPosition(p.position));
  const usedIds = new Set<string>();
  const assigned: { player: Player; pos: DefensiveLineupPosition }[] = [];

  for (const pos of DEFENSIVE_SLOTS) {
    const pick = pickBestSlotCandidate(hitters, usedIds, pos, starterThrows);
    if (pick) {
      usedIds.add(pick.id);
      assigned.push({ player: pick, pos });
    }
  }
  const dhPick = hitters
    .filter((p) => !usedIds.has(p.id))
    .sort((a, b) => scoreHitterForStarter(b, starterThrows) - scoreHitterForStarter(a, starterThrows))[0];
  if (dhPick) {
    usedIds.add(dhPick.id);
    assigned.push({ player: dhPick, pos: 'DH' });
  }

  const ordered = [...assigned].sort(
    (a, b) => scoreHitterForStarter(b.player, starterThrows) - scoreHitterForStarter(a.player, starterThrows),
  );
  const candidateLineup: LineupSlot[] = ordered.map((item, idx) => ({
    orderIndex: idx,
    playerId: item.player.id,
    defensivePosition: item.pos,
  }));

  const legal = validateLineup({ ...club, lineup: candidateLineup }).valid
    ? candidateLineup
    : buildOptimalLineup(club.roster);

  return {
    lineup: legal,
    summary: `Lineup auto-tuned vs ${starterThrows}HP (hot bats & platoon edges prioritized)!`,
  };
}
