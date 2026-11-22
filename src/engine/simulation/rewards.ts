import type { Club } from '../models/club';
import type { ManagerProfile } from '../models/manager';
import { isPitcherPosition, type Player, type PlayerSeasonStats } from '../models/player';
import {
  updateCareerServiceAfterGame,
  xpRequiredForNextLevel,
} from '../rpg/careerExperience';
import { computeRosterPopularityAttendanceMultiplier } from '../rpg/coEdArchetypes';
import { updatePlayerFormAfterGame } from '../rpg/formTracker';
import { evaluateClubhouseMentalAura } from '../rpg/mentalAndLeverage';
import { computePostGamePitcherRecovery } from '../rpg/pitcherEndurance';
import { evolveSpecialistArchetype } from '../rpg/specialistsAndPositions';
import { enforceRatingBudget } from '../rpg/trainingCompromises';
import { applyGameStatDeltasToClub } from './baseballEngine';
import type {
  BatterBoxLine,
  GameSessionResult,
  PitcherBoxLine,
} from './gameState';

export interface GameMvpSelection {
  clubId: string;
  playerId: string;
  playerName: string;
  impactScore: number;
  summary: string;
}

export interface PostGameRewards {
  attendance: number;
  cashDelta: number;
  managerXp: number;
  hypeDelta: number;
  fanDelta: number;
  playerXpById: Record<string, number>;
}

function scoreBatterLine(line: BatterBoxLine, won: boolean): number {
  const base =
    line.hits * 3 +
    line.doubles * 2 +
    line.triples * 4 +
    line.homeRuns * 7 +
    line.rbis * 2 +
    line.runs +
    line.walks +
    line.stolenBases -
    line.strikeouts * 0.5;
  return base + (won ? 3 : 0);
}

function formatBatterSummary(line: BatterBoxLine): string {
  const parts = [`${line.hits}-for-${line.atBats}`];
  if (line.homeRuns > 0) parts.push(`${line.homeRuns} HR`);
  if (line.rbis > 0) parts.push(`${line.rbis} RBI`);
  if (line.walks > 0 && line.hits === 0) parts.push(`${line.walks} BB`);
  return parts.join(', ');
}

function scorePitcherLine(line: PitcherBoxLine, won: boolean): number {
  const decBonus = line.decision === 'W' ? 8 : line.decision === 'SV' ? 6 : 0;
  return (
    line.outsRecorded * 1.5 +
    line.strikeouts * 2 +
    decBonus -
    line.earnedRuns * 3 -
    line.walks * 0.5 +
    (won ? 2 : 0)
  );
}

function formatPitcherSummary(line: PitcherBoxLine): string {
  const fullInnings = Math.floor(line.outsRecorded / 3);
  const partialOuts = line.outsRecorded % 3;
  const parts = [`${fullInnings}.${partialOuts} IP`, `${line.strikeouts} K`];
  if (line.decision) parts.push(line.decision);
  return parts.join(', ');
}

interface ScoredCandidate {
  clubId: string;
  playerId: string;
  impactScore: number;
  summary: string;
}

function evaluateSideCandidates(
  club: Club,
  batters: Readonly<Record<string, BatterBoxLine>>,
  pitchers: Readonly<Record<string, PitcherBoxLine>>,
  won: boolean,
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];
  for (const line of Object.values(batters)) {
    candidates.push({
      clubId: club.id,
      playerId: line.playerId,
      impactScore: Math.round(scoreBatterLine(line, won)),
      summary: formatBatterSummary(line),
    });
  }
  for (const line of Object.values(pitchers)) {
    if (line.pitchesThrown === 0 && line.outsRecorded === 0) continue;
    candidates.push({
      clubId: club.id,
      playerId: line.playerId,
      impactScore: Math.round(scorePitcherLine(line, won)),
      summary: formatPitcherSummary(line),
    });
  }
  return candidates;
}

/** Picks the highest-impact performer from a completed baseball game. */
export function selectGameMvp(
  result: GameSessionResult,
  awayClub: Club,
  homeClub: Club,
): GameMvpSelection {
  const awayWon = result.winnerClubId === awayClub.id;
  const homeWon = result.winnerClubId === homeClub.id;
  const candidates = [
    ...evaluateSideCandidates(awayClub, result.boxScore.awayBatters, result.boxScore.awayPitchers, awayWon),
    ...evaluateSideCandidates(homeClub, result.boxScore.homeBatters, result.boxScore.homePitchers, homeWon),
  ];

  candidates.sort((a, b) => b.impactScore - a.impactScore);
  const winner = candidates[0];
  const pool = winner.clubId === awayClub.id ? awayClub.roster : homeClub.roster;
  const player = pool.find((p) => p.id === winner.playerId) ?? pool[0];

  return {
    clubId: winner.clubId,
    playerId: player.id,
    playerName: player.name,
    impactScore: Math.max(1, winner.impactScore),
    summary: winner.summary,
  };
}

function computePlayerXpGain(delta: PlayerSeasonStats | undefined): number {
  if (!delta || delta.games === 0) return 5;
  return Math.max(
    12,
    15 +
      delta.hits * 6 +
      delta.homeRuns * 12 +
      delta.rbis * 4 +
      delta.pitchingStrikeouts * 5 +
      delta.wins * 15,
  );
}

/** Computes attendance, gate cash, manager XP, hype/fan shifts, and roster XP awards. */
export function calculatePostGameRewards(
  club: Club,
  result: GameSessionResult,
  isHomeGame: boolean,
  won: boolean,
): PostGameRewards {
  const hypeFactor = 0.55 + club.economy.teamHype / 100;
  const popMultiplier = computeRosterPopularityAttendanceMultiplier(club.roster);
  const attendance = Math.min(
    club.stadium.capacity,
    Math.max(
      120,
      Math.round(club.economy.fanBase * hypeFactor * popMultiplier * (isHomeGame ? 1.0 : 0.65)),
    ),
  );
  const gateShare = isHomeGame ? 0.65 : 0.25;
  const gateRevenue = Math.round(attendance * club.economy.ticketPrice * gateShare);
  const winBonus = won ? 1800 : 400;

  const playerXpById: Record<string, number> = {};
  for (const player of club.roster) {
    const baseXp = computePlayerXpGain(result.playerStatDeltas[player.id]);
    playerXpById[player.id] = Math.max(2, Math.round(baseXp * player.xpGrowthMultiplier));
  }

  return {
    attendance,
    cashDelta: gateRevenue + winBonus,
    managerXp: won ? 45 : 22,
    hypeDelta: won ? 6 : -3,
    fanDelta: won ? Math.round(attendance * 0.04) : Math.round(attendance * 0.01),
    playerXpById,
  };
}

function nudgeRatingsWithinCaps(player: Player): Player['ratings'] {
  const r = player.ratings;
  const c = player.statCaps;
  const bumped = isPitcherPosition(player.position)
    ? {
        ...r,
        velocity: Math.min(c.velocity, r.velocity + 1),
        movement: Math.min(c.movement, r.movement + 1),
        control: Math.min(c.control, r.control + 1),
      }
    : {
        ...r,
        contact: Math.min(c.contact, r.contact + 1),
        power: Math.min(c.power, r.power + 1),
        fielding: Math.min(c.fielding, r.fielding + 1),
      };
  return enforceRatingBudget(bumped, player.position, player.totalRatingBudget);
}

export function applyPlayerXpAndLevelUps(player: Player, gainedXp: number): Player {
  let level = player.level;
  let xp = player.xp + gainedXp;
  let skillPoints = player.skillPoints;
  let nextRatings = player.ratings;

  while (xp >= xpRequiredForNextLevel(level)) {
    xp -= xpRequiredForNextLevel(level);
    level += 1;
    skillPoints += 1;
    nextRatings = nudgeRatingsWithinCaps({ ...player, ratings: nextRatings });
  }

  return {
    ...player,
    level,
    xp,
    skillPoints,
    ratings: nextRatings,
    specialistArchetype: evolveSpecialistArchetype({
      position: player.position,
      specialistArchetype: player.specialistArchetype,
      ratings: nextRatings,
    }),
  };
}

export function applyManagerXpAndLevelUp(
  manager: ManagerProfile,
  gainedXp: number,
  won: boolean,
): ManagerProfile {
  let level = manager.level;
  let xp = manager.xp + gainedXp;
  let skillPoints = manager.skillPoints;

  while (xp >= level * 120) {
    xp -= level * 120;
    level += 1;
    skillPoints += 1;
  }

  return {
    ...manager,
    level,
    xp,
    skillPoints,
    wins: manager.wins + (won ? 1 : 0),
    losses: manager.losses + (won ? 0 : 1),
  };
}

/** Applies post-game stat deltas, XP/level-ups, cash, hype, and manager record immutably. */
export function applyPostGameProgression(
  club: Club,
  manager: ManagerProfile,
  rewards: PostGameRewards,
  statDeltas: Readonly<Record<string, PlayerSeasonStats>>,
  won: boolean,
): { club: Club; manager: ManagerProfile } {
  const clubWithStats = applyGameStatDeltasToClub(club, statDeltas, won);
  const aura = evaluateClubhouseMentalAura(clubWithStats.roster);
  const moraleShift = (won ? 4 : -4) + aura.moraleRecoveryBonus;
  const updatedRoster = clubWithStats.roster.map((player) => {
    const delta = statDeltas[player.id];
    const withXp = applyPlayerXpAndLevelUps(player, rewards.playerXpById[player.id] ?? 0);
    const withForm = updatePlayerFormAfterGame(withXp, delta);
    const pitched = Boolean(delta && (delta.pitchesThrown > 0 || delta.inningsPitchedOuts > 0));
    const nextFatigue = isPitcherPosition(player.position)
      ? computePostGamePitcherRecovery(
          pitched ? Math.min(100, withForm.fatigue + Math.round((delta?.pitchesThrown ?? 25) * 0.9)) : withForm.fatigue,
          pitched,
        )
      : Math.max(0, withForm.fatigue - 25);
    return {
      ...withForm,
      careerService: updateCareerServiceAfterGame(withForm.careerService, withForm.careerStats, false),
      fatigue: nextFatigue,
      morale: Math.max(20, Math.min(100, withForm.morale + moraleShift)),
    };
  });

  return {
    club: {
      ...clubWithStats,
      roster: updatedRoster,
      economy: {
        ...clubWithStats.economy,
        cash: Math.max(0, clubWithStats.economy.cash + rewards.cashDelta),
        fanBase: Math.max(100, clubWithStats.economy.fanBase + rewards.fanDelta),
        teamHype: Math.max(0, Math.min(100, clubWithStats.economy.teamHype + rewards.hypeDelta)),
      },
    },
    manager: applyManagerXpAndLevelUp(manager, rewards.managerXp, won),
  };
}
