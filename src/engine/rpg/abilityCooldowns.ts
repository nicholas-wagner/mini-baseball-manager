import type { Player } from '../models/player';

export const SPECIAL_ABILITY_HYPE_COST = 75;
export const SPECIAL_ABILITY_FATIGUE_COST = 8;
export const TEAM_SUPER_SWING_COOLDOWN_PAS = 2;
export const PITCHER_SUPER_COOLDOWN_BATTERS = 3;
export const PITCHER_SUPER_COOLDOWN_PITCHES = 12;

export type TeamSideKey = 'away' | 'home';

export interface AbilityCooldownState {
  playerUsesById: Record<string, number>;
  pitcherCooldownBattersById: Record<string, number>;
  pitcherCooldownPitchesById: Record<string, number>;
  teamSuperSwingCooldownPas: Record<TeamSideKey, number>;
  managerPowerUsedIds: Record<TeamSideKey, string[]>;
}

export interface SpecialAbilityAvailability {
  allowed: boolean;
  reason?: string;
  chargesLeft: number;
  maxCharges: number;
  cooldownRemaining: number;
  hypeRequired: number;
}

export function createInitialAbilityCooldownState(): AbilityCooldownState {
  return {
    playerUsesById: {},
    pitcherCooldownBattersById: {},
    pitcherCooldownPitchesById: {},
    teamSuperSwingCooldownPas: { away: 0, home: 0 },
    managerPowerUsedIds: { away: [], home: [] },
  };
}

export function cloneAbilityCooldownState(state: AbilityCooldownState): AbilityCooldownState {
  return {
    playerUsesById: { ...state.playerUsesById },
    pitcherCooldownBattersById: { ...state.pitcherCooldownBattersById },
    pitcherCooldownPitchesById: { ...state.pitcherCooldownPitchesById },
    teamSuperSwingCooldownPas: { ...state.teamSuperSwingCooldownPas },
    managerPowerUsedIds: {
      away: [...state.managerPowerUsedIds.away],
      home: [...state.managerPowerUsedIds.home],
    },
  };
}

/** Computes per-game charge cap: 1 for batters (2 at Legend Lv 12+), 1 for RP, 2 for SP. */
export function getMaxSpecialUsesForPlayer(
  player: Pick<Player, 'position' | 'level'>,
  role: 'batter' | 'pitcher',
): number {
  if (role === 'pitcher') {
    return player.position === 'SP' ? 2 : 1;
  }
  return player.level >= 12 ? 2 : 1;
}

/** Evaluates whether a batter or pitcher can legally trigger a Special Ability on this pitch. */
export function canTriggerSpecialAbility(
  state: AbilityCooldownState,
  side: TeamSideKey,
  player: Pick<Player, 'id' | 'position' | 'level'>,
  role: 'batter' | 'pitcher',
  currentHype: number,
): SpecialAbilityAvailability {
  const maxCharges = getMaxSpecialUsesForPlayer(player, role);
  const used = state.playerUsesById[player.id] ?? 0;
  const chargesLeft = Math.max(0, maxCharges - used);

  const cooldownRemaining =
    role === 'batter'
      ? state.teamSuperSwingCooldownPas[side]
      : Math.max(
          state.pitcherCooldownBattersById[player.id] ?? 0,
          state.pitcherCooldownPitchesById[player.id] ?? 0,
        );

  if (chargesLeft <= 0) {
    return {
      allowed: false,
      reason: 'No special charges remaining this game.',
      chargesLeft: 0,
      maxCharges,
      cooldownRemaining,
      hypeRequired: SPECIAL_ABILITY_HYPE_COST,
    };
  }
  if (cooldownRemaining > 0) {
    return {
      allowed: false,
      reason: 'Special ability cooling down.',
      chargesLeft,
      maxCharges,
      cooldownRemaining,
      hypeRequired: SPECIAL_ABILITY_HYPE_COST,
    };
  }
  if (currentHype < SPECIAL_ABILITY_HYPE_COST) {
    return {
      allowed: false,
      reason: `Needs ${SPECIAL_ABILITY_HYPE_COST} Hype.`,
      chargesLeft,
      maxCharges,
      cooldownRemaining: 0,
      hypeRequired: SPECIAL_ABILITY_HYPE_COST,
    };
  }
  return {
    allowed: true,
    chargesLeft,
    maxCharges,
    cooldownRemaining: 0,
    hypeRequired: SPECIAL_ABILITY_HYPE_COST,
  };
}

/** Records a Special Ability trigger, consuming Hype, adding fatigue, and setting cooldowns. */
export function recordSpecialAbilityUse(
  state: AbilityCooldownState,
  side: TeamSideKey,
  player: Pick<Player, 'id'>,
  role: 'batter' | 'pitcher',
  currentHype: number,
  currentFatigue: number,
): {
  nextState: AbilityCooldownState;
  nextHype: number;
  nextFatigue: number;
  hypeSpent: number;
  fatigueAdded: number;
} {
  const next = cloneAbilityCooldownState(state);
  next.playerUsesById[player.id] = (next.playerUsesById[player.id] ?? 0) + 1;

  if (role === 'batter') {
    next.teamSuperSwingCooldownPas[side] = TEAM_SUPER_SWING_COOLDOWN_PAS;
  } else {
    next.pitcherCooldownBattersById[player.id] = PITCHER_SUPER_COOLDOWN_BATTERS;
    next.pitcherCooldownPitchesById[player.id] = PITCHER_SUPER_COOLDOWN_PITCHES;
  }

  return {
    nextState: next,
    nextHype: Math.max(0, currentHype - SPECIAL_ABILITY_HYPE_COST),
    nextFatigue: Math.min(100, currentFatigue + SPECIAL_ABILITY_FATIGUE_COST),
    hypeSpent: SPECIAL_ABILITY_HYPE_COST,
    fatigueAdded: SPECIAL_ABILITY_FATIGUE_COST,
  };
}

/** Decrements pitch-based cooldown on the active pitcher after each pitch thrown. */
export function tickAbilityCooldownsOnPitch(
  state: AbilityCooldownState,
  pitcherId: string,
): AbilityCooldownState {
  const remaining = state.pitcherCooldownPitchesById[pitcherId] ?? 0;
  if (remaining <= 0) return state;
  const next = cloneAbilityCooldownState(state);
  next.pitcherCooldownPitchesById[pitcherId] = Math.max(0, remaining - 1);
  return next;
}

/** Decrements PA-based cooldowns for both the batting side and active pitcher when a PA finishes. */
export function tickAbilityCooldownsOnPlateAppearance(
  state: AbilityCooldownState,
  battingSide: TeamSideKey,
  pitcherId: string,
): AbilityCooldownState {
  const teamCd = state.teamSuperSwingCooldownPas[battingSide];
  const pitcherCd = state.pitcherCooldownBattersById[pitcherId] ?? 0;
  if (teamCd <= 0 && pitcherCd <= 0) return state;
  const next = cloneAbilityCooldownState(state);
  if (teamCd > 0) next.teamSuperSwingCooldownPas[battingSide] = Math.max(0, teamCd - 1);
  if (pitcherCd > 0) next.pitcherCooldownBattersById[pitcherId] = Math.max(0, pitcherCd - 1);
  return next;
}

/** Manager Skipper active powers are strictly 1 charge per power per game. */
export function canUseManagerPower(
  state: AbilityCooldownState,
  side: TeamSideKey,
  powerId: string,
): boolean {
  return !state.managerPowerUsedIds[side].includes(powerId);
}

/** Records use of a once-per-game Manager active power. */
export function recordManagerPowerUse(
  state: AbilityCooldownState,
  side: TeamSideKey,
  powerId: string,
): AbilityCooldownState {
  if (!canUseManagerPower(state, side, powerId)) return state;
  const next = cloneAbilityCooldownState(state);
  next.managerPowerUsedIds[side].push(powerId);
  return next;
}
