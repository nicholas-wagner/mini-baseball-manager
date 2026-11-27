import { describe, expect, it } from 'vitest';
import { createManagerProfile, type ManagerProfile } from '../models/manager';
import {
  canUnlockManagerSkillNode,
  getManagerBuildIdentity,
  getManagerSpentSkillPoints,
  MANAGER_MAX_CAPSTONES,
  MANAGER_SKILL_NODES,
  MANAGER_SKILL_SP_CAP,
  unlockManagerSkillNode,
} from './managerTree';

describe('Capped Manager Skill Tree & Legacy Build Identity (TASK-114)', () => {
  it('defines a 9 SP legacy cap (out of 15 SP total) and max 1 Tier-4 capstone', () => {
    const totalSp = MANAGER_SKILL_NODES.reduce((sum, n) => sum + n.spCost, 0);
    expect(totalSp).toBe(15);
    expect(MANAGER_SKILL_SP_CAP).toBe(9);
    expect(MANAGER_MAX_CAPSTONES).toBe(1);
  });

  it('tracks spent SP, enforces the 9 SP budget cap, and classifies Balanced GM builds', () => {
    let mgr = { ...createManagerProfile({ name: 'Skip', avatarSeed: 1994 }), skillPoints: 20 };
    expect(getManagerSpentSkillPoints(mgr)).toBe(1); // starts with skipper_pep_talk
    expect(getManagerBuildIdentity(mgr)).toEqual({
      label: 'Balanced GM',
      tone: 'balanced',
      spentSp: 1,
      maxSp: 9,
      capstoneId: null,
    });

    // Balanced build: Tier 1-3 across all 3 branches = 9 SP, 0 capstones
    for (const id of [
      'skipper_mound_whisper',
      'skipper_clutch_focus',
      'coach_cage_intensity',
      'coach_film_room',
      'coach_fatigue_smart',
      'mogul_ticket_buzz',
      'mogul_staff_negotiator',
      'mogul_scouting_eye',
    ]) {
      const res = unlockManagerSkillNode(mgr, id);
      expect(res.unlocked).toBe(true);
      mgr = res.manager;
    }

    expect(getManagerSpentSkillPoints(mgr)).toBe(9);
    expect(getManagerBuildIdentity(mgr).label).toBe('Balanced GM');

    // Any further node is blocked by the 9 SP legacy budget cap
    const capCheck = canUnlockManagerSkillNode(mgr, 'skipper_rally_cap');
    expect(capCheck.allowed).toBe(false);
    expect(capCheck.reason).toMatch(/9\/9 SP/i);
    expect(unlockManagerSkillNode(mgr, 'skipper_rally_cap').unlocked).toBe(false);
  });

  it('locks rival Tier-4 capstones once 1 specialization capstone is unlocked and maps all 3 identities', () => {
    const buildWithNodes = (ids: string[]) => {
      let mgr: ManagerProfile = {
        ...createManagerProfile({ name: 'Skip', avatarSeed: 1995 }),
        unlockedNodeIds: [],
        activePowerIds: [],
        skillPoints: 20,
      };
      for (const id of ids) {
        const res = unlockManagerSkillNode(mgr, id);
        expect(res.unlocked).toBe(true);
        mgr = res.manager;
      }
      return mgr;
    };

    // Skipper Legend (5 SP) + Coach Tier 1-3 (3 SP) = 8 SP; Coach Capstone blocked by capstone exclusivity!
    const skipperMgr = buildWithNodes([
      'skipper_pep_talk',
      'skipper_mound_whisper',
      'skipper_clutch_focus',
      'skipper_rally_cap',
      'coach_cage_intensity',
      'coach_film_room',
      'coach_fatigue_smart',
    ]);
    expect(getManagerBuildIdentity(skipperMgr)).toEqual({
      label: 'Skipper Legend',
      tone: 'skipper',
      spentSp: 8,
      maxSp: 9,
      capstoneId: 'skipper_rally_cap',
    });

    const coachCapstoneBlocked = canUnlockManagerSkillNode(skipperMgr, 'coach_rookie_whisperer');
    expect(coachCapstoneBlocked.allowed).toBe(false);
    expect(coachCapstoneBlocked.reason).toMatch(/Rally Cap Magic/i);

    const mogulCapstoneBlocked = canUnlockManagerSkillNode(skipperMgr, 'mogul_dynasty_aura');
    expect(mogulCapstoneBlocked.allowed).toBe(false);
    expect(mogulCapstoneBlocked.reason).toMatch(/Rally Cap Magic/i);

    // Player-Dev Guru identity
    const coachMgr = buildWithNodes([
      'coach_cage_intensity',
      'coach_film_room',
      'coach_fatigue_smart',
      'coach_rookie_whisperer',
    ]);
    expect(getManagerBuildIdentity(coachMgr)).toMatchObject({
      label: 'Player-Dev Guru',
      tone: 'coach',
      capstoneId: 'coach_rookie_whisperer',
    });

    // Cash Mogul identity
    const mogulMgr = buildWithNodes([
      'mogul_ticket_buzz',
      'mogul_staff_negotiator',
      'mogul_scouting_eye',
      'mogul_dynasty_aura',
    ]);
    expect(getManagerBuildIdentity(mogulMgr)).toMatchObject({
      label: 'Cash Mogul',
      tone: 'mogul',
      capstoneId: 'mogul_dynasty_aura',
    });
  });
});
