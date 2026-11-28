import { isScoringOrHitOutcome, type AtBatOutcome, type PlayEvent } from '../models/playEvent';
import { PITCH_TYPE_SHORT_LABELS } from '../models/player';

export interface BatterAtBatMemoryEntry {
  inning: number;
  shortResult: string;
  pitchLabel: string | null;
  isHit: boolean;
}

const COMPLETED_PA_LABELS: Readonly<Partial<Record<AtBatOutcome, string>>> = {
  single: '1B',
  double: '2B',
  triple: '3B',
  home_run: 'HR',
  bunt_single: '1B',
  walk: 'BB',
  strikeout: 'K',
  ground_out: 'GO',
  fly_out: 'FO',
  line_out: 'LO',
  double_play: 'DP',
  sac_fly: 'SF',
  fielding_error: 'E',
  bunt_out: 'SAC',
};

function formatOrdinalInning(inning: number): string {
  const mod100 = inning % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${inning}th`;
  const mod10 = inning % 10;
  if (mod10 === 1) return `${inning}st`;
  if (mod10 === 2) return `${inning}nd`;
  if (mod10 === 3) return `${inning}rd`;
  return `${inning}th`;
}

/**
 * Scans chronological game events for completed plate appearances by `batterId` today.
 */
export function extractBatterGameMemory(
  events: readonly PlayEvent[],
  batterId: string,
): BatterAtBatMemoryEntry[] {
  const entries: BatterAtBatMemoryEntry[] = [];
  for (const ev of events) {
    if (ev.batterId !== batterId || !ev.outcome) continue;
    const shortResult = COMPLETED_PA_LABELS[ev.outcome];
    if (!shortResult) continue;
    const pitchType = ev.pitchThrown?.pitchType;
    entries.push({
      inning: ev.inning,
      shortResult,
      pitchLabel: pitchType ? PITCH_TYPE_SHORT_LABELS[pitchType] : null,
      isHit: isScoringOrHitOutcome(ev.outcome),
    });
  }
  return entries;
}

/**
 * Formats a batter's completed plate appearances today into a compact 1-line strip
 * (e.g. `1st K (Slider) · 3rd 2B (4-Seam)`), or `null` when empty.
 */
export function formatBatterGameMemoryLine(
  entries: readonly BatterAtBatMemoryEntry[],
): string | null {
  if (entries.length === 0) return null;
  return entries
    .map((entry) => {
      const inningTag = formatOrdinalInning(entry.inning);
      return entry.pitchLabel
        ? `${inningTag} ${entry.shortResult} (${entry.pitchLabel})`
        : `${inningTag} ${entry.shortResult}`;
    })
    .join(' · ');
}
