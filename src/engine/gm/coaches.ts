import type { Club, LeagueTierId } from '../models/club';
import type {
  StaffMember,
  StaffQualityTier,
  StaffRole,
} from '../models/manager';
import type { SeededRng } from '../rng/seededRng';
import type { RetiredLegendCoachCandidate } from '../rpg/lifecycle';

export type DugoutStaffRole =
  | 'pitching_coach'
  | 'hitting_coach'
  | 'bench_coach'
  | 'fielding_coach'
  | 'bullpen_coach'
  | 'equipment_manager';

/** Hard active staff slot limit per league tier — forces meaningful hiring trade-offs! */
export const STAFF_SLOT_LIMITS_BY_TIER: Readonly<Record<LeagueTierId, number>> = {
  rookie: 2,
  low_a: 3,
  high_a: 4,
  aa: 5,
  aaa: 6,
  majors: 7,
};

/** Annual club staff payroll cap by league tier. */
export const STAFF_SALARY_BUDGET_BY_TIER: Readonly<Record<LeagueTierId, number>> = {
  rookie: 4_500,
  low_a: 8_500,
  high_a: 14_000,
  aa: 24_000,
  aaa: 40_000,
  majors: 70_000,
};

export const MAX_CLINIC_SESSIONS_PER_OFFSEASON = 2;

export const STAFF_ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  pitching_coach: 'Pitching Coach',
  hitting_coach: 'Hitting Coach',
  bench_coach: 'Bench Coach',
  fielding_coach: 'Fielding Coach',
  bullpen_coach: 'Bullpen Coach (Catchers + Pitchers)',
  equipment_manager: 'Equipment Manager',
  team_doctor: 'Team Doctor',
  athletic_trainer: 'Head Athletic Trainer',
};

export interface ClubStaffBonuses {
  pitchingVeloBonus: number;
  pitchingMovementBonus: number;
  pitchingControlBonus: number;
  pitcherEnduranceDrainScale: number; // >1 means faster drain trade-off; <1 means slower drain
  battingContactBonus: number;
  battingPowerBonus: number;
  battingEyeBonus: number;
  slumpBusterBonus: number;
  highLiComposureBonus: number;
  managerPowerCooldownBonus: number;
  moraleAura: number;
  fieldingGloveBonus: number;
  crossTrainRustReduction: number; // 0..0.5
  bullpenWarmupBonus: number;
  catcherFramingZoneBonus: number; // extra borderline strike rate
  catcherPopTimeBonus: number; // extra throw-out bonus vs base stealers
  relieverFatigueReduction: number; // 0..0.35
  relicBonusMultiplier: number; // 1.0..1.38
  blisterPreventionBonus: number; // 0..0.4
  vintageRelicFindChance: number; // per-series chance 0..0.18
}

interface StaffSpecialtySpec {
  id: string;
  role: DugoutStaffRole;
  label: string;
  perkSummary: string;
  tradeOffSummary: string;
  apply: (potency: number, out: ClubStaffBonuses) => void;
}

const STAFF_SPECIALTIES: readonly StaffSpecialtySpec[] = [
  // Pitching Coaches
  {
    id: 'gas_lab',
    role: 'pitching_coach',
    label: 'Gas Lab Velo Guru',
    perkSummary: 'Boosts fastball velocity & strikeout stuff on mound and drills',
    tradeOffSummary: 'Max-effort mechanics increase mound endurance drain (+6–12%)',
    apply: (p, out) => {
      out.pitchingVeloBonus += Math.round(p * 1.4);
      out.pitcherEnduranceDrainScale += 0.04 + p * 0.015;
    },
  },
  {
    id: 'groundball_professor',
    role: 'pitching_coach',
    label: 'Groundball Professor',
    perkSummary: 'Boosts sinker/breaking movement & zone command',
    tradeOffSummary: 'Emphasizes pitch-to-contact (-1 raw Velocity)',
    apply: (p, out) => {
      out.pitchingMovementBonus += Math.round(p * 1.3);
      out.pitchingControlBonus += Math.round(p * 1.1);
      out.pitchingVeloBonus -= 1;
    },
  },
  {
    id: 'command_tactician',
    role: 'pitching_coach',
    label: 'Pinpoint Command Tactician',
    perkSummary: 'Sharpens strike-zone command & cuts walks',
    tradeOffSummary: 'Slightly lower swing-and-miss bite (-1 Movement)',
    apply: (p, out) => {
      out.pitchingControlBonus += Math.round(p * 1.5);
      out.pitchingMovementBonus -= 1;
    },
  },
  // Hitting Coaches
  {
    id: 'launch_angle_guru',
    role: 'hitting_coach',
    label: 'Launch-Angle Slugger Guru',
    perkSummary: 'Elevates HR Power & barrel carry across lineup',
    tradeOffSummary: 'Uppercut swing taxes pure Contact (-2 Contact)',
    apply: (p, out) => {
      out.battingPowerBonus += Math.round(p * 1.5);
      out.battingContactBonus -= 2;
    },
  },
  {
    id: 'small_ball_craftsman',
    role: 'hitting_coach',
    label: 'Small-Ball Bat-to-Ball Craftsman',
    perkSummary: 'Boosts Contact, Eye & slump busting',
    tradeOffSummary: 'Shorter swing trims raw HR Power (-2 Power)',
    apply: (p, out) => {
      out.battingContactBonus += Math.round(p * 1.4);
      out.battingEyeBonus += Math.round(p * 1.1);
      out.slumpBusterBonus += Math.round(p * 4);
      out.battingPowerBonus -= 2;
    },
  },
  {
    id: 'clutch_mentor',
    role: 'hitting_coach',
    label: 'Two-Strike Approach Mentor',
    perkSummary: 'Boosts Eye, Clutch composure & cold-slump recovery',
    tradeOffSummary: 'Less focus on raw Power ceiling (-1 Power)',
    apply: (p, out) => {
      out.battingEyeBonus += Math.round(p * 1.2);
      out.highLiComposureBonus += Math.round(p * 0.8);
      out.slumpBusterBonus += Math.round(p * 6);
      out.battingPowerBonus -= 1;
    },
  },
  // Bench Coaches
  {
    id: 'tactical_skipper',
    role: 'bench_coach',
    label: 'Hard-Nosed Tactical Bench Boss',
    perkSummary: 'Boosts high-LI composure, shifts & Manager Power tempo',
    tradeOffSummary: 'Strict dugout demands slight clubhouse morale tension (-2 morale)',
    apply: (p, out) => {
      out.highLiComposureBonus += Math.round(p * 1.3);
      out.managerPowerCooldownBonus += Math.min(2, Math.ceil(p * 0.4));
      out.moraleAura -= 2;
    },
  },
  {
    id: 'players_skipper',
    role: 'bench_coach',
    label: "Players' Clubhouse Bench Coach",
    perkSummary: 'Lifts clubhouse morale, streak momentum & slump resilience',
    tradeOffSummary: 'Looser tactical shift discipline (-1 high-LI edge)',
    apply: (p, out) => {
      out.moraleAura += Math.round(p * 3);
      out.slumpBusterBonus += Math.round(p * 4);
      out.highLiComposureBonus -= 1;
    },
  },
  // Fielding Coaches
  {
    id: 'sure_handed_fundamentalist',
    role: 'fielding_coach',
    label: 'Gold-Glove Fundamentalist',
    perkSummary: 'Sharpens glove reliability & slashes positional Cross-Training rust',
    tradeOffSummary: 'Conservative angles trade a touch of daring dive range',
    apply: (p, out) => {
      out.fieldingGloveBonus += Math.round(p * 1.4);
      out.crossTrainRustReduction += Math.min(0.45, Number((p * 0.09).toFixed(2)));
    },
  },
  {
    id: 'infield_range_architect',
    role: 'fielding_coach',
    label: 'Turn-Two Range Architect',
    perkSummary: 'Expands defender range, double-play turns & utility flexibility',
    tradeOffSummary: 'Aggressive hops can slightly raise error variance on routine plays',
    apply: (p, out) => {
      out.fieldingGloveBonus += Math.round(p * 1.2);
      out.crossTrainRustReduction += Math.min(0.35, Number((p * 0.07).toFixed(2)));
    },
  },
  // Bullpen Coaches (Explicitly helps BOTH Catchers & Pitchers!)
  {
    id: 'battery_whisperer',
    role: 'bullpen_coach',
    label: 'Battery Whisperer (Catchers + Pitchers)',
    perkSummary: 'Boosts catcher pitch-framing, catcher pop-time & reliever endurance/warmup',
    tradeOffSummary: 'Heavy bullpen prep adds mild pitch-calling conservatism (-1 raw Velo)',
    apply: (p, out) => {
      out.catcherFramingZoneBonus += Number((p * 0.008).toFixed(3));
      out.catcherPopTimeBonus += Math.round(p * 1.5);
      out.bullpenWarmupBonus += Math.round(p * 1.4);
      out.relieverFatigueReduction += Math.min(0.35, Number((p * 0.065).toFixed(3)));
      out.pitchingVeloBonus -= 1;
    },
  },
  {
    id: 'firehouse_reliever_guru',
    role: 'bullpen_coach',
    label: 'Firehouse Bullpen & Blocking Coach',
    perkSummary: 'Cuts reliever fatigue & passed balls while locking down late-inning jams',
    tradeOffSummary: 'Shorter leash emphasis trims long-reliever length slightly',
    apply: (p, out) => {
      out.bullpenWarmupBonus += Math.round(p * 1.7);
      out.relieverFatigueReduction += Math.min(0.35, Number((p * 0.075).toFixed(3)));
      out.catcherFramingZoneBonus += Number((p * 0.006).toFixed(3));
      out.catcherPopTimeBonus += Math.round(p * 1.1);
    },
  },
  // Equipment Managers
  {
    id: 'relic_tuner',
    role: 'equipment_manager',
    label: '90s Gear & Relic Master',
    perkSummary: 'Amplifies 90s Gear/Relic perks, prevents blisters & uncovers vintage gear',
    tradeOffSummary: 'Experimental rosin/pine-tar tweaks cost minor upkeep supplies',
    apply: (p, out) => {
      out.relicBonusMultiplier += Number((0.08 + p * 0.055).toFixed(3));
      out.blisterPreventionBonus += Math.min(0.38, Number((p * 0.075).toFixed(3)));
      out.moraleAura += Math.round(p * 1.5);
      out.vintageRelicFindChance += Math.min(0.18, Number((0.03 + p * 0.028).toFixed(3)));
    },
  },
  {
    id: 'clubhouse_quartermaster',
    role: 'equipment_manager',
    label: 'Clubhouse Quartermaster',
    perkSummary: 'Peak cleat traction, blister-free gloves, happy dugout morale & gear boosts',
    tradeOffSummary: 'Smaller relic multiplier than experimental Relic Masters',
    apply: (p, out) => {
      out.relicBonusMultiplier += Number((0.05 + p * 0.035).toFixed(3));
      out.blisterPreventionBonus += Math.min(0.4, Number((p * 0.085).toFixed(3)));
      out.moraleAura += Math.round(p * 2.5);
      out.vintageRelicFindChance += Math.min(0.12, Number((0.02 + p * 0.018).toFixed(3)));
    },
  },
];

const FIRST_NAMES = ['Lou', 'Carmen', 'Skip', 'Miki', 'Hector', 'Doris', 'Wally', 'Sora', 'Babe', 'Gina'] as const;
const LAST_NAMES = ['Mendoza', 'Takahashi', 'Kowalski', 'Vega', 'Callahan', 'Otis', 'Delgado', 'Snyder'] as const;

const SALARY_BY_TIER: Readonly<Record<StaffQualityTier, number>> = {
  1: 1_100,
  2: 2_300,
  3: 4_400,
  4: 7_800,
  5: 13_000,
};

const MAX_MARKET_TIER_BY_LEAGUE: Readonly<Record<LeagueTierId, StaffQualityTier>> = {
  rookie: 2,
  low_a: 3,
  high_a: 3,
  aa: 4,
  aaa: 5,
  majors: 5,
};

function findSpecialty(role: DugoutStaffRole, specialtyId?: string): StaffSpecialtySpec {
  const exact = specialtyId
    ? STAFF_SPECIALTIES.find((s) => s.id === specialtyId && s.role === role)
    : undefined;
  return exact ?? STAFF_SPECIALTIES.find((s) => s.role === role)!;
}

export function createStaffMember(
  rng: SeededRng,
  role: DugoutStaffRole,
  tier: StaffQualityTier,
  specialtyId?: string,
): StaffMember {
  const roleSpecs = STAFF_SPECIALTIES.filter((s) => s.role === role);
  const spec = specialtyId ? findSpecialty(role, specialtyId) : rng.pick(roleSpecs);
  return {
    id: `staff-${role}-${tier}-${rng.int(1000, 9999)}`,
    role,
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    portraitSeed: rng.int(10000, 99999),
    tier,
    level: 1,
    xp: 0,
    salaryPerSeason: SALARY_BY_TIER[tier],
    yearsRemaining: rng.int(2, 3),
    specialtyId: spec.id,
    specialtyLabel: spec.label,
    perkSummary: spec.perkSummary,
    tradeOffSummary: spec.tradeOffSummary,
  };
}

export function computeClubStaffPayroll(staff: readonly StaffMember[]): number {
  return staff.reduce((sum, s) => sum + s.salaryPerSeason, 0);
}

/** Hires a staff member enforcing tier-scaled active slot caps, staff salary budget, and signing deposit. */
export function hireStaffMember(
  club: Club,
  candidate: StaffMember,
): { hired: boolean; reason?: string; club: Club } {
  const current = club.coaches.activeStaff ?? [];
  const existingSameRole = current.find((s) => s.role === candidate.role);
  const slotLimit = STAFF_SLOT_LIMITS_BY_TIER[club.leagueTier];

  if (!existingSameRole && current.length >= slotLimit) {
    return {
      hired: false,
      reason: `Active staff slot limit reached (${current.length}/${slotLimit} for ${club.leagueTier.toUpperCase()}). Fire a role or earn promotion!`,
      club,
    };
  }

  const nextStaff = existingSameRole
    ? current.map((s) => (s.role === candidate.role ? candidate : s))
    : [...current, candidate];
  const projectedPayroll = computeClubStaffPayroll(nextStaff);
  const budgetCap = STAFF_SALARY_BUDGET_BY_TIER[club.leagueTier];
  if (projectedPayroll > budgetCap) {
    return {
      hired: false,
      reason: `Exceeds ${club.leagueTier.toUpperCase()} staff salary budget ($${projectedPayroll.toLocaleString()} / $${budgetCap.toLocaleString()}).`,
      club,
    };
  }

  const signingDeposit = Math.round(candidate.salaryPerSeason * 0.25);
  if (club.economy.cash < signingDeposit) {
    return {
      hired: false,
      reason: `Need $${signingDeposit.toLocaleString()} upfront signing deposit.`,
      club,
    };
  }

  return {
    hired: true,
    club: {
      ...club,
      coaches: {
        ...club.coaches,
        activeStaff: nextStaff,
      },
      economy: {
        ...club.economy,
        cash: club.economy.cash - signingDeposit,
      },
    },
  };
}

export function fireStaffMember(club: Club, staffId: string): Club {
  return {
    ...club,
    coaches: {
      ...club.coaches,
      activeStaff: (club.coaches.activeStaff ?? []).filter((s) => s.id !== staffId),
    },
  };
}

/** Awards Staff XP and advances coach level (up to tier cap) so staff grow across seasons. */
export function awardStaffExperience(member: StaffMember, xpGain: number): StaffMember {
  const maxLevel = Math.min(5, member.tier + 1) as StaffQualityTier;
  let nextXp = member.xp + Math.max(0, xpGain);
  let nextLevel = member.level;

  while (nextLevel < maxLevel && nextXp >= nextLevel * 120) {
    nextXp -= nextLevel * 120;
    nextLevel = (nextLevel + 1) as StaffQualityTier;
  }

  return {
    ...member,
    level: nextLevel,
    xp: nextXp,
  };
}

/** Sends a staff member to a paid Offseason Coaching Clinic (+1 level, capped per offseason). */
export function runOffseasonCoachingClinic(
  club: Club,
  staffId: string,
): { upgraded: boolean; reason?: string; club: Club } {
  const used = club.coaches.clinicSessionsUsedThisOffseason ?? 0;
  if (used >= MAX_CLINIC_SESSIONS_PER_OFFSEASON) {
    return {
      upgraded: false,
      reason: `Already used all ${MAX_CLINIC_SESSIONS_PER_OFFSEASON} Coaching Clinic slots this offseason.`,
      club,
    };
  }

  const target = (club.coaches.activeStaff ?? []).find((s) => s.id === staffId);
  if (!target) {
    return { upgraded: false, reason: 'Staff member not found.', club };
  }
  const maxLevel = Math.min(5, target.tier + 1);
  if (target.level >= maxLevel) {
    return { upgraded: false, reason: `${target.name} has reached their Tier ${target.tier} ceiling (Lv.${maxLevel}).`, club };
  }

  const cost = target.level * 1_200;
  if (club.economy.cash < cost) {
    return { upgraded: false, reason: `Coaching Clinic costs $${cost.toLocaleString()}.`, club };
  }

  const upgradedMember: StaffMember = {
    ...target,
    level: (target.level + 1) as StaffQualityTier,
    xp: 0,
  };
  return {
    upgraded: true,
    club: {
      ...club,
      coaches: {
        ...club.coaches,
        activeStaff: club.coaches.activeStaff.map((s) => (s.id === staffId ? upgradedMember : s)),
        clinicSessionsUsedThisOffseason: used + 1,
      },
      economy: {
        ...club.economy,
        cash: club.economy.cash - cost,
      },
    },
  };
}

/** Aggregates live gameplay bonuses and trade-offs from all hired dugout & clubhouse staff. */
export function evaluateClubStaffBonuses(staff: readonly StaffMember[]): ClubStaffBonuses {
  const bonuses: ClubStaffBonuses = {
    pitchingVeloBonus: 0,
    pitchingMovementBonus: 0,
    pitchingControlBonus: 0,
    pitcherEnduranceDrainScale: 1.0,
    battingContactBonus: 0,
    battingPowerBonus: 0,
    battingEyeBonus: 0,
    slumpBusterBonus: 0,
    highLiComposureBonus: 0,
    managerPowerCooldownBonus: 0,
    moraleAura: 0,
    fieldingGloveBonus: 0,
    crossTrainRustReduction: 0,
    bullpenWarmupBonus: 0,
    catcherFramingZoneBonus: 0,
    catcherPopTimeBonus: 0,
    relieverFatigueReduction: 0,
    relicBonusMultiplier: 1.0,
    blisterPreventionBonus: 0,
    vintageRelicFindChance: 0,
  };

  for (const member of staff) {
    const spec = STAFF_SPECIALTIES.find((s) => s.id === member.specialtyId);
    if (!spec) continue;
    const potency = member.tier * 0.65 + member.level * 0.55;
    spec.apply(potency, bonuses);
  }
  return bonuses;
}

/** Generates a hireable staff pool across all 6 roles plus any newly retired club legends. */
export function generateStaffHiringPool(
  rng: SeededRng,
  tier: LeagueTierId,
  retiredLegends: readonly RetiredLegendCoachCandidate[] = [],
): StaffMember[] {
  const maxQ = MAX_MARKET_TIER_BY_LEAGUE[tier];
  const roles: readonly DugoutStaffRole[] = [
    'pitching_coach',
    'hitting_coach',
    'bench_coach',
    'fielding_coach',
    'bullpen_coach',
    'equipment_manager',
  ];

  const generated = roles.map((role) =>
    createStaffMember(rng, role, rng.int(1, maxQ) as StaffQualityTier),
  );

  const legendHires: StaffMember[] = retiredLegends.map((legend) => {
    const spec = findSpecialty(legend.recommendedRole, legend.specialtyId);
    return {
      id: `staff-legend-${legend.formerPlayerId}`,
      role: legend.recommendedRole,
      name: `${legend.name} (Club Legend)`,
      portraitSeed: legend.portraitSeed,
      tier: legend.startingTier,
      level: 2,
      xp: 0,
      salaryPerSeason: Math.round(SALARY_BY_TIER[legend.startingTier] * 0.9),
      yearsRemaining: 3,
      specialtyId: spec.id,
      specialtyLabel: spec.label,
      perkSummary: `${spec.perkSummary} • Legend of ${legend.clubLegendOf}`,
      tradeOffSummary: spec.tradeOffSummary,
      formerPlayerId: legend.formerPlayerId,
    };
  });

  return [...legendHires, ...generated];
}
