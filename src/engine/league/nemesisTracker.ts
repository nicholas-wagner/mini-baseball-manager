import type { AtBatOutcome, PlayEvent } from '../models/playEvent';

export interface HeadToHeadRecord {
  batterId: string;
  pitcherId: string;
  pa: number;
  hits: number;
  homeRuns: number;
  strikeouts: number;
  walks: number;
}

export type NemesisHistoryMap = Record<string, HeadToHeadRecord>;

export type NemesisTier = 'batter_owns' | 'pitcher_owns' | 'heated_grudge';

export interface NemesisMatchupEvaluation {
  tier: NemesisTier;
  badgeText: string;
  bannerText: string;
  batterContactDelta: number;
  batterPowerDelta: number;
  pitcherStuffDelta: number;
  pitcherControlDelta: number;
  record: HeadToHeadRecord;
}

const RESOLVED_PA_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'walk',
  'strikeout',
  'single',
  'double',
  'triple',
  'home_run',
  'ground_out',
  'fly_out',
  'line_out',
  'double_play',
  'sac_fly',
  'fielding_error',
  'bunt_single',
  'bunt_out',
]);

const HIT_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'single',
  'double',
  'triple',
  'home_run',
  'bunt_single',
]);

export function makeNemesisKey(batterId: string, pitcherId: string): string {
  return `${batterId}::${pitcherId}`;
}

function isResolvedPaEvent(
  ev: PlayEvent,
): ev is PlayEvent & { batterId: string; pitcherId: string; outcome: AtBatOutcome } {
  return Boolean(ev.batterId && ev.pitcherId && ev.outcome && RESOLVED_PA_OUTCOMES.has(ev.outcome));
}

function incrementNemesisRecord(
  prev: HeadToHeadRecord,
  outcome: AtBatOutcome,
): HeadToHeadRecord {
  return {
    ...prev,
    pa: prev.pa + 1,
    hits: prev.hits + (HIT_OUTCOMES.has(outcome) ? 1 : 0),
    homeRuns: prev.homeRuns + (outcome === 'home_run' ? 1 : 0),
    strikeouts: prev.strikeouts + (outcome === 'strikeout' ? 1 : 0),
    walks: prev.walks + (outcome === 'walk' ? 1 : 0),
  };
}

/** Updates persistent head-to-head batter-vs-pitcher history from completed plate appearances. */
export function recordMatchupEvents(
  history: NemesisHistoryMap,
  events: readonly PlayEvent[],
): NemesisHistoryMap {
  const next: NemesisHistoryMap = { ...history };
  for (const ev of events) {
    if (!isResolvedPaEvent(ev)) continue;
    const key = makeNemesisKey(ev.batterId, ev.pitcherId);
    const prev = next[key] ?? {
      batterId: ev.batterId,
      pitcherId: ev.pitcherId,
      pa: 0,
      hits: 0,
      homeRuns: 0,
      strikeouts: 0,
      walks: 0,
    };
    next[key] = incrementNemesisRecord(prev, ev.outcome);
  }
  return next;
}

/** Evaluates active head-to-head Nemesis psychology & combat modifiers for a live matchup. */
export function evaluateNemesisMatchup(
  history: NemesisHistoryMap,
  batterId: string,
  pitcherId: string,
  batterName: string,
  pitcherName: string,
): NemesisMatchupEvaluation | null {
  const rec = history[makeNemesisKey(batterId, pitcherId)];
  if (!rec || rec.pa < 2) return null;

  const ab = Math.max(1, rec.pa - rec.walks);
  const avg = rec.hits / ab;

  if (rec.homeRuns >= 1 || (rec.hits >= 2 && avg >= 0.45)) {
    const hrTag = rec.homeRuns > 0 ? `, ${rec.homeRuns} HR` : '';
    return {
      tier: 'batter_owns',
      badgeText: `🔥 NEMESIS: OWNS HIM (${rec.hits}-${ab}${hrTag})`,
      bannerText: `${batterName} owns ${pitcherName} (${rec.hits}-for-${ab}${hrTag}) — locked-in confidence (+4 CON, +4 PWR)!`,
      batterContactDelta: 4,
      batterPowerDelta: 4,
      pitcherStuffDelta: -1,
      pitcherControlDelta: -1,
      record: rec,
    };
  }

  if (rec.strikeouts >= 2 && rec.hits === 0) {
    return {
      tier: 'pitcher_owns',
      badgeText: `❄️ NEMESIS: REVENGE SPOT (0-${ab}, ${rec.strikeouts} K)`,
      bannerText: `${pitcherName} has ${batterName}’s number (0-for-${ab}, ${rec.strikeouts} K) — mound swagger (+4 STU, +3 CTL)!`,
      batterContactDelta: -1,
      batterPowerDelta: 0,
      pitcherStuffDelta: 4,
      pitcherControlDelta: 3,
      record: rec,
    };
  }

  if (rec.pa >= 4) {
    return {
      tier: 'heated_grudge',
      badgeText: `⚔️ NEMESIS GRUDGE (${rec.hits}-${ab}, ${rec.strikeouts} K)`,
      bannerText: `Bad blood rematch: ${batterName} vs ${pitcherName} (${rec.pa} career battles — +2 CON / +2 STU)!`,
      batterContactDelta: 2,
      batterPowerDelta: 1,
      pitcherStuffDelta: 2,
      pitcherControlDelta: 1,
      record: rec,
    };
  }

  return null;
}
