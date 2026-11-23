import {
  getStadiumTierProfile,
  STADIUM_UPGRADE_CATALOG,
} from '../ballparks/stadiumProgression';
import type { Club } from '../models/club';
import type { ManagerProfile } from '../models/manager';
import { isPitcherPosition, type Player } from '../models/player';
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

export type TeamPracticeFocusId = 'batting_cage' | 'bullpen_lab' | 'full_squad' | 'rest_film';

export interface TeamPracticeOption {
  id: TeamPracticeFocusId;
  icon: string;
  label: string;
  gainBadge: string;
  tradeoffBadge: string;
}

export interface TeamPracticeRecommendation {
  focusId: TeamPracticeFocusId;
  reason: string;
}

export const TEAM_PRACTICE_OPTIONS: readonly TeamPracticeOption[] = [
  {
    id: 'batting_cage',
    icon: '🏏',
    label: 'Batting Cage Marathon',
    gainBadge: '+110 XP & +8 Form (Hitters)',
    tradeoffBadge: 'Pitchers 0 XP • +7 Fatigue',
  },
  {
    id: 'bullpen_lab',
    icon: '⚾',
    label: 'Bullpen & Pitch Lab',
    gainBadge: '+110 XP & +8 Form (Pitchers)',
    tradeoffBadge: 'Hitters 0 XP • +8 Fatigue',
  },
  {
    id: 'full_squad',
    icon: '🧤',
    label: 'Full-Squad Fundamentals',
    gainBadge: '+65 XP & +5 Morale (All)',
    tradeoffBadge: 'Slower XP • +6 Fatigue',
  },
  {
    id: 'rest_film',
    icon: '🧘',
    label: 'Rest, Ice & Film Room',
    gainBadge: '-24 Fatigue • Busts Slumps • +45 Mgr XP',
    tradeoffBadge: '0 Player XP this cycle',
  },
];

export interface QuickTeamPracticeResult {
  focusId: TeamPracticeFocusId;
  focusLabel: string;
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

  const isOpeningDayPreGame = club.wins + club.losses === 0 && currentSeriesIndex === 0;
  if (!isOpeningDayPreGame && hasAffordableBallparkUpgrade(club)) {
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

/** Recommends the smartest between-games Team Practice focus based on current club fatigue and form. */
export function recommendTeamPracticeFocus(club: Club): TeamPracticeRecommendation {
  const pitchers = club.roster.filter((p) => isPitcherPosition(p.position));
  const hitters = club.roster.filter((p) => !isPitcherPosition(p.position));
  const avgPitcherFatigue =
    pitchers.length > 0
      ? pitchers.reduce((sum, p) => sum + p.fatigue, 0) / pitchers.length
      : 0;
  const tiredPlayers = club.roster.filter((p) => p.fatigue >= 45).length;

  if (avgPitcherFatigue >= 38 || tiredPlayers >= 3) {
    return {
      focusId: 'rest_film',
      reason: 'Players are carrying fatigue — Rest, Ice & Film Room gets everyone fresh!',
    };
  }

  const coldHitters = hitters.filter((p) => p.formScore <= -10).length;
  if (coldHitters >= 3) {
    return {
      focusId: 'batting_cage',
      reason: 'Bats have gone chilly — Batting Cage Marathon heats up your lineup!',
    };
  }

  const coldPitchers = pitchers.filter((p) => p.formScore <= -10).length;
  if (coldPitchers >= 2) {
    return {
      focusId: 'bullpen_lab',
      reason: 'Your staff needs rhythm — Bullpen & Pitch Lab sharpens your arms!',
    };
  }

  return {
    focusId: 'full_squad',
    reason: 'Club is rested & healthy — grow the whole squad or target one unit!',
  };
}

function applyFocusToPlayer(player: Player, focusId: TeamPracticeFocusId): Player {
  const pitcher = isPitcherPosition(player.position);
  const youth = player.age <= 24 ? 30 : 0;

  if (focusId === 'rest_film') {
    const formBoost = player.formScore < 0 ? 14 : 5;
    const nextForm = Math.min(100, player.formScore + formBoost);
    return {
      ...player,
      fatigue: Math.max(0, player.fatigue - 24),
      formScore: nextForm,
      formState: deriveFormState(nextForm),
      morale: Math.min(100, player.morale + 6),
    };
  }

  if (focusId === 'batting_cage') {
    if (pitcher) return { ...player, fatigue: Math.max(0, player.fatigue - 4) };
    const withLevels = applyPlayerXpAndLevelUps(
      player,
      Math.round((110 + youth) * player.xpGrowthMultiplier),
    );
    const nextForm = Math.min(100, withLevels.formScore + 8);
    return {
      ...withLevels,
      formScore: nextForm,
      formState: deriveFormState(nextForm),
      fatigue: Math.min(100, withLevels.fatigue + 7),
    };
  }

  if (focusId === 'bullpen_lab') {
    if (!pitcher) return { ...player, fatigue: Math.max(0, player.fatigue - 4) };
    const withLevels = applyPlayerXpAndLevelUps(
      player,
      Math.round((110 + youth) * player.xpGrowthMultiplier),
    );
    const nextForm = Math.min(100, withLevels.formScore + 8);
    return {
      ...withLevels,
      formScore: nextForm,
      formState: deriveFormState(nextForm),
      fatigue: Math.min(100, withLevels.fatigue + 8),
    };
  }

  const fullYouth = player.age <= 24 ? 20 : 0;
  const withLevels = applyPlayerXpAndLevelUps(
    player,
    Math.round((65 + fullYouth) * player.xpGrowthMultiplier),
  );
  const nextForm = Math.min(100, withLevels.formScore + 4);
  return {
    ...withLevels,
    formScore: nextForm,
    formState: deriveFormState(nextForm),
    morale: Math.min(100, withLevels.morale + 5),
    fatigue: Math.min(100, withLevels.fatigue + 6),
  };
}

/** Runs a focused between-games Team Practice with clear reward/tradeoff dynamics (1 per game/series). */
export function runQuickTeamPractice(
  club: Club,
  manager: ManagerProfile,
  focusId: TeamPracticeFocusId = 'full_squad',
): QuickTeamPracticeResult {
  const option =
    TEAM_PRACTICE_OPTIONS.find((opt) => opt.id === focusId) ?? TEAM_PRACTICE_OPTIONS[2];
  const updatedRoster = club.roster.map((player) => applyFocusToPlayer(player, focusId));
  const levelUps = diffClubLevelUps(club.roster, updatedRoster);
  const mgrXp = focusId === 'rest_film' ? 45 : 35;
  const nextManager = applyManagerXpAndLevelUp(manager, mgrXp, false);

  const suffix =
    focusId === 'rest_film'
      ? ' Cleared -24 Fatigue, busted cold slumps & earned +45 Manager XP!'
      : levelUps.length > 0
        ? ` ${levelUps.length} player${levelUps.length === 1 ? '' : 's'} leveled up (+SP ready for Skill Trees)!`
        : ' Sharpened form & earned focused XP!';

  return {
    focusId,
    focusLabel: option.label,
    club: { ...club, roster: updatedRoster },
    manager: nextManager,
    playersBoosted: updatedRoster.length,
    levelUps,
    managerLeveledUp: nextManager.level > manager.level,
    summary: `${option.icon} ${option.label} complete!${suffix}`,
  };
}
