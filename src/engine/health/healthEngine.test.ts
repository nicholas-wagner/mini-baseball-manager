import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  getAllHealthConditions,
  HEALTH_CONDITIONS_CATALOG,
  type HealthConditionDefinition,
} from './conditionsCatalog';
import {
  advancePlayerHealthRecovery,
  applyHealthConditionToPlayer,
  evaluatePostGameHealthRoll,
  getActiveHealthRatingPenalties,
  setPlayerPlayThroughStatus,
} from './healthEngine';
import {
  createAthleticTrainer,
  createTeamDoctor,
  evaluateMedicalStaffEffects,
  generateMedicalStaffMarket,
} from './medicalStaff';

describe('Toggleable Injuries, Illnesses & Specialty Medical Staff (TASK-067, TASK-068)', () => {
  it('maintains a rich 4-tier catalog with zero fatalities, zero STDs, sex-specific conditions & custom extensibility', () => {
    const all = getAllHealthConditions();
    const injuries = all.filter((c) => c.kind === 'injury');
    const illnesses = all.filter((c) => c.kind === 'illness');
    expect(injuries.length).toBeGreaterThanOrEqual(18);
    expect(illnesses.length).toBeGreaterThanOrEqual(16);

    for (const rarity of ['common', 'uncommon', 'rare', 'ultra_rare'] as const) {
      expect(injuries.some((c) => c.rarity === rarity)).toBe(true);
      expect(illnesses.some((c) => c.rarity === rarity)).toBe(true);
    }

    // Sex-specific conditions exist (e.g., yeast infection, early breast cancer comeback, sports hernia)
    expect(all.some((c) => c.id === 'yeast_infection' && c.applicableTo === 'female' && c.canPlayThrough)).toBe(true);
    expect(all.some((c) => c.id === 'early_breast_cancer_recovery' && c.applicableTo === 'female' && !c.canPlayThrough)).toBe(true);
    expect(all.some((c) => c.id === 'broken_arm' && !c.canPlayThrough)).toBe(true);
    expect(all.some((c) => c.id === 'leg_cramp' && c.canPlayThrough)).toBe(true);

    // Zero STDs or fatal descriptions
    for (const item of all) {
      expect(item.name.toLowerCase()).not.toMatch(/death|fatal|std|hiv|herpes|syphilis|chlamydia|gonorrhea/);
    }

    // Extensible custom rare condition injection
    const customRare: HealthConditionDefinition = {
      id: 'custom_knuckle_vertigo',
      name: 'Knuckleball Vertigo',
      kind: 'illness',
      rarity: 'ultra_rare',
      category: 'concussion_neuro',
      applicableTo: 'all',
      severity: 'short_il',
      canPlayThrough: false,
      minGamesOut: 3,
      maxGamesOut: 5,
      statPenalties: { eye: -8, control: -8 },
      description: 'Got dizzy watching a dancing knuckleball in batting practice.',
    };
    expect(getAllHealthConditions([customRare]).some((c) => c.id === 'custom_knuckle_vertigo')).toBe(true);
  });

  it('strictly respects independent enableInjuries and enableIllnesses toggles and keeps base frequency low', () => {
    const rng = createSeededRng(6701);
    const player = createPlayer(rng, { position: 'CF', tier: 'rookie' });

    // Both disabled -> 0 events across 500 game rolls
    let eventsDisabled = 0;
    for (let i = 0; i < 500; i += 1) {
      const rolled = evaluatePostGameHealthRoll(rng, player, {
        enableInjuries: false,
        enableIllnesses: false,
      });
      if (rolled) eventsDisabled += 1;
    }
    expect(eventsDisabled).toBe(0);

    // Only illnesses enabled -> zero injuries ever rolled
    let illnessHits = 0;
    let injuryHits = 0;
    for (let i = 0; i < 1200; i += 1) {
      const rolled = evaluatePostGameHealthRoll(rng, player, {
        enableInjuries: false,
        enableIllnesses: true,
      });
      if (rolled?.kind === 'illness') illnessHits += 1;
      if (rolled?.kind === 'injury') injuryHits += 1;
    }
    expect(injuryHits).toBe(0);
    expect(illnessHits).toBeGreaterThan(0);
    // Fun-first low frequency: well under 1.5% per player-game
    expect(illnessHits).toBeLessThan(18);
  });

  it('enforces sex-specific condition eligibility matched to playerLook', () => {
    const rng = createSeededRng(6702);
    const maleBase = createPlayer(rng, { position: '1B', tier: 'aa' });
    const malePlayer = { ...maleBase, traits: { ...maleBase.traits, playerLook: 'male' as const } };
    const femalePlayer = { ...maleBase, traits: { ...maleBase.traits, playerLook: 'female' as const } };

    for (let i = 0; i < 1500; i += 1) {
      const maleEvent = evaluatePostGameHealthRoll(rng, malePlayer, {
        enableInjuries: true,
        enableIllnesses: true,
      });
      if (maleEvent) {
        const def = HEALTH_CONDITIONS_CATALOG.find((c) => c.id === maleEvent.conditionId)!;
        expect(def.applicableTo).not.toBe('female');
      }
      const femaleEvent = evaluatePostGameHealthRoll(rng, femalePlayer, {
        enableInjuries: true,
        enableIllnesses: true,
      });
      if (femaleEvent) {
        const def = HEALTH_CONDITIONS_CATALOG.find((c) => c.id === femaleEvent.conditionId)!;
        expect(def.applicableTo).not.toBe('male');
      }
    }
  });

  it('allows playing through minor injuries/illnesses with stat dips while blocking play-through on broken arms', () => {
    const rng = createSeededRng(6703);
    const player = createPlayer(rng, { position: 'SS', tier: 'high_a' });

    const brokenArm = HEALTH_CONDITIONS_CATALOG.find((c) => c.id === 'broken_arm')!;
    const brokenPlayer = applyHealthConditionToPlayer(rng, player, brokenArm);
    expect(brokenPlayer.activeHealthStatus?.canPlayThrough).toBe(false);
    expect(brokenPlayer.activeHealthStatus?.playingThrough).toBe(false);
    const blocked = setPlayerPlayThroughStatus(brokenPlayer, true);
    expect(blocked.allowed).toBe(false);

    const legCramp = HEALTH_CONDITIONS_CATALOG.find((c) => c.id === 'leg_cramp')!;
    const cramped = applyHealthConditionToPlayer(rng, player, legCramp);
    const allowed = setPlayerPlayThroughStatus(cramped, true);
    expect(allowed.allowed).toBe(true);
    const penalties = getActiveHealthRatingPenalties(allowed.player);
    expect(penalties.speed).toBeLessThan(0);

    // Strength & Durability Athletic Trainer softens play-through penalties
    const eliteTrainer = createAthleticTrainer(rng, 'strength_durability', 5);
    const softened = getActiveHealthRatingPenalties(allowed.player, { athleticTrainer: eliteTrainer });
    expect(softened.speed).toBeGreaterThan(penalties.speed);
  });

  it('uses specialty Team Doctors & Athletic Trainers to prevent conditions, speed healing, and slow 35+ aging decline', () => {
    const rng = createSeededRng(6704);
    const armDoc = createTeamDoctor(rng, 'orthopedic_arm', 5);
    const armTrainer = createAthleticTrainer(rng, 'arm_care_velo', 5);
    const strengthTrainer = createAthleticTrainer(rng, 'strength_durability', 5);

    const armEffects = evaluateMedicalStaffEffects('arm_elbow_shoulder', {
      teamDoctor: armDoc,
      athleticTrainer: armTrainer,
    });
    const nonSpecialtyEffects = evaluateMedicalStaffEffects('respiratory_viral', {
      teamDoctor: armDoc,
      athleticTrainer: armTrainer,
    });
    expect(armEffects.preventionMultiplier).toBeLessThan(nonSpecialtyEffects.preventionMultiplier);
    expect(armEffects.healingSpeedMultiplier).toBeGreaterThan(nonSpecialtyEffects.healingSpeedMultiplier);

    const agingMitigation = evaluateMedicalStaffEffects('legs_soft_tissue', {
      athleticTrainer: strengthTrainer,
    });
    expect(agingMitigation.agingDeclineReductionFactor).toBeGreaterThanOrEqual(0.3);

    // Faster healing with matching specialty doctor vs no doctor
    const base = createPlayer(rng, { position: 'SP', tier: 'majors' });
    const tendinitis = HEALTH_CONDITIONS_CATALOG.find((c) => c.id === 'mild_rotator_cuff_inflammation')!;
    const injured = applyHealthConditionToPlayer(createSeededRng(88), base, tendinitis);
    const healedNoDoc = advancePlayerHealthRecovery(injured, undefined, true);
    const healedWithDoc = advancePlayerHealthRecovery(injured, { teamDoctor: armDoc }, true);
    expect(healedWithDoc.activeHealthStatus!.gamesRemaining).toBeLessThan(
      healedNoDoc.activeHealthStatus!.gamesRemaining,
    );

    // Market generator produces varied tiered candidates
    const market = generateMedicalStaffMarket(rng, 'aa');
    expect(market.doctors.length).toBeGreaterThanOrEqual(4);
    expect(market.trainers.length).toBeGreaterThanOrEqual(4);
  });
});
