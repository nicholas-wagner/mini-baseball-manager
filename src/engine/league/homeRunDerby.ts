import { getBallparkPreset, type BallparkPresetId } from '../ballparks/stadiumCatalog';
import type { Club } from '../models/club';
import { computePlayerOverall, isPitcherPosition, type Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { getFormStatModifiers } from '../rpg/formTracker';

export interface AllStarSelection {
  playerId: string;
  playerName: string;
  clubId: string;
  clubName: string;
  position: Player['position'];
  overall: number;
  isPitcher: boolean;
}

export interface DerbyMatchupResult {
  round: 'quarterfinal' | 'semifinal' | 'final';
  batterAId: string;
  batterAName: string;
  batterAHrs: number;
  batterBId: string;
  batterBName: string;
  batterBHrs: number;
  winnerId: string;
  winnerName: string;
  longestFt: number;
}

export interface HomeRunDerbyResult {
  ballparkId: BallparkPresetId;
  participants: AllStarSelection[];
  matchups: DerbyMatchupResult[];
  championId: string;
  championName: string;
  championClubId: string;
  longestHomeRunFt: number;
  cashPrize: number;
  rewardRelicId: string;
}

function toAllStar(player: Player, club: Club): AllStarSelection {
  return {
    playerId: player.id,
    playerName: player.name,
    clubId: club.id,
    clubName: `${club.city} ${club.name}`,
    position: player.position,
    overall: computePlayerOverall(player),
    isPitcher: isPitcherPosition(player.position),
  };
}

/** Selects fan-voted All-Stars across a league tier, guaranteeing at least 1 representative per club. */
export function selectAllStarRoster(
  tierClubs: readonly Club[],
  targetSize = 16,
): AllStarSelection[] {
  const pickedIds = new Set<string>();
  const selections: AllStarSelection[] = [];

  for (const club of tierClubs) {
    const best = [...club.roster].sort(
      (a, b) => computePlayerOverall(b) - computePlayerOverall(a),
    )[0];
    if (best) {
      pickedIds.add(best.id);
      selections.push(toAllStar(best, club));
    }
  }

  const remaining: AllStarSelection[] = [];
  for (const club of tierClubs) {
    for (const p of club.roster) {
      if (!pickedIds.has(p.id)) {
        remaining.push(toAllStar(p, club));
      }
    }
  }
  remaining.sort((a, b) => b.overall - a.overall);
  for (const cand of remaining) {
    if (selections.length >= targetSize) break;
    selections.push(cand);
  }
  return selections;
}

function simulateDerbyRound(
  rng: SeededRng,
  batter: Player,
  parkHrFactor: number,
): { hrs: number; longestFt: number } {
  const form = getFormStatModifiers(batter.formState);
  const effectivePower = batter.ratings.power + form.powerDelta + batter.ratings.clutch * 0.12;
  const hrChance = Math.max(0.22, Math.min(0.76, (0.3 + (effectivePower - 55) * 0.0065) * parkHrFactor));

  let outs = 0;
  let hrs = 0;
  let longestFt = 0;
  let streak = 0;
  const maxOuts = 10;

  while (outs < maxOuts && hrs < 35) {
    const streakBoost = streak >= 3 ? 0.05 : 0;
    if (rng.chance(Math.min(0.84, hrChance + streakBoost))) {
      hrs += 1;
      streak += 1;
      const dist = Math.round(372 + effectivePower * 0.85 + rng.int(0, 48) * parkHrFactor);
      if (dist > longestFt) longestFt = dist;
    } else {
      outs += 1;
      streak = 0;
    }
  }
  return { hrs, longestFt };
}

function runDerbyDuel(
  rng: SeededRng,
  round: DerbyMatchupResult['round'],
  a: Player,
  b: Player,
  parkHrFactor: number,
): { winner: Player; record: DerbyMatchupResult } {
  const resA = simulateDerbyRound(rng, a, parkHrFactor);
  const resB = simulateDerbyRound(rng, b, parkHrFactor);
  let hrsA = resA.hrs;
  let hrsB = resB.hrs;
  if (hrsA === hrsB) {
    // 3-swing tiebreaker swing-off!
    if (rng.chance(0.5 + (a.ratings.power - b.ratings.power) * 0.004)) hrsA += 1;
    else hrsB += 1;
  }
  const winner = hrsA > hrsB ? a : b;
  return {
    winner,
    record: {
      round,
      batterAId: a.id,
      batterAName: a.name,
      batterAHrs: hrsA,
      batterBId: b.id,
      batterBName: b.name,
      batterBHrs: hrsB,
      winnerId: winner.id,
      winnerName: winner.name,
      longestFt: Math.max(resA.longestFt, resB.longestFt),
    },
  };
}

function collectTopDerbyHitters(
  tierClubs: readonly Club[],
  limit = 8,
): { player: Player; club: Club }[] {
  const hitters: { player: Player; club: Club }[] = [];
  for (const club of tierClubs) {
    for (const p of club.roster) {
      if (!isPitcherPosition(p.position)) {
        hitters.push({ player: p, club });
      }
    }
  }
  hitters.sort((a, b) => b.player.ratings.power - a.player.ratings.power);
  return hitters.slice(0, limit);
}

function runDerbyBracketStage(
  rng: SeededRng,
  round: DerbyMatchupResult['round'],
  entrants: readonly Player[],
  parkHrFactor: number,
  matchups: DerbyMatchupResult[],
): Player[] {
  const winners: Player[] = [];
  for (let i = 0; i < entrants.length; i += 2) {
    const a = entrants[i];
    const b = entrants[i + 1] ?? a;
    const duel = runDerbyDuel(rng, round, a, b, parkHrFactor);
    matchups.push(duel.record);
    winners.push(duel.winner);
  }
  return winners;
}

/** Runs an 8-slugger bracketed All-Star Home Run Derby with bomb-swing streaks & park HR carry. */
export function runHomeRunDerby(
  rng: SeededRng,
  tierClubs: readonly Club[],
  ballparkId: BallparkPresetId = 'high_altitude_mesa',
): HomeRunDerbyResult {
  const park = getBallparkPreset(ballparkId);
  const field = collectTopDerbyHitters(tierClubs, 8);
  const clubByPlayer = new Map(field.map((entry) => [entry.player.id, entry.club]));
  const participants = field.map((entry) => toAllStar(entry.player, entry.club));

  const matchups: DerbyMatchupResult[] = [];
  const semiFinalists = runDerbyBracketStage(
    rng,
    'quarterfinal',
    field.map((f) => f.player),
    park.factors.hrFactor,
    matchups,
  );
  const finalists = runDerbyBracketStage(
    rng,
    'semifinal',
    semiFinalists,
    park.factors.hrFactor,
    matchups,
  );
  const [champion] = runDerbyBracketStage(
    rng,
    'final',
    finalists,
    park.factors.hrFactor,
    matchups,
  );
  const longestHomeRunFt = Math.max(...matchups.map((m) => m.longestFt), 390);
  const champClub = clubByPlayer.get(champion.id);

  return {
    ballparkId: park.id,
    participants,
    matchups,
    championId: champion.id,
    championName: champion.name,
    championClubId: champClub?.id ?? '',
    longestHomeRunFt,
    cashPrize: 3_500,
    rewardRelicId: 'golden_ash_bat',
  };
}
