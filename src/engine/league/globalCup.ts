import type { Club } from '../models/club';
import { computePlayerOverall, type Player } from '../models/player';
import { NATIONALITIES_CATALOG } from '../nationalities/nationalitiesCatalog';
import type { NationalityId } from '../nationalities/types';
import type { SeededRng } from '../rng/seededRng';

export interface NationalSquad {
  nationalityId: NationalityId;
  nationName: string;
  shortCode: string;
  heritagePowerName: string;
  playerIds: string[];
  captainName: string;
  teamRating: number;
}

export interface GlobalCupMatch {
  round: 'quarterfinal' | 'semifinal' | 'final';
  nationA: NationalityId;
  nationB: NationalityId;
  scoreA: number;
  scoreB: number;
  winnerId: NationalityId;
  headline: string;
}

export interface GlobalCupMedal {
  season: number;
  nationalityId: NationalityId;
  medal: 'gold' | 'silver' | 'bronze';
  playerId: string;
  playerName: string;
}

export interface GlobalCupResult {
  season: number;
  squads: NationalSquad[];
  matches: GlobalCupMatch[];
  championNationId: NationalityId;
  championNationName: string;
  runnerUpNationId: NationalityId;
  mvpPlayerId: string;
  mvpPlayerName: string;
  medals: GlobalCupMedal[];
}

/** The Global Chibi Cup takes place every 3 seasons across all global nationalities. */
export function isGlobalCupSeason(seasonNumber: number): boolean {
  return seasonNumber > 0 && seasonNumber % 3 === 0;
}

/** Drafts national baseball squads from all active clubs in the 6-tier world. */
export function draftGlobalCupSquads(allClubs: readonly Club[]): NationalSquad[] {
  const byNation = new Map<NationalityId, Player[]>();
  for (const club of allClubs) {
    for (const player of club.roster) {
      const list = byNation.get(player.nationalityId) ?? [];
      list.push(player);
      byNation.set(player.nationalityId, list);
    }
  }

  return NATIONALITIES_CATALOG.map((nat) => {
    const pool = (byNation.get(nat.id) ?? []).sort(
      (a, b) => computePlayerOverall(b) - computePlayerOverall(a),
    );
    const chosen = pool.slice(0, 12);
    const avgOvr =
      chosen.length > 0
        ? Math.round(chosen.reduce((acc, p) => acc + computePlayerOverall(p), 0) / chosen.length)
        : 56;
    return {
      nationalityId: nat.id,
      nationName: nat.name,
      shortCode: nat.shortCode,
      heritagePowerName: nat.heritageAbility.name,
      playerIds: chosen.map((p) => p.id),
      captainName: chosen[0]?.name ?? `${nat.name} Captain`,
      teamRating: avgOvr,
    };
  }).sort((a, b) => b.teamRating - a.teamRating);
}

function playGlobalCupMatch(
  rng: SeededRng,
  round: GlobalCupMatch['round'],
  a: NationalSquad,
  b: NationalSquad,
): { winner: NationalSquad; loser: NationalSquad; match: GlobalCupMatch } {
  const diff = (a.teamRating - b.teamRating) * 0.014;
  const winProbA = Math.max(0.22, Math.min(0.78, 0.5 + diff));
  const aWins = rng.chance(winProbA);
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;
  const winScore = rng.int(3, 9);
  const loseScore = Math.max(0, winScore - rng.int(1, 4));
  const scoreA = aWins ? winScore : loseScore;
  const scoreB = aWins ? loseScore : winScore;

  return {
    winner,
    loser,
    match: {
      round,
      nationA: a.nationalityId,
      nationB: b.nationalityId,
      scoreA,
      scoreB,
      winnerId: winner.nationalityId,
      headline: `${winner.shortCode} unleashes ${winner.heritagePowerName} to beat ${loser.shortCode} ${winScore}-${loseScore}!`,
    },
  };
}

/** Runs an 8-nation Global Chibi Cup knockout tournament and awards permanent Global Cup Medals. */
export function runGlobalChibiCup(
  rng: SeededRng,
  allClubs: readonly Club[],
  seasonNumber: number,
): GlobalCupResult {
  const allSquads = draftGlobalCupSquads(allClubs);
  const bracket = allSquads.slice(0, 8);
  const matches: GlobalCupMatch[] = [];

  const qfWinners: NationalSquad[] = [];
  for (let i = 0; i < bracket.length; i += 2) {
    const res = playGlobalCupMatch(rng, 'quarterfinal', bracket[i], bracket[i + 1]);
    matches.push(res.match);
    qfWinners.push(res.winner);
  }

  const sfWinners: NationalSquad[] = [];
  const sfLosers: NationalSquad[] = [];
  for (let i = 0; i < qfWinners.length; i += 2) {
    const res = playGlobalCupMatch(rng, 'semifinal', qfWinners[i], qfWinners[i + 1]);
    matches.push(res.match);
    sfWinners.push(res.winner);
    sfLosers.push(res.loser);
  }

  const finalRes = playGlobalCupMatch(rng, 'final', sfWinners[0], sfWinners[1]);
  matches.push(finalRes.match);

  const playerLookup = new Map<string, Player>();
  for (const club of allClubs) {
    for (const p of club.roster) playerLookup.set(p.id, p);
  }

  const buildMedals = (squad: NationalSquad, medal: GlobalCupMedal['medal']): GlobalCupMedal[] =>
    squad.playerIds.slice(0, 5).map((id) => ({
      season: seasonNumber,
      nationalityId: squad.nationalityId,
      medal,
      playerId: id,
      playerName: playerLookup.get(id)?.name ?? squad.captainName,
    }));

  const medals: GlobalCupMedal[] = [
    ...buildMedals(finalRes.winner, 'gold'),
    ...buildMedals(finalRes.loser, 'silver'),
    ...(sfLosers[0] ? buildMedals(sfLosers[0], 'bronze') : []),
  ];

  const mvpId = finalRes.winner.playerIds[0] ?? 'global-mvp';
  const mvpName = playerLookup.get(mvpId)?.name ?? finalRes.winner.captainName;

  return {
    season: seasonNumber,
    squads: bracket,
    matches,
    championNationId: finalRes.winner.nationalityId,
    championNationName: finalRes.winner.nationName,
    runnerUpNationId: finalRes.loser.nationalityId,
    mvpPlayerId: mvpId,
    mvpPlayerName: mvpName,
    medals,
  };
}
