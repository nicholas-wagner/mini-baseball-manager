import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng/seededRng';
import { createClub } from './rosterFactory';
import {
  awardStaffExperience,
  createStaffMember,
  evaluateClubStaffBonuses,
  fireStaffMember,
  hireStaffMember,
  runOffseasonCoachingClinic,
} from './coaches';
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

    // Empty staff list & playoff loss branches
    const emptyStaff = awardClubStaffPostGameXp(club, false, { isPlayoffGame: true });
    expect(emptyStaff.rankUps).toHaveLength(0);

    const coachClub = hireStaffMember(club, createStaffMember(rng, 'hitting_coach', 1, 'launch_lab')).club;
    const lossStep = awardClubStaffPostGameXp(coachClub, false, { isPlayoffGame: true, activeHealthCases: 0 });
    expect(lossStep.club.coaches.activeStaff[0].xp).toBeGreaterThan(0);

    // Verify Rank 2, 4, and 5 milestone bonuses across all 6 dugout/equipment coach roles
    const roles = [
      'pitching_coach',
      'hitting_coach',
      'bench_coach',
      'fielding_coach',
      'bullpen_coach',
      'equipment_manager',
    ] as const;
    const baseCrew = roles.map((role) => createStaffMember(rng, role, 1));
    const rank2Crew = baseCrew.map((m) => ({ ...m, level: 2 as const }));
    const rank4Crew = baseCrew.map((m) => ({ ...m, level: 4 as const }));
    const rank5Crew = baseCrew.map((m) => ({ ...m, level: 5 as const }));
    const b2 = evaluateClubStaffBonuses(rank2Crew);
    const b4 = evaluateClubStaffBonuses(rank4Crew);
    const b5 = evaluateClubStaffBonuses(rank5Crew);
    expect(b5.pitchingControlBonus).toBeGreaterThan(b2.pitchingControlBonus);
    expect(b5.battingContactBonus).toBeGreaterThan(b2.battingContactBonus);
    expect(b5.managerPowerCooldownBonus).toBeGreaterThan(b2.managerPowerCooldownBonus);
    expect(b5.fieldingGloveBonus).toBeGreaterThan(b2.fieldingGloveBonus);
    expect(b5.relieverFatigueReduction).toBeGreaterThan(b4.relieverFatigueReduction);
    expect(b5.relicBonusMultiplier).toBeGreaterThan(b2.relicBonusMultiplier);
    expect(b4.vintageRelicFindChance).toBeGreaterThan(b2.vintageRelicFindChance);

    // Offseason Coaching Clinic guards, upgrade, fireStaffMember, and awardStaffExperience
    const richClub = {
      ...coachClub,
      economy: { ...coachClub.economy, cash: 25_000 },
    };
    const staffId = richClub.coaches.activeStaff[0].id;
    expect(runOffseasonCoachingClinic(richClub, 'missing-staff').upgraded).toBe(false);
    const brokeClub = { ...richClub, economy: { ...richClub.economy, cash: 100 } };
    expect(runOffseasonCoachingClinic(brokeClub, staffId).upgraded).toBe(false);
    const clinic1 = runOffseasonCoachingClinic(richClub, staffId);
    expect(clinic1.upgraded).toBe(true);
    expect(clinic1.club.coaches.activeStaff[0].level).toBe(2);
    const maxedClub = {
      ...clinic1.club,
      coaches: {
        ...clinic1.club.coaches,
        activeStaff: clinic1.club.coaches.activeStaff.map((s) => ({ ...s, level: 5 as const })),
      },
    };
    expect(runOffseasonCoachingClinic(maxedClub, staffId).upgraded).toBe(false);
    const clinicExhausted = {
      ...clinic1.club,
      coaches: { ...clinic1.club.coaches, clinicSessionsUsedThisOffseason: 2 },
    };
    expect(runOffseasonCoachingClinic(clinicExhausted, staffId).upgraded).toBe(false);

    expect(awardStaffExperience(richClub.coaches.activeStaff[0], 130).level).toBe(2);
    expect(fireStaffMember(richClub, staffId).coaches.activeStaff).toHaveLength(0);
  });
});
