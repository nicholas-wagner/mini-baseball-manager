import type { LeagueTierId } from '../models/club';
import type { StaffMember, StaffQualityTier } from '../models/manager';
import type { SeededRng } from '../rng/seededRng';
import type { ConditionCategory } from './conditionsCatalog';

export type MedicalQualityTier = 1 | 2 | 3 | 4 | 5;

export type TeamDoctorSpecialty =
  | 'orthopedic_arm'
  | 'orthopedic_legs'
  | 'concussion_neuro'
  | 'internal_medicine'
  | 'womens_sports_medicine'
  | 'oncology_complex_care';

export type AthleticTrainerSpecialty =
  | 'arm_care_velo'
  | 'soft_tissue_mobility'
  | 'strength_durability'
  | 'recovery_nutrition'
  | 'rehab_conditioning';

export interface TeamDoctor {
  id: string;
  name: string;
  portraitSeed: number;
  tier: MedicalQualityTier;
  specialty: TeamDoctorSpecialty;
  salaryPerSeason: number;
  summary: string;
}

export interface AthleticTrainer {
  id: string;
  name: string;
  portraitSeed: number;
  tier: MedicalQualityTier;
  specialty: AthleticTrainerSpecialty;
  salaryPerSeason: number;
  summary: string;
}

export interface ClubMedicalStaff {
  teamDoctor?: TeamDoctor | null;
  athleticTrainer?: AthleticTrainer | null;
}

export interface MedicalStaffEffectSummary {
  preventionMultiplier: number; // < 1 reduces probability (e.g., 0.55 = 45% fewer events)
  healingSpeedMultiplier: number; // > 1 heals more games per day/game (e.g., 1.45)
  playThroughPenaltyScale: number; // < 1 softens play-through stat penalties (e.g., 0.65)
  agingDeclineReductionFactor: number; // 0..0.45 softens 35+ aging decline
  careerEndingRiskReduction: number; // 0..0.45 cuts veteran career-ending risk
}

const DOCTOR_SPECIALTY_CATEGORIES: Readonly<Record<TeamDoctorSpecialty, readonly ConditionCategory[]>> = {
  orthopedic_arm: ['arm_elbow_shoulder', 'bone_joint'],
  orthopedic_legs: ['legs_soft_tissue', 'bone_joint'],
  concussion_neuro: ['concussion_neuro'],
  internal_medicine: ['respiratory_viral', 'gi_internal'],
  womens_sports_medicine: ['womens_health', 'legs_soft_tissue'],
  oncology_complex_care: ['complex_oncology', 'mens_health', 'womens_health', 'respiratory_viral'],
};

const TRAINER_SPECIALTY_CATEGORIES: Readonly<Record<AthleticTrainerSpecialty, readonly ConditionCategory[]>> = {
  arm_care_velo: ['arm_elbow_shoulder'],
  soft_tissue_mobility: ['legs_soft_tissue'],
  strength_durability: ['bone_joint', 'legs_soft_tissue'],
  recovery_nutrition: ['respiratory_viral', 'gi_internal', 'womens_health'],
  rehab_conditioning: ['arm_elbow_shoulder', 'legs_soft_tissue', 'complex_oncology'],
};

export const DOCTOR_SPECIALTY_LABELS: Readonly<Record<TeamDoctorSpecialty, string>> = {
  orthopedic_arm: 'Orthopedic Arm & Elbow MD',
  orthopedic_legs: 'Orthopedic Lower-Body MD',
  concussion_neuro: 'Concussion & Neuro MD',
  internal_medicine: 'Internal Medicine & Illness MD',
  womens_sports_medicine: "Women's Sports Medicine MD",
  oncology_complex_care: 'Oncology & Complex Recovery MD',
};

export const TRAINER_SPECIALTY_LABELS: Readonly<Record<AthleticTrainerSpecialty, string>> = {
  arm_care_velo: 'Arm Care & Velo Preservation',
  soft_tissue_mobility: 'Soft-Tissue & Mobility Specialist',
  strength_durability: 'Strength & Career Durability',
  recovery_nutrition: 'Recovery, Immune & Nutrition',
  rehab_conditioning: 'IL Rehab & Conditioning',
};

const DOCTOR_FIRST_NAMES = ['Dr. Maya', 'Dr. Kenji', 'Dr. Elena', 'Dr. Marcus', 'Dr. Priya', 'Dr. Owen'] as const;
const DOCTOR_LAST_NAMES = ['Patel', 'Sato', 'Morales', 'Vance', 'Alvarez', 'Okafor'] as const;
const TRAINER_FIRST_NAMES = ['Sam', 'Tessa', 'Devon', 'Hana', 'Carlos', 'Nora'] as const;
const TRAINER_LAST_NAMES = ['Keller', 'Brooks', 'Cho', 'Reyes', 'Bauer', 'Kim'] as const;

const SALARY_BY_TIER: Readonly<Record<MedicalQualityTier, number>> = {
  1: 900,
  2: 2_000,
  3: 4_000,
  4: 7_000,
  5: 11_000,
};

const MAX_TIER_FOR_LEAGUE: Readonly<Record<LeagueTierId, MedicalQualityTier>> = {
  rookie: 2,
  low_a: 3,
  high_a: 3,
  aa: 4,
  aaa: 5,
  majors: 5,
};

export function createTeamDoctor(
  rng: SeededRng,
  specialty: TeamDoctorSpecialty,
  tier: MedicalQualityTier,
): TeamDoctor {
  const name = `${rng.pick(DOCTOR_FIRST_NAMES)} ${rng.pick(DOCTOR_LAST_NAMES)}`;
  return {
    id: `doc-${specialty}-${tier}-${rng.int(1000, 9999)}`,
    name,
    portraitSeed: rng.int(10000, 99999),
    tier,
    specialty,
    salaryPerSeason: SALARY_BY_TIER[tier],
    summary: `Tier ${tier} ${DOCTOR_SPECIALTY_LABELS[specialty]}`,
  };
}

export function createAthleticTrainer(
  rng: SeededRng,
  specialty: AthleticTrainerSpecialty,
  tier: MedicalQualityTier,
): AthleticTrainer {
  const name = `${rng.pick(TRAINER_FIRST_NAMES)} ${rng.pick(TRAINER_LAST_NAMES)}`;
  return {
    id: `trn-${specialty}-${tier}-${rng.int(1000, 9999)}`,
    name,
    portraitSeed: rng.int(10000, 99999),
    tier,
    specialty,
    salaryPerSeason: Math.round(SALARY_BY_TIER[tier] * 0.85),
    summary: `Tier ${tier} ${TRAINER_SPECIALTY_LABELS[specialty]}`,
  };
}

function evaluateDoctorContribution(doc: TeamDoctor | null, category: ConditionCategory) {
  if (!doc) return { prevention: 0, healing: 0, careerRisk: 0 };
  const matches = DOCTOR_SPECIALTY_CATEGORIES[doc.specialty].includes(category);
  return {
    prevention: doc.tier * 0.025 + (matches ? doc.tier * 0.045 : 0),
    healing: doc.tier * 0.06 + (matches ? doc.tier * 0.12 : 0),
    careerRisk: doc.tier * 0.04 + (matches ? doc.tier * 0.05 : 0),
  };
}

function evaluateTrainerContribution(trainer: AthleticTrainer | null, category: ConditionCategory) {
  if (!trainer) return { prevention: 0, healing: 0, penalty: 0, aging: 0 };
  const matches = TRAINER_SPECIALTY_CATEGORIES[trainer.specialty].includes(category);
  const isDurability = trainer.specialty === 'strength_durability';
  return {
    prevention: trainer.tier * 0.04 + (matches ? trainer.tier * 0.07 : 0),
    healing: trainer.specialty === 'rehab_conditioning' ? trainer.tier * 0.08 : 0,
    penalty: trainer.tier * (isDurability ? 0.08 : 0.03),
    aging: trainer.tier * (isDurability ? 0.085 : 0.025),
  };
}

/** Evaluates how the club's Team Doctor and Athletic Trainer prevent, soften, and heal a condition category. */
export function evaluateMedicalStaffEffects(
  category: ConditionCategory,
  staff?: ClubMedicalStaff,
): MedicalStaffEffectSummary {
  const docFx = evaluateDoctorContribution(staff?.teamDoctor ?? null, category);
  const trnFx = evaluateTrainerContribution(staff?.athleticTrainer ?? null, category);
  const preventionDiscount = docFx.prevention + trnFx.prevention;
  const healingSpeed = 1.0 + docFx.healing + trnFx.healing;

  return {
    preventionMultiplier: Math.max(0.28, Number((1 - preventionDiscount).toFixed(3))),
    healingSpeedMultiplier: Number(Math.min(2.1, healingSpeed).toFixed(3)),
    playThroughPenaltyScale: Math.max(0.55, Number((1 - trnFx.penalty).toFixed(3))),
    agingDeclineReductionFactor: Math.min(0.45, Number(trnFx.aging.toFixed(3))),
    careerEndingRiskReduction: Math.min(0.45, Number(docFx.careerRisk.toFixed(3))),
  };
}

/** Generates a hireable market of specialty Team Doctors and Head Athletic Trainers for the club's league tier. */
export function generateMedicalStaffMarket(
  rng: SeededRng,
  tier: LeagueTierId,
): { doctors: TeamDoctor[]; trainers: AthleticTrainer[] } {
  const maxQ = MAX_TIER_FOR_LEAGUE[tier];
  const docSpecs: readonly TeamDoctorSpecialty[] = [
    'orthopedic_arm',
    'orthopedic_legs',
    'concussion_neuro',
    'internal_medicine',
    'womens_sports_medicine',
    'oncology_complex_care',
  ];
  const trnSpecs: readonly AthleticTrainerSpecialty[] = [
    'arm_care_velo',
    'soft_tissue_mobility',
    'strength_durability',
    'recovery_nutrition',
    'rehab_conditioning',
  ];

  const doctors = docSpecs.map((spec) =>
    createTeamDoctor(rng, spec, rng.int(1, maxQ) as MedicalQualityTier),
  );
  const trainers = trnSpecs.map((spec) =>
    createAthleticTrainer(rng, spec, rng.int(1, maxQ) as MedicalQualityTier),
  );
  return { doctors, trainers };
}

/** Adapts a specialty Team Doctor into a unified hireable StaffMember for the club dugout roster. */
export function teamDoctorToStaffMember(doc: TeamDoctor): StaffMember {
  return {
    id: doc.id,
    role: 'team_doctor',
    name: doc.name,
    portraitSeed: doc.portraitSeed,
    tier: doc.tier as StaffQualityTier,
    level: doc.tier as StaffQualityTier,
    xp: 0,
    salaryPerSeason: doc.salaryPerSeason,
    yearsRemaining: 2,
    specialtyId: doc.specialty,
    specialtyLabel: DOCTOR_SPECIALTY_LABELS[doc.specialty],
    perkSummary: `Prevents & speeds recovery for ${DOCTOR_SPECIALTY_LABELS[doc.specialty]} cases`,
    tradeOffSummary: 'Occupies 1 active dugout staff slot & annual medical salary budget',
  };
}

/** Adapts a Head Athletic Trainer into a unified hireable StaffMember for the club dugout roster. */
export function athleticTrainerToStaffMember(trainer: AthleticTrainer): StaffMember {
  return {
    id: trainer.id,
    role: 'athletic_trainer',
    name: trainer.name,
    portraitSeed: trainer.portraitSeed,
    tier: trainer.tier as StaffQualityTier,
    level: trainer.tier as StaffQualityTier,
    xp: 0,
    salaryPerSeason: trainer.salaryPerSeason,
    yearsRemaining: 2,
    specialtyId: trainer.specialty,
    specialtyLabel: TRAINER_SPECIALTY_LABELS[trainer.specialty],
    perkSummary: `Boosts conditioning, injury prevention & softens aging (${TRAINER_SPECIALTY_LABELS[trainer.specialty]})`,
    tradeOffSummary: 'Occupies 1 active dugout staff slot & annual training salary budget',
  };
}

/** Extracts active Team Doctor & Athletic Trainer records from a club's unified activeStaff list. */
export function extractClubMedicalStaff(staff: readonly StaffMember[]): ClubMedicalStaff {
  const docMember = staff.find((s) => s.role === 'team_doctor');
  const trnMember = staff.find((s) => s.role === 'athletic_trainer');

  const teamDoctor: TeamDoctor | null = docMember
    ? {
        id: docMember.id,
        name: docMember.name,
        portraitSeed: docMember.portraitSeed,
        tier: docMember.tier as MedicalQualityTier,
        specialty: docMember.specialtyId as TeamDoctorSpecialty,
        salaryPerSeason: docMember.salaryPerSeason,
        summary: `Tier ${docMember.tier} ${docMember.specialtyLabel}`,
      }
    : null;

  const athleticTrainer: AthleticTrainer | null = trnMember
    ? {
        id: trnMember.id,
        name: trnMember.name,
        portraitSeed: trnMember.portraitSeed,
        tier: trnMember.tier as MedicalQualityTier,
        specialty: trnMember.specialtyId as AthleticTrainerSpecialty,
        salaryPerSeason: trnMember.salaryPerSeason,
        summary: `Tier ${trnMember.tier} ${trnMember.specialtyLabel}`,
      }
    : null;

  return { teamDoctor, athleticTrainer };
}
