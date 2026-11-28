import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng/seededRng';
import { createClub } from './rosterFactory';
import { createStaffMember, hireStaffMember } from './coaches';
import {
  advanceStaffRankXp,
  awardClubStaffPostGameXp,
  getNextStaffAbility,
  getStaffRankInfo,
  getStaffUnlockedAbilities,
  STAFF_RANK_LADDER,
} from './staffProgression';
import {
  createAthleticTrainer,
  createTeamDoctor,
  evaluateMedicalStaffEffects,
  teamDoctorToStaffMember,
} from '../health/medicalStaff';

describe('Starfleet Command 5-Rank Staff & Medical Progression (TASK-128, TASK-129)', () => {
  it('progresses any hired Rookie staff member all the way to Legendary [Locked] along steep XP thresholds', () => {
    expect(STAFF_RANK_LADDER.map((r) => r.label)).toEqual([
      'Rookie',
      'Junior',
      'Senior',
      'Veteran',
      'Legendary',
    ]);
    expect(getStaffRankInfo(5).isMaxLocked).toBe(true);

    const rng = createSeededRng(1281);
    let coach = createStaffMember(rng, 'pitching_coach', 1, 'gas_lab');
    expect(coach.level).toBe(1);
    expect(getStaffUnlockedAbilities(coach)).toHaveLength(0);
    expect(getNextStaffAbility(coach)?.unlockLevel).toBe(2);

    // 120 XP -> Rank 2 (Junior) + unlocks first signature ability!
    const r2 = advanceStaffRankXp(coach, 120);
    expect(r2.rankedUp).toBe(true);
    expect(r2.member.level).toBe(2);
    expect(r2.notice?.toRankLabel).toBe('Junior');
    expect(r2.notice?.unlockedAbilityName).toBe('Pitch Sequencing Lab');
    expect(getStaffUnlockedAbilities(r2.member)).toHaveLength(1);

    // Continue through Senior (320), Veteran (700), Legendary (1400) -> locks at Rank 5!
    coach = advanceStaffRankXp(r2.member, 320 + 700 + 1_400).member;
    expect(coach.level).toBe(5);
    expect(coach.xp).toBe(0);
    expect(getStaffUnlockedAbilities(coach)).toHaveLength(3);
    expect(getNextStaffAbility(coach)).toBeNull();

    // Locked at Legendary: further XP does not exceed 5 or accumulate xp
    const capped = advanceStaffRankXp(coach, 999);
    expect(capped.rankedUp).toBe(false);
    expect(capped.member.level).toBe(5);
    expect(capped.member.xp).toBe(0);
  });

  it('grows Team Doctors & Athletic Trainers via post-game XP and strengthens their medical effects as rank climbs', () => {
    const rng = createSeededRng(1282);
    const club = createClub(rng, {
      id: 'med-prog-club',
      city: 'Starfleet',
      name: 'Voyagers',
      mascot: 'Comet',
      colors: { primary: '#1D3557', secondary: '#E63946', accent: '#FFD166', monogram: 'SV' },
      leagueTier: 'aa',
      isHuman: true,
    });

    const rookieDoc = createTeamDoctor(rng, 'womens_sports_medicine', 1);
    const hired = hireStaffMember(club, teamDoctorToStaffMember(rookieDoc));
    expect(hired.hired).toBe(true);

    // Simulate 8 games with an active health case -> doctor earns XP and reaches Rank 2 (Junior)
    let currentClub = hired.club;
    let totalRankUps = 0;
    for (let g = 0; g < 8; g += 1) {
      const step = awardClubStaffPostGameXp(currentClub, true, { activeHealthCases: 1 });
      currentClub = step.club;
      totalRankUps += step.rankUps.length;
    }
    expect(totalRankUps).toBeGreaterThanOrEqual(1);
    const leveledDoc = currentClub.coaches.activeStaff[0];
    expect(leveledDoc.level).toBeGreaterThanOrEqual(2);

    // Higher-ranked medical crew produce noticeably stronger prevention & healing multipliers
    const rank1Doc = { ...rookieDoc, level: 1 as const };
    const rank5Doc = { ...rookieDoc, level: 5 as const };
    const rank1Fx = evaluateMedicalStaffEffects('womens_health', { teamDoctor: rank1Doc });
    const rank5Fx = evaluateMedicalStaffEffects('womens_health', { teamDoctor: rank5Doc });
    expect(rank5Fx.healingSpeedMultiplier).toBeGreaterThan(rank1Fx.healingSpeedMultiplier);
    expect(rank5Fx.preventionMultiplier).toBeLessThan(rank1Fx.preventionMultiplier);

    const rank1Trn = { ...createAthleticTrainer(rng, 'strength_durability', 1), level: 1 as const };
    const rank5Trn = { ...rank1Trn, level: 5 as const };
    const t1 = evaluateMedicalStaffEffects('legs_soft_tissue', { athleticTrainer: rank1Trn });
    const t5 = evaluateMedicalStaffEffects('legs_soft_tissue', { athleticTrainer: rank5Trn });
    expect(t5.agingDeclineReductionFactor).toBeGreaterThan(t1.agingDeclineReductionFactor);
    expect(t5.playThroughPenaltyScale).toBeLessThan(t1.playThroughPenaltyScale);
  });
});
