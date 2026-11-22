import type { Club } from '../models/club';
import type { MentalTraitId, Player, PlayerRatings } from '../models/player';
import type { SeededRng } from '../rng/seededRng';

export type WinterLeagueId = 'dominican' | 'japan' | 'mexico' | 'australia';

export interface WinterLeagueDestination {
  id: WinterLeagueId;
  name: string;
  countryLabel: string;
  stipendPerPlayer: number;
  bonusSp: number;
  focusStats: readonly (keyof PlayerRatings)[];
  culturalTrait: MentalTraitId;
  flavor: string;
}

export const MAX_WINTER_BALL_PLAYERS = 3;
export const MAX_WINTER_BALL_AGE = 25;

export const WINTER_LEAGUE_DESTINATIONS: readonly WinterLeagueDestination[] = [
  {
    id: 'dominican',
    name: 'Dominican Winter Showtime League',
    countryLabel: 'Dominican Republic',
    stipendPerPlayer: 750,
    bonusSp: 2,
    focusStats: ['contact', 'speed', 'power'],
    culturalTrait: 'high_energy',
    flavor: 'Electric stadium drums & winter bat speed polish!',
  },
  {
    id: 'japan',
    name: 'Miyazaki Precision Winter Camp',
    countryLabel: 'Japan',
    stipendPerPlayer: 850,
    bonusSp: 2,
    focusStats: ['control', 'eye', 'movement'],
    culturalTrait: 'ice_veins',
    flavor: 'Zen mechanics, strike-zone discipline & razor command.',
  },
  {
    id: 'mexico',
    name: 'Pacific Coast Barnstormers League',
    countryLabel: 'Mexico',
    stipendPerPlayer: 700,
    bonusSp: 2,
    focusStats: ['power', 'clutch', 'stamina'],
    culturalTrait: 'fiery_competitor',
    flavor: 'High-stakes winter playoffs forging fearless clutch bats.',
  },
  {
    id: 'australia',
    name: 'Southern Cross Summer Heat Tour',
    countryLabel: 'Australia',
    stipendPerPlayer: 800,
    bonusSp: 2,
    focusStats: ['fielding', 'range', 'arm'],
    culturalTrait: 'clubhouse_glue',
    flavor: 'Fast hardpan fields building slick leather and brotherhood.',
  },
];

export interface WinterBallReport {
  sent: boolean;
  reason?: string;
  club: Club;
  graduates: { playerId: string; playerName: string; gainedSp: number; summary: string }[];
  totalCost: number;
}

function polishPlayerInWinterBall(
  rng: SeededRng,
  player: Player,
  dest: WinterLeagueDestination,
): { updated: Player; summary: string } {
  const nextRatings: PlayerRatings = { ...player.ratings };
  const boostedLabels: string[] = [];

  for (const stat of dest.focusStats) {
    const cap = player.statCaps[stat] ?? 95;
    const gain = rng.int(1, 3);
    const nextVal = Math.min(cap, nextRatings[stat] + gain);
    if (nextVal > nextRatings[stat]) {
      boostedLabels.push(`+${nextVal - nextRatings[stat]} ${stat}`);
      nextRatings[stat] = nextVal;
    }
  }

  const nextTraits = player.mentalTraits.includes(dest.culturalTrait)
    ? player.mentalTraits
    : [...player.mentalTraits, dest.culturalTrait];

  return {
    updated: {
      ...player,
      ratings: nextRatings,
      skillPoints: player.skillPoints + dest.bonusSp,
      mentalTraits: nextTraits,
      fatigue: Math.max(0, player.fatigue - 10),
    },
    summary: `${player.name} thrived in ${dest.countryLabel} (+${dest.bonusSp} SP${
      boostedLabels.length > 0 ? `, ${boostedLabels.join(', ')}` : ''
    }).`,
  };
}

/** Sends up to 3 young players (age <= 25) to Offseason Winter Ball for bonus SP & cross-cultural polish. */
export function runWinterBallAssignment(
  rng: SeededRng,
  club: Club,
  playerIds: readonly string[],
  destinationId: WinterLeagueId,
): WinterBallReport {
  const dest = WINTER_LEAGUE_DESTINATIONS.find((d) => d.id === destinationId);
  if (!dest) {
    return { sent: false, reason: 'Unknown Winter League destination.', club, graduates: [], totalCost: 0 };
  }
  const uniqueIds = [...new Set(playerIds)];
  if (uniqueIds.length === 0 || uniqueIds.length > MAX_WINTER_BALL_PLAYERS) {
    return {
      sent: false,
      reason: `Select between 1 and ${MAX_WINTER_BALL_PLAYERS} young players for Winter Ball.`,
      club,
      graduates: [],
      totalCost: 0,
    };
  }

  const allPool = [...club.roster, ...club.academyProspects];
  const selected = uniqueIds
    .map((id) => allPool.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));
  if (selected.length !== uniqueIds.length) {
    return { sent: false, reason: 'One or more selected players were not found.', club, graduates: [], totalCost: 0 };
  }
  const tooOld = selected.find((p) => p.age > MAX_WINTER_BALL_AGE);
  if (tooOld) {
    return {
      sent: false,
      reason: `${tooOld.name} (age ${tooOld.age}) exceeds the Winter Ball age limit (${MAX_WINTER_BALL_AGE}).`,
      club,
      graduates: [],
      totalCost: 0,
    };
  }

  const totalCost = dest.stipendPerPlayer * selected.length;
  if (club.economy.cash < totalCost) {
    return {
      sent: false,
      reason: `Need $${totalCost.toLocaleString()} for ${dest.name} travel stipend.`,
      club,
      graduates: [],
      totalCost: 0,
    };
  }

  const updatedMap = new Map<string, Player>();
  const graduates: WinterBallReport['graduates'] = [];
  for (const p of selected) {
    const res = polishPlayerInWinterBall(rng, p, dest);
    updatedMap.set(p.id, res.updated);
    graduates.push({
      playerId: p.id,
      playerName: p.name,
      gainedSp: dest.bonusSp,
      summary: res.summary,
    });
  }

  return {
    sent: true,
    club: {
      ...club,
      roster: club.roster.map((p) => updatedMap.get(p.id) ?? p),
      academyProspects: club.academyProspects.map((p) => updatedMap.get(p.id) ?? p),
      economy: {
        ...club.economy,
        cash: club.economy.cash - totalCost,
        teamHype: Math.min(100, club.economy.teamHype + 3),
      },
    },
    graduates,
    totalCost,
  };
}
