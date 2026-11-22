import type { GameSessionState } from './gameState';

export type DefensiveShiftId = 'standard' | 'infield_in' | 'no_doubles' | 'bunt_defense';

export interface DefensiveShiftMeta {
  id: DefensiveShiftId;
  label: string;
  shortLabel: string;
  description: string;
  groundballOutBonus: number;
  xbhSuppressBonus: number;
  buntOutBonus: number;
}

export const DEFENSIVE_SHIFTS: readonly DefensiveShiftMeta[] = [
  {
    id: 'standard',
    label: 'Standard Alignment',
    shortLabel: 'Standard',
    description: 'Balanced 9-fielder positioning across infield & outfield gaps.',
    groundballOutBonus: 0,
    xbhSuppressBonus: 0,
    buntOutBonus: 0,
  },
  {
    id: 'infield_in',
    label: 'Infield In',
    shortLabel: 'Infield In',
    description: 'Cuts down runner at the plate on grounders, slightly opens bloops.',
    groundballOutBonus: 0.04,
    xbhSuppressBonus: -0.02,
    buntOutBonus: 0.06,
  },
  {
    id: 'no_doubles',
    label: 'No-Doubles Deep',
    shortLabel: 'No Doubles',
    description: 'Outfielders guard the lines & alleys to choke off 2B/3B extra-base rallies.',
    groundballOutBonus: -0.02,
    xbhSuppressBonus: 0.08,
    buntOutBonus: -0.02,
  },
  {
    id: 'bunt_defense',
    label: 'Bunt Defense',
    shortLabel: 'Bunt Def',
    description: 'Corners crash hard to smother sacrifice & drag bunts.',
    groundballOutBonus: -0.01,
    xbhSuppressBonus: -0.01,
    buntOutBonus: 0.16,
  },
];

export type WarmupStatus = 'cold' | 'warming' | 'hot' | 'overcooked';

export interface BullpenWarmupEntry {
  pitcherId: string;
  warmupPitches: number;
  status: WarmupStatus;
  controlModifier: number;
}

/** Classifies a reliever's bullpen phone readiness from warm-up pitches thrown. */
export function evaluateBullpenWarmup(pitcherId: string, warmupPitches: number): BullpenWarmupEntry {
  if (warmupPitches <= 0) {
    return { pitcherId, warmupPitches: 0, status: 'cold', controlModifier: -5 };
  }
  if (warmupPitches < 3) {
    return { pitcherId, warmupPitches, status: 'warming', controlModifier: -2 };
  }
  if (warmupPitches <= 8) {
    return { pitcherId, warmupPitches, status: 'hot', controlModifier: 3 };
  }
  return { pitcherId, warmupPitches, status: 'overcooked', controlModifier: -3 };
}

/** Advances warmup counters for every reliever currently loosening in the bullpen. */
export function tickBullpenWarmups(
  warmups: Readonly<Record<string, number>>,
  activeWarmingIds: readonly string[],
): Record<string, number> {
  const next: Record<string, number> = { ...warmups };
  for (const id of activeWarmingIds) {
    next[id] = (next[id] ?? 0) + 1;
  }
  return next;
}

function baseThreatValue(bases: GameSessionState['bases']): number {
  let threat = 0;
  if (bases[0]) threat += 0.35;
  if (bases[1]) threat += 0.62;
  if (bases[2]) threat += 0.85;
  return threat;
}

/**
 * Computes real-time Home Win Probability (0.02..0.98) from score differential,
 * remaining innings, half-inning advantage, outs, and active baserunners.
 */
export function estimateHomeWinProbability(session: GameSessionState): number {
  if (session.status === 'completed') {
    return session.winnerClubId === session.home.clubId ? 1 : 0;
  }

  const scoreDiff = session.home.score - session.away.score;
  const regInnings = Math.max(5, session.regulationInnings);
  const inningsLeft = Math.max(0.5, regInnings - session.inning + (session.half === 'TOP' ? 1 : 0.5));
  const runScale = 0.42 + (1 / Math.sqrt(inningsLeft)) * 0.72;

  const outFactor = (3 - session.outs) / 3;
  const liveThreat = baseThreatValue(session.bases) * outFactor * 0.55;
  const signedThreat = session.half === 'BOT' ? liveThreat : -liveThreat;
  const homeLastUps = session.half === 'TOP' ? 0.16 : 0.04;

  const z = (scoreDiff + signedThreat + homeLastUps) * runScale;
  const prob = 1 / (1 + Math.exp(-z));
  return Number(Math.max(0.02, Math.min(0.98, prob)).toFixed(3));
}
