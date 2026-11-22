import type { TacticalCall } from '../models/playEvent';
import { canTriggerSpecialAbility } from '../rpg/abilityCooldowns';
import { fatigueToEndurance } from '../rpg/pitcherEndurance';
import { getActivatablePowersForPlayer } from '../rpg/specialPowerEffects';
import { getEligibleStealPlays, type StealPlayType } from './baserunning';
import {
  getBattingSide,
  getCurrentBatter,
  getCurrentLeverage,
  getCurrentPitcher,
  getDefenderAtPosition,
  getFieldingSide,
  type GameSessionState,
} from './gameState';

export type LiveActionCueKind =
  | 'game_over'
  | 'power_armed'
  | 'pitcher_gassed'
  | 'power_ready'
  | 'steal_opportunity'
  | 'clutch_moment'
  | 'default_pitching'
  | 'default_batting';

export type SuggestedQuickActionType = 'arm_power' | 'steal' | 'mound_visit' | 'bullpen_swap';

export interface SuggestedQuickAction {
  type: SuggestedQuickActionType;
  label: string;
  powerId?: string;
  tacticalCall?: TacticalCall;
  relieverId?: string;
}

export interface LiveActionCue {
  kind: LiveActionCueKind;
  urgency: 'calm' | 'medium' | 'high';
  turnLabel: string;
  badgeText: string;
  headline: string;
  primaryButtonLabel: string;
  suggestedAction: SuggestedQuickAction | null;
}

export interface LiveActionAdvisorInput {
  session: GameSessionState;
  tacticalCall: TacticalCall;
  armedPowerId: string | null;
  moundVisitUsed: boolean;
}

const STEAL_PLAY_TO_CALL: Readonly<Record<StealPlayType, TacticalCall>> = {
  steal_2b: 'steal',
  steal_3b: 'steal_3b',
  double_steal: 'double_steal',
  steal_home: 'steal_home',
};

function findBestStealOpportunity(session: GameSessionState): SuggestedQuickAction | null {
  if (session.half !== 'BOT') return null;
  const battingSide = getBattingSide(session);
  const fieldingSide = getFieldingSide(session);
  const pitcher = getCurrentPitcher(session);
  const catcher = getDefenderAtPosition(fieldingSide, 'C');
  const plays = getEligibleStealPlays(
    session.bases,
    battingSide.playersById,
    pitcher,
    catcher,
    fieldingSide.pitcherFatigue,
    fieldingSide.catcherPopTimeBonus,
  );
  const best = plays.find((p) => p.successPct >= 60);
  if (!best) return null;
  return {
    type: 'steal',
    label: `🏃 ${best.label} (${best.successPct}%)`,
    tacticalCall: STEAL_PLAY_TO_CALL[best.playType],
  };
}

function findFreshRelieverId(session: GameSessionState): string | null {
  return (
    session.home.bullpenIds.find((id) => !session.home.usedPitcherIds.includes(id)) ?? null
  );
}

function buildPitcherGassedCue(
  endurance: number,
  moundVisitUsed: boolean,
  relieverId: string | null,
  turnLabel: string,
  primaryButtonLabel: string,
): LiveActionCue {
  const relieverAction: SuggestedQuickAction | null = relieverId
    ? { type: 'bullpen_swap', label: '📞 Bring In Reliever', relieverId }
    : null;
  const suggestedAction: SuggestedQuickAction | null = !moundVisitUsed
    ? { type: 'mound_visit', label: '🧘 Calm Mound Visit (+14% End)' }
    : relieverAction;
  return {
    kind: 'pitcher_gassed',
    urgency: 'high',
    turnLabel,
    badgeText: '🩺 TIRED PITCHER',
    headline: `Pitcher is tired (${endurance}% Endurance) — calm them down or call the bullpen!`,
    primaryButtonLabel,
    suggestedAction,
  };
}

function buildPowerReadyCue(
  powerId: string,
  powerName: string,
  turnLabel: string,
  primaryButtonLabel: string,
): LiveActionCue {
  return {
    kind: 'power_ready',
    urgency: 'high',
    turnLabel,
    badgeText: '⚡ POWER READY!',
    headline: `Hype is charged! Tap to arm ${powerName} before the next pitch.`,
    primaryButtonLabel,
    suggestedAction: {
      type: 'arm_power',
      label: `⚡ Arm ${powerName}`,
      powerId,
    },
  };
}

function buildClutchOrDefaultCue(
  isBatting: boolean,
  leverageIndex: number,
  turnLabel: string,
  primaryButtonLabel: string,
): LiveActionCue {
  if (leverageIndex >= 1.6) {
    return {
      kind: 'clutch_moment',
      urgency: 'high',
      turnLabel,
      badgeText: '🔥 CLUTCH SPOT',
      headline: isBatting
        ? 'Big late-game at-bat! Pick Contact or Power — or tap Next Pitch!'
        : 'Huge spot on the mound! Tap Throw Pitch to bear down!',
      primaryButtonLabel,
      suggestedAction: null,
    };
  }
  return {
    kind: isBatting ? 'default_batting' : 'default_pitching',
    urgency: 'calm',
    turnLabel,
    badgeText: '✅ READY',
    headline: isBatting
      ? 'Tap "Next Pitch" to watch the at-bat — extra buttons are optional!'
      : 'Tap "Throw Pitch" to watch the pitch — extra buttons are optional!',
    primaryButtonLabel,
    suggestedAction: null,
  };
}

function findReadyPowerCue(
  session: GameSessionState,
  isBatting: boolean,
  turnLabel: string,
  primaryButtonLabel: string,
): LiveActionCue | null {
  const humanRole: 'batter' | 'pitcher' = isBatting ? 'batter' : 'pitcher';
  const humanActor = isBatting ? getCurrentBatter(session) : getCurrentPitcher(session);
  const avail = canTriggerSpecialAbility(
    session.abilityCooldowns,
    'home',
    humanActor,
    humanRole,
    session.home.hypeGauge,
  );
  if (!avail.allowed) return null;
  const activatable = getActivatablePowersForPlayer(humanActor, humanRole);
  if (activatable.length === 0) return null;
  return buildPowerReadyCue(activatable[0].id, activatable[0].name, turnLabel, primaryButtonLabel);
}

function findStealCue(
  session: GameSessionState,
  tacticalCall: TacticalCall,
  turnLabel: string,
  primaryButtonLabel: string,
): LiveActionCue | null {
  if (tacticalCall !== 'normal') return null;
  const stealAction = findBestStealOpportunity(session);
  if (!stealAction) return null;
  return {
    kind: 'steal_opportunity',
    urgency: 'medium',
    turnLabel,
    badgeText: '🏃 STEAL WINDOW',
    headline: 'Speedy runner on base with a strong jump — swipe the bag or swing away!',
    primaryButtonLabel,
    suggestedAction: stealAction,
  };
}

/**
 * Pure situational advisor powering Coach Pops' one-glance live action bar so new players
 * always know whose turn it is and whether any special action is actually worth pressing now.
 */
export function computeLiveActionCue(input: LiveActionAdvisorInput): LiveActionCue {
  const { session, tacticalCall, armedPowerId, moundVisitUsed } = input;
  const isBatting = session.half === 'BOT';
  const turnLabel = isBatting ? '🏏 YOUR TURN TO BAT' : '⚾ YOUR TURN TO PITCH';
  const primaryButtonLabel = isBatting ? 'Next Pitch' : 'Throw Pitch (Next Pitch)';

  if (session.status === 'completed') {
    return {
      kind: 'game_over',
      urgency: 'calm',
      turnLabel: '🏁 FINAL',
      badgeText: 'GAME OVER',
      headline: 'Ballgame complete — check your Box Score & Post-Game MVP!',
      primaryButtonLabel: 'Game Complete',
      suggestedAction: null,
    };
  }

  if (armedPowerId) {
    return {
      kind: 'power_armed',
      urgency: 'high',
      turnLabel,
      badgeText: '🔥 POWER ARMED',
      headline: `Special power armed! Tap "${primaryButtonLabel}" to unleash it in 3D!`,
      primaryButtonLabel,
      suggestedAction: null,
    };
  }

  const endurance = fatigueToEndurance(session.home.pitcherFatigue);
  if (!isBatting && endurance <= 35) {
    return buildPitcherGassedCue(
      endurance,
      moundVisitUsed,
      findFreshRelieverId(session),
      turnLabel,
      primaryButtonLabel,
    );
  }

  const powerCue = findReadyPowerCue(session, isBatting, turnLabel, primaryButtonLabel);
  if (powerCue) return powerCue;

  const stealCue = findStealCue(session, tacticalCall, turnLabel, primaryButtonLabel);
  if (stealCue) return stealCue;

  const { leverageIndex } = getCurrentLeverage(session);
  return buildClutchOrDefaultCue(isBatting, leverageIndex, turnLabel, primaryButtonLabel);
}
