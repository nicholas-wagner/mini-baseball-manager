import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createManagerProfile } from '../models/manager';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession } from '../simulation/baseballEngine';
import {
  createInGameManagerPowerTracker,
  evaluateManagerTreePassives,
  MANAGER_SKILL_NODES,
  triggerInGameManagerPower,
  unlockManagerSkillNode,
} from '../manager/managerTree';
import {
  PRACTICE_COMPLEX_ACTIVITIES,
  runPracticeComplexActivity,
} from './practiceEngine';

describe('Practice & Training Complex (TASK-022) & Manager RPG Tree (TASK-023)', () => {
  it('runs Fielding Fungos, Slump-Buster Film Room, Fan Meet & Greet, and compromise drills cleanly', () => {
    const rng = createSeededRng(2201);
    const club = createClub(rng, {
      id: 'c-prac',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    expect(PRACTICE_COMPLEX_ACTIVITIES.length).toBeGreaterThanOrEqual(8);

    const slumpHitter = {
      ...club.roster.find((p) => p.position === 'SS')!,
      formScore: -55,
      formState: 'cold' as const,
      morale: 45,
      fatigue: 10,
    };

    const filmRes = runPracticeComplexActivity(rng, slumpHitter, {
      activityId: 'slump_buster_film',
    });
    expect(filmRes.trained).toBe(true);
    expect(filmRes.player.formScore).toBeGreaterThan(slumpHitter.formScore + 15);
    expect(filmRes.player.morale).toBeGreaterThan(slumpHitter.morale);

    const fungoRes = runPracticeComplexActivity(rng, slumpHitter, {
      activityId: 'fielding_fungos',
    });
    expect(fungoRes.trained).toBe(true);
    expect(fungoRes.player.ratings.fielding + fungoRes.player.ratings.range).toBeGreaterThanOrEqual(
      slumpHitter.ratings.fielding + slumpHitter.ratings.range,
    );

    const fanRes = runPracticeComplexActivity(rng, slumpHitter, {
      activityId: 'fan_meet_and_greet',
    });
    expect(fanRes.trained).toBe(true);
    expect(fanRes.player.ratings.popularity).toBeGreaterThan(slumpHitter.ratings.popularity);
    expect(fanRes.clubHypeDelta).toBeGreaterThan(0);
  });

  it('unlocks Manager RPG nodes across Skipper/Coach/Mogul branches and enforces 1/game active power charges', () => {
    expect(MANAGER_SKILL_NODES).toHaveLength(12);
    let mgr = { ...createManagerProfile({ name: 'Skip', avatarSeed: 2301 }), skillPoints: 4 };

    // Prerequisite check: cannot unlock tier-2 node before prerequisite
    const blocked = unlockManagerSkillNode(mgr, 'skipper_rally_cap');
    expect(blocked.unlocked).toBe(false);

    const u1 = unlockManagerSkillNode(mgr, 'skipper_mound_whisper');
    expect(u1.unlocked).toBe(true);
    mgr = u1.manager;
    expect(mgr.activePowerIds).toContain('mound_whisper');

    const u2 = unlockManagerSkillNode(mgr, 'coach_cage_intensity');
    expect(u2.unlocked).toBe(true);
    mgr = u2.manager;

    const u3 = unlockManagerSkillNode(mgr, 'mogul_ticket_buzz');
    expect(u3.unlocked).toBe(true);
    mgr = u3.manager;

    const passives = evaluateManagerTreePassives(mgr);
    expect(passives.drillBonus).toBeGreaterThanOrEqual(1);
    expect(passives.cashMultiplier).toBeGreaterThan(1.05);

    // Live in-game Manager Power Dock: strictly 1 charge per game per power
    const away = createClub(createSeededRng(2310), {
      id: 'a-1',
      city: 'Harbor',
      name: 'Hawks',
      mascot: 'Hawk',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'HH' },
      leagueTier: 'rookie',
      isHuman: false,
    });
    const home = createClub(createSeededRng(2311), {
      id: 'h-1',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const session = createGameSession(away, home, 2312, 'regular', 5);
    const fatiguedSession = {
      ...session,
      home: { ...session.home, pitcherFatigue: 60 },
    };

    const tracker = createInGameManagerPowerTracker();
    const firstUse = triggerInGameManagerPower(tracker, mgr, 'mound_whisper', fatiguedSession, 'home');
    expect(firstUse.used).toBe(true);
    expect(firstUse.session.home.pitcherFatigue).toBeLessThan(60);
    expect(firstUse.event?.type).toBe('manager_power_used');

    // Second use in same game strictly rejected
    const secondUse = triggerInGameManagerPower(
      firstUse.tracker,
      mgr,
      'mound_whisper',
      firstUse.session,
      'home',
    );
    expect(secondUse.used).toBe(false);
    expect(secondUse.reason).toMatch(/already used/i);

    // Exercise additional Manager Skipper powers & guardrails
    const allPowersMgr = {
      ...mgr,
      skillPoints: 0,
      activePowerIds: [
        'pep_talk',
        'mound_whisper',
        'clutch_focus',
        'rally_cap',
        'bullpen_freeze',
      ] as typeof mgr.activePowerIds,
    };
    expect(unlockManagerSkillNode(allPowersMgr, 'unknown_node').unlocked).toBe(false);
    expect(unlockManagerSkillNode(allPowersMgr, 'skipper_pep_talk').unlocked).toBe(false);
    expect(unlockManagerSkillNode(allPowersMgr, 'coach_film_room').unlocked).toBe(false);

    const pep = triggerInGameManagerPower(createInGameManagerPowerTracker(), allPowersMgr, 'pep_talk', session, 'home');
    expect(pep.used).toBe(true);
    const focus = triggerInGameManagerPower(pep.tracker, allPowersMgr, 'clutch_focus', pep.session, 'home');
    expect(focus.used).toBe(true);
    const rally = triggerInGameManagerPower(focus.tracker, allPowersMgr, 'rally_cap', focus.session, 'home');
    expect(rally.used).toBe(true);
    const freeze = triggerInGameManagerPower(rally.tracker, allPowersMgr, 'bullpen_freeze', rally.session, 'home');
    expect(freeze.used).toBe(true);
    expect(freeze.session.away.hypeGauge).toBeLessThan(session.away.hypeGauge);
  });
});
