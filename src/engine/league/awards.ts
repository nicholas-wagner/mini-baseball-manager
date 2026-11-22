import type { Club, LeagueTierId } from '../models/club';
import { computePlayerOverall, isPitcherPosition, type Player } from '../models/player';

export type SeasonAwardType =
  | 'mvp'
  | 'golden_arm'
  | 'iron_glove'
  | 'rookie_of_the_year'
  | 'manager_of_the_year';

export interface SeasonAwardWinner {
  award: SeasonAwardType;
  label: string;
  season: number;
  leagueTier: LeagueTierId;
  winnerId: string;
  winnerName: string;
  clubId: string;
  clubName: string;
  summary: string;
}

export interface HallOfFameEvaluation {
  eligible: boolean;
  hofScore: number;
  tierLabel: 'First-Ballot Legend' | 'Club Hall of Famer' | 'Fan Favorite' | 'Not Eligible';
  summary: string;
}

function scoreMvp(p: Player): number {
  const s = p.seasonStats;
  return (
    s.hits * 1.4 +
    s.doubles * 0.8 +
    s.triples * 1.4 +
    s.homeRuns * 4.5 +
    s.rbis * 1.2 +
    s.stolenBases * 1.3 +
    s.walks * 0.8 +
    computePlayerOverall(p) * 0.4
  );
}

function scoreGoldenArm(p: Player): number {
  const s = p.seasonStats;
  const ip = s.inningsPitchedOuts / 3;
  return (
    s.pitchingStrikeouts * 1.5 +
    s.wins * 6 +
    s.saves * 5 +
    ip * 1.1 -
    s.earnedRuns * 2.2 +
    computePlayerOverall(p) * 0.45
  );
}

function scoreIronGlove(p: Player): number {
  const s = p.seasonStats;
  return (
    p.ratings.fielding * 0.9 +
    p.ratings.range * 0.8 +
    p.ratings.arm * 0.5 +
    s.putouts * 0.8 +
    s.assists * 1.1 -
    s.errors * 4.5
  );
}

function pickTopPlayer(
  clubs: readonly Club[],
  filter: (p: Player) => boolean,
  scorer: (p: Player) => number,
): { player: Player; club: Club } | null {
  let best: { player: Player; club: Club; score: number } | null = null;
  for (const club of clubs) {
    for (const player of club.roster) {
      if (!filter(player)) continue;
      const score = scorer(player);
      if (!best || score > best.score) {
        best = { player, club, score };
      }
    }
  }
  return best ? { player: best.player, club: best.club } : null;
}

/** Runs end-of-season award voting across a league tier (MVP, Golden Arm, Iron Glove, ROY, MOY). */
export function voteSeasonAwards(
  tierClubs: readonly Club[],
  season: number,
  leagueTier: LeagueTierId,
  humanManagerName = 'Skipper',
): SeasonAwardWinner[] {
  const winners: SeasonAwardWinner[] = [];
  const mvp = pickTopPlayer(tierClubs, (p) => !isPitcherPosition(p.position), scoreMvp);
  if (mvp) {
    winners.push({
      award: 'mvp',
      label: 'Most Valuable Player',
      season,
      leagueTier,
      winnerId: mvp.player.id,
      winnerName: mvp.player.name,
      clubId: mvp.club.id,
      clubName: `${mvp.club.city} ${mvp.club.name}`,
      summary: `${mvp.player.seasonStats.homeRuns} HR, ${mvp.player.seasonStats.rbis} RBI, ${mvp.player.seasonStats.hits} H`,
    });
  }

  const arm = pickTopPlayer(tierClubs, (p) => isPitcherPosition(p.position), scoreGoldenArm);
  if (arm) {
    winners.push({
      award: 'golden_arm',
      label: 'Golden Arm Award',
      season,
      leagueTier,
      winnerId: arm.player.id,
      winnerName: arm.player.name,
      clubId: arm.club.id,
      clubName: `${arm.club.city} ${arm.club.name}`,
      summary: `${arm.player.seasonStats.wins} W, ${arm.player.seasonStats.saves} SV, ${arm.player.seasonStats.pitchingStrikeouts} K`,
    });
  }

  const glove = pickTopPlayer(tierClubs, (p) => !isPitcherPosition(p.position), scoreIronGlove);
  if (glove) {
    winners.push({
      award: 'iron_glove',
      label: 'Iron Glove Award',
      season,
      leagueTier,
      winnerId: glove.player.id,
      winnerName: glove.player.name,
      clubId: glove.club.id,
      clubName: `${glove.club.city} ${glove.club.name}`,
      summary: `FLD ${glove.player.ratings.fielding} / RNG ${glove.player.ratings.range} (${glove.player.seasonStats.errors} E)`,
    });
  }

  const roy = pickTopPlayer(
    tierClubs,
    (p) => p.careerService.seasonsPlayed <= 1 || p.marketTier === 'rookie',
    (p) => (isPitcherPosition(p.position) ? scoreGoldenArm(p) : scoreMvp(p)),
  );
  if (roy) {
    winners.push({
      award: 'rookie_of_the_year',
      label: 'Rookie of the Year',
      season,
      leagueTier,
      winnerId: roy.player.id,
      winnerName: roy.player.name,
      clubId: roy.club.id,
      clubName: `${roy.club.city} ${roy.club.name}`,
      summary: `Breakout youngster (Age ${roy.player.age}, OVR ${computePlayerOverall(roy.player)})`,
    });
  }

  const topClub = [...tierClubs].sort((a, b) => b.wins - a.wins)[0];
  if (topClub) {
    const mgrName = topClub.isHuman ? humanManagerName : `${topClub.city} Skipper`;
    winners.push({
      award: 'manager_of_the_year',
      label: 'Manager of the Year',
      season,
      leagueTier,
      winnerId: `mgr-${topClub.id}`,
      winnerName: mgrName,
      clubId: topClub.id,
      clubName: `${topClub.city} ${topClub.name}`,
      summary: `Led ${topClub.city} ${topClub.name} to a ${topClub.wins}-${topClub.losses} record`,
    });
  }

  return winners;
}

/** Evaluates a retiring or veteran club legend for Club Hall of Fame induction. */
export function evaluateHallOfFameCandidate(
  player: Player,
  championshipsWon = 0,
  majorAwardsCount = 0,
): HallOfFameEvaluation {
  const ovr = computePlayerOverall(player);
  const service = player.careerService;
  const hofScore = Math.round(
    ovr * 0.42 +
      service.seasonsPlayed * 5.5 +
      service.careerPlayoffGames * 1.4 +
      championshipsWon * 12 +
      majorAwardsCount * 10,
  );
  if (hofScore >= 90) {
    return {
      eligible: true,
      hofScore,
      tierLabel: 'First-Ballot Legend',
      summary: `${player.name} is a unanimous First-Ballot Club Hall of Famer (Score ${hofScore})!`,
    };
  }
  if (hofScore >= 70) {
    return {
      eligible: true,
      hofScore,
      tierLabel: 'Club Hall of Famer',
      summary: `${player.name} earns a bronze plaque in the Club Hall of Fame (Score ${hofScore}).`,
    };
  }
  if (hofScore >= 52) {
    return {
      eligible: false,
      hofScore,
      tierLabel: 'Fan Favorite',
      summary: `${player.name} retires as a beloved club Fan Favorite (Score ${hofScore}).`,
    };
  }
  return {
    eligible: false,
    hofScore,
    tierLabel: 'Not Eligible',
    summary: `${player.name} falls short of Club Hall of Fame thresholds (Score ${hofScore}).`,
  };
}

/** Permanently retires a club legend's jersey number onto the 3D Stadium Outfield Wall! */
export function retirePlayerJerseyNumber(
  club: Club,
  player: Pick<Player, 'jerseyNumber' | 'name'>,
): { retired: boolean; reason?: string; club: Club } {
  const existing = club.stadium.retiredNumbers;
  if (existing.some((entry) => entry.jerseyNumber === player.jerseyNumber)) {
    return {
      retired: false,
      reason: `Jersey #${player.jerseyNumber} is already retired on your outfield wall.`,
      club,
    };
  }
  return {
    retired: true,
    club: {
      ...club,
      stadium: {
        ...club.stadium,
        retiredNumbers: [
          ...existing,
          { jerseyNumber: player.jerseyNumber, playerName: player.name },
        ],
      },
      economy: {
        ...club.economy,
        teamHype: Math.min(100, club.economy.teamHype + 6),
        fanBase: club.economy.fanBase + 120,
      },
    },
  };
}

/** Mounts a permanent Championship Pennant onto the club's 3D ballpark roof! */
export function awardChampionshipPennant(club: Club, season: number): Club {
  const already = club.stadium.championshipPennants.some(
    (p) => p.season === season && p.leagueTier === club.leagueTier,
  );
  if (already) return club;
  return {
    ...club,
    stadium: {
      ...club.stadium,
      championshipPennants: [
        ...club.stadium.championshipPennants,
        { season, leagueTier: club.leagueTier },
      ],
    },
    economy: {
      ...club.economy,
      teamHype: Math.min(100, club.economy.teamHype + 12),
    },
  };
}
