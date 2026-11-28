import type { BallparkPresetId } from '../ballparks/stadiumCatalog';
import type { Club } from '../models/club';
import { isScoringOrHitOutcome, type AtBatOutcome, type PlayEvent } from '../models/playEvent';
import type { GameSessionState, TeamGameSide } from './gameState';

export interface EnhanceBroadcastCommentaryParams {
  event: PlayEvent;
  session: GameSessionState;
  awayClub: Club;
  homeClub: Club;
  ballparkId?: BallparkPresetId;
  rallyHitStreak?: number;
  priorAtBatSummary?: string | null;
  isBossShowdown?: boolean;
}

const MAX_BROADCAST_CALL_CHARS = 165;
const REPEAT_STRIKEOUT_PATTERN = /(^|\s)K(\s|$)/;

const HIGH_IMPACT_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'single',
  'double',
  'triple',
  'home_run',
  'bunt_single',
  'strikeout',
  'sac_fly',
]);

function lookupActorName(
  side: TeamGameSide,
  club: Club,
  playerId: string | undefined,
  fallback: string,
): string {
  if (!playerId) return fallback;
  const fromSide = side.playersById[playerId];
  if (fromSide) return fromSide.name;
  const fromRoster = club.roster.find((p) => p.id === playerId);
  return fromRoster?.name ?? fallback;
}

function resolveBrickyardWallCall(
  event: PlayEvent,
  landingX: number,
  batterName: string,
  distTag: string,
): string | null {
  if (landingX >= -4) return null;
  if (event.outcome === 'home_run') {
    return `${batterName} blasts it ${distTag}over Brickyard's towering 37-foot Emerald Wall!`;
  }
  if (event.outcome === 'double' || event.outcome === 'triple') {
    return `${batterName} bangs a ${event.outcome} off Brickyard's towering 37-foot Emerald Wall!`;
  }
  return null;
}

function resolveParkLandmarkCall(
  event: PlayEvent,
  parkId: BallparkPresetId | undefined,
  batterName: string,
): string | null {
  const landingX = event.ballFlight?.landingX ?? 0;
  const dist = event.hrStatcast?.distanceFt;
  const distTag = dist ? `${dist} FT! ` : '';

  if (parkId === 'brickyard_classic') {
    return resolveBrickyardWallCall(event, landingX, batterName, distTag);
  }
  if (event.outcome !== 'home_run') return null;
  if (parkId === 'bayfront_cove' && landingX > 6) {
    return `${batterName}: ${distTag}SPLASH HIT into Bayfront Cove — kayaks scrambling for the souvenir!`;
  }
  if (parkId === 'cornfield_twilight') {
    return `${batterName} crushes it ${distTag}— Sails deep into the golden cornstalks!`;
  }
  return null;
}

function buildCoreBoothCall(
  params: EnhanceBroadcastCommentaryParams,
  batterName: string,
  fielderName: string,
): { text: string; enhanced: boolean } {
  const { event, session } = params;
  if (event.fieldingHighlight?.robbedHomeRun) {
    return {
      text: `UNBELIEVABLE! ${fielderName} scales the fence and steals a home run right out of the seats!`,
      enhanced: true,
    };
  }
  if (event.brokenBat) {
    return {
      text: `SHATTERED LUMBER! ${batterName} fights it off with a broken-bat bloop single!`,
      enhanced: true,
    };
  }
  const parkCall = resolveParkLandmarkCall(event, params.ballparkId ?? session.ballparkId, batterName);
  if (parkCall) {
    return { text: parkCall, enhanced: true };
  }
  if (
    event.outcome === 'strikeout' &&
    params.priorAtBatSummary &&
    REPEAT_STRIKEOUT_PATTERN.test(params.priorAtBatSummary)
  ) {
    return {
      text: `${batterName} rings up K! Got him again — pitcher owns this matchup today!`,
      enhanced: true,
    };
  }
  return { text: event.commentary, enhanced: false };
}

function isRallyKnockEvent(event: PlayEvent): boolean {
  if (event.outsAfter > event.outsBefore) return false;
  if (!event.outcome) return false;
  return isScoringOrHitOutcome(event.outcome) || event.outcome === 'walk';
}

function resolveClutchSuffix(isBossShowdown: boolean, highLeverage: boolean): string | null {
  if (isBossShowdown && highLeverage) return '· 👑 Boss Showdown clutch!';
  if (isBossShowdown) return '· 👑 Boss Showdown!';
  if (highLeverage) return '· 🔥 High-leverage clutch!';
  return null;
}

function resolveBoothSuffix(params: EnhanceBroadcastCommentaryParams): string | null {
  const { event, rallyHitStreak = 0, isBossShowdown = false } = params;
  if (rallyHitStreak >= 3 && isRallyKnockEvent(event)) {
    return `— that's ${rallyHitStreak} straight knocks! The crowd is shaking the bleachers!`;
  }
  if (!event.outcome || !HIGH_IMPACT_OUTCOMES.has(event.outcome)) {
    return null;
  }
  return resolveClutchSuffix(isBossShowdown, (event.leverageIndex ?? 0) >= 1.8);
}

function clampToMax(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const trimmed = text.slice(0, maxChars - 1).replace(/\s+\S*$/, '').trim();
  return trimmed.length > 0 ? `${trimmed}…` : `${text.slice(0, maxChars - 1)}…`;
}

function combineBoothLines(base: string, suffix: string | null): string {
  if (!suffix) return clampToMax(base, MAX_BROADCAST_CALL_CHARS);
  const full = `${base} ${suffix}`;
  if (full.length <= MAX_BROADCAST_CALL_CHARS) return full;

  const allowedBaseLen = MAX_BROADCAST_CALL_CHARS - suffix.length - 1;
  if (allowedBaseLen < 20) return clampToMax(suffix, MAX_BROADCAST_CALL_CHARS);
  return `${clampToMax(base, allowedBaseLen)} ${suffix}`;
}

/**
 * Pure, deterministic 90s Broadcast Booth announcer enhancer.
 * Elevates raw PlayEvent commentary with park landmarks, robberies, broken bats,
 * rally chains, duel memory, and clutch/Boss Showdown flavor without mutating PlayEvent.
 */
export function enhanceBroadcastCommentary(params: EnhanceBroadcastCommentaryParams): string {
  const { event, session, awayClub, homeClub } = params;
  const isTop = event.half === 'TOP';
  const battingSide = isTop ? session.away : session.home;
  const fieldingSide = isTop ? session.home : session.away;
  const battingClub = isTop ? awayClub : homeClub;
  const fieldingClub = isTop ? homeClub : awayClub;

  const batterName = lookupActorName(battingSide, battingClub, event.batterId, 'The batter');
  const fielderName = lookupActorName(
    fieldingSide,
    fieldingClub,
    event.fieldingHighlight?.fielderId,
    'The outfielder',
  );

  const core = buildCoreBoothCall(params, batterName, fielderName);
  const suffix = resolveBoothSuffix(params);
  if (!core.enhanced && !suffix) return event.commentary;

  return combineBoothLines(core.text, suffix);
}
