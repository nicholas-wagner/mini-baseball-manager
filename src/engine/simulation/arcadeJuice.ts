import { getBallparkPreset, type BallparkPresetId } from '../ballparks/stadiumCatalog';
import type {
  AtBatOutcome,
  HomeRunStatcast,
  PlayEvent,
  PlaySoundCue,
} from '../models/playEvent';
import type { BattedBallType, PitchType, Player } from '../models/player';

export type RallyChainTone = 'gold' | 'fire' | 'electric';

export interface RallyChainState {
  hitStreak: number;
  label: string | null;
  tone: RallyChainTone | null;
  soundCue: PlaySoundCue | null;
  isThreeUpThreeDown: boolean;
}

const FASTBALL_CUTTER_TYPES: ReadonlySet<PitchType> = new Set([
  'four_seam',
  'two_seam',
  'cutter',
]);

const RALLY_SPARK_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'single',
  'double',
  'triple',
  'home_run',
  'bunt_single',
  'walk',
  'fielding_error',
]);

const RALLY_OUT_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'strikeout',
  'ground_out',
  'fly_out',
  'line_out',
  'double_play',
  'sac_fly',
  'bunt_out',
  'pickoff_out',
]);

const ARGUE_TOUGH_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'called_strike',
  'strikeout',
  'pickoff_out',
  'ground_out',
  'double_play',
  'line_out',
  'bunt_out',
]);

const ARGUE_PITCHING_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'ball',
  'walk',
  'pickoff_safe',
]);

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function deterministicHash(seedText: string, eventSeq: number): number {
  let h = (2166136261 ^ (eventSeq * 16777619)) >>> 0;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function resolveHrLandmarkCall(
  ballparkId: BallparkPresetId | undefined,
  landingX: number,
  distanceFt: number,
): string {
  if (ballparkId === 'bayfront_cove' && landingX > 6) {
    return 'SPLASH HIT INTO THE COVE!';
  }
  if (ballparkId === 'brickyard_classic' && landingX < -4) {
    return 'OVER THE EMERALD WALL!';
  }
  if (ballparkId === 'cornfield_twilight') {
    return 'INTO THE CORNFIELD!';
  }
  if (ballparkId === 'high_altitude_mesa' && distanceFt >= 435) {
    return 'MILE-HIGH MOONSHOT!';
  }
  if (distanceFt >= 440) {
    return 'UPPER DECK CRUSHER!';
  }
  return 'NO-DOUBT HOME RUN!';
}

/**
 * Pure deterministic Home Run Statcast calculator (ZERO RNG consumption).
 * Maps batter power, landing depth, park altitude/factors, and swing intent into arcade numbers.
 */
export function computeHomeRunStatcast(params: {
  batter: Player;
  landingX: number;
  landingZ: number;
  ballparkId?: BallparkPresetId;
  eventSeq: number;
  isPowerSwing?: boolean;
}): HomeRunStatcast {
  const { batter, landingX, landingZ, ballparkId, eventSeq, isPowerSwing } = params;
  const hash = deterministicHash(`${batter.id}:${ballparkId ?? 'default'}`, eventSeq);
  const powerNorm = Math.max(0, Math.min(1, (batter.ratings.power - 35) / 64));
  const depthBonus = Math.max(0, (Math.abs(landingZ) - 38) * 1.9);
  const park = getBallparkPreset(ballparkId);
  const parkFtBonus =
    ballparkId === 'high_altitude_mesa'
      ? 18
      : Math.round((park.factors.hrFactor - 1) * 45);
  const swingFtBonus = isPowerSwing ? 12 : 0;
  const jitterFt = (hash % 19) - 7;
  const distanceFt = clampInt(
    368 + powerNorm * 52 + depthBonus + parkFtBonus + swingFtBonus + jitterFt,
    358,
    478,
  );

  const swingVeloBonus = isPowerSwing ? 3 : 0;
  const parkVeloBonus = ballparkId === 'high_altitude_mesa' ? 2 : 0;
  const jitterMph = ((hash >>> 8) % 5) - 2;
  const exitVeloMph = clampInt(
    98 + powerNorm * 13 + swingVeloBonus + parkVeloBonus + jitterMph,
    96,
    118,
  );

  return {
    distanceFt,
    exitVeloMph,
    landmarkCall: resolveHrLandmarkCall(ballparkId, landingX, distanceFt),
  };
}

/**
 * Pure deterministic broken-bat bloop detector (ZERO RNG consumption).
 * Fires on ~14% of singles off fastballs and cutters using a stable hash.
 */
export function detectBrokenBatBloop(params: {
  outcome?: AtBatOutcome;
  battedBallType?: BattedBallType;
  pitchType?: PitchType;
  eventSeq: number;
  batterId?: string;
}): boolean {
  if (params.outcome !== 'single') return false;
  if (!params.pitchType || !FASTBALL_CUTTER_TYPES.has(params.pitchType)) return false;
  const key = `${params.batterId ?? 'batter'}:${params.pitchType}:${params.battedBallType ?? 'hit'}`;
  return deterministicHash(key, params.eventSeq) % 100 < 14;
}

function isRallyBreakingOut(event: PlayEvent): boolean {
  if (event.outsAfter > event.outsBefore) return true;
  return Boolean(event.outcome && RALLY_OUT_OUTCOMES.has(event.outcome));
}

function buildRallyPresentation(hitStreak: number): Pick<RallyChainState, 'label' | 'tone' | 'soundCue'> {
  if (hitStreak >= 4) {
    return {
      label: `⚡ ${hitStreak}× UNSTOPPABLE RALLY!`,
      tone: 'electric',
      soundCue: 'stadium_stomp_clap',
    };
  }
  if (hitStreak === 3) {
    return {
      label: '🔥🔥 3× RALLY CHAIN!',
      tone: 'fire',
      soundCue: 'stadium_stomp_clap',
    };
  }
  if (hitStreak === 2) {
    return {
      label: '🔥 2× RALLY!',
      tone: 'gold',
      soundCue: 'organ_rally',
    };
  }
  return { label: null, tone: null, soundCue: null };
}

/**
 * Evaluates consecutive on-base sparks and clean 3-up, 3-down defensive frames in a half-inning.
 */
export function evaluateRallyChain(
  events: readonly PlayEvent[],
  inning: number,
  half: 'TOP' | 'BOT',
): RallyChainState {
  let hitStreak = 0;
  let reachedBaseCount = 0;
  let maxOuts = 0;

  for (const ev of events) {
    if (ev.inning !== inning || ev.half !== half) continue;
    if (ev.outsAfter > maxOuts) maxOuts = ev.outsAfter;
    if (ev.outcome && RALLY_SPARK_OUTCOMES.has(ev.outcome)) {
      hitStreak += 1;
      reachedBaseCount += 1;
    } else if (isRallyBreakingOut(ev)) {
      hitStreak = 0;
    }
  }

  return {
    hitStreak,
    ...buildRallyPresentation(hitStreak),
    isThreeUpThreeDown: maxOuts >= 3 && reachedBaseCount === 0,
  };
}

function isCaughtStealingEvent(event: PlayEvent): boolean {
  return event.type === 'stolen_base_attempt' && event.outsAfter > event.outsBefore;
}

function isToughPitchingCall(event: PlayEvent, isHumanPitching: boolean): boolean {
  return isHumanPitching && Boolean(event.outcome && ARGUE_PITCHING_OUTCOMES.has(event.outcome));
}

/**
 * Checks whether the human skipper can trigger the 1-per-game cartoon "Argue Call!" chip.
 */
export function canArgueLatestCall(
  latestEvent: PlayEvent | null,
  arguedAlready: boolean,
  gameCompleted: boolean,
  isHumanPitching = false,
): boolean {
  if (!latestEvent || arguedAlready || gameCompleted) return false;
  if (isCaughtStealingEvent(latestEvent)) return true;
  if (latestEvent.outcome && ARGUE_TOUGH_OUTCOMES.has(latestEvent.outcome)) return true;
  return isToughPitchingCall(latestEvent, isHumanPitching);
}
