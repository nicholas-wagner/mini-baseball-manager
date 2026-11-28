import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  applyAutoSkillTreeForClub,
  applyCoachSkillPicksForPlayer,
  pickCoachRecommendedSkillNode,
} from './skillTreeAssist';

describe('Skill Tree 3-Mode Assistant (Auto / Ask Me / Manual — TASK-133)', () => {
  it('recommends and unlocks Coach Picks aligned with player discipline mastery while honoring Career SP Caps', () => {
    const club = createClub(createSeededRng(1339), {
      id: 'assist-club',
      isHuman: true,
      city: 'Star',
      name: 'Knights',
      mascot: 'Comet',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SK' },
      leagueTier: 'rookie',
    });
    const slugger = {
      ...club.roster[0],
      skillPoints: 3,
      unlockedSkillIds: [],
      specialistArchetype: 'power_slugger' as const,
      skillMastery: { power: 35, contact: 10, speed: 5, fielding: 10, heat: 0, spin: 0, command: 0 },
    };

    const rec = pickCoachRecommendedSkillNode(slugger);
    expect(rec).not.toBeNull();
    expect(rec?.node.id).toBe('b_pwr_1');

    const { player: upgraded, unlockedNodeNames } = applyCoachSkillPicksForPlayer(slugger);
    expect(unlockedNodeNames.length).toBeGreaterThanOrEqual(2);
    expect(upgraded.unlockedSkillIds).toContain('b_pwr_1');
    expect(upgraded.unlockedSkillIds).toContain('b_pwr_2');

    // Club-wide auto apply upgrades every player with SP ready
    const seededClub = {
      ...club,
      roster: club.roster.map((p, idx) => (idx < 2 ? { ...p, skillPoints: 2 } : p)),
    };
    const autoRes = applyAutoSkillTreeForClub(seededClub);
    expect(autoRes.appliedSummary.length).toBe(2);
    expect(autoRes.club.roster[0].unlockedSkillIds.length).toBeGreaterThan(0);
  });
});
