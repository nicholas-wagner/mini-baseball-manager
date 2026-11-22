import type { Club, LeagueTierId } from '../models/club';
import { evaluateCoEdClubhouseSynergy } from '../rpg/coEdArchetypes';
import { getPromoNightById, type PromoNightId } from './ledger';

export interface AttendanceSimulationInput {
  rivalryAttendanceSurgePct?: number; // 0..0.35 from Rivalry Engine
  promoNightId?: PromoNightId | null;
  districtAttendanceBonusPct?: number; // 0..0.25 from Transit Shuttle / District
}

export interface AttendanceSimulationResult {
  attendance: number;
  capacity: number;
  crowdFillRatio: number; // 0..1 drives 3D chibi stand crowd count & stadium wave!
  ticketFairnessMultiplier: number;
  sellout: boolean;
  fanBuzzSummary: string;
}

export const FAIR_TICKET_PRICE_BY_TIER: Readonly<Record<LeagueTierId, number>> = {
  rookie: 9,
  low_a: 12,
  high_a: 15,
  aa: 19,
  aaa: 25,
  majors: 34,
};

function computeTicketElasticity(ticketPrice: number, tier: LeagueTierId): number {
  const fair = FAIR_TICKET_PRICE_BY_TIER[tier];
  const ratio = ticketPrice / fair;
  if (ratio <= 0.8) return 1.18;
  if (ratio <= 1.05) return 1.04;
  if (ratio <= 1.3) return 0.86;
  if (ratio <= 1.6) return 0.66;
  return 0.42;
}

function computeStarPopularityBoost(club: Club): number {
  if (club.roster.length === 0) return 0;
  const topPop = [...club.roster]
    .sort((a, b) => b.ratings.popularity - a.ratings.popularity)
    .slice(0, 3);
  const avgTopPop = topPop.reduce((sum, p) => sum + p.ratings.popularity, 0) / topPop.length;
  const coEd = evaluateCoEdClubhouseSynergy(club.roster);
  const coEdFanDraw = Math.min(0.06, coEd.femaleCount * 0.008);
  return Math.max(0, (avgTopPop - 50) * 0.004) + coEdFanDraw;
}

/** Simulates live game attendance from Fanbase, Hype, Streak, Popularity, Ticket Fairness, Promos & Rivalries. */
export function simulateGameAttendance(
  club: Club,
  input: AttendanceSimulationInput = {},
): AttendanceSimulationResult {
  const capacity = Math.max(400, club.stadium.capacity);
  const fairMult = computeTicketElasticity(club.economy.ticketPrice, club.leagueTier);
  const hypeMult = 0.72 + (club.economy.teamHype / 100) * 0.52;
  const streakMult = 1 + Math.max(-0.18, Math.min(0.24, club.streak * 0.04));
  const starBoost = 1 + computeStarPopularityBoost(club);
  const promo = input.promoNightId ? getPromoNightById(input.promoNightId) : undefined;
  const promoMult = 1 + (promo?.attendanceBoostPct ?? 0);
  const rivalryMult = 1 + Math.max(0, input.rivalryAttendanceSurgePct ?? 0);
  const districtMult = 1 + Math.max(0, input.districtAttendanceBonusPct ?? 0);

  const rawDemand =
    club.economy.fanBase *
    0.72 *
    fairMult *
    hypeMult *
    streakMult *
    starBoost *
    promoMult *
    rivalryMult *
    districtMult;

  const attendance = Math.max(120, Math.min(capacity, Math.round(rawDemand)));
  const crowdFillRatio = Number((attendance / capacity).toFixed(3));
  const sellout = crowdFillRatio >= 0.96;

  return {
    attendance,
    capacity,
    crowdFillRatio,
    ticketFairnessMultiplier: fairMult,
    sellout,
    fanBuzzSummary: sellout
      ? `PACKED SELLOUT! ${attendance.toLocaleString()} fans rocking the stands!`
      : `${attendance.toLocaleString()} / ${capacity.toLocaleString()} fans (${Math.round(crowdFillRatio * 100)}% full)`,
  };
}
