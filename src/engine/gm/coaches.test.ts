import { describe, expect, it } from 'vitest';
import { createClub } from './rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  awardStaffExperience,
  createStaffMember,
  evaluateClubStaffBonuses,
  fireStaffMember,
  generateStaffHiringPool,
  hireStaffMember,
  runOffseasonCoachingClinic,
  STAFF_SALARY_BUDGET_BY_TIER,
  STAFF_SLOT_LIMITS_BY_TIER,
} from './coaches';

describe('Expanded Coaching Staff & Equipment Manager (TASK-035)', () => {
  it('enforces tier-scaled staff slot limits and staff salary budgets to create real hiring trade-offs', () => {
    const rng = createSeededRng(3501);
    const club = createClub(rng, {
      id: 'c-rookie',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });

    expect(STAFF_SLOT_LIMITS_BY_TIER.rookie).toBe(2);
    expect(STAFF_SLOT_LIMITS_BY_TIER.majors).toBe(7);

    const pitching = createStaffMember(rng, 'pitching_coach', 1, 'gas_lab');
    const bullpen = createStaffMember(rng, 'bullpen_coach', 1, 'battery_whisperer');
    const equip = createStaffMember(rng, 'equipment_manager', 1, 'relic_tuner');

    const h1 = hireStaffMember(club, pitching);
    expect(h1.hired).toBe(true);
    const h2 = hireStaffMember(h1.club, bullpen);
    expect(h2.hired).toBe(true);
    expect(h2.club.coaches.activeStaff).toHaveLength(2);

    // 3rd distinct role blocked in Rookie Ball (slot cap = 2)
    const h3 = hireStaffMember(h2.club, equip);
    expect(h3.hired).toBe(false);
    expect(h3.reason).toMatch(/staff slot/i);

    // Over-budget elite tier-5 coach blocked in Rookie Ball
    const fired = fireStaffMember(h2.club, bullpen.id);
    const eliteHitter = createStaffMember(rng, 'hitting_coach', 5, 'launch_angle_guru');
    expect(eliteHitter.salaryPerSeason).toBeGreaterThan(STAFF_SALARY_BUDGET_BY_TIER.rookie);
    const overBudget = hireStaffMember(fired, eliteHitter);
    expect(overBudget.hired).toBe(false);
    expect(overBudget.reason).toMatch(/budget/i);
  });

  it('applies distinct gameplay perks and philosophy trade-offs across all 6 dugout & clubhouse roles', () => {
    const rng = createSeededRng(3502);
    const pitchingGas = createStaffMember(rng, 'pitching_coach', 3, 'gas_lab');
    const hittingLaunch = createStaffMember(rng, 'hitting_coach', 3, 'launch_angle_guru');
    const bench = createStaffMember(rng, 'bench_coach', 3, 'tactical_skipper');
    const fielding = createStaffMember(rng, 'fielding_coach', 3, 'sure_handed_fundamentalist');
    const bullpen = createStaffMember(rng, 'bullpen_coach', 3, 'battery_whisperer');
    const equip = createStaffMember(rng, 'equipment_manager', 3, 'relic_tuner');

    const fx = evaluateClubStaffBonuses([
      pitchingGas,
      hittingLaunch,
      bench,
      fielding,
      bullpen,
      equip,
    ]);

    // Pitching Gas Lab: +Velo with slight endurance drain trade-off
    expect(fx.pitchingVeloBonus).toBeGreaterThan(0);
    expect(fx.pitcherEnduranceDrainScale).toBeGreaterThan(1);
    // Hitting Launch-Angle Guru: +Power with slight Contact trade-off
    expect(fx.battingPowerBonus).toBeGreaterThan(0);
    expect(fx.battingContactBonus).toBeLessThan(0);
    // Bench + Fielding perks
    expect(fx.highLiComposureBonus).toBeGreaterThan(0);
    expect(fx.fieldingGloveBonus).toBeGreaterThan(0);
    expect(fx.crossTrainRustReduction).toBeGreaterThan(0);
    // Bullpen Coach explicitly helps BOTH catchers (framing/pop-time) and pitchers (reliever endurance)
    expect(fx.catcherFramingZoneBonus).toBeGreaterThan(0);
    expect(fx.catcherPopTimeBonus).toBeGreaterThan(0);
    expect(fx.relieverFatigueReduction).toBeGreaterThan(0);
    // Equipment Manager boosts relics, morale & cuts blisters
    expect(fx.relicBonusMultiplier).toBeGreaterThan(1.1);
    expect(fx.blisterPreventionBonus).toBeGreaterThan(0);
    expect(fx.vintageRelicFindChance).toBeGreaterThan(0);
  });

  it('develops coaches via Staff XP and capped Offseason Clinics and includes retired legends in hiring pool', () => {
    const rng = createSeededRng(3503);
    const club = createClub(rng, {
      id: 'c-aa',
      city: 'Metro',
      name: 'Knights',
      mascot: 'Knight',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'MK' },
      leagueTier: 'aa',
      isHuman: true,
    });

    const coach = createStaffMember(rng, 'bullpen_coach', 3, 'battery_whisperer');
    expect(coach.level).toBe(1);
    const leveled = awardStaffExperience(coach, 150);
    expect(leveled.level).toBe(2);

    const hired = hireStaffMember(club, coach);
    expect(hired.hired).toBe(true);
    const clinic1 = runOffseasonCoachingClinic(hired.club, coach.id);
    expect(clinic1.upgraded).toBe(true);
    expect(clinic1.club.coaches.activeStaff[0].level).toBe(2);
    expect(clinic1.club.economy.cash).toBeLessThan(hired.club.economy.cash);

    // Hiring pool covers all 6 dugout/clubhouse roles + converts retired legend candidates
    const pool = generateStaffHiringPool(rng, 'aa', [
      {
        formerPlayerId: 'legend-99',
        name: 'Ace Legend',
        portraitSeed: 9901,
        clubLegendOf: 'Metro Knights',
        recommendedRole: 'pitching_coach',
        startingTier: 4,
        specialtyId: 'command_tactician',
        seasonsPlayed: 11,
        careerOvrPeak: 88,
      },
    ]);
    expect(pool.some((c) => c.role === 'pitching_coach')).toBe(true);
    expect(pool.some((c) => c.role === 'hitting_coach')).toBe(true);
    expect(pool.some((c) => c.role === 'bench_coach')).toBe(true);
    expect(pool.some((c) => c.role === 'fielding_coach')).toBe(true);
    expect(pool.some((c) => c.role === 'bullpen_coach')).toBe(true);
    expect(pool.some((c) => c.role === 'equipment_manager')).toBe(true);
    expect(pool.some((c) => c.formerPlayerId === 'legend-99')).toBe(true);
  });
});
