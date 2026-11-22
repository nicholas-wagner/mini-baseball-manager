import type {
  ManagerBranch,
  ManagerPowerId,
  ManagerProfile,
} from '../models/manager';
import type { PlayEvent, PlaySoundCue } from '../models/playEvent';
import type { GameSessionState } from '../simulation/gameState';

export interface ManagerSkillNode {
  id: string;
  branch: ManagerBranch;
  name: string;
  description: string;
  spCost: number;
  prerequisiteId?: string;
  unlocksPowerId?: ManagerPowerId;
}

export interface ManagerTreePassives {
  drillBonus: number;
  slumpBusterBonus: number;
  practiceFatigueScale: number;
  playerXpMultiplier: number;
  cashMultiplier: number;
  staffFeeDiscount: number;
  fanGrowthMultiplier: number;
  bonusStaffSlot: number;
}

export interface InGameManagerPowerTracker {
  usedPowerIds: readonly ManagerPowerId[];
}

export interface ManagerPowerMetadata {
  id: ManagerPowerId;
  label: string;
  callout: string;
  shortEffect: string;
  soundCue: PlaySoundCue;
  vfxColor: string;
}

export const MANAGER_POWER_CATALOG: Readonly<Record<ManagerPowerId, ManagerPowerMetadata>> = {
  pep_talk: {
    id: 'pep_talk',
    label: 'Pep Talk',
    callout: 'DUGOUT PEP TALK!',
    shortEffect: '+18 Team Hype & sparks cold bats',
    soundCue: 'organ_charge',
    vfxColor: '#FFC300',
  },
  mound_whisper: {
    id: 'mound_whisper',
    label: 'Mound Whisper',
    callout: 'MOUND WHISPER!',
    shortEffect: 'Restores 22 Pitcher Endurance & calms command',
    soundCue: 'bullpen_phone',
    vfxColor: '#00E5FF',
  },
  clutch_focus: {
    id: 'clutch_focus',
    label: 'Clutch Focus',
    callout: 'CLUTCH LOCK-IN!',
    shortEffect: '+16 Hype & sharpens high-leverage focus',
    soundCue: 'pitch_whoosh',
    vfxColor: '#FF595E',
  },
  rally_cap: {
    id: 'rally_cap',
    label: 'Rally Cap Magic',
    callout: 'RALLY CAPS ON!',
    shortEffect: '+28 Hype surge & stadium stomp-stomp-clap wave',
    soundCue: 'stadium_stomp_clap',
    vfxColor: '#9B5DE5',
  },
  bullpen_freeze: {
    id: 'bullpen_freeze',
    label: 'Bullpen Freeze',
    callout: 'ICE THE OPPONENT!',
    shortEffect: 'Drains 18 opposing Team Hype & stalls momentum',
    soundCue: 'crowd_gasp',
    vfxColor: '#38BDF8',
  },
};

/** 12-node Human Manager RPG Tree spanning Skipper (Active Powers), Coach (Training), and Mogul (GM/Economy). */
export const MANAGER_SKILL_NODES: readonly ManagerSkillNode[] = [
  // Skipper Active Powers
  {
    id: 'skipper_pep_talk',
    branch: 'skipper',
    name: 'Dugout Pep Talk',
    description: 'Unlocks active 1/game Pep Talk (+18 Hype rally boost).',
    spCost: 1,
    unlocksPowerId: 'pep_talk',
  },
  {
    id: 'skipper_mound_whisper',
    branch: 'skipper',
    name: 'Mound Whisper',
    description: 'Unlocks active 1/game Mound Whisper (-22 Pitcher Fatigue).',
    spCost: 1,
    prerequisiteId: 'skipper_pep_talk',
    unlocksPowerId: 'mound_whisper',
  },
  {
    id: 'skipper_clutch_focus',
    branch: 'skipper',
    name: 'Clutch Focus Call',
    description: 'Unlocks active 1/game Clutch Focus (+16 Hype in big spots).',
    spCost: 1,
    prerequisiteId: 'skipper_mound_whisper',
    unlocksPowerId: 'clutch_focus',
  },
  {
    id: 'skipper_rally_cap',
    branch: 'skipper',
    name: 'Rally Cap Magic',
    description: 'Unlocks active 1/game Rally Cap (+28 Hype + Stomp-Stomp-Clap wave).',
    spCost: 2,
    prerequisiteId: 'skipper_clutch_focus',
    unlocksPowerId: 'rally_cap',
  },
  // Coach Passives
  {
    id: 'coach_cage_intensity',
    branch: 'coach',
    name: 'Cage Intensity',
    description: '+1 extra rating point on successful Practice Complex drills.',
    spCost: 1,
  },
  {
    id: 'coach_film_room',
    branch: 'coach',
    name: 'Slump-Buster Film Guru',
    description: '+8 bonus Form recovery during Slump-Buster Film Sessions.',
    spCost: 1,
    prerequisiteId: 'coach_cage_intensity',
  },
  {
    id: 'coach_fatigue_smart',
    branch: 'coach',
    name: 'Smart Conditioning',
    description: 'Cuts Practice Complex fatigue cost by 20%.',
    spCost: 1,
    prerequisiteId: 'coach_film_room',
  },
  {
    id: 'coach_rookie_whisperer',
    branch: 'coach',
    name: 'Prospect Whisperer',
    description: '+15% Player XP earned after every completed game.',
    spCost: 2,
    prerequisiteId: 'coach_fatigue_smart',
  },
  // Mogul Passives
  {
    id: 'mogul_ticket_buzz',
    branch: 'mogul',
    name: '90s Promo Buzz',
    description: '+10% cash payout from gate receipts & post-game rewards.',
    spCost: 1,
  },
  {
    id: 'mogul_staff_negotiator',
    branch: 'mogul',
    name: 'Savvy Staff Negotiator',
    description: '12% discount on Coach, Equipment & Medical hiring and clinics.',
    spCost: 1,
    prerequisiteId: 'mogul_ticket_buzz',
  },
  {
    id: 'mogul_scouting_eye',
    branch: 'mogul',
    name: 'Fanbase Magnet',
    description: '+15% extra Fan Base growth after victories.',
    spCost: 1,
    prerequisiteId: 'mogul_staff_negotiator',
  },
  {
    id: 'mogul_dynasty_aura',
    branch: 'mogul',
    name: 'Dynasty Front Office',
    description: 'Unlocks +1 bonus Active Staff Slot above your tier limit!',
    spCost: 2,
    prerequisiteId: 'mogul_scouting_eye',
  },
];

/** Unlocks a Manager RPG skill node if SP & prerequisites are satisfied. */
export function unlockManagerSkillNode(
  manager: ManagerProfile,
  nodeId: string,
): { unlocked: boolean; reason?: string; manager: ManagerProfile } {
  const node = MANAGER_SKILL_NODES.find((n) => n.id === nodeId);
  if (!node) return { unlocked: false, reason: 'Unknown manager skill node.', manager };
  if (manager.unlockedNodeIds.includes(nodeId)) {
    return { unlocked: false, reason: `${node.name} is already unlocked.`, manager };
  }
  if (node.prerequisiteId && !manager.unlockedNodeIds.includes(node.prerequisiteId)) {
    const prereq = MANAGER_SKILL_NODES.find((n) => n.id === node.prerequisiteId);
    return {
      unlocked: false,
      reason: `Unlock ${prereq?.name ?? node.prerequisiteId} first.`,
      manager,
    };
  }
  if (manager.skillPoints < node.spCost) {
    return {
      unlocked: false,
      reason: `Need ${node.spCost} Manager SP (currently ${manager.skillPoints}).`,
      manager,
    };
  }

  const activePowerIds =
    node.unlocksPowerId && !manager.activePowerIds.includes(node.unlocksPowerId)
      ? [...manager.activePowerIds, node.unlocksPowerId]
      : manager.activePowerIds;

  return {
    unlocked: true,
    manager: {
      ...manager,
      skillPoints: manager.skillPoints - node.spCost,
      unlockedNodeIds: [...manager.unlockedNodeIds, node.id],
      activePowerIds,
    },
  };
}

function evaluateCoachBranchPassives(ids: ReadonlySet<string>) {
  return {
    drillBonus: ids.has('coach_cage_intensity') ? 1 : 0,
    slumpBusterBonus: ids.has('coach_film_room') ? 8 : 0,
    practiceFatigueScale: ids.has('coach_fatigue_smart') ? 0.8 : 1.0,
    playerXpMultiplier: ids.has('coach_rookie_whisperer') ? 1.15 : 1.0,
  };
}

function evaluateMogulBranchPassives(ids: ReadonlySet<string>) {
  return {
    cashMultiplier: ids.has('mogul_ticket_buzz') ? 1.1 : 1.0,
    staffFeeDiscount: ids.has('mogul_staff_negotiator') ? 0.12 : 0,
    fanGrowthMultiplier: ids.has('mogul_scouting_eye') ? 1.15 : 1.0,
    bonusStaffSlot: ids.has('mogul_dynasty_aura') ? 1 : 0,
  };
}

/** Evaluates all permanent Coach & Mogul passives unlocked by the human manager. */
export function evaluateManagerTreePassives(manager: ManagerProfile | null): ManagerTreePassives {
  const ids = new Set(manager?.unlockedNodeIds ?? []);
  return {
    ...evaluateCoachBranchPassives(ids),
    ...evaluateMogulBranchPassives(ids),
  };
}

export function createInGameManagerPowerTracker(): InGameManagerPowerTracker {
  return { usedPowerIds: [] };
}

function applyPowerEffectToSession(
  session: GameSessionState,
  sideKey: 'away' | 'home',
  powerId: ManagerPowerId,
): GameSessionState {
  const oppKey: 'away' | 'home' = sideKey === 'home' ? 'away' : 'home';
  const mySide = { ...session[sideKey] };
  const oppSide = { ...session[oppKey] };

  if (powerId === 'pep_talk') {
    mySide.hypeGauge = Math.min(100, mySide.hypeGauge + 18);
  } else if (powerId === 'mound_whisper') {
    mySide.pitcherFatigue = Math.max(0, mySide.pitcherFatigue - 22);
  } else if (powerId === 'clutch_focus') {
    mySide.hypeGauge = Math.min(100, mySide.hypeGauge + 16);
  } else if (powerId === 'rally_cap') {
    mySide.hypeGauge = Math.min(100, mySide.hypeGauge + 28);
  } else if (powerId === 'bullpen_freeze') {
    oppSide.hypeGauge = Math.max(0, oppSide.hypeGauge - 18);
  }

  return {
    ...session,
    eventSeq: session.eventSeq + 1,
    [sideKey]: mySide,
    [oppKey]: oppSide,
  };
}

/** Fires an unlocked Skipper active power during a live game (strictly 1 charge per game per power). */
export function triggerInGameManagerPower(
  tracker: InGameManagerPowerTracker,
  manager: ManagerProfile,
  powerId: ManagerPowerId,
  session: GameSessionState,
  sideKey: 'away' | 'home',
): {
  used: boolean;
  reason?: string;
  tracker: InGameManagerPowerTracker;
  session: GameSessionState;
  event: PlayEvent | null;
} {
  if (session.status !== 'in_progress') {
    return { used: false, reason: 'Game is already complete.', tracker, session, event: null };
  }
  if (!manager.activePowerIds.includes(powerId)) {
    return { used: false, reason: 'Power is not unlocked in Manager RPG Tree.', tracker, session, event: null };
  }
  if (tracker.usedPowerIds.includes(powerId)) {
    return {
      used: false,
      reason: `${MANAGER_POWER_CATALOG[powerId].label} was already used this game (1 charge/game).`,
      tracker,
      session,
      event: null,
    };
  }

  const meta = MANAGER_POWER_CATALOG[powerId];
  const nextSession = applyPowerEffectToSession(session, sideKey, powerId);
  const event: PlayEvent = {
    seq: nextSession.eventSeq,
    type: 'manager_power_used',
    inning: nextSession.inning,
    half: nextSession.half,
    outsBefore: nextSession.outs,
    outsAfter: nextSession.outs,
    balls: nextSession.balls,
    strikes: nextSession.strikes,
    awayScore: nextSession.away.score,
    homeScore: nextSession.home.score,
    basesAfter: [...nextSession.bases] as [string | null, string | null, string | null],
    isClutchMoment: true,
    specialPowerTriggered: {
      actor: 'manager',
      powerId,
      calloutText: meta.callout,
      vfxColor: meta.vfxColor,
    },
    commentary: `Skipper ${manager.name} fires ${meta.label}! (${meta.shortEffect})`,
    soundCue: meta.soundCue,
  };

  return {
    used: true,
    tracker: { usedPowerIds: [...tracker.usedPowerIds, powerId] },
    session: nextSession,
    event,
  };
}
