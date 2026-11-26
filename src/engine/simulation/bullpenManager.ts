import {
  computePlayerOverall,
  PITCHER_ROLE_SHORT_LABELS,
  type PitcherRole,
  type Player,
} from '../models/player';
import { fatigueToEndurance } from '../rpg/pitcherEndurance';
import {
  evaluatePitcherRoleSituation,
  scoreBullpenCandidate,
  selectBestBullpenReliever,
  type PitcherSituationContext,
} from '../rpg/pitcherRoles';
import {
  getBattingSide,
  getCurrentBatter,
  getCurrentLeverage,
  getFieldingSide,
  type GameSessionState,
} from './gameState';

export type BullpenMode = 'auto' | 'semi_auto' | 'manual';

export type BullpenTriggerReason =
  | 'gassed'
  | 'tiring_jam'
  | 'shelled'
  | 'tiring'
  | 'save_spot'
  | 'late_jam';

export interface BullpenModeOption {
  id: BullpenMode;
  shortLabel: string;
  label: string;
  description: string;
}

export const BULLPEN_MODE_OPTIONS: readonly BullpenModeOption[] = [
  {
    id: 'auto',
    shortLabel: 'Auto',
    label: 'Auto (Coach Swaps)',
    description: 'Bullpen Coach brings in fresh arms and closers automatically.',
  },
  {
    id: 'semi_auto',
    shortLabel: 'Ask Me',
    label: 'Ask Me (Semi-Auto)',
    description: 'Coach Pops pops up a 1-tap call when a tired arm or save spot hits.',
  },
  {
    id: 'manual',
    shortLabel: 'Manual',
    label: 'Manual (Full Control)',
    description: '100% your call — never pulls your pitcher automatically.',
  },
];

export interface BullpenRecommendation {
  shouldSwap: boolean;
  urgency: 'critical' | 'recommended' | 'optional';
  trigger: BullpenTriggerReason;
  recommendedReliever: Player;
  headline: string;
  shortTag: string;
  matchupNote: string;
  autoCommentary: string;
  snoozeKey: string;
}

export interface BullpenCandidateSummary {
  player: Player;
  ovr: number;
  roleLabel: string;
  isRecommended: boolean;
  fitTag: string | null;
  platoonEdge: 'favorable' | 'neutral' | 'tough';
  freshnessPct: number;
}

function getAvailableRelievers(session: GameSessionState, sideKey: 'away' | 'home'): Player[] {
  const side = session[sideKey];
  return side.bullpenIds
    .filter((id) => !side.usedPitcherIds.includes(id))
    .map((id) => side.playersById[id])
    .filter((p): p is Player => Boolean(p));
}

function isSideOnDefense(session: GameSessionState, sideKey: 'away' | 'home'): boolean {
  return (session.half === 'TOP') === (sideKey === 'home');
}

/** Builds the canonical situation context for pitcher role evaluation and reliever ranking. */
export function buildBullpenSituationContext(
  session: GameSessionState,
  sideKey: 'away' | 'home',
): PitcherSituationContext {
  const pitchingSide = session[sideKey];
  const oppSide = sideKey === 'home' ? session.away : session.home;
  const onDefense = isSideOnDefense(session, sideKey);
  const nextBatter = onDefense
    ? getCurrentBatter(session)
    : oppSide.playersById[oppSide.lineup[oppSide.lineupIndex % oppSide.lineup.length].playerId];
  return {
    inning: session.inning,
    regulationInnings: session.regulationInnings,
    lead: pitchingSide.score - oppSide.score,
    hasRunnersOn: onDefense && session.bases.some((b) => b !== null),
    leverageIndex: getCurrentLeverage(session).leverageIndex,
    batterEffectiveSide: nextBatter?.bats === 'L' ? 'L' : 'R',
  };
}

function resolveFitTag(reliever: Player, ctx: PitcherSituationContext): string | null {
  const role: PitcherRole = reliever.pitcherRole ?? 'short_reliever';
  const evalFit = evaluatePitcherRoleSituation(reliever, ctx);
  if (evalFit.roleFit !== 'ideal') return null;
  if (role === 'closer') return 'Save Spot';
  if (role === 'fireman') return 'Jam Stopper';
  if (role === 'loogy') return 'L vs L Edge';
  if (role === 'setup_man') return 'Setup Arm';
  if (role === 'long_reliever') return 'Long Arm';
  return 'Fresh Arm';
}

function resolvePlatoonEdge(
  throws: Player['throws'],
  batterSide: 'L' | 'R' | 'S',
): 'favorable' | 'neutral' | 'tough' {
  if (batterSide === 'S') return 'neutral';
  return throws === batterSide ? 'favorable' : 'tough';
}

/** Ranks every unused reliever with Coach's Pick first plus OVR, freshness, role fit, and platoon edge. */
export function rankBullpenCandidates(
  session: GameSessionState,
  sideKey: 'away' | 'home',
): BullpenCandidateSummary[] {
  const available = getAvailableRelievers(session, sideKey);
  if (available.length === 0) return [];

  const ctx = buildBullpenSituationContext(session, sideKey);
  const oppSide = sideKey === 'home' ? session.away : session.home;
  const nextBatter = isSideOnDefense(session, sideKey)
    ? getCurrentBatter(session)
    : oppSide.playersById[oppSide.lineup[oppSide.lineupIndex % oppSide.lineup.length].playerId];
  const batterBats = nextBatter?.bats ?? 'R';
  const best = selectBestBullpenReliever(available, ctx);

  return [...available]
    .sort((a, b) => scoreBullpenCandidate(b, ctx) - scoreBullpenCandidate(a, ctx))
    .map((player) => {
      const roleLabel = player.pitcherRole ? PITCHER_ROLE_SHORT_LABELS[player.pitcherRole] : 'RP';
      return {
        player,
        ovr: computePlayerOverall(player),
        roleLabel,
        isRecommended: best?.id === player.id,
        fitTag: resolveFitTag(player, ctx),
        platoonEdge: resolvePlatoonEdge(player.throws, batterBats),
        freshnessPct: fatigueToEndurance(player.fatigue),
      };
    });
}

interface TriggerCheck {
  trigger: BullpenTriggerReason;
  urgency: 'critical' | 'recommended' | 'optional';
}

const LATE_JAM_ROLES: ReadonlySet<PitcherRole> = new Set([
  'fireman',
  'setup_man',
  'closer',
  'loogy',
]);

function isSaveSpotTrigger(
  session: GameSessionState,
  ctx: PitcherSituationContext,
  currentPitcher: Player,
  pitchesThrown: number,
  endurance: number,
  available: readonly Player[],
): boolean {
  const isFinal = session.inning >= session.regulationInnings;
  if (!isFinal || session.outs > 0 || ctx.lead < 1 || ctx.lead > 3) return false;
  if (currentPitcher.pitcherRole === 'closer' || pitchesThrown < 12) return false;
  const hasCloser = available.some((p) => p.pitcherRole === 'closer');
  return hasCloser || endurance <= 52;
}

function isLateJamTrigger(
  session: GameSessionState,
  ctx: PitcherSituationContext,
  pitchesThrown: number,
  endurance: number,
  available: readonly Player[],
): boolean {
  const isLate = session.inning >= Math.max(3, session.regulationInnings - 1);
  if (!isLate || Math.abs(ctx.lead) > 2 || !ctx.hasRunnersOn) return false;
  if (endurance > 50 || pitchesThrown < 12) return false;
  return available.some((p) => p.pitcherRole && LATE_JAM_ROLES.has(p.pitcherRole));
}

function isTiringJam(endurance: number, ctx: PitcherSituationContext): boolean {
  return endurance <= 38 && (ctx.hasRunnersOn || ctx.leverageIndex >= 1.45);
}

function isShelledOuting(
  regulationInnings: number,
  runsAllowed: number,
  pitchesThrown: number,
  endurance: number,
): boolean {
  const shelledRuns = regulationInnings <= 5 ? 3 : 4;
  return runsAllowed >= shelledRuns && pitchesThrown >= 12 && endurance <= 62;
}

function detectBullpenTrigger(
  session: GameSessionState,
  ctx: PitcherSituationContext,
  currentPitcher: Player,
  endurance: number,
  pitchesThrown: number,
  runsAllowed: number,
  available: readonly Player[],
): TriggerCheck | null {
  if (endurance <= 20) return { trigger: 'gassed', urgency: 'critical' };
  if (isTiringJam(endurance, ctx)) return { trigger: 'tiring_jam', urgency: 'critical' };
  if (isShelledOuting(session.regulationInnings, runsAllowed, pitchesThrown, endurance)) {
    return { trigger: 'shelled', urgency: 'recommended' };
  }
  if (endurance <= 30) return { trigger: 'tiring', urgency: 'recommended' };
  if (isSaveSpotTrigger(session, ctx, currentPitcher, pitchesThrown, endurance, available)) {
    return { trigger: 'save_spot', urgency: 'recommended' };
  }
  if (isLateJamTrigger(session, ctx, pitchesThrown, endurance, available)) {
    return { trigger: 'late_jam', urgency: 'optional' };
  }
  return null;
}

function formatRecommendationCopy(
  trigger: BullpenTriggerReason,
  currentPitcher: Player,
  reliever: Player,
  endurance: number,
  inning: number,
  runsAllowed: number,
): Pick<BullpenRecommendation, 'headline' | 'shortTag' | 'matchupNote' | 'autoCommentary'> {
  const curFirst = currentPitcher.name.split(' ')[0];
  const relRole = reliever.pitcherRole ? PITCHER_ROLE_SHORT_LABELS[reliever.pitcherRole] : 'RP';
  const ovr = computePlayerOverall(reliever);
  const relTag = `${reliever.throws}HP · ${relRole}`;
  const matchupNote = `${relTag} · ${ovr} OVR · Fresh arm`;

  if (trigger === 'save_spot') {
    return {
      shortTag: 'Save Spot',
      headline: `Save spot in the ${inning}th! Bring in ${relRole} ${reliever.name} (${reliever.throws}HP)?`,
      matchupNote: `${relTag} · ${ovr} OVR · Built to close out leads`,
      autoCommentary: `Bullpen call! ${relRole} ${reliever.name} (${reliever.throws}HP) trots in for the save!`,
    };
  }
  if (trigger === 'gassed') {
    return {
      shortTag: `Gassed (${endurance}%)`,
      headline: `${curFirst} is out of gas (${endurance}%) — bring in ${reliever.name} (${relTag})?`,
      matchupNote,
      autoCommentary: `Bullpen call! ${reliever.name} (${relTag}) relieves a gassed ${curFirst}.`,
    };
  }
  if (trigger === 'shelled') {
    return {
      shortTag: `Rough Outing (${runsAllowed} R)`,
      headline: `${curFirst} is in trouble (${runsAllowed} R allowed) — turn to ${reliever.name} (${relTag})?`,
      matchupNote,
      autoCommentary: `Bullpen call! ${reliever.name} (${relTag}) enters to stop the rally.`,
    };
  }
  if (trigger === 'tiring_jam' || trigger === 'late_jam') {
    return {
      shortTag: `Jam Stopper (${endurance}%)`,
      headline: `Runners on with ${curFirst} tiring (${endurance}%) — call ${reliever.name} (${relTag})?`,
      matchupNote,
      autoCommentary: `Bullpen call! ${reliever.name} (${relTag}) trots in to put out the fire.`,
    };
  }
  return {
    shortTag: `Tired Arm (${endurance}%)`,
    headline: `${curFirst} is tiring (${endurance}%) — bring in fresh arm ${reliever.name} (${relTag})?`,
    matchupNote,
    autoCommentary: `Bullpen call! Fresh arm ${reliever.name} (${relTag}) takes the mound.`,
  };
}

function isCleanBullpenBoundary(session: GameSessionState, sideKey: 'away' | 'home'): boolean {
  return (
    session.status === 'in_progress' &&
    isSideOnDefense(session, sideKey) &&
    session.balls === 0 &&
    session.strikes === 0
  );
}

function getActivePitcherUsage(
  session: GameSessionState,
  sideKey: 'away' | 'home',
  pitcherId: string,
): { pitchesThrown: number; runsAllowed: number } {
  const pitcherMap =
    sideKey === 'home' ? session.boxScore.homePitchers : session.boxScore.awayPitchers;
  const line = pitcherMap[pitcherId];
  return {
    pitchesThrown: line?.pitchesThrown ?? 0,
    runsAllowed: line?.runsAllowed ?? 0,
  };
}

function shouldSuppressForAuto(
  detected: TriggerCheck | null,
  forAutoExecution: boolean,
  endurance: number,
): boolean {
  if (!detected) return true;
  return forAutoExecution && detected.trigger === 'late_jam' && endurance > 46;
}

/**
 * Pure situational bullpen evaluator powering Auto mode, Semi-Auto 1-tap Coach Pops cards,
 * and AI bullpen calls. Always respects clean 0-0 batter boundaries and 5/7/9-inning pacing.
 */
export function evaluateBullpenCall(
  session: GameSessionState,
  sideKey: 'away' | 'home',
  forAutoExecution = false,
): BullpenRecommendation | null {
  if (!isCleanBullpenBoundary(session, sideKey)) return null;

  const available = getAvailableRelievers(session, sideKey);
  const side = session[sideKey];
  const currentPitcher = side.playersById[side.activePitcherId];
  if (available.length === 0 || !currentPitcher) return null;

  const { pitchesThrown, runsAllowed } = getActivePitcherUsage(session, sideKey, currentPitcher.id);
  const endurance = fatigueToEndurance(side.pitcherFatigue);
  const ctx = buildBullpenSituationContext(session, sideKey);
  const detected = detectBullpenTrigger(
    session,
    ctx,
    currentPitcher,
    endurance,
    pitchesThrown,
    runsAllowed,
    available,
  );
  if (shouldSuppressForAuto(detected, forAutoExecution, endurance)) return null;

  const recommended = selectBestBullpenReliever(available, ctx);
  if (!recommended || !detected) return null;

  const copy = formatRecommendationCopy(
    detected.trigger,
    currentPitcher,
    recommended,
    endurance,
    session.inning,
    runsAllowed,
  );
  return {
    shouldSwap: true,
    urgency: detected.urgency,
    trigger: detected.trigger,
    recommendedReliever: recommended,
    ...copy,
    snoozeKey: `${currentPitcher.id}:${session.inning}:${endurance <= 15 ? 'critical' : 'normal'}`,
  };
}

/** Convenience helper checking whether the currently fielding side has an unused reliever ready. */
export function hasAvailableFieldingReliever(session: GameSessionState): boolean {
  const fielding = getFieldingSide(session);
  const batting = getBattingSide(session);
  if (fielding.clubId === batting.clubId) return false;
  return fielding.bullpenIds.some((id) => !fielding.usedPitcherIds.includes(id));
}
