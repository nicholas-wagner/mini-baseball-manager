import { evaluateSalaryCapStatus } from '../economy/clubLedgerSettlement';
import type { Club } from '../models/club';
import { computePlayerOverall, type Player } from '../models/player';

export type ExtensionArchetypeId =
  | 'youth_bridge'
  | 'hometown_loyalist'
  | 'market_star'
  | 'veteran_security';

export interface PlayerExtensionDemand {
  playerId: string;
  archetype: ExtensionArchetypeId;
  archetypeLabel: string;
  preferredYears: 1 | 2 | 3 | 4;
  minAcceptableYears: 1 | 2 | 3 | 4;
  askingSalary: number;
  floorSalary: number;
  openingQuote: string;
}

export interface ContractOfferInput {
  years: 1 | 2 | 3 | 4;
  salaryPerSeason: number;
}

export interface ContractNegotiationOutcome {
  status: 'accepted' | 'counter' | 'walked' | 'cap_blocked';
  moodScore: number; // 0..100
  playerReply: string;
  counterOffer: ContractOfferInput | null;
}

function classifyExtensionArchetype(player: Player): {
  archetype: ExtensionArchetypeId;
  label: string;
  preferredYears: 1 | 2 | 3 | 4;
  minAcceptableYears: 1 | 2 | 3 | 4;
  salaryMult: number;
  quote: string;
} {
  if (player.age >= 32) {
    return {
      archetype: 'veteran_security',
      label: 'Veteran Seeking Security',
      preferredYears: 3,
      minAcceptableYears: 2,
      salaryMult: 0.94,
      quote: 'Give me multi-year stability here and I will work with you on the annual figure!',
    };
  }
  const loyal =
    player.morale >= 78 ||
    player.personality === 'clutch_captain' ||
    player.mentalTraits.includes('clubhouse_glue');
  if (loyal) {
    return {
      archetype: 'hometown_loyalist',
      label: 'Hometown Loyalist (-10% Discount)',
      preferredYears: 2,
      minAcceptableYears: 1,
      salaryMult: 0.9,
      quote: 'I love this clubhouse and our fans — make it fair and I will gladly sign a hometown deal!',
    };
  }
  if (player.age <= 24) {
    return {
      archetype: 'youth_bridge',
      label: 'Rising Youth (Bridge Deal)',
      preferredYears: 2,
      minAcceptableYears: 1,
      salaryMult: 1.06,
      quote: 'I am still climbing — I prefer a 1–2 year bridge deal unless you pay extra to lock up my prime!',
    };
  }
  return {
    archetype: 'market_star',
    label: 'Prime Market Earner',
    preferredYears: 3,
    minAcceptableYears: 2,
    salaryMult: 1.12,
    quote: 'I am in my prime and want a market-rate multi-year contract that reflects my production.',
  };
}

function computeBaselineFairSalary(player: Player): number {
  const ovr = computePlayerOverall(player);
  const current = Math.max(350, player.contract.salaryPerSeason);
  const ovrFactor = Math.max(0.85, Math.min(1.45, 0.72 + ovr / 115));
  return Math.max(400, Math.round((current * ovrFactor) / 50) * 50);
}

/** Computes a player's transparent, personality-driven contract extension demand profile. */
export function buildPlayerExtensionDemand(player: Player): PlayerExtensionDemand {
  const profile = classifyExtensionArchetype(player);
  const baseline = computeBaselineFairSalary(player);
  const askingSalary = Math.max(400, Math.round((baseline * profile.salaryMult) / 50) * 50);
  const floorSalary = Math.max(350, Math.round((askingSalary * 0.84) / 50) * 50);
  return {
    playerId: player.id,
    archetype: profile.archetype,
    archetypeLabel: profile.label,
    preferredYears: profile.preferredYears,
    minAcceptableYears: profile.minAcceptableYears,
    askingSalary,
    floorSalary,
    openingQuote: profile.quote,
  };
}

function yearAdjustedAsk(demand: PlayerExtensionDemand, offeredYears: 1 | 2 | 3 | 4): number {
  const diff = offeredYears - demand.preferredYears;
  if (demand.archetype === 'youth_bridge' && diff > 0) {
    return Math.round((demand.askingSalary * (1 + diff * 0.08)) / 50) * 50;
  }
  if (demand.archetype === 'veteran_security' && diff > 0) {
    return Math.round((demand.askingSalary * Math.max(0.86, 1 - diff * 0.05)) / 50) * 50;
  }
  if (diff < 0) {
    return Math.round((demand.askingSalary * (1 + Math.abs(diff) * 0.06)) / 50) * 50;
  }
  return demand.askingSalary;
}

/** Evaluates one negotiation round (`1..3`) with live Cap check, Mood Meter, and fair counteroffers. */
export function evaluateContractOffer(
  club: Club,
  player: Player,
  demand: PlayerExtensionDemand,
  offer: ContractOfferInput,
  round: 1 | 2 | 3,
): ContractNegotiationOutcome {
  const cap = evaluateSalaryCapStatus(club);
  const projectedPayroll = cap.payroll - player.contract.salaryPerSeason + offer.salaryPerSeason;
  if (projectedPayroll > cap.softCapMax) {
    return {
      status: 'cap_blocked',
      moodScore: 50,
      playerReply: `Over Soft Salary Cap ($${projectedPayroll.toLocaleString()} / $${cap.softCapMax.toLocaleString()}) — lower the salary or clear payroll.`,
      counterOffer: null,
    };
  }

  const targetSalary = yearAdjustedAsk(demand, offer.years);
  const salaryRatio = offer.salaryPerSeason / Math.max(1, targetSalary);
  const yearPenalty = offer.years < demand.minAcceptableYears ? 14 : Math.abs(offer.years - demand.preferredYears) * 4;
  const moodScore = Math.max(5, Math.min(100, Math.round(salaryRatio * 88 - yearPenalty + (player.morale - 65) * 0.2)));

  if (moodScore >= 82) {
    return {
      status: 'accepted',
      moodScore,
      playerReply: `🤝 Deal! ${offer.years} yr @ $${offer.salaryPerSeason.toLocaleString()}/yr works for me — let's win a championship!`,
      counterOffer: null,
    };
  }

  if (round >= 3 || moodScore < 40) {
    return {
      status: 'walked',
      moodScore,
      playerReply: '😬 We are too far apart right now — let’s revisit extension talks later in the season.',
      counterOffer: null,
    };
  }

  const counterSalary = Math.max(
    demand.floorSalary,
    Math.round(((targetSalary * 0.65 + offer.salaryPerSeason * 0.35) / 50)) * 50,
  );
  const counterYears = (offer.years < demand.minAcceptableYears ? demand.preferredYears : offer.years) as 1 | 2 | 3 | 4;
  const reason =
    offer.years < demand.minAcceptableYears
      ? `I really need at least ${demand.minAcceptableYears} years of security.`
      : `Meet me at $${counterSalary.toLocaleString()}/yr over ${counterYears} yr and I'll sign today.`;

  return {
    status: 'counter',
    moodScore,
    playerReply: `💬 Close! ${reason}`,
    counterOffer: { years: counterYears, salaryPerSeason: counterSalary },
  };
}

/** Applies a signed negotiated extension immutably onto the Club roster with a morale lift. */
export function applyNegotiatedContractExtension(
  club: Club,
  playerId: string,
  offer: ContractOfferInput,
): { applied: boolean; reason?: string; club: Club } {
  const target = club.roster.find((p) => p.id === playerId);
  if (!target) return { applied: false, reason: 'Player not found.', club };
  const cap = evaluateSalaryCapStatus(club);
  const projected = cap.payroll - target.contract.salaryPerSeason + offer.salaryPerSeason;
  if (projected > cap.softCapMax) {
    return { applied: false, reason: 'Offer exceeds Soft Salary Cap.', club };
  }
  const updatedRoster = club.roster.map((p) =>
    p.id === playerId
      ? {
          ...p,
          morale: Math.min(100, p.morale + 6),
          contract: {
            ...p.contract,
            yearsRemaining: p.contract.yearsRemaining + offer.years,
            salaryPerSeason: offer.salaryPerSeason,
          },
        }
      : p,
  );
  return { applied: true, club: { ...club, roster: updatedRoster } };
}
