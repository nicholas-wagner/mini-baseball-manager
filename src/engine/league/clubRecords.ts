import type { Club } from '../models/club';
import { isScoringOrHitOutcome, type PlayEvent } from '../models/playEvent';
import type { Player } from '../models/player';
import type {
  BatterBoxLine,
  GameSessionState,
  PitcherBoxLine,
  TeamGameSide,
} from '../simulation/gameState';

export interface ClubRecordEntry {
  value: number;
  holderName: string;
  holderId: string;
  season: number;
  detail: string;
}

export interface ClubFranchiseRecords {
  longestHomeRunFt: ClubRecordEntry | null;
  mostSingleGameStrikeouts: ClubRecordEntry | null;
  mostSingleGameHits: ClubRecordEntry | null;
  longestWinStreak: ClubRecordEntry | null;
  currentWinStreak: number;
  mostSeasonHomeRuns: ClubRecordEntry | null;
  mostSeasonStolenBases: ClubRecordEntry | null;
}

export interface LiveRecordBreakerAlert {
  label: string;
  headline: string;
  value: number;
}

export interface UpdateClubFranchiseRecordsParams {
  club: Club;
  session: GameSessionState;
  humanWon: boolean;
  season: number;
  events?: readonly PlayEvent[];
}

const INAUGURAL_HR_DIST_BAR = 400;
const INAUGURAL_STRIKEOUT_BAR = 7;
const INAUGURAL_HITS_BAR = 4;

export function createEmptyFranchiseRecords(): ClubFranchiseRecords {
  return {
    longestHomeRunFt: null,
    mostSingleGameStrikeouts: null,
    mostSingleGameHits: null,
    longestWinStreak: null,
    currentWinStreak: 0,
    mostSeasonHomeRuns: null,
    mostSeasonStolenBases: null,
  };
}

/** Hydrates partial/legacy franchise records safely without discarding valid records. */
export function hydrateFranchiseRecords(
  raw?: Partial<ClubFranchiseRecords> | null,
): ClubFranchiseRecords {
  const base = createEmptyFranchiseRecords();
  if (!raw) return base;
  const streak =
    typeof raw.currentWinStreak === 'number' && Number.isFinite(raw.currentWinStreak)
      ? Math.max(0, Math.floor(raw.currentWinStreak))
      : 0;
  return {
    ...base,
    ...raw,
    currentWinStreak: streak,
  };
}

function resolveHumanGameContext(session: GameSessionState, club: Club) {
  const humanIsHome = session.home.clubId === club.id || session.home.isHuman;
  return {
    humanIsHome,
    humanSide: humanIsHome ? session.home : session.away,
    batterBox: humanIsHome ? session.boxScore.homeBatters : session.boxScore.awayBatters,
    pitcherBox: humanIsHome ? session.boxScore.homePitchers : session.boxScore.awayPitchers,
  };
}

function lookupClubPlayer(side: TeamGameSide, club: Club, playerId: string | undefined): Player | null {
  if (!playerId) return null;
  return side.playersById[playerId] ?? club.roster.find((p) => p.id === playerId) ?? null;
}

function exceedsRecordBar(
  value: number,
  existing: ClubRecordEntry | null,
  inauguralBar: number,
): boolean {
  return existing ? value > existing.value : value >= inauguralBar;
}

function checkLiveLongestHr(
  records: ClubFranchiseRecords | undefined,
  event: PlayEvent,
  season: number,
): LiveRecordBreakerAlert | null {
  if (event.outcome !== 'home_run' || !event.hrStatcast) return null;
  const dist = event.hrStatcast.distanceFt;
  const existing = records?.longestHomeRunFt ?? null;
  if (!exceedsRecordBar(dist, existing, INAUGURAL_HR_DIST_BAR)) return null;
  return {
    label: 'Longest Home Run',
    headline: existing
      ? `NEW CLUB RECORD: ${dist} FT MOONSHOT! (Prev: ${existing.value} FT · S${season})`
      : `NEW CLUB RECORD: ${dist} FT MOONSHOT! (S${season})`,
    value: dist,
  };
}

function checkLiveSingleGameStrikeouts(
  records: ClubFranchiseRecords | undefined,
  event: PlayEvent,
  pitcherBox: Readonly<Record<string, PitcherBoxLine>>,
  fallbackPitcherId: string,
  season: number,
): LiveRecordBreakerAlert | null {
  if (event.outcome !== 'strikeout') return null;
  const pitcherId = event.pitcherId ?? fallbackPitcherId;
  const ks = pitcherBox[pitcherId]?.strikeouts ?? 0;
  const existing = records?.mostSingleGameStrikeouts ?? null;
  if (!exceedsRecordBar(ks, existing, INAUGURAL_STRIKEOUT_BAR)) return null;
  return {
    label: 'Single-Game Strikeouts',
    headline: existing
      ? `NEW CLUB RECORD: ${ks} Ks IN A GAME! (Prev: ${existing.value} K · S${season})`
      : `NEW CLUB RECORD: ${ks} Ks IN A GAME! (S${season})`,
    value: ks,
  };
}

function checkLiveSingleGameHits(
  records: ClubFranchiseRecords | undefined,
  event: PlayEvent,
  batterBox: Readonly<Record<string, BatterBoxLine>>,
  season: number,
): LiveRecordBreakerAlert | null {
  if (!event.outcome || !event.batterId || !isScoringOrHitOutcome(event.outcome)) return null;
  const line = batterBox[event.batterId];
  const hits = line ? line.hits : 0;
  const existing = records?.mostSingleGameHits ?? null;
  if (!exceedsRecordBar(hits, existing, INAUGURAL_HITS_BAR)) return null;
  return {
    label: 'Single-Game Hits',
    headline: existing
      ? `NEW CLUB RECORD: ${hits} HITS IN A GAME! (Prev: ${existing.value} H · S${season})`
      : `NEW CLUB RECORD: ${hits} HITS IN A GAME! (S${season})`,
    value: hits,
  };
}

/**
 * Detects live mid-game franchise record breaks for the human club.
 */
export function detectLiveRecordBreaker(
  records: ClubFranchiseRecords | undefined,
  event: PlayEvent,
  session: GameSessionState,
  humanClub: Club,
  season: number,
): LiveRecordBreakerAlert | null {
  const { humanIsHome, humanSide, batterBox, pitcherBox } = resolveHumanGameContext(session, humanClub);
  const humanBattingEvent = (event.half === 'BOT') === humanIsHome;

  if (humanBattingEvent) {
    return (
      checkLiveLongestHr(records, event, season) ??
      checkLiveSingleGameHits(records, event, batterBox, season)
    );
  }
  return checkLiveSingleGameStrikeouts(records, event, pitcherBox, humanSide.activePitcherId, season);
}

function buildGameHrEntry(
  ev: PlayEvent,
  side: TeamGameSide,
  club: Club,
  season: number,
): ClubRecordEntry | null {
  if (ev.outcome !== 'home_run' || !ev.hrStatcast) return null;
  const batter = lookupClubPlayer(side, club, ev.batterId);
  return {
    value: ev.hrStatcast.distanceFt,
    holderName: batter?.name ?? club.name,
    holderId: batter?.id ?? club.id,
    season,
    detail: `${ev.hrStatcast.distanceFt} FT (${ev.hrStatcast.exitVeloMph} MPH)`,
  };
}

function findBestGameHomeRun(
  events: readonly PlayEvent[],
  humanIsHome: boolean,
  side: TeamGameSide,
  club: Club,
  season: number,
): ClubRecordEntry | null {
  let best: ClubRecordEntry | null = null;
  for (const ev of events) {
    if ((ev.half === 'BOT') !== humanIsHome) continue;
    const entry = buildGameHrEntry(ev, side, club, season);
    if (entry && (!best || entry.value > best.value)) {
      best = entry;
    }
  }
  return best;
}

function findBestSingleGamePitcherK(
  pitcherBox: Readonly<Record<string, PitcherBoxLine>>,
  side: TeamGameSide,
  club: Club,
  season: number,
): ClubRecordEntry | null {
  let best: ClubRecordEntry | null = null;
  for (const line of Object.values(pitcherBox)) {
    if (line.strikeouts <= 0 || (best && line.strikeouts <= best.value)) continue;
    const pitcher = lookupClubPlayer(side, club, line.playerId);
    best = {
      value: line.strikeouts,
      holderName: pitcher?.name ?? club.name,
      holderId: pitcher?.id ?? line.playerId,
      season,
      detail: `${line.strikeouts} Ks in 1 game`,
    };
  }
  return best;
}

function findBestSingleGameBatterHits(
  batterBox: Readonly<Record<string, BatterBoxLine>>,
  side: TeamGameSide,
  club: Club,
  season: number,
): ClubRecordEntry | null {
  let best: ClubRecordEntry | null = null;
  for (const line of Object.values(batterBox)) {
    if (line.hits <= 0 || (best && line.hits <= best.value)) continue;
    const batter = lookupClubPlayer(side, club, line.playerId);
    best = {
      value: line.hits,
      holderName: batter?.name ?? club.name,
      holderId: batter?.id ?? line.playerId,
      season,
      detail: `${line.hits}-for-${Math.max(line.hits, line.atBats)} game`,
    };
  }
  return best;
}

function findBestSeasonLeader(
  club: Club,
  batterBox: Readonly<Record<string, BatterBoxLine>>,
  stat: 'homeRuns' | 'stolenBases',
  season: number,
): ClubRecordEntry | null {
  let best: ClubRecordEntry | null = null;
  for (const player of club.roster) {
    const val = Math.max(player.seasonStats[stat], batterBox[player.id]?.[stat] ?? 0);
    if (val <= 0 || (best && val <= best.value)) continue;
    const unit = stat === 'homeRuns' ? 'HR' : 'SB';
    best = {
      value: val,
      holderName: player.name,
      holderId: player.id,
      season,
      detail: `${val} ${unit} (S${season})`,
    };
  }
  return best;
}

function applyCandidateRecord(
  current: ClubRecordEntry | null,
  candidate: ClubRecordEntry | null,
  label: string,
  headlines: string[],
): ClubRecordEntry | null {
  if (!candidate || (current && candidate.value <= current.value)) return current;
  headlines.push(`${label}: ${candidate.holderName} — ${candidate.detail}`);
  return candidate;
}

/**
 * Updates persistent Club Franchise Records after a completed game and reports any broken headlines.
 */
export function updateClubFranchiseRecordsAfterGame(
  records: ClubFranchiseRecords | undefined,
  params: UpdateClubFranchiseRecordsParams,
): { records: ClubFranchiseRecords; brokenHeadlines: string[] } {
  const prev = hydrateFranchiseRecords(records);
  const { club, session, humanWon, season, events = [] } = params;
  const { humanIsHome, humanSide, batterBox, pitcherBox } = resolveHumanGameContext(session, club);
  const brokenHeadlines: string[] = [];

  const nextWinStreak = humanWon ? prev.currentWinStreak + 1 : 0;
  const streakCandidate: ClubRecordEntry | null =
    nextWinStreak > 0
      ? {
          value: nextWinStreak,
          holderName: `${club.city} ${club.name}`,
          holderId: club.id,
          season,
          detail: `${nextWinStreak}-Game Win Streak`,
        }
      : null;

  const updated: ClubFranchiseRecords = {
    longestHomeRunFt: applyCandidateRecord(
      prev.longestHomeRunFt,
      findBestGameHomeRun(events, humanIsHome, humanSide, club, season),
      'Longest Home Run',
      brokenHeadlines,
    ),
    mostSingleGameStrikeouts: applyCandidateRecord(
      prev.mostSingleGameStrikeouts,
      findBestSingleGamePitcherK(pitcherBox, humanSide, club, season),
      'Single-Game Strikeouts',
      brokenHeadlines,
    ),
    mostSingleGameHits: applyCandidateRecord(
      prev.mostSingleGameHits,
      findBestSingleGameBatterHits(batterBox, humanSide, club, season),
      'Single-Game Hits',
      brokenHeadlines,
    ),
    longestWinStreak: applyCandidateRecord(
      prev.longestWinStreak,
      streakCandidate,
      'Longest Win Streak',
      brokenHeadlines,
    ),
    currentWinStreak: nextWinStreak,
    mostSeasonHomeRuns: applyCandidateRecord(
      prev.mostSeasonHomeRuns,
      findBestSeasonLeader(club, batterBox, 'homeRuns', season),
      'Season Home Runs',
      brokenHeadlines,
    ),
    mostSeasonStolenBases: applyCandidateRecord(
      prev.mostSeasonStolenBases,
      findBestSeasonLeader(club, batterBox, 'stolenBases', season),
      'Season Stolen Bases',
      brokenHeadlines,
    ),
  };

  return { records: updated, brokenHeadlines };
}
