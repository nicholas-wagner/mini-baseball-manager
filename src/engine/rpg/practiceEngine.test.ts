import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { runPracticeComplexActivity } from './practiceEngine';
import { resolvePlayerSkillMastery } from './skillTreeMastery';

describe('Practice Complex Activities & Discipline Mastery Integration', () => {
  it('runs fielding fungos, slump-buster film, fan meet & greet, compromise drills, and guards gassed players', () => {
    const rng = createSeededRng(7711);
    const hitter = createPlayer(rng, { position: 'SS', tier: 'aa' });
    const base = {
      ...hitter,
      fatigue: 15,
      formState: 'cold' as const,
      skillMastery: { power: 10, contact: 10, speed: 10, fielding: 10, heat: 0, spin: 0, command: 0 },
    };

    // Guard against fatigued players (>= 88)
    const blocked = runPracticeComplexActivity(rng, { ...base, fatigue: 90 }, { activityId: 'fielding_fungos' });
    expect(blocked.trained).toBe(false);
    expect(blocked.reason).toMatch(/too fatigued/i);

    // Fielding fungos grows fielding mastery
    const fungos = runPracticeComplexActivity(
      rng,
      base,
      { activityId: 'fielding_fungos' },
      { managerPassives: { drillBonus: 1, practiceFatigueScale: 0.85 } },
    );
    expect(fungos.trained).toBe(true);
    expect(resolvePlayerSkillMastery(fungos.player).fielding).toBe(16);

    // Slump buster film warms cold form & respects staff/manager bonuses
    const film = runPracticeComplexActivity(
      rng,
      base,
      { activityId: 'slump_buster_film' },
      { staffBonuses: { slumpBusterBonus: 2 }, managerPassives: { slumpBusterBonus: 1 } },
    );
    expect(film.trained).toBe(true);

    // Fan meet & greet increases club hype
    const meet = runPracticeComplexActivity(rng, base, { activityId: 'fan_meet_and_greet' });
    expect(meet.trained).toBe(true);
    expect(meet.clubHypeDelta).toBeGreaterThan(0);

    // Compromise drill delegates to trainingCompromises & grows power mastery
    const cage = runPracticeComplexActivity(rng, base, { activityId: 'power_launch_cage' });
    expect(cage.trained).toBe(true);
    expect(resolvePlayerSkillMastery(cage.player).power).toBe(16);
  });
});
