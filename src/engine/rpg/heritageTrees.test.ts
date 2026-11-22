import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { NATIONALITIES_CATALOG } from '../nationalities/nationalitiesCatalog';
import { createSeededRng } from '../rng/seededRng';
import {
  canUnlockNextHeritageTier,
  evaluateHeritageCombatBonuses,
  getHeritageBranch,
  unlockNextHeritageTier,
} from './heritageTrees';

describe('3-Tier Cultural Heritage Skill Branches (TASK-020)', () => {
  it('provides a complete 3-tier Myth/Animal progression branch for every national team', () => {
    for (const nation of NATIONALITIES_CATALOG) {
      const branch = getHeritageBranch(nation.id);
      expect(branch.nationalityId).toBe(nation.id);
      expect(branch.tiers).toHaveLength(3);
      expect(branch.tiers.map((t) => t.tier)).toEqual([1, 2, 3]);
      expect(branch.tiers[0].spCost).toBe(1);
      expect(branch.tiers[1].spCost).toBe(2);
      expect(branch.tiers[2].spCost).toBe(3);
      expect(branch.tiers[2].signaturePowerId).toBe(nation.heritageAbility.id);
    }
  });

  it('unlocks Tier 1 -> Tier 2 -> Tier 3 sequentially, respecting SP costs, statCaps, and equipping signature power at Tier 3', () => {
    const base = createPlayer(createSeededRng(303), {
      position: 'CF',
      tier: 'aa',
      forcedNationalityId: 'DOM',
    });
    const player = { ...base, skillPoints: 6, heritageTierUnlocked: 0 as const };

    expect(canUnlockNextHeritageTier({ ...player, skillPoints: 0 }).allowed).toBe(false);

    // Tier 1 (1 SP)
    const t1 = unlockNextHeritageTier(player);
    expect(t1.unlocked).toBe(true);
    expect(t1.player.heritageTierUnlocked).toBe(1);
    expect(t1.player.skillPoints).toBe(5);

    // Tier 2 (2 SP)
    const t2 = unlockNextHeritageTier(t1.player);
    expect(t2.unlocked).toBe(true);
    expect(t2.player.heritageTierUnlocked).toBe(2);
    expect(t2.player.skillPoints).toBe(3);

    // Tier 3 (3 SP) unlocks signature Myth/Animal power
    const t3 = unlockNextHeritageTier(t2.player);
    expect(t3.unlocked).toBe(true);
    expect(t3.player.heritageTierUnlocked).toBe(3);
    expect(t3.player.skillPoints).toBe(0);
    expect(t3.player.equippedPowerIds).toContain('dom_huracan_swing');

    // Further unlocks blocked at max Tier 3
    expect(canUnlockNextHeritageTier({ ...t3.player, skillPoints: 5 }).allowed).toBe(false);
  });

  it('scales combat bonuses across tiers and activates clutch boost at high Leverage Index (LI >= 1.55)', () => {
    const base = createPlayer(createSeededRng(404), {
      position: 'SP',
      tier: 'aa',
      forcedNationalityId: 'JPN',
    });
    const t0Fx = evaluateHeritageCombatBonuses({ ...base, heritageTierUnlocked: 0 }, 1.0);
    expect(t0Fx.passiveBonus).toBe(0);
    expect(t0Fx.clutchBonus).toBe(0);
    expect(t0Fx.signaturePowerReady).toBe(false);

    const t2LowLi = evaluateHeritageCombatBonuses({ ...base, heritageTierUnlocked: 2 }, 1.0);
    const t2HighLi = evaluateHeritageCombatBonuses({ ...base, heritageTierUnlocked: 2 }, 2.1);
    expect(t2LowLi.passiveBonus).toBeGreaterThan(0);
    expect(t2LowLi.clutchBonus).toBe(0);
    expect(t2HighLi.clutchBonus).toBeGreaterThan(0);

    const t3HighLi = evaluateHeritageCombatBonuses({ ...base, heritageTierUnlocked: 3 }, 2.2);
    expect(t3HighLi.signaturePowerReady).toBe(true);
    expect(t3HighLi.signaturePower?.name).toBe('Kitsune Mirage');
    expect(t3HighLi.signaturePower?.ballStyle).toBe('ghost_knuckle');
  });
});
