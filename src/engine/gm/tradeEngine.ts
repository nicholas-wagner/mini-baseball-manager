import { scorePlayerForAiArchetype } from '../ai/aiGm';
import {
  MAX_ACTIVE_ROSTER_SIZE,
  MIN_ACTIVE_ROSTER_SIZE,
  type Club,
} from '../models/club';
import type { Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { validateSalaryCapRoom } from './offseasonEngine';

export interface TradeProposal {
  outgoingPlayerIds: readonly string[]; // From Club A -> Club B
  incomingPlayerIds: readonly string[]; // From Club B -> Club A
  cashSweetener?: number; // Positive = Club A pays Club B; Negative = Club B pays Club A
}

export interface TradeEvaluationResult {
  accepted: boolean;
  valueOfferedToAi: number;
  valueRequestedFromAi: number;
  fairnessRatio: number;
  reason: string;
}

function estimateTradeValueForClub(club: Club, player: Player): number {
  const base = scorePlayerForAiArchetype(club.aiArchetype, player);
  const ageFactor = player.age <= 24 ? 1.18 : player.age <= 30 ? 1.05 : player.age <= 34 ? 0.92 : 0.72;
  const tierFactor = player.marketTier === 'all_star' ? 1.25 : player.marketTier === 'rookie' ? 1.12 : 1.0;
  return Math.round(base * ageFactor * tierFactor);
}

function sumPlayersValue(club: Club, roster: readonly Player[], ids: readonly string[]): number {
  const byId = new Map(roster.map((p) => [p.id, p]));
  let total = 0;
  for (const id of ids) {
    const p = byId.get(id);
    if (p) total += estimateTradeValueForClub(club, p);
  }
  return total;
}

/** Evaluates multi-player + cash trade proposals weighing AI GM archetype, age, tier, roster caps & Salary Cap. */
export function evaluateTradeProposal(
  clubA: Club,
  clubB: Club,
  proposal: TradeProposal,
): TradeEvaluationResult {
  const cash = proposal.cashSweetener ?? 0;
  const nextCountA = clubA.roster.length - proposal.outgoingPlayerIds.length + proposal.incomingPlayerIds.length;
  const nextCountB = clubB.roster.length - proposal.incomingPlayerIds.length + proposal.outgoingPlayerIds.length;

  if (nextCountA < MIN_ACTIVE_ROSTER_SIZE || nextCountA > MAX_ACTIVE_ROSTER_SIZE) {
    return {
      accepted: false,
      valueOfferedToAi: 0,
      valueRequestedFromAi: 0,
      fairnessRatio: 0,
      reason: `Trade leaves ${clubA.name} outside legal ${MIN_ACTIVE_ROSTER_SIZE}–${MAX_ACTIVE_ROSTER_SIZE} roster limits.`,
    };
  }
  if (nextCountB < MIN_ACTIVE_ROSTER_SIZE || nextCountB > MAX_ACTIVE_ROSTER_SIZE) {
    return {
      accepted: false,
      valueOfferedToAi: 0,
      valueRequestedFromAi: 0,
      fairnessRatio: 0,
      reason: `Trade leaves ${clubB.name} outside legal ${MIN_ACTIVE_ROSTER_SIZE}–${MAX_ACTIVE_ROSTER_SIZE} roster limits.`,
    };
  }

  const offered = sumPlayersValue(clubB, clubA.roster, proposal.outgoingPlayerIds) + Math.round(cash / 250);
  const requested = sumPlayersValue(clubB, clubB.roster, proposal.incomingPlayerIds);
  const ratio = requested > 0 ? Number((offered / requested).toFixed(3)) : 0;
  const accepted = ratio >= 0.96 && offered > 0 && requested > 0;

  return {
    accepted,
    valueOfferedToAi: offered,
    valueRequestedFromAi: requested,
    fairnessRatio: ratio,
    reason: accepted
      ? `${clubB.name} GM accepts the trade! (Value ratio ${Math.round(ratio * 100)}%)`
      : `${clubB.name} GM declines — package falls short (${Math.round(ratio * 100)}% of asking value).`,
  };
}

/** Executes a fair multi-player trade enforcing cash balance and Salary Cap compliance on both clubs. */
export function executeTradeProposal(
  clubA: Club,
  clubB: Club,
  proposal: TradeProposal,
): { executed: boolean; reason: string; clubA: Club; clubB: Club } {
  const cash = proposal.cashSweetener ?? 0;
  if (cash > 0 && clubA.economy.cash < cash) {
    return { executed: false, reason: 'Insufficient cash for sweetener.', clubA, clubB };
  }
  const evaluation = evaluateTradeProposal(clubA, clubB, proposal);
  if (!evaluation.accepted) {
    return { executed: false, reason: evaluation.reason, clubA, clubB };
  }

  const outSet = new Set(proposal.outgoingPlayerIds);
  const inSet = new Set(proposal.incomingPlayerIds);
  const outgoingPlayers = clubA.roster.filter((p) => outSet.has(p.id));
  const incomingPlayers = clubB.roster.filter((p) => inSet.has(p.id));
  const outSalary = outgoingPlayers.reduce((s, p) => s + p.contract.salaryPerSeason, 0);
  const inSalary = incomingPlayers.reduce((s, p) => s + p.contract.salaryPerSeason, 0);

  const capA = validateSalaryCapRoom(clubA, inSalary, outSalary);
  if (!capA.allowed) {
    return { executed: false, reason: capA.reason ?? 'Exceeds Salary Cap.', clubA, clubB };
  }

  const nextClubA: Club = {
    ...clubA,
    roster: [...clubA.roster.filter((p) => !outSet.has(p.id)), ...incomingPlayers],
    economy: { ...clubA.economy, cash: clubA.economy.cash - cash },
  };
  const nextClubB: Club = {
    ...clubB,
    roster: [...clubB.roster.filter((p) => !inSet.has(p.id)), ...outgoingPlayers],
    economy: { ...clubB.economy, cash: clubB.economy.cash + cash },
  };
  return { executed: true, reason: evaluation.reason, clubA: nextClubA, clubB: nextClubB };
}

/** Generates an incoming Trade Deadline offer from a rival AI GM targeting a positional fit. */
export function generateDeadlineTradeOffer(
  rng: SeededRng,
  humanClub: Club,
  aiClub: Club,
): (TradeProposal & { pitchHeadline: string }) | null {
  if (humanClub.roster.length === 0 || aiClub.roster.length === 0) return null;
  const target = rng.pick(humanClub.roster);
  const rankedAi = [...aiClub.roster].sort(
    (a, b) =>
      Math.abs(estimateTradeValueForClub(aiClub, a) - estimateTradeValueForClub(aiClub, target)) -
      Math.abs(estimateTradeValueForClub(aiClub, b) - estimateTradeValueForClub(aiClub, target)),
  );
  const offeredByAi = rankedAi[0];
  return {
    outgoingPlayerIds: [target.id],
    incomingPlayerIds: [offeredByAi.id],
    cashSweetener: 0,
    pitchHeadline: `${aiClub.city} ${aiClub.name} offers ${offeredByAi.name} (${offeredByAi.position}) for ${target.name} (${target.position})!`,
  };
}
