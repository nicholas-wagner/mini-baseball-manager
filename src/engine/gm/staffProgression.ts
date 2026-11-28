import type { Club } from '../models/club';
import type { StaffMember, StaffQualityTier, StaffRole } from '../models/manager';

export type StaffRankId = 'rookie' | 'junior' | 'senior' | 'veteran' | 'legendary';

export interface StaffRankMetadata {
  level: StaffQualityTier;
  rankId: StaffRankId;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  xpToNext: number | null;
  isMaxLocked: boolean;
}

export interface StaffRankAbility {
  id: string;
  unlockLevel: StaffQualityTier;
  name: string;
  effectText: string;
}

export interface StaffRankUpNotice {
  staffId: string;
  staffName: string;
  role: StaffRole;
  fromLevel: StaffQualityTier;
  toLevel: StaffQualityTier;
  toRankLabel: string;
  unlockedAbilityName: string | null;
}

/**
 * Starfleet Command–inspired 5-rank staff progression ladder.
 * Steep hard-earned curve (`120 -> 320 -> 700 -> 1400`, 2,540 XP total) so reaching
 * Rank 5 (`Legendary [Locked]`) feels like a true multi-season dynasty achievement!
 */
export const STAFF_RANK_LADDER: readonly StaffRankMetadata[] = [
  {
    level: 1,
    rankId: 'rookie',
    label: 'Rookie',
    shortLabel: 'RK',
    badgeBg: '#E2E8F0',
    badgeText: '#1E293B',
    xpToNext: 120,
    isMaxLocked: false,
  },
  {
    level: 2,
    rankId: 'junior',
    label: 'Junior',
    shortLabel: 'JR',
    badgeBg: '#DBEAFE',
    badgeText: '#1E3A8A',
    xpToNext: 320,
    isMaxLocked: false,
  },
  {
    level: 3,
    rankId: 'senior',
    label: 'Senior',
    shortLabel: 'SR',
    badgeBg: '#D8F3DC',
    badgeText: '#1B4332',
    xpToNext: 700,
    isMaxLocked: false,
  },
  {
    level: 4,
    rankId: 'veteran',
    label: 'Veteran',
    shortLabel: 'VET',
    badgeBg: '#F3E8FF',
    badgeText: '#5B21B6',
    xpToNext: 1_400,
    isMaxLocked: false,
  },
  {
    level: 5,
    rankId: 'legendary',
    label: 'Legendary',
    shortLabel: 'LEG',
    badgeBg: '#FFC300',
    badgeText: '#181B2C',
    xpToNext: null,
    isMaxLocked: true,
  },
];

export const STAFF_ROLE_ABILITIES: Readonly<Record<StaffRole, readonly StaffRankAbility[]>> = {
  pitching_coach: [
    { id: 'pc_sequencing', unlockLevel: 2, name: 'Pitch Sequencing Lab', effectText: '+1 Control on 2-strike putaway pitches' },
    { id: 'pc_endurance_shield', unlockLevel: 4, name: 'Ace Endurance Shield', effectText: 'Cuts starter late-inning fatigue drop by 6%' },
    { id: 'pc_cy_aura', unlockLevel: 5, name: 'Hall-of-Fame Pitching Aura', effectText: '+2 Stuff & +1 Control across entire staff' },
  ],
  hitting_coach: [
    { id: 'hc_two_strike', unlockLevel: 2, name: 'Two-Strike Battle Plan', effectText: '+1 Eye & sharper slump-buster drills' },
    { id: 'hc_barrel_tune', unlockLevel: 4, name: 'Barrel Calibration', effectText: '+1 Power & +1 Contact with runners on' },
    { id: 'hc_batting_title', unlockLevel: 5, name: 'Batting-Title Guru', effectText: '+2 Contact & +1 Power lineup-wide' },
  ],
  bench_coach: [
    { id: 'bc_dugout_pulse', unlockLevel: 2, name: 'Dugout Pulse Check', effectText: '+2 Clubhouse Morale & faster rally sparks' },
    { id: 'bc_matchup_binder', unlockLevel: 4, name: 'Clutch Matchup Binder', effectText: '+2 High-Leverage composure in late innings' },
    { id: 'bc_skipper_savant', unlockLevel: 5, name: 'Pennant Chessmaster', effectText: '-1 Manager Power cooldown & +2 Clutch' },
  ],
  fielding_coach: [
    { id: 'fc_first_step', unlockLevel: 2, name: 'First-Step Reads', effectText: '+1 Glove reliability & 8% less position rust' },
    { id: 'fc_turn_two', unlockLevel: 4, name: 'Double-Play Clinic', effectText: '+2 Fielding & 12% less cross-train rust' },
    { id: 'fc_gold_leather', unlockLevel: 5, name: 'Gold-Glove Dynasty', effectText: '+3 Fielding across every defensive spot' },
  ],
  bullpen_coach: [
    { id: 'bp_pop_time', unlockLevel: 2, name: 'Catcher Pop-Time Drills', effectText: '+2 Catcher throw-out boost vs base stealers' },
    { id: 'bp_framing_craft', unlockLevel: 4, name: 'Borderline Framing Craft', effectText: '+1% extra called strikes & fresher relievers' },
    { id: 'bp_lockdown_pen', unlockLevel: 5, name: 'Lockdown Bullpen Battery', effectText: '+2 Warmup poise & -8% reliever fatigue' },
  ],
  equipment_manager: [
    { id: 'eq_pine_tar', unlockLevel: 2, name: 'Custom Pine-Tar Blend', effectText: '+5% Relic stat amplification & blister shield' },
    { id: 'eq_vintage_radar', unlockLevel: 4, name: 'Vintage Locker Radar', effectText: '+4% rare 90s Relic discovery chance' },
    { id: 'eq_hall_curator', unlockLevel: 5, name: 'Hall-of-Fame Gear Curator', effectText: '+10% Relic boost & +3 Dugout Morale' },
  ],
  team_doctor: [
    { id: 'doc_fast_diag', unlockLevel: 2, name: 'Fast-Track Diagnostics', effectText: '+10% faster injury & illness clearance' },
    { id: 'doc_precision_rehab', unlockLevel: 4, name: 'Precision Sports Rehab', effectText: '-8% specialty injury risk & faster IL return' },
    { id: 'doc_miracle_md', unlockLevel: 5, name: 'Miracle Clearance MD', effectText: '+18% healing speed & -12% vet career-end risk' },
  ],
  athletic_trainer: [
    { id: 'trn_warmup', unlockLevel: 2, name: 'Dynamic Warmup Routine', effectText: '-6% soft-tissue strain risk club-wide' },
    { id: 'trn_iron_man', unlockLevel: 4, name: 'Iron-Man Durability', effectText: 'Softens play-through penalties by 8%' },
    { id: 'trn_ageless', unlockLevel: 5, name: 'Ageless Legend Protocol', effectText: 'Cuts 35+ aging decline by an extra 10%' },
  ],
};

export function getStaffRankInfo(level: StaffQualityTier): StaffRankMetadata {
  return STAFF_RANK_LADDER[Math.max(0, Math.min(4, level - 1))];
}

/** Returns all learned signature abilities unlocked at or below this staff member's current rank. */
export function getStaffUnlockedAbilities(
  member: Pick<StaffMember, 'role' | 'level'>,
): readonly StaffRankAbility[] {
  return STAFF_ROLE_ABILITIES[member.role].filter((ab) => member.level >= ab.unlockLevel);
}

/** Returns the next rank ability this staff member will unlock on rank-up (null when Legendary/Locked). */
export function getNextStaffAbility(
  member: Pick<StaffMember, 'role' | 'level'>,
): StaffRankAbility | null {
  return STAFF_ROLE_ABILITIES[member.role].find((ab) => ab.unlockLevel > member.level) ?? null;
}

/**
 * Advances a staff member (dugout coach, Equipment Manager, Team Doctor, or Athletic Trainer)
 * along the 5-rank Starfleet Command ladder (`Rookie -> Junior -> Senior -> Veteran -> Legendary [Locked]`).
 */
export function advanceStaffRankXp(
  member: StaffMember,
  xpGain: number,
): { member: StaffMember; rankedUp: boolean; notice: StaffRankUpNotice | null } {
  const startLevel = member.level;
  if (startLevel >= 5) {
    return { member: { ...member, level: 5, xp: 0 }, rankedUp: false, notice: null };
  }

  let nextXp = member.xp + Math.max(0, Math.round(xpGain));
  let nextLevel = startLevel;

  while (nextLevel < 5) {
    const threshold = getStaffRankInfo(nextLevel).xpToNext;
    if (threshold === null || nextXp < threshold) break;
    nextXp -= threshold;
    nextLevel = (nextLevel + 1) as StaffQualityTier;
  }

  if (nextLevel >= 5) nextXp = 0;
  const updated: StaffMember = { ...member, level: nextLevel, xp: nextXp };
  if (nextLevel === startLevel) {
    return { member: updated, rankedUp: false, notice: null };
  }

  const newlyUnlocked =
    STAFF_ROLE_ABILITIES[member.role].find(
      (ab) => ab.unlockLevel > startLevel && ab.unlockLevel <= nextLevel,
    ) ?? null;

  return {
    member: updated,
    rankedUp: true,
    notice: {
      staffId: member.id,
      staffName: member.name,
      role: member.role,
      fromLevel: startLevel,
      toLevel: nextLevel,
      toRankLabel: getStaffRankInfo(nextLevel).label,
      unlockedAbilityName: newlyUnlocked?.name ?? null,
    },
  };
}

/** Awards post-game Staff XP to ALL active club crew (coaches, Equipment Manager, Team Doctor & Athletic Trainer). */
export function awardClubStaffPostGameXp(
  club: Club,
  won: boolean,
  options?: { isPlayoffGame?: boolean; activeHealthCases?: number },
): { club: Club; rankUps: StaffRankUpNotice[] } {
  const activeStaff = club.coaches.activeStaff ?? [];
  if (activeStaff.length === 0) return { club, rankUps: [] };

  const baseXp = (won ? 18 : 9) + (options?.isPlayoffGame ? 12 : 0);
  const medBonus = (options?.activeHealthCases ?? 0) > 0 ? 10 : 0;
  const rankUps: StaffRankUpNotice[] = [];

  const nextStaff = activeStaff.map((member) => {
    const isMedical = member.role === 'team_doctor' || member.role === 'athletic_trainer';
    const res = advanceStaffRankXp(member, baseXp + (isMedical ? medBonus : 0));
    if (res.notice) rankUps.push(res.notice);
    return res.member;
  });

  return {
    club: {
      ...club,
      coaches: {
        ...club.coaches,
        activeStaff: nextStaff,
      },
    },
    rankUps,
  };
}
