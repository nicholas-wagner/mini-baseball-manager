import { getBallparkPreset } from '../../engine/ballparks/stadiumCatalog';
import type { Club } from '../../engine/models/club';
import type { GameSessionState, HalfInning } from '../../engine/simulation/gameState';

export interface ScoreboardInningColumn {
  inning: number;
  away: number | null;
  home: number | null;
}

export interface LiveStadiumScoreboardSnapshot {
  stadiumName: string;
  awayAbbr: string;
  homeAbbr: string;
  awayRuns: number;
  homeRuns: number;
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  inning: number;
  half: HalfInning;
  balls: number;
  strikes: number;
  outs: number;
  bases: readonly [boolean, boolean, boolean];
  inningColumns: readonly ScoreboardInningColumn[];
  signature: string;
}

function buildInningColumns(session: GameSessionState): ScoreboardInningColumn[] {
  const maxVisible = 5;
  const totalSlots = Math.max(maxVisible, Math.min(session.regulationInnings, maxVisible));
  const endInning = Math.max(totalSlots, session.inning);
  const startInning = Math.max(1, endInning - maxVisible + 1);
  const byInning = new Map(session.boxScore.inningRuns.map((row) => [row.inning, row]));

  const cols: ScoreboardInningColumn[] = [];
  for (let inn = startInning; inn <= endInning; inn += 1) {
    const row = byInning.get(inn);
    const awayPlayed = inn <= session.inning;
    const homePlayed =
      inn < session.inning || (inn === session.inning && session.half === 'BOT') || session.status === 'completed';
    cols.push({
      inning: inn,
      away: awayPlayed ? (row?.away ?? 0) : null,
      home: homePlayed ? (row?.home ?? 0) : null,
    });
  }
  return cols;
}

/** Projects live game session state into a compact snapshot for the 3D stadium center-field scoreboard. */
export function buildLiveStadiumScoreboardSnapshot(
  awayClub: Club,
  homeClub: Club,
  session: GameSessionState,
): LiveStadiumScoreboardSnapshot {
  const park = getBallparkPreset(session.ballparkId ?? homeClub.stadium.ballparkId);
  const stadiumName = park.name.toUpperCase();
  const awayAbbr = awayClub.colors.monogram.toUpperCase().slice(0, 3);
  const homeAbbr = homeClub.colors.monogram.toUpperCase().slice(0, 3);
  const bases: readonly [boolean, boolean, boolean] = [
    Boolean(session.bases[0]),
    Boolean(session.bases[1]),
    Boolean(session.bases[2]),
  ];
  const inningColumns = buildInningColumns(session);
  const colSig = inningColumns
    .map((c) => `${c.inning}:${c.away ?? '-'}/${c.home ?? '-'}`)
    .join(',');
  const signature = [
    stadiumName,
    awayAbbr,
    homeAbbr,
    session.away.score,
    session.away.hits,
    session.away.errors,
    session.home.score,
    session.home.hits,
    session.home.errors,
    session.inning,
    session.half,
    session.balls,
    session.strikes,
    session.outs,
    bases.map((b) => (b ? '1' : '0')).join(''),
    colSig,
  ].join('|');

  return {
    stadiumName,
    awayAbbr,
    homeAbbr,
    awayRuns: session.away.score,
    homeRuns: session.home.score,
    awayHits: session.away.hits,
    homeHits: session.home.hits,
    awayErrors: session.away.errors,
    homeErrors: session.home.errors,
    inning: session.inning,
    half: session.half,
    balls: session.balls,
    strikes: session.strikes,
    outs: session.outs,
    bases,
    inningColumns,
    signature,
  };
}
