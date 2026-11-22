import type { Club, LeagueTierId } from '../models/club';
import { computePlayerOverall, type Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import {
  generateMarketPool,
  validateRosterAddition,
  validateRosterRelease,
} from './marketTiers';
import { validateSalaryCapRoom } from './offseasonEngine';

export interface FreeAgentListing {
  player: Player;
  askingSalary: number;
  askingYears: number;
  highestRivalBid: number;
  highestRivalClubName: string | null;
}

export interface ContractOffer {
  salaryPerSeason: number;
  years: number;
  signingBonus: number;
}

export interface OfferEvaluation {
  accepted: boolean;
  score: number;
  threshold: number;
  reason: string;
}

/** Generates a Free Agency market with live competing rival club bids for bidding-war drama. */
export function generateFreeAgencyMarket(
  rng: SeededRng,
  tier: LeagueTierId,
  rivalClubs: readonly Club[],
  count = 12,
): FreeAgentListing[] {
  const pool = generateMarketPool(rng, tier, count);
  return pool.map((player) => {
    const askingSalary = player.contract.salaryPerSeason;
    const askingYears = player.marketTier === 'all_star' ? rng.int(2, 4) : rng.int(1, 3);
    const hasRivalBid = rivalClubs.length > 0 && rng.chance(player.marketTier === 'all_star' ? 0.85 : 0.45);
    const bidder = hasRivalBid ? rng.pick(rivalClubs) : null;
    const bidScale = player.marketTier === 'all_star' ? 1.08 : 0.96;

    return {
      player,
      askingSalary,
      askingYears,
      highestRivalBid: bidder ? Math.round(askingSalary * bidScale) : 0,
      highestRivalClubName: bidder ? `${bidder.city} ${bidder.name}` : null,
    };
  });
}

/** Evaluates whether a free agent accepts a club's contract offer vs. asking price and rival bids. */
export function evaluateFreeAgentOffer(
  listing: FreeAgentListing,
  offer: ContractOffer,
  club: Club,
): OfferEvaluation {
  const winPct = club.wins + club.losses > 0 ? club.wins / (club.wins + club.losses) : 0.5;
  const prestigeBonus = (club.economy.teamHype - 50) * 0.002 + (winPct - 0.5) * 0.14;
  const effectiveAnnual = offer.salaryPerSeason + Math.round(offer.signingBonus / Math.max(1, offer.years));
  const targetAnnual = Math.max(listing.askingSalary, listing.highestRivalBid);
  const salaryRatio = targetAnnual > 0 ? effectiveAnnual / targetAnnual : 1;
  const yearsBonus = offer.years >= listing.askingYears ? 0.05 : -0.05;
  const score = Number((salaryRatio + prestigeBonus + yearsBonus).toFixed(3));
  const threshold = 0.98;

  if (score >= threshold) {
    return {
      accepted: true,
      score,
      threshold,
      reason: `${listing.player.name} accepts your ${offer.years}yr / $${offer.salaryPerSeason.toLocaleString()} offer!`,
    };
  }
  const rivalNote = listing.highestRivalClubName
    ? ` (${listing.highestRivalClubName} bid $${listing.highestRivalBid.toLocaleString()})`
    : '';
  return {
    accepted: false,
    score,
    threshold,
    reason: `${listing.player.name} declined — seeking near $${targetAnnual.toLocaleString()}/yr${rivalNote}.`,
  };
}

/** Runs full contract negotiation enforcing 20-man active roster cap, Tier Salary Cap, and signing bonus cash. */
export function negotiateAndSignFreeAgent(
  club: Club,
  market: readonly FreeAgentListing[],
  playerId: string,
  offer: ContractOffer,
): {
  signed: boolean;
  reason: string;
  club: Club;
  market: FreeAgentListing[];
} {
  const listing = market.find((m) => m.player.id === playerId);
  if (!listing) {
    return { signed: false, reason: 'Free agent is no longer available.', club, market: [...market] };
  }

  const rosterCheck = validateRosterAddition(club.roster, playerId);
  if (!rosterCheck.allowed) {
    return { signed: false, reason: rosterCheck.reason ?? 'Roster full.', club, market: [...market] };
  }

  const capCheck = validateSalaryCapRoom(club, offer.salaryPerSeason);
  if (!capCheck.allowed) {
    return { signed: false, reason: capCheck.reason ?? 'Over Salary Cap.', club, market: [...market] };
  }

  if (club.economy.cash < offer.signingBonus) {
    return {
      signed: false,
      reason: `Need $${offer.signingBonus.toLocaleString()} cash for signing bonus.`,
      club,
      market: [...market],
    };
  }

  const evalRes = evaluateFreeAgentOffer(listing, offer, club);
  if (!evalRes.accepted) {
    return { signed: false, reason: evalRes.reason, club, market: [...market] };
  }

  const signedPlayer: Player = {
    ...listing.player,
    contract: {
      salaryPerSeason: offer.salaryPerSeason,
      yearsRemaining: Math.max(1, Math.min(5, offer.years)),
      signingBonus: offer.signingBonus,
    },
  };
  return {
    signed: true,
    reason: evalRes.reason,
    club: {
      ...club,
      roster: [...club.roster, signedPlayer],
      economy: {
        ...club.economy,
        cash: club.economy.cash - offer.signingBonus,
      },
    },
    market: market.filter((m) => m.player.id !== playerId),
  };
}

/** Cuts/waives a player enforcing minimum roster size, calculating dead-cap buyout and clubhouse morale shock. */
export function releasePlayerWithWaiverPenalty(
  club: Club,
  playerId: string,
): {
  released: boolean;
  reason?: string;
  deadCapCost: number;
  moraleDelta: number;
  club: Club;
} {
  const check = validateRosterRelease(club.roster, playerId);
  if (!check.allowed) {
    return { released: false, reason: check.reason, deadCapCost: 0, moraleDelta: 0, club };
  }
  const target = club.roster.find((p) => p.id === playerId)!;
  const remainingGuarantee = target.contract.salaryPerSeason * Math.max(1, target.contract.yearsRemaining);
  const deadCapCost = Math.round(remainingGuarantee * 0.25);
  const isGlueLeader = target.mentalTraits.includes('clubhouse_glue');
  const isStar = computePlayerOverall(target) >= 75;
  const moraleDelta = -(2 + (isGlueLeader ? 4 : 0) + (isStar ? 2 : 0));

  const nextRoster = club.roster
    .filter((p) => p.id !== playerId)
    .map((p) => ({
      ...p,
      morale: Math.max(15, Math.min(100, p.morale + moraleDelta)),
    }));

  return {
    released: true,
    deadCapCost,
    moraleDelta,
    club: {
      ...club,
      roster: nextRoster,
      economy: {
        ...club.economy,
        cash: Math.max(0, club.economy.cash - deadCapCost),
      },
    },
  };
}
