import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  canUnlockSkillNode,
  computeSkillTreeCombatBonuses,
  getAvailableSkillBranches,
  respecPlayerSkills,
  SKILL_TREE_NODES,
  toggleEquippedSpecialPower,
  unlockSkillNode,
} from './skillTrees';

describe('Branching Player Skill Trees Engine (TASK-019)', () => {
  it('defines at least 30 branching nodes across pitcher, batter, and fielder trees with valid prerequisites', () => {
    expect(SKILL_TREE_NODES.length).toBeGreaterThanOrEqual(30);
    const byId = new Map(SKILL_TREE_NODES.map((n) => [n.id, n]));
    const branches = new Set(SKILL_TREE_NODES.map((n) => n.branch));
    expect(branches).toEqual(new Set(['pitcher', 'batter', 'fielder']));

    for (const node of SKILL_TREE_NODES) {
      for (const req of node.prerequisiteIds) {
        expect(byId.has(req)).toBe(true);
      }
      expect(node.spCost).toBeGreaterThanOrEqual(1);
    }

    const capstones = SKILL_TREE_NODES.filter((n) => n.capstonePowerId !== undefined);
    expect(capstones.length).toBeGreaterThanOrEqual(9);
  });

  it('enforces branch eligibility, prerequisite order, SP costs, statCaps, totalRatingBudget, and capstone equips', () => {
    const basePitcher = createPlayer(createSeededRng(101), { position: 'SP', tier: 'aa' });
    const pitcher = { ...basePitcher, skillPoints: 8, level: 5 };

    expect(getAvailableSkillBranches(pitcher)).toEqual(['pitcher', 'fielder']);

    // Cannot unlock batter node on a pitcher
    const wrongBranch = canUnlockSkillNode(pitcher, 'b_pwr_1');
    expect(wrongBranch.allowed).toBe(false);

    // Cannot unlock Tier 2 or Capstone before prerequisites
    const skipPrereq = canUnlockSkillNode(pitcher, 'cap_blazing_comet');
    expect(skipPrereq.allowed).toBe(false);

    // Walk path: p_heat_1 -> p_heat_2 -> cap_blazing_comet
    const step1 = unlockSkillNode(pitcher, 'p_heat_1');
    expect(step1.unlocked).toBe(true);
    expect(step1.player.skillPoints).toBe(7);
    expect(step1.player.unlockedSkillIds).toContain('p_heat_1');
    expect(step1.player.ratings.velocity).toBeLessThanOrEqual(step1.player.statCaps.velocity);

    const step2 = unlockSkillNode(step1.player, 'p_heat_2');
    expect(step2.unlocked).toBe(true);

    const step3 = unlockSkillNode(step2.player, 'cap_blazing_comet');
    expect(step3.unlocked).toBe(true);
    expect(step3.player.equippedPowerIds).toContain('blazing_comet');

    const combatFx = computeSkillTreeCombatBonuses(step3.player);
    expect(combatFx.pitchingStuffDelta).toBeGreaterThan(0);
    expect(combatFx.equippedCapstoneNames).toContain('Blazing Comet');

    // Duplicate unlock blocked
    expect(canUnlockSkillNode(step3.player, 'p_heat_1').allowed).toBe(false);
  });

  it('respects max equipped special power slots (2 standard, 3 at Legend Lv >= 12) and cleanly respecs', () => {
    const baseBatter = createPlayer(createSeededRng(202), { position: 'CF', tier: 'aa' });
    let batter = { ...baseBatter, skillPoints: 20, level: 8 };
    const startingRatings = { ...batter.ratings };

    expect(getAvailableSkillBranches(batter)).toEqual(['batter', 'fielder']);

    // Unlock 3 capstones across batter & fielder trees
    for (const id of [
      'b_pwr_1',
      'b_pwr_2',
      'cap_moonshot_bomb',
      'b_spd_1',
      'b_spd_2',
      'cap_ninja_bunt',
      'f_rng_1',
      'f_rng_2',
      'cap_sky_high_leap',
    ]) {
      const res = unlockSkillNode(batter, id);
      expect(res.unlocked).toBe(true);
      batter = res.player;
    }

    // Standard Lv 8 cap is 2 equipped powers
    expect(batter.equippedPowerIds.length).toBe(2);
    const blockedEquip = toggleEquippedSpecialPower(batter, 'sky_high_leap');
    expect(blockedEquip.changed).toBe(false);

    // Unequip one -> can now equip the 3rd
    const unequipped = toggleEquippedSpecialPower(batter, 'moonshot_bomb');
    expect(unequipped.changed).toBe(true);
    expect(unequipped.player.equippedPowerIds).toHaveLength(1);
    const equippedLeap = toggleEquippedSpecialPower(unequipped.player, 'sky_high_leap');
    expect(equippedLeap.changed).toBe(true);
    expect(equippedLeap.player.equippedPowerIds).toContain('sky_high_leap');

    // Legend Lv 12 unlocks a 3rd equipped slot
    const legend = { ...equippedLeap.player, level: 12 };
    const thirdSlot = toggleEquippedSpecialPower(legend, 'moonshot_bomb');
    expect(thirdSlot.changed).toBe(true);
    expect(thirdSlot.player.equippedPowerIds).toHaveLength(3);

    // Respec refunds all SP spent on tree nodes and restores unlockedSkillIds = []
    const respec = respecPlayerSkills(thirdSlot.player);
    expect(respec.refundedSp).toBeGreaterThanOrEqual(12);
    expect(respec.player.unlockedSkillIds).toEqual([]);
    expect(respec.player.skillPoints).toBe(thirdSlot.player.skillPoints + respec.refundedSp);
    expect(respec.player.ratings.power).toBeLessThanOrEqual(startingRatings.power + 2);
  });
});
