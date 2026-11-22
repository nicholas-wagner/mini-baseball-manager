export type ManagerBranch = 'skipper' | 'coach' | 'mogul';

export type ManagerPowerId =
  | 'pep_talk'
  | 'mound_whisper'
  | 'clutch_focus'
  | 'rally_cap'
  | 'bullpen_freeze';

export type CoachRole = 'pitching' | 'hitting' | 'scouting' | 'stadium';

export type StaffRole =
  | 'pitching_coach'
  | 'hitting_coach'
  | 'bench_coach'
  | 'fielding_coach'
  | 'bullpen_coach'
  | 'equipment_manager'
  | 'team_doctor'
  | 'athletic_trainer';

export type StaffQualityTier = 1 | 2 | 3 | 4 | 5;

export interface StaffMember {
  id: string;
  role: StaffRole;
  name: string;
  portraitSeed: number;
  tier: StaffQualityTier;
  level: StaffQualityTier;
  xp: number;
  salaryPerSeason: number;
  yearsRemaining: number;
  specialtyId: string;
  specialtyLabel: string;
  perkSummary: string;
  tradeOffSummary: string;
  formerPlayerId?: string;
}

export interface CoachMember {
  id: string;
  name: string;
  role: CoachRole;
  level: number;
  salaryPerSeason: number;
  bonusSummary: string;
  avatarSeed: number;
}

export interface CoachStaffState {
  pitching: CoachMember | null;
  hitting: CoachMember | null;
  scouting: CoachMember | null;
  stadium: CoachMember | null;
  activeStaff: StaffMember[];
  clinicSessionsUsedThisOffseason: number;
}

export interface ManagerProfile {
  id: string;
  name: string;
  avatarSeed: number;
  level: number;
  xp: number;
  skillPoints: number;
  unlockedNodeIds: string[];
  activePowerIds: ManagerPowerId[];
  wins: number;
  losses: number;
  championships: number;
}

export function createDefaultCoachStaff(): CoachStaffState {
  return {
    pitching: null,
    hitting: null,
    scouting: null,
    stadium: null,
    activeStaff: [],
    clinicSessionsUsedThisOffseason: 0,
  };
}

/** Initializes a Level 1 human manager profile with Pep Talk ready out of the gate. */
export function createManagerProfile(params: {
  id?: string;
  name: string;
  avatarSeed: number;
}): ManagerProfile {
  return {
    id: params.id ?? `mgr-${params.avatarSeed}`,
    name: params.name,
    avatarSeed: params.avatarSeed,
    level: 1,
    xp: 0,
    skillPoints: 1,
    unlockedNodeIds: ['skipper_pep_talk'],
    activePowerIds: ['pep_talk'],
    wins: 0,
    losses: 0,
    championships: 0,
  };
}
