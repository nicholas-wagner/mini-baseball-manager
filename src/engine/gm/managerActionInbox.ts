import {
  getStadiumTierProfile,
  STADIUM_UPGRADE_CATALOG,
} from '../ballparks/stadiumProgression';
import type { Club } from '../models/club';
import type { ManagerProfile } from '../models/manager';
import type { Player } from '../models/player';
import { deriveFormState } from '../rpg/formTracker';
import {
  applyManagerXpAndLevelUp,
  applyPlayerXpAndLevelUps,
} from '../simulation/rewards';

export type ManagerActionKind =
  | 'injury_alert'
  | 'skill_points_ready'
  | 'foil_packs_ready'
  | 'postseason_ready'
  | 'ballpark_upgrade';

export type ManagerJumpTarget = 'roster' | 'skills' | 'league' | 'economy' | 'foil_packs';

export interface ManagerActionItem {
  kind: ManagerActionKind;
  priority: 'urgent' | 'reward' | 'tip';
  badge: string;
  title: string;
  detail: string;
  ctaLabel: string;
  target: ManagerJumpTarget;
}

export interface NavTabBadges {
  roster?: string;
  skills?: string;
  league?: string;
  economy?: string;
}

export interface ManagerActionInbox {
  headline: string;
  items: ManagerActionItem[];
  tabBadges: NavTabBadges;
  injuredCount: number;
  playerSpTotal: number;
  managerSpTotal: number;
}

export interface ManagerActionInboxInput {
  club: Club;
  manager: ManagerProfile | null;
  currentSeriesIndex: number;
  unopenedPackCount: number;
}

export interface PlayerLevelUpEvent {
  playerId: string;
  playerName: string;
  newLevel: number;
  spEarned: number;
}

export interface SeriesAutoProgressionResult {
  club: Club;
  manager: ManagerProfile;
  levelUps: PlayerLevelUpEvent[];
  managerLeveledUp: boolean;
  cashEarned: number;
  hypeDelta: number;
}

export interface QuickTeamPracticeResult {
  club: Club;
  manager: ManagerProfile;
  playersBoosted: number;
  levelUps: PlayerLevelUpEvent[];
  managerLeveledUp: boolean;
  summary: string;
}

function hasAffordableBallparkUpgrade(club: Club): boolean {
  const profile = getStadiumTierProfile(club.leagueTier);
  const canExpand = club.stadium.capacity < profile.maxCapacity && club.stadium.seatingTier < 4;
  if (canExpand && club.economy.cash >= 4_500) return true;
  const cheapSpec = STADIUM_UPGRADE_CATALOG.find(
    (s) => s.id === 'night_lights' && !club.stadium.hasNightLights,
  );
  return Boolean(cheapSpec && club.economy.cash >= cheapSpec.cost);
}

function pushInjuryAndSkillItems(
  items: ManagerActionItem[],
  tabBadges: NavTabBadges,
  injuredCount: number,
  playerSpTotal: number,
  managerSpTotal: number,
): void {
  if (injuredCount > 0) {
    tabBadges.roster = `🩺 ${injuredCount}`;
    items.push({
      kind: 'injury_alert',
      priority: 'urgent',
      badge: `🩺 ${injuredCount} HURT`,
      title: `${injuredCount} player${injuredCount === 1 ? '' : 's'} injured or ill`,
      detail: 'Open the Trainer’s Table to check recovery or rest them from your lineup.',
      ctaLabel: 'Review Injuries',
      target: 'roster',
    });
  }

  const totalSp = playerSpTotal + managerSpTotal;
  if (totalSp > 0) {
    tabBadges.skills = `⚡ ${totalSp}`;
    items.push({
      kind: 'skill_points_ready',
      priority: 'reward',
      badge: `⚡ ${totalSp} SP`,
      title: `${totalSp} Skill Tree Point${totalSp === 1 ? '' : 's'} ready to spend!`,
      detail: 'Core ratings level up automatically — spend SP to unlock Special Skill Tree powers!',
      ctaLabel: 'Open Skill Trees',
      target: 'skills',
    });
  }
}

function pushClubMilestoneItems(
  items: ManagerActionItem[],
  tabBadges: NavTabBadges,
  club: Club,
  currentSeriesIndex: number,
  unopenedPackCount: number,
): void {
  if (unopenedPackCount > 0) {
    items.push({
      kind: 'foil_packs_ready',
      priority: 'reward',
      badge: `🎁 ${unopenedPackCount} PACK${unopenedPackCount === 1 ? '' : 'S'}`,
      title: `Unopened 1994 Foil Booster Pack${unopenedPackCount === 1 ? '' : 's'} waiting!`,
      detail: 'Rip open 3 foil cards for auto-equipped 90s Relics, cash & XP boosts.',
      ctaLabel: 'Rip Foil Pack',
      target: 'foil_packs',
    });
  }

  if (currentSeriesIndex >= 7) {
    tabBadges.league = '🏆';
    items.push({
      kind: 'postseason_ready',
      priority: 'reward',
      badge: '🏆 PLAYOFFS',
      title: 'Regular season complete — Playoffs & Offseason ready!',
      detail: 'Play or sim the Best-of-3 Playoffs, Draft prospects, and chase promotion.',
      ctaLabel: 'Open Playoffs',
      target: 'league',
    });
  }

  if (hasAffordableBallparkUpgrade(club)) {
    tabBadges.economy = '⬆';
    items.push({
      kind: 'ballpark_upgrade',
      priority: 'tip',
      badge: '🏟️ UPGRADE',
      title: 'Ballpark upgrade affordable!',
      detail: `You have $${club.economy.cash.toLocaleString()} cash — expand seating or add stadium lights.`,
      ctaLabel: 'Upgrade Ballpark',
      target: 'economy',
    });
  }
}

/** Pure GM inbox computing obvious, rewarding next-best actions and live navigation badges. */
export function buildManagerActionInbox(input: ManagerActionInboxInput): ManagerActionInbox {
  const { club, manager, currentSeriesIndex, unopenedPackCount } = input;
  const injuredCount = club.roster.filter((p) => Boolean(p.activeHealthStatus)).length;
  const playerSpTotal = club.roster.reduce((sum, p) => sum + p.skillPoints, 0);
  const managerSpTotal = manager?.skillPoints ?? 0;

  const items: ManagerActionItem[] = [];
  const tabBadges: NavTabBadges = {};

  pushInjuryAndSkillItems(items, tabBadges, injuredCount, playerSpTotal, managerSpTotal);
  pushClubMilestoneItems(items, tabBadges, club, currentSeriesIndex, unopenedPackCount);

  const headline =
    items.length === 0
      ? 'All set, Skipper! Sim the next 3-game series or jump into a live 3D game.'
      : `${items.length} rewarding GM action${items.length === 1 ? '' : 's'} ready for your club!`;

  return {
    headline,
    items,
    tabBadges,
    injuredCount,
    playerSpTotal,
    managerSpTotal,
  };
}

/** Computes explicit player level-up events by comparing before & after roster snapshots. */
export function diffClubLevelUps(
  beforeRoster: readonly Player[],
  afterRoster: readonly Player[],
): PlayerLevelUpEvent[] {
  const prevById = new Map(beforeRoster.map((p) => [p.id, p]));
  const events: PlayerLevelUpEvent[] = [];
  for (const next of afterRoster) {
    const prev = prevById.get(next.id);
    if (prev && next.level > prev.level) {
      events.push({
        playerId: next.id,
        playerName: next.name,
        newLevel: next.level,
        spEarned: Math.max(1, next.level - prev.level),
      });
    }
  }
  return events;
}

/** Automatically grants series XP, auto-level-ups, Skill Tree SP, Manager XP, and gate cash after a simmed 3-game series. */
export function applySeriesAutoProgression(
  club: Club,
  manager: ManagerProfile,
  winsGained: number,
  lossesGained: number,
): SeriesAutoProgressionResult {
  const basePlayerXp = 95 + winsGained * 35;
  const updatedRoster = club.roster.map((player) => {
    const scaledXp = Math.max(12, Math.round(basePlayerXp * player.xpGrowthMultiplier));
    const withLevels = applyPlayerXpAndLevelUps(player, scaledXp);
    return {
      ...withLevels,
      fatigue: Math.max(0, withLevels.fatigue - 20),
    };
  });

  const levelUps = diffClubLevelUps(club.roster, updatedRoster);
  const managerXpGain = 90 + winsGained * 45;
  const nextManager = applyManagerXpAndLevelUp(manager, managerXpGain, winsGained >= lossesGained);
  const cashEarned =
    1_800 +
    winsGained * 950 +
    Math.round(Math.min(club.stadium.capacity, club.economy.fanBase) * 0.65);
  const hypeDelta = winsGained * 4 - lossesGained * 2;

  return {
    club: {
      ...club,
      roster: updatedRoster,
      economy: {
        ...club.economy,
        cash: club.economy.cash + cashEarned,
        teamHype: Math.max(0, Math.min(100, club.economy.teamHype + hypeDelta)),
        fanBase: Math.max(100, club.economy.fanBase + winsGained * 45),
      },
    },
    manager: nextManager,
    levelUps,
    managerLeveledUp: nextManager.level > manager.level,
    cashEarned,
    hypeDelta,
  };
}

/** One-tap joyful team practice giving automatic XP/level-ups and a morale/form lift across the roster. */
export function runQuickTeamPractice(
  club: Club,
  manager: ManagerProfile,
): QuickTeamPracticeResult {
  const updatedRoster = club.roster.map((player) => {
    const youthBonus = player.age <= 24 ? 30 : 0;
    const xpGain = Math.round((80 + youthBonus) * player.xpGrowthMultiplier);
    const withLevels = applyPlayerXpAndLevelUps(player, xpGain);
    const nextForm = Math.min(100, withLevels.formScore + 6);
    return {
      ...withLevels,
      formScore: nextForm,
      formState: deriveFormState(nextForm),
      morale: Math.min(100, withLevels.morale + 4),
    };
  });

  const levelUps = diffClubLevelUps(club.roster, updatedRoster);
  const nextManager = applyManagerXpAndLevelUp(manager, 35, false);
  const levelText =
    levelUps.length > 0
      ? ` ${levelUps.length} player${levelUps.length === 1 ? '' : 's'} leveled up (+SP ready for Skill Trees)!`
      : ' Roster gained +XP & sharpened form!';

  return {
    club: { ...club, roster: updatedRoster },
    manager: nextManager,
    playersBoosted: updatedRoster.length,
    levelUps,
    managerLeveledUp: nextManager.level > manager.level,
    summary: `Team Practice complete!${levelText}`,
  };
}
