import type { Club } from '../models/club';
import type { Player } from '../models/player';
import {
  canUnlockSkillNode,
  getAvailableSkillBranches,
  getNodesForBranch,
  unlockSkillNode,
  type SkillTreeNode,
} from './skillTrees';
import { getNodeMasteryDiscipline, resolvePlayerSkillMastery } from './skillTreeMastery';

export type SkillTreeAssistMode = 'auto' | 'semi_auto' | 'manual';

export interface CoachSkillRecommendation {
  node: SkillTreeNode;
  reason: string;
}

const ARCHETYPE_PREFERRED_DISCIPLINES: Readonly<Record<string, readonly string[]>> = {
  power_slugger: ['power'],
  contact_technician: ['contact'],
  speed_smallball: ['speed'],
  defensive_wizard: ['fielding'],
  flame_closer: ['heat'],
  crafty_tactician: ['command', 'spin'],
};

const TIER_SCORE_BONUS: Readonly<Record<1 | 2 | 3, number>> = {
  1: 0,
  2: 12,
  3: 25,
};

function scoreNodeForPlayer(player: Player, node: SkillTreeNode): number {
  const mastery = resolvePlayerSkillMastery(player);
  const disc = getNodeMasteryDiscipline(node);
  const preferred = ARCHETYPE_PREFERRED_DISCIPLINES[player.specialistArchetype];
  const archBonus = preferred?.includes(disc) ? 18 : 0;
  const roleBonus = node.branch === 'fielder' ? 0 : 8;
  return mastery[disc] * 1.2 + TIER_SCORE_BONUS[node.tier] + roleBonus + archBonus;
}

/** Selects the highest-value unlockable skill node (`★ Coach's Pick`) matching the player's active Mastery & archetype. */
export function pickCoachRecommendedSkillNode(player: Player): CoachSkillRecommendation | null {
  const branches = getAvailableSkillBranches(player);
  const candidates: SkillTreeNode[] = [];
  for (const branch of branches) {
    for (const node of getNodesForBranch(branch)) {
      if (canUnlockSkillNode(player, node.id).allowed) {
        candidates.push(node);
      }
    }
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => scoreNodeForPlayer(player, b) - scoreNodeForPlayer(player, a));
  const best = candidates[0];
  const disc = getNodeMasteryDiscipline(best);
  const masteryVal = resolvePlayerSkillMastery(player)[disc];
  return {
    node: best,
    reason:
      best.tier === 3
        ? `Locks in signature ${best.name} capstone (Mastery ${masteryVal})`
        : `Matches ${player.name}'s top ${disc} mastery (${masteryVal})`,
  };
}

/** Spends available SP on Coach's Picks for one player (used by Auto mode and 1-tap Ask Me Apply). */
export function applyCoachSkillPicksForPlayer(player: Player): {
  player: Player;
  unlockedNodeNames: string[];
} {
  let current = player;
  const unlockedNodeNames: string[] = [];
  for (let step = 0; step < 6; step += 1) {
    const rec = pickCoachRecommendedSkillNode(current);
    if (!rec) break;
    const res = unlockSkillNode(current, rec.node.id);
    if (!res.unlocked) break;
    current = res.player;
    unlockedNodeNames.push(rec.node.name);
  }
  return { player: current, unlockedNodeNames };
}

/** Automatically applies Coach's Picks across an entire club roster when `skillTreeMode === 'auto'` or on 1-tap apply. */
export function applyAutoSkillTreeForClub(club: Club): {
  club: Club;
  appliedSummary: string[];
} {
  const appliedSummary: string[] = [];
  const nextRoster = club.roster.map((player) => {
    if (player.skillPoints <= 0) return player;
    const { player: upgraded, unlockedNodeNames } = applyCoachSkillPicksForPlayer(player);
    if (unlockedNodeNames.length > 0) {
      appliedSummary.push(`${player.name}: ${unlockedNodeNames.join(', ')}`);
    }
    return upgraded;
  });
  return {
    club: { ...club, roster: nextRoster },
    appliedSummary,
  };
}
