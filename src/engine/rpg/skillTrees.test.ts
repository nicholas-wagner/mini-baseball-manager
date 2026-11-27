import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  canRetrainPlayerSkills,
  canUnlockSkillNode,
  computeSkillTreeCombatBonuses,
  getAvailableSkillBranches,
  getMaxPlayerCapstones,
  getPlayerBuildIdentity,
  getPlayerCapstoneSummary,
  getPlayerSkillBudgetCap,
  getPlayerSpentSkillPoints,
  MAX_CAREER_RETRAINS_PER_PLAYER,
  respecPlayerSkills,
  SKILL_RESPEC_CASH_FEE,
  SKILL_TREE_NODES,
  toggleEquippedSpecialPower,
  undoSessionSkillNode,
  unlockSkillNode,
} from './skillTrees';
import { unlockNextHeritageTier } from './heritageTrees';

describe('Branching Player Skill Trees Engine (TASK-019, TASK-114)', () => {
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
    const baseBatter = createPlayer(createSeededRng(202), {
      position: 'CF',
      tier: 'aa',
      marketTier: 'all_star',
    });
    let batter = { ...baseBatter, skillPoints: 30, level: 8 };
    const startingRatings = { ...batter.ratings };

    expect(getAvailableSkillBranches(batter)).toEqual(['batter', 'fielder']);

    // All-Star unlocks 1 primary capstone + 1 fielder capstone (12 SP) + Tier-3 Cultural Heritage power = 3 powers
    for (const id of [
      'b_pwr_1',
      'b_pwr_2',
      'cap_moonshot_bomb',
      'f_rng_1',
      'f_rng_2',
      'cap_sky_high_leap',
    ]) {
      const res = unlockSkillNode(batter, id);
      expect(res.unlocked).toBe(true);
      batter = res.player;
    }

    // Standard Lv 8 cap is 2 equipped powers (both capstones auto-equipped)
    expect(batter.equippedPowerIds).toEqual(['moonshot_bomb', 'sky_high_leap']);

    // Unlock all 3 heritage tiers -> 3rd special power available (replaces last slot when at cap 2)
    batter = unlockNextHeritageTier(batter).player;
    batter = unlockNextHeritageTier(batter).player;
    batter = unlockNextHeritageTier(batter).player;
    expect(batter.equippedPowerIds).toHaveLength(2);
    expect(batter.equippedPowerIds).not.toContain('sky_high_leap');

    const blockedEquip = toggleEquippedSpecialPower(batter, 'sky_high_leap');
    expect(blockedEquip.changed).toBe(false);

    // Unequip one -> can now equip sky_high_leap
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
    expect(respec.refundedSp).toBe(12);
    expect(respec.player.unlockedSkillIds).toEqual([]);
    expect(respec.player.skillPoints).toBe(thirdSlot.player.skillPoints + respec.refundedSp);
    expect(respec.player.ratings.power).toBeLessThanOrEqual(startingRatings.power + 2);
  });

  it('caps Career Talent SP by marketTier and promotes Lv 12+ or award-winning breakouts to 18 SP (never 100% completion)', () => {
    const base = createPlayer(createSeededRng(303), { position: 'SS', tier: 'aa', marketTier: 'average' });
    expect(getPlayerSkillBudgetCap({ ...base, marketTier: 'all_star', level: 3, awards: [] })).toBe(18);
    expect(getPlayerSkillBudgetCap({ ...base, marketTier: 'rookie', level: 3, awards: [] })).toBe(14);
    expect(getPlayerSkillBudgetCap({ ...base, marketTier: 'above_average', level: 3, awards: [] })).toBe(14);
    expect(getPlayerSkillBudgetCap({ ...base, marketTier: 'average', level: 3, awards: [] })).toBe(12);
    expect(getPlayerSkillBudgetCap({ ...base, marketTier: 'veteran', level: 3, awards: [] })).toBe(12);
    expect(getPlayerSkillBudgetCap({ ...base, marketTier: 'below_average', level: 3, awards: [] })).toBe(12);

    // Career Breakout Promotion: Lv >= 12 OR major career award promotes non-all_star to 18 SP & 2 capstones!
    const lv12Breakout = { ...base, marketTier: 'rookie' as const, level: 12, awards: [] };
    expect(getPlayerSkillBudgetCap(lv12Breakout)).toBe(18);
    expect(getMaxPlayerCapstones(lv12Breakout)).toEqual({ total: 2, maxPrimary: 1, maxFielder: 1 });

    const mvpBreakout = { ...base, marketTier: 'average' as const, level: 6, awards: ['Season 2 Most Valuable Player'] };
    expect(getPlayerSkillBudgetCap(mvpBreakout)).toBe(18);
    const cyBreakout = { ...base, marketTier: 'below_average' as const, level: 5, awards: ['Golden Arm Award'] };
    expect(getPlayerSkillBudgetCap(cyBreakout)).toBe(18);
    const allStarBreakout = { ...base, marketTier: 'veteran' as const, level: 7, awards: ['All-Star Selection'] };
    expect(getPlayerSkillBudgetCap(allStarBreakout)).toBe(18);

    // Non-all_star below Lv 12 gets strictly 1 capstone total
    expect(getMaxPlayerCapstones({ ...base, marketTier: 'rookie', level: 7, awards: [] })).toEqual({
      total: 1,
      maxPrimary: 1,
      maxFielder: 1,
    });

    // Even 18 SP is far below the 41 SP required for 100% completion
    const totalBatterFielderSp = SKILL_TREE_NODES.filter(
      (n) => n.branch === 'batter' || n.branch === 'fielder',
    ).reduce((sum, n) => sum + n.spCost, 0);
    expect(totalBatterFielderSp).toBe(41);
  });

  it('enforces Career SP Budget Cap and Tier-3 Capstone exclusivity for both regular players and All-Stars', () => {
    const avgBatter = {
      ...createPlayer(createSeededRng(404), { position: 'RF', tier: 'aa', marketTier: 'average' }),
      skillPoints: 30,
      level: 5,
      awards: [],
    };

    // Reach Moonshot Bomb-Swing (6 SP)
    let p = unlockSkillNode(avgBatter, 'b_pwr_1').player;
    p = unlockSkillNode(p, 'b_pwr_2').player;
    p = unlockSkillNode(p, 'cap_moonshot_bomb').player;
    expect(getPlayerSpentSkillPoints(p)).toBe(6);

    // Rival same-branch Tier-3 capstone is locked immediately with clear reason
    const rivalBatterCap = canUnlockSkillNode(p, 'cap_rally_spark');
    expect(rivalBatterCap.allowed).toBe(false);
    expect(rivalBatterCap.reason).toMatch(/Specialized in Moonshot Bomb-Swing/i);

    // Cross-branch Tier-3 capstone is ALSO locked for a non-all_star (max 1 total capstone)
    p = unlockSkillNode(p, 'f_rng_1').player;
    p = unlockSkillNode(p, 'f_rng_2').player; // spent = 9 SP
    const crossCapBlocked = canUnlockSkillNode(p, 'cap_sky_high_leap');
    expect(crossCapBlocked.allowed).toBe(false);
    expect(crossCapBlocked.reason).toMatch(/Max 1 Tier-3 Capstone reached/i);

    // Spend remaining 3 SP on Tier 1-2 nodes up to 12/12 SP cap
    p = unlockSkillNode(p, 'b_con_1').player; // 10
    p = unlockSkillNode(p, 'b_con_2').player; // 12
    expect(getPlayerSpentSkillPoints(p)).toBe(12);

    const overBudget = canUnlockSkillNode(p, 'b_spd_1');
    expect(overBudget.allowed).toBe(false);
    expect(overBudget.reason).toMatch(/Career Talent cap reached \(12\/12 SP/i);

    // All-Star can pair 1 primary + 1 fielder capstone, NEVER 2 primary capstones
    const starBatter = {
      ...createPlayer(createSeededRng(405), { position: 'CF', tier: 'aa', marketTier: 'all_star' }),
      skillPoints: 30,
      level: 6,
    };
    let s = unlockSkillNode(starBatter, 'b_pwr_1').player;
    s = unlockSkillNode(s, 'b_pwr_2').player;
    s = unlockSkillNode(s, 'cap_moonshot_bomb').player;
    s = unlockSkillNode(s, 'b_spd_1').player;
    s = unlockSkillNode(s, 'b_spd_2').player;
    const secondPrimaryBlocked = canUnlockSkillNode(s, 'cap_ninja_bunt');
    expect(secondPrimaryBlocked.allowed).toBe(false);
    expect(secondPrimaryBlocked.reason).toMatch(/Specialized in Moonshot Bomb-Swing/i);

    s = unlockSkillNode(s, 'f_arm_1').player;
    s = unlockSkillNode(s, 'f_arm_2').player;
    const fielderCapAllowed = unlockSkillNode(s, 'cap_cannon_arm');
    expect(fielderCapAllowed.unlocked).toBe(true);
    expect(getPlayerCapstoneSummary(fielderCapAllowed.player)).toEqual({
      primaryCapstoneNodeId: 'cap_moonshot_bomb',
      fielderCapstoneNodeId: 'cap_cannon_arm',
      totalCapstones: 2,
    });
  });

  it('handles legacy over-cap saves safely without crashing or deleting nodes', () => {
    const legacyBatter = {
      ...createPlayer(createSeededRng(505), { position: 'LF', tier: 'aa', marketTier: 'average' }),
      skillPoints: 10,
      level: 5,
      awards: [],
      unlockedSkillIds: [
        'b_pwr_1', 'b_pwr_2', 'cap_moonshot_bomb',
        'b_con_1', 'b_con_2', 'cap_rally_spark',
        'f_glv_1', 'f_glv_2', 'cap_iron_vacuum',
      ],
    };

    const identity = getPlayerBuildIdentity(legacyBatter);
    expect(identity.spentSp).toBe(18);
    expect(identity.maxSp).toBe(12);
    expect(identity.remainingBudgetSp).toBe(0);
    expect(canUnlockSkillNode(legacyBatter, 'b_spd_1').allowed).toBe(false);
  });

  it('derives accurate Build Identity labels across balanced, specialist, pitcher, fielder, and two-way builds', () => {
    const batter = {
      ...createPlayer(createSeededRng(606), { position: '1B', tier: 'aa', marketTier: 'all_star' }),
      level: 6,
      awards: [],
    };
    expect(getPlayerBuildIdentity(batter).label).toBe('Developing Prospect');
    expect(getPlayerBuildIdentity({ ...batter, unlockedSkillIds: ['b_pwr_1', 'b_con_1'] }).label).toBe(
      'Rising Contributor',
    );
    expect(
      getPlayerBuildIdentity({
        ...batter,
        unlockedSkillIds: ['b_pwr_1', 'b_con_1', 'b_spd_1', 'f_rng_1', 'b_pwr_2'],
      }).label,
    ).toBe('Balanced All-Around');
    expect(
      getPlayerBuildIdentity({ ...batter, unlockedSkillIds: ['b_pwr_1', 'b_pwr_2', 'cap_moonshot_bomb'] }),
    ).toMatchObject({ label: 'Power Specialist', tone: 'power', primaryCapstoneName: 'Moonshot Bomb-Swing' });
    expect(
      getPlayerBuildIdentity({ ...batter, unlockedSkillIds: ['b_con_1', 'b_con_2', 'cap_rally_spark'] }),
    ).toMatchObject({ label: 'Contact Maestro', tone: 'contact' });
    expect(
      getPlayerBuildIdentity({ ...batter, unlockedSkillIds: ['b_spd_1', 'b_spd_2', 'cap_ninja_bunt'] }),
    ).toMatchObject({ label: 'Speed Demon', tone: 'speed' });
    expect(
      getPlayerBuildIdentity({ ...batter, unlockedSkillIds: ['f_glv_1', 'f_glv_2', 'cap_iron_vacuum'] }),
    ).toMatchObject({ label: 'Defensive Anchor', tone: 'glove', fielderCapstoneName: 'Iron Vacuum' });
    expect(
      getPlayerBuildIdentity({
        ...batter,
        unlockedSkillIds: ['b_pwr_1', 'b_pwr_2', 'cap_moonshot_bomb', 'f_glv_1', 'f_glv_2', 'cap_iron_vacuum'],
      }),
    ).toMatchObject({ label: 'Two-Way All-Star', tone: 'two_way' });

    const pitcher = {
      ...createPlayer(createSeededRng(607), { position: 'SP', tier: 'aa', marketTier: 'rookie' }),
      level: 6,
      awards: [],
    };
    expect(
      getPlayerBuildIdentity({ ...pitcher, unlockedSkillIds: ['p_heat_1', 'p_heat_2', 'cap_blazing_comet'] }),
    ).toMatchObject({ label: 'Flamethrower Ace', tone: 'heat' });
    expect(
      getPlayerBuildIdentity({ ...pitcher, unlockedSkillIds: ['p_spin_1', 'p_spin_2', 'cap_ghost_knuckle'] }),
    ).toMatchObject({ label: 'Spin Wizard', tone: 'spin' });
    expect(
      getPlayerBuildIdentity({ ...pitcher, unlockedSkillIds: ['p_paint_1', 'p_paint_2', 'cap_ice_veins'] }),
    ).toMatchObject({ label: 'Command Artist', tone: 'control' });
  });

  it('enforces Offseason Retrain ($2,000, 1/career) and free instant session undo with prerequisite safety', () => {
    expect(SKILL_RESPEC_CASH_FEE).toBe(2_000);
    expect(MAX_CAREER_RETRAINS_PER_PLAYER).toBe(1);

    const base = {
      ...createPlayer(createSeededRng(707), { position: 'SS', tier: 'aa', marketTier: 'rookie' }),
      skillPoints: 10,
      careerRetrainsUsed: 0,
    };

    // Free session undo works in reverse order and refuses to orphan dependent nodes
    const step1 = unlockSkillNode(base, 'b_pwr_1').player;
    const step2 = unlockSkillNode(step1, 'b_pwr_2').player;
    expect(step2.skillPoints).toBe(7);

    const orphanBlocked = undoSessionSkillNode(step2, 'b_pwr_1');
    expect(orphanBlocked.undone).toBe(false);
    expect(orphanBlocked.reason).toMatch(/Gap Crusher/i);

    const undoStep2 = undoSessionSkillNode(step2, 'b_pwr_2');
    expect(undoStep2.undone).toBe(true);
    expect(undoStep2.refundedSp).toBe(2);
    expect(undoStep2.player.skillPoints).toBe(9);
    expect(undoStep2.player.unlockedSkillIds).toEqual(['b_pwr_1']);

    // Offseason Retrain rules
    expect(canRetrainPlayerSkills(base, { isOffseason: true, clubCash: 5_000 }).allowed).toBe(false);
    expect(canRetrainPlayerSkills(step2, { isOffseason: false, clubCash: 5_000 }).allowed).toBe(false);
    expect(canRetrainPlayerSkills(step2, { isOffseason: true, clubCash: 1_500 }).allowed).toBe(false);
    expect(canRetrainPlayerSkills(step2, { isOffseason: true, clubCash: 2_000 }).allowed).toBe(true);

    const retrained = respecPlayerSkills(step2, { markCareerRetrain: true });
    expect(retrained.refundedSp).toBe(3);
    expect(retrained.player.careerRetrainsUsed).toBe(1);
    expect(retrained.player.unlockedSkillIds).toEqual([]);

    // 2nd career retrain blocked even in offseason with ample cash
    const rebuilt = unlockSkillNode(retrained.player, 'b_con_1').player;
    const secondCheck = canRetrainPlayerSkills(rebuilt, { isOffseason: true, clubCash: 20_000 });
    expect(secondCheck.allowed).toBe(false);
    expect(secondCheck.reason).toMatch(/1 per player|already used/i);
  });
});
