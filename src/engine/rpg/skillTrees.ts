import {
  isPitcherPosition,
  type Player,
  type PlayerMarketTier,
  type PlayerRatings,
} from '../models/player';
import { evolveSpecialistArchetype } from './specialistsAndPositions';
import {
  checkNodeMasteryGate,
  DISCIPLINE_LABELS,
} from './skillTreeMastery';
import { enforceRatingBudget } from './trainingCompromises';

export type SkillBranchId = 'pitcher' | 'batter' | 'fielder';

export type PlayerBuildTone =
  | 'balanced'
  | 'power'
  | 'contact'
  | 'speed'
  | 'heat'
  | 'spin'
  | 'control'
  | 'glove'
  | 'two_way';

export interface PlayerCapstoneLimits {
  total: number;
  maxPrimary: number;
  maxFielder: number;
}

export interface PlayerCapstoneSummary {
  primaryCapstoneNodeId: string | null;
  fielderCapstoneNodeId: string | null;
  totalCapstones: number;
}

export interface PlayerBuildIdentity {
  label: string;
  shortTag: string;
  tone: PlayerBuildTone;
  spentSp: number;
  maxSp: number;
  remainingBudgetSp: number;
  primaryCapstoneName: string | null;
  fielderCapstoneName: string | null;
}

export interface SkillUndoResult {
  undone: boolean;
  refundedSp: number;
  reason?: string;
  player: Player;
}

export type SkillRatingKey = keyof Pick<
  PlayerRatings,
  | 'contact'
  | 'power'
  | 'gapPower'
  | 'eye'
  | 'bunt'
  | 'velocity'
  | 'movement'
  | 'control'
  | 'stamina'
  | 'speed'
  | 'fielding'
  | 'range'
  | 'arm'
  | 'clutch'
>;

export interface SkillTreeNode {
  id: string;
  branch: SkillBranchId;
  lane: number; // 0 | 1 | 2 visual column
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  spCost: number;
  prerequisiteIds: readonly string[];
  statBonuses: Readonly<Partial<Record<SkillRatingKey, number>>>;
  capstonePowerId?: string;
  capstonePowerName?: string;
}

export interface SkillUnlockEligibility {
  allowed: boolean;
  reason?: string;
}

export interface SkillUnlockResult {
  unlocked: boolean;
  reason?: string;
  player: Player;
}

export interface SkillRespecResult {
  refundedSp: number;
  player: Player;
}

export interface PowerToggleResult {
  changed: boolean;
  reason?: string;
  player: Player;
}

export interface SkillTreeCombatBonuses {
  pitchingStuffDelta: number;
  pitchingControlDelta: number;
  battingContactDelta: number;
  battingPowerDelta: number;
  fieldingDelta: number;
  equippedCapstoneIds: string[];
  equippedCapstoneNames: string[];
}

export const SKILL_RESPEC_CASH_FEE = 2_000;
export const MAX_CAREER_RETRAINS_PER_PLAYER = 1;

const MARKET_TIER_SP_CAPS: Readonly<Record<PlayerMarketTier, number>> = {
  all_star: 18,
  rookie: 14,
  above_average: 14,
  average: 12,
  veteran: 12,
  below_average: 12,
};

const BREAKOUT_AWARD_PATTERN = /all[- ]?star|mvp|most valuable|cy young|golden arm/i;

const PRIMARY_CAPSTONE_IDENTITIES: Readonly<
  Record<string, { label: string; shortTag: string; tone: PlayerBuildTone }>
> = {
  cap_moonshot_bomb: { label: 'Power Specialist', shortTag: '💣 Power', tone: 'power' },
  cap_rally_spark: { label: 'Contact Maestro', shortTag: '🎯 Contact', tone: 'contact' },
  cap_laser_eye: { label: 'Contact Maestro', shortTag: '👁️ Contact', tone: 'contact' },
  cap_ninja_bunt: { label: 'Speed Demon', shortTag: '⚡ Speed', tone: 'speed' },
  cap_blazing_comet: { label: 'Flamethrower Ace', shortTag: '🔥 Heat', tone: 'heat' },
  cap_ghost_knuckle: { label: 'Spin Wizard', shortTag: '🌀 Spin', tone: 'spin' },
  cap_tornado_slider: { label: 'Spin Wizard', shortTag: '🌀 Spin', tone: 'spin' },
  cap_ice_veins: { label: 'Command Artist', shortTag: '🧊 Command', tone: 'control' },
};

export const SKILL_TREE_NODES: readonly SkillTreeNode[] = [
  // PITCHER BRANCH (11 nodes across 3 lanes)
  {
    id: 'p_heat_1',
    branch: 'pitcher',
    lane: 0,
    tier: 1,
    name: 'Fastball Drive',
    description: '+2 Velocity from explosive mound push-off.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { velocity: 2 },
  },
  {
    id: 'p_spin_1',
    branch: 'pitcher',
    lane: 1,
    tier: 1,
    name: 'Spin Lab',
    description: '+2 Movement for sharper late pitch break.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { movement: 2 },
  },
  {
    id: 'p_paint_1',
    branch: 'pitcher',
    lane: 2,
    tier: 1,
    name: 'Corner Painter',
    description: '+2 Control painting the outer black.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { control: 2 },
  },
  {
    id: 'p_heat_2',
    branch: 'pitcher',
    lane: 0,
    tier: 2,
    name: 'High Cheese',
    description: '+3 Velocity & +1 Clutch climbing the ladder.',
    spCost: 2,
    prerequisiteIds: ['p_heat_1'],
    statBonuses: { velocity: 3, clutch: 1 },
  },
  {
    id: 'p_spin_2',
    branch: 'pitcher',
    lane: 1,
    tier: 2,
    name: 'Wipeout Break',
    description: '+3 Movement & +1 Control on chase pitches.',
    spCost: 2,
    prerequisiteIds: ['p_spin_1'],
    statBonuses: { movement: 3, control: 1 },
  },
  {
    id: 'p_paint_2',
    branch: 'pitcher',
    lane: 2,
    tier: 2,
    name: 'Pitch Sequencing',
    description: '+3 Control & +2 Clutch mixing speeds cleanly.',
    spCost: 2,
    prerequisiteIds: ['p_paint_1'],
    statBonuses: { control: 3, clutch: 2 },
  },
  {
    id: 'p_stamina_2',
    branch: 'pitcher',
    lane: 2,
    tier: 2,
    name: 'Iron Rubber',
    description: '+4 Stamina resisting late-inning velocity drop.',
    spCost: 2,
    prerequisiteIds: ['p_paint_1'],
    statBonuses: { stamina: 4 },
  },
  {
    id: 'cap_blazing_comet',
    branch: 'pitcher',
    lane: 0,
    tier: 3,
    name: 'Blazing Comet',
    description: 'Capstone Power: Scorching comet heater (+3 VEL, limited-charge finisher).',
    spCost: 3,
    prerequisiteIds: ['p_heat_2'],
    statBonuses: { velocity: 3, clutch: 2 },
    capstonePowerId: 'blazing_comet',
    capstonePowerName: 'Blazing Comet',
  },
  {
    id: 'cap_ghost_knuckle',
    branch: 'pitcher',
    lane: 1,
    tier: 3,
    name: 'Ghost Knuckle',
    description: 'Capstone Power: Vanishing flutter pitch (+3 MOV, limited-charge finisher).',
    spCost: 3,
    prerequisiteIds: ['p_spin_2'],
    statBonuses: { movement: 3, control: 1 },
    capstonePowerId: 'ghost_knuckle',
    capstonePowerName: 'Ghost Knuckle',
  },
  {
    id: 'cap_tornado_slider',
    branch: 'pitcher',
    lane: 1,
    tier: 3,
    name: 'Tornado Slider',
    description: 'Capstone Power: Cyclone sweeping breaker (+2 MOV, +2 VEL).',
    spCost: 3,
    prerequisiteIds: ['p_spin_2', 'p_heat_2'],
    statBonuses: { movement: 2, velocity: 2 },
    capstonePowerId: 'tornado_slider',
    capstonePowerName: 'Tornado Slider',
  },
  {
    id: 'cap_ice_veins',
    branch: 'pitcher',
    lane: 2,
    tier: 3,
    name: 'Ice Veins',
    description: 'Capstone Power: Sub-zero composure (+3 CTL, +4 CLU in high leverage).',
    spCost: 3,
    prerequisiteIds: ['p_paint_2'],
    statBonuses: { control: 3, clutch: 4 },
    capstonePowerId: 'ice_veins',
    capstonePowerName: 'Ice Veins',
  },

  // BATTER BRANCH (11 nodes across 3 lanes)
  {
    id: 'b_pwr_1',
    branch: 'batter',
    lane: 0,
    tier: 1,
    name: 'Launch Mechanics',
    description: '+2 Power driving the ball to the wall.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { power: 2 },
  },
  {
    id: 'b_con_1',
    branch: 'batter',
    lane: 1,
    tier: 1,
    name: 'Sweet Spot Craft',
    description: '+2 Contact squaring up tough pitches.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { contact: 2 },
  },
  {
    id: 'b_spd_1',
    branch: 'batter',
    lane: 2,
    tier: 1,
    name: 'First-Step Burst',
    description: '+2 Speed & +2 Bunt exploding out of the box.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { speed: 2, bunt: 2 },
  },
  {
    id: 'b_pwr_2',
    branch: 'batter',
    lane: 0,
    tier: 2,
    name: 'Gap Crusher',
    description: '+3 Power & +2 Gap Power ripping doubles.',
    spCost: 2,
    prerequisiteIds: ['b_pwr_1'],
    statBonuses: { power: 3, gapPower: 2 },
  },
  {
    id: 'b_con_2',
    branch: 'batter',
    lane: 1,
    tier: 2,
    name: 'Two-Strike Battle',
    description: '+3 Contact & +2 Eye spoiling tough pitches.',
    spCost: 2,
    prerequisiteIds: ['b_con_1'],
    statBonuses: { contact: 3, eye: 2 },
  },
  {
    id: 'b_eye_2',
    branch: 'batter',
    lane: 1,
    tier: 2,
    name: 'Strike-Zone Hawk',
    description: '+4 Eye laying off borderline chase pitches.',
    spCost: 2,
    prerequisiteIds: ['b_con_1'],
    statBonuses: { eye: 4 },
  },
  {
    id: 'b_spd_2',
    branch: 'batter',
    lane: 2,
    tier: 2,
    name: 'Base Thief',
    description: '+3 Speed & +2 Bunt rattling pitchers.',
    spCost: 2,
    prerequisiteIds: ['b_spd_1'],
    statBonuses: { speed: 3, bunt: 2 },
  },
  {
    id: 'cap_moonshot_bomb',
    branch: 'batter',
    lane: 0,
    tier: 3,
    name: 'Moonshot Bomb-Swing',
    description: 'Capstone Power: Towering fireworks blast (+3 PWR, +2 CLU).',
    spCost: 3,
    prerequisiteIds: ['b_pwr_2'],
    statBonuses: { power: 3, clutch: 2 },
    capstonePowerId: 'moonshot_bomb',
    capstonePowerName: 'Moonshot Bomb-Swing',
  },
  {
    id: 'cap_rally_spark',
    branch: 'batter',
    lane: 1,
    tier: 3,
    name: 'Rally Spark',
    description: 'Capstone Power: Line-drive sparkplug (+3 CON, +3 CLU).',
    spCost: 3,
    prerequisiteIds: ['b_con_2'],
    statBonuses: { contact: 3, clutch: 3 },
    capstonePowerId: 'rally_spark',
    capstonePowerName: 'Rally Spark',
  },
  {
    id: 'cap_laser_eye',
    branch: 'batter',
    lane: 1,
    tier: 3,
    name: 'Laser Eye',
    description: 'Capstone Power: Elite zone vision (+3 EYE, +2 CON).',
    spCost: 3,
    prerequisiteIds: ['b_eye_2'],
    statBonuses: { eye: 3, contact: 2 },
    capstonePowerId: 'laser_eye',
    capstonePowerName: 'Laser Eye',
  },
  {
    id: 'cap_ninja_bunt',
    branch: 'batter',
    lane: 2,
    tier: 3,
    name: 'Ninja Bunt',
    description: 'Capstone Power: Dead-stop chalk bunt (+4 BNT, +2 SPD).',
    spCost: 3,
    prerequisiteIds: ['b_spd_2'],
    statBonuses: { bunt: 4, speed: 2 },
    capstonePowerId: 'ninja_bunt',
    capstonePowerName: 'Ninja Bunt',
  },

  // FIELDER BRANCH (9 nodes across 3 lanes)
  {
    id: 'f_rng_1',
    branch: 'fielder',
    lane: 0,
    tier: 1,
    name: 'Quick Jump',
    description: '+2 Range reading the ball off the bat.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { range: 2 },
  },
  {
    id: 'f_arm_1',
    branch: 'fielder',
    lane: 1,
    tier: 1,
    name: 'Crow-Hop Mechanics',
    description: '+2 Arm loading clean throws.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { arm: 2 },
  },
  {
    id: 'f_glv_1',
    branch: 'fielder',
    lane: 2,
    tier: 1,
    name: 'Soft Hands',
    description: '+2 Fielding cleanly smothering hot grounders.',
    spCost: 1,
    prerequisiteIds: [],
    statBonuses: { fielding: 2 },
  },
  {
    id: 'f_rng_2',
    branch: 'fielder',
    lane: 0,
    tier: 2,
    name: 'Gap Blanket',
    description: '+3 Range & +1 Speed erasing extra-base hits.',
    spCost: 2,
    prerequisiteIds: ['f_rng_1'],
    statBonuses: { range: 3, speed: 1 },
  },
  {
    id: 'f_arm_2',
    branch: 'fielder',
    lane: 1,
    tier: 2,
    name: 'Hose Relay',
    description: '+3 Arm gunning down daring baserunners.',
    spCost: 2,
    prerequisiteIds: ['f_arm_1'],
    statBonuses: { arm: 3 },
  },
  {
    id: 'f_glv_2',
    branch: 'fielder',
    lane: 2,
    tier: 2,
    name: 'Turn-Two Footwork',
    description: '+3 Fielding & +1 Clutch snapping double plays.',
    spCost: 2,
    prerequisiteIds: ['f_glv_1'],
    statBonuses: { fielding: 3, clutch: 1 },
  },
  {
    id: 'cap_sky_high_leap',
    branch: 'fielder',
    lane: 0,
    tier: 3,
    name: 'Sky-High Leap',
    description: 'Capstone Power: Wall-climbing super grab (+3 RNG, +2 FLD).',
    spCost: 3,
    prerequisiteIds: ['f_rng_2'],
    statBonuses: { range: 3, fielding: 2 },
    capstonePowerId: 'sky_high_leap',
    capstonePowerName: 'Sky-High Leap',
  },
  {
    id: 'cap_cannon_arm',
    branch: 'fielder',
    lane: 1,
    tier: 3,
    name: 'Cannon Arm',
    description: 'Capstone Power: Laser beam strike home (+4 ARM).',
    spCost: 3,
    prerequisiteIds: ['f_arm_2'],
    statBonuses: { arm: 4 },
    capstonePowerId: 'cannon_arm',
    capstonePowerName: 'Cannon Arm',
  },
  {
    id: 'cap_iron_vacuum',
    branch: 'fielder',
    lane: 2,
    tier: 3,
    name: 'Iron Vacuum',
    description: 'Capstone Power: Error-proof leather (+4 FLD, +2 CLU).',
    spCost: 3,
    prerequisiteIds: ['f_glv_2'],
    statBonuses: { fielding: 4, clutch: 2 },
    capstonePowerId: 'iron_vacuum',
    capstonePowerName: 'Iron Vacuum',
  },
];

export const SKILL_NODES_BY_ID: Readonly<Record<string, SkillTreeNode>> = Object.fromEntries(
  SKILL_TREE_NODES.map((node) => [node.id, node]),
);

const CAPSTONE_NODES_BY_POWER_ID: Readonly<Record<string, SkillTreeNode>> = Object.fromEntries(
  SKILL_TREE_NODES.filter((n) => n.capstonePowerId).map((n) => [n.capstonePowerId!, n]),
);

/** Returns max equippable special power slots (2 standard, 3 at Legend Lv >= 12). */
export function getMaxEquippedPowerSlots(level: number): number {
  return level >= 12 ? 3 : 2;
}

/** Returns skill tree branches available to a player based on role. */
export function getAvailableSkillBranches(player: Pick<Player, 'position'>): readonly SkillBranchId[] {
  return isPitcherPosition(player.position) ? ['pitcher', 'fielder'] : ['batter', 'fielder'];
}

/** Returns all skill tree nodes belonging to a specific branch. */
export function getNodesForBranch(branch: SkillBranchId): readonly SkillTreeNode[] {
  return SKILL_TREE_NODES.filter((node) => node.branch === branch);
}

/** Returns total SP spent across a player's unlocked skill tree nodes. */
export function getPlayerSpentSkillPoints(player: Pick<Player, 'unlockedSkillIds'>): number {
  let spent = 0;
  for (const id of new Set(player.unlockedSkillIds)) {
    spent += SKILL_NODES_BY_ID[id]?.spCost ?? 0;
  }
  return spent;
}

function hasBreakoutCareerAward(awards: readonly string[] | undefined): boolean {
  if (!awards || awards.length === 0) return false;
  return awards.some((award) => BREAKOUT_AWARD_PATTERN.test(award));
}

/** Returns career SP budget cap by marketTier, promoting Lv 12+ or major-award breakouts to 18 SP. */
export function getPlayerSkillBudgetCap(
  player: Pick<Player, 'marketTier' | 'level' | 'awards' | 'careerService'>,
): number {
  if (player.marketTier === 'all_star') return 18;
  if (player.level >= 12 || hasBreakoutCareerAward(player.awards)) return 18;
  return MARKET_TIER_SP_CAPS[player.marketTier] ?? 12;
}

/** Returns Tier-3 capstone specialization limits for a player (2 for All-Star/Lv12+ legends, 1 otherwise). */
export function getMaxPlayerCapstones(
  player: Pick<Player, 'marketTier' | 'level' | 'awards' | 'careerService'>,
): PlayerCapstoneLimits {
  const cap = getPlayerSkillBudgetCap(player);
  return cap >= 18
    ? { total: 2, maxPrimary: 1, maxFielder: 1 }
    : { total: 1, maxPrimary: 1, maxFielder: 1 };
}

/** Summarizes unlocked Tier-3 capstones across primary (batter/pitcher) and fielder branches. */
export function getPlayerCapstoneSummary(
  player: Pick<Player, 'unlockedSkillIds'>,
): PlayerCapstoneSummary {
  let primaryCapstoneNodeId: string | null = null;
  let fielderCapstoneNodeId: string | null = null;
  let totalCapstones = 0;

  for (const id of new Set(player.unlockedSkillIds)) {
    const node = SKILL_NODES_BY_ID[id];
    if (!node || node.tier !== 3) continue;
    totalCapstones += 1;
    if (node.branch === 'fielder') {
      fielderCapstoneNodeId ??= node.id;
    } else {
      primaryCapstoneNodeId ??= node.id;
    }
  }

  return { primaryCapstoneNodeId, fielderCapstoneNodeId, totalCapstones };
}

function resolveIdentityMeta(
  spentSp: number,
  capstones: PlayerCapstoneSummary,
): { label: string; shortTag: string; tone: PlayerBuildTone } {
  if (spentSp === 0) {
    return { label: 'Developing Prospect', shortTag: '🌱 Prospect', tone: 'balanced' };
  }
  if (capstones.primaryCapstoneNodeId && capstones.fielderCapstoneNodeId) {
    return { label: 'Two-Way All-Star', shortTag: '⭐ Two-Way', tone: 'two_way' };
  }
  if (capstones.primaryCapstoneNodeId) {
    return (
      PRIMARY_CAPSTONE_IDENTITIES[capstones.primaryCapstoneNodeId] ?? {
        label: 'Role Specialist',
        shortTag: '★ Specialist',
        tone: 'balanced',
      }
    );
  }
  if (capstones.fielderCapstoneNodeId) {
    return { label: 'Defensive Anchor', shortTag: '🧤 Glove', tone: 'glove' };
  }
  if (spentSp >= 6) {
    return { label: 'Balanced All-Around', shortTag: '⚖️ Balanced', tone: 'balanced' };
  }
  return { label: 'Rising Contributor', shortTag: '📈 Rising', tone: 'balanced' };
}

/** Computes a player's RPG Build Identity badge, SP budget usage, and active capstones. */
export function getPlayerBuildIdentity(
  player: Pick<Player, 'unlockedSkillIds' | 'marketTier' | 'level' | 'awards' | 'careerService'>,
): PlayerBuildIdentity {
  const spentSp = getPlayerSpentSkillPoints(player);
  const maxSp = getPlayerSkillBudgetCap(player);
  const capstones = getPlayerCapstoneSummary(player);
  const meta = resolveIdentityMeta(spentSp, capstones);
  const primaryCapstoneName = capstones.primaryCapstoneNodeId
    ? (SKILL_NODES_BY_ID[capstones.primaryCapstoneNodeId]?.name ?? null)
    : null;
  const fielderCapstoneName = capstones.fielderCapstoneNodeId
    ? (SKILL_NODES_BY_ID[capstones.fielderCapstoneNodeId]?.name ?? null)
    : null;

  return {
    ...meta,
    spentSp,
    maxSp,
    remainingBudgetSp: Math.max(0, maxSp - spentSp),
    primaryCapstoneName,
    fielderCapstoneName,
  };
}

function checkCapstoneEligibility(player: Player, node: SkillTreeNode): SkillUnlockEligibility | null {
  if (node.tier !== 3) return null;
  const summary = getPlayerCapstoneSummary(player);
  const limits = getMaxPlayerCapstones(player);
  const existingSameBranchId =
    node.branch === 'fielder' ? summary.fielderCapstoneNodeId : summary.primaryCapstoneNodeId;

  if (existingSameBranchId) {
    const existingName = SKILL_NODES_BY_ID[existingSameBranchId]?.name ?? existingSameBranchId;
    return {
      allowed: false,
      reason: `Specialized in ${existingName} — other ${node.branch} Tier-3 capstones are locked.`,
    };
  }
  if (summary.totalCapstones >= limits.total) {
    return {
      allowed: false,
      reason: `Max ${limits.total} Tier-3 Capstone reached (reach All-Star / Lv 12 to unlock a 2nd specialization).`,
    };
  }
  return null;
}

function checkBudgetEligibility(player: Player, node: SkillTreeNode): SkillUnlockEligibility | null {
  const spentSp = getPlayerSpentSkillPoints(player);
  const maxSp = getPlayerSkillBudgetCap(player);
  if (spentSp + node.spCost > maxSp) {
    return {
      allowed: false,
      reason: `Career Talent cap reached (${spentSp}/${maxSp} SP — need ${node.spCost} SP room).`,
    };
  }
  return null;
}

function checkMasteryEligibility(player: Player, node: SkillTreeNode): SkillUnlockEligibility | null {
  if (!player.skillMastery || node.tier <= 1) return null;
  const gate = checkNodeMasteryGate(player, node.id);
  if (gate.met) return null;
  const label = DISCIPLINE_LABELS[gate.discipline].label;
  return {
    allowed: false,
    reason: `Needs ${label} Mastery ${gate.required} (now ${gate.current}) — play games or practice!`,
  };
}

function checkPrereqAndSpEligibility(player: Player, node: SkillTreeNode): SkillUnlockEligibility | null {
  const missingReq = node.prerequisiteIds.find((req) => !player.unlockedSkillIds.includes(req));
  if (missingReq) {
    const reqName = SKILL_NODES_BY_ID[missingReq]?.name ?? missingReq;
    return { allowed: false, reason: `Requires ${reqName} first.` };
  }
  const masteryBlock = checkMasteryEligibility(player, node);
  if (masteryBlock) return masteryBlock;
  if (player.skillPoints < node.spCost) {
    return { allowed: false, reason: `Need ${node.spCost} SP (have ${player.skillPoints}).` };
  }
  return null;
}

/** Validates whether a player can unlock a given skill tree node right now. */
export function canUnlockSkillNode(player: Player, nodeId: string): SkillUnlockEligibility {
  const node = SKILL_NODES_BY_ID[nodeId];
  if (!node) return { allowed: false, reason: 'Unknown skill node.' };

  if (!getAvailableSkillBranches(player).includes(node.branch)) {
    return { allowed: false, reason: `${player.position} players cannot unlock ${node.branch} skills.` };
  }
  if (player.unlockedSkillIds.includes(nodeId)) {
    return { allowed: false, reason: 'Skill already unlocked.' };
  }
  const block =
    checkCapstoneEligibility(player, node) ??
    checkBudgetEligibility(player, node) ??
    checkPrereqAndSpEligibility(player, node);
  return block ?? { allowed: true };
}

function applyStatBonusesWithinCaps(
  ratings: PlayerRatings,
  statCaps: PlayerRatings,
  bonuses: Readonly<Partial<Record<SkillRatingKey, number>>>,
  direction: 1 | -1,
): PlayerRatings {
  const next = { ...ratings };
  for (const [key, amount] of Object.entries(bonuses) as [SkillRatingKey, number][]) {
    const updated = next[key] + amount * direction;
    next[key] = direction === 1 ? Math.min(statCaps[key], updated) : Math.max(25, updated);
  }
  return next;
}

/** Unlocks a skill node, spending SP, applying capped stat upgrades, and equipping capstones when open. */
export function unlockSkillNode(player: Player, nodeId: string): SkillUnlockResult {
  const check = canUnlockSkillNode(player, nodeId);
  if (!check.allowed) {
    return { unlocked: false, reason: check.reason, player };
  }
  const node = SKILL_NODES_BY_ID[nodeId];
  const boosted = applyStatBonusesWithinCaps(player.ratings, player.statCaps, node.statBonuses, 1);
  const budgeted = enforceRatingBudget(boosted, player.position, player.totalRatingBudget);

  const maxSlots = getMaxEquippedPowerSlots(player.level);
  const nextEquipped = [...player.equippedPowerIds];
  if (
    node.capstonePowerId &&
    !nextEquipped.includes(node.capstonePowerId) &&
    nextEquipped.length < maxSlots
  ) {
    nextEquipped.push(node.capstonePowerId);
  }

  const nextPlayer: Player = {
    ...player,
    skillPoints: player.skillPoints - node.spCost,
    unlockedSkillIds: [...player.unlockedSkillIds, nodeId],
    equippedPowerIds: nextEquipped,
    ratings: budgeted,
    specialistArchetype: evolveSpecialistArchetype({
      position: player.position,
      specialistArchetype: player.specialistArchetype,
      ratings: budgeted,
    }),
  };
  return { unlocked: true, player: nextPlayer };
}

/** Toggles an unlocked capstone or heritage special power in/out of active equipped slots. */
export function toggleEquippedSpecialPower(player: Player, powerId: string): PowerToggleResult {
  if (player.equippedPowerIds.includes(powerId)) {
    return {
      changed: true,
      player: {
        ...player,
        equippedPowerIds: player.equippedPowerIds.filter((id) => id !== powerId),
      },
    };
  }

  const capstoneNode = CAPSTONE_NODES_BY_POWER_ID[powerId];
  const unlockedCapstone = capstoneNode && player.unlockedSkillIds.includes(capstoneNode.id);
  const isUnlockedHeritage = player.heritageTierUnlocked >= 3 && !capstoneNode;
  if (!unlockedCapstone && !isUnlockedHeritage) {
    return { changed: false, reason: 'Unlock this special power before equipping it.', player };
  }

  const maxSlots = getMaxEquippedPowerSlots(player.level);
  if (player.equippedPowerIds.length >= maxSlots) {
    return {
      changed: false,
      reason: `Max ${maxSlots} equipped powers reached — unequip one first.`,
      player,
    };
  }

  return {
    changed: true,
    player: {
      ...player,
      equippedPowerIds: [...player.equippedPowerIds, powerId],
    },
  };
}

/** Checks whether a player can perform their rare Offseason Career Retrain ($2,000, 1/career). */
export function canRetrainPlayerSkills(
  player: Pick<Player, 'unlockedSkillIds' | 'careerRetrainsUsed'>,
  context: { isOffseason: boolean; clubCash: number },
): SkillUnlockEligibility {
  if (player.unlockedSkillIds.length === 0) {
    return { allowed: false, reason: 'No skill tree nodes to retrain.' };
  }
  if (!context.isOffseason) {
    return { allowed: false, reason: 'Offseason Retrain is only available during the Offseason.' };
  }
  if ((player.careerRetrainsUsed ?? 0) >= MAX_CAREER_RETRAINS_PER_PLAYER) {
    return { allowed: false, reason: 'Career retrain already used (1 per player).' };
  }
  if (context.clubCash < SKILL_RESPEC_CASH_FEE) {
    return { allowed: false, reason: `Need $${SKILL_RESPEC_CASH_FEE.toLocaleString()} cash to retrain.` };
  }
  return { allowed: true };
}

/** Free instant undo for a node unlocked during the current Skill Tree screen visit. */
export function undoSessionSkillNode(player: Player, nodeId: string): SkillUndoResult {
  const node = SKILL_NODES_BY_ID[nodeId];
  if (!node || !player.unlockedSkillIds.includes(nodeId)) {
    return { undone: false, refundedSp: 0, reason: 'Skill node is not currently unlocked.', player };
  }
  const dependentId = player.unlockedSkillIds.find((otherId) =>
    SKILL_NODES_BY_ID[otherId]?.prerequisiteIds.includes(nodeId),
  );
  if (dependentId) {
    const depName = SKILL_NODES_BY_ID[dependentId]?.name ?? dependentId;
    return {
      undone: false,
      refundedSp: 0,
      reason: `Undo ${depName} first before undoing ${node.name}.`,
      player,
    };
  }

  const nextRatings = applyStatBonusesWithinCaps(player.ratings, player.statCaps, node.statBonuses, -1);
  const nextEquipped = node.capstonePowerId
    ? player.equippedPowerIds.filter((id) => id !== node.capstonePowerId)
    : player.equippedPowerIds;

  return {
    undone: true,
    refundedSp: node.spCost,
    player: {
      ...player,
      skillPoints: player.skillPoints + node.spCost,
      unlockedSkillIds: player.unlockedSkillIds.filter((id) => id !== nodeId),
      equippedPowerIds: nextEquipped,
      ratings: nextRatings,
      specialistArchetype: evolveSpecialistArchetype({
        position: player.position,
        specialistArchetype: player.specialistArchetype,
        ratings: nextRatings,
      }),
    },
  };
}

/** Refunds all SP spent in the role skill tree and removes unlocked tree node bonuses/capstones. */
export function respecPlayerSkills(
  player: Player,
  options?: { markCareerRetrain?: boolean },
): SkillRespecResult {
  let refundedSp = 0;
  let nextRatings = { ...player.ratings };
  const removedPowerIds = new Set<string>();

  for (const nodeId of player.unlockedSkillIds) {
    const node = SKILL_NODES_BY_ID[nodeId];
    if (!node) continue;
    refundedSp += node.spCost;
    nextRatings = applyStatBonusesWithinCaps(nextRatings, player.statCaps, node.statBonuses, -1);
    if (node.capstonePowerId) removedPowerIds.add(node.capstonePowerId);
  }

  const nextRetrains = options?.markCareerRetrain
    ? (player.careerRetrainsUsed ?? 0) + 1
    : player.careerRetrainsUsed;

  return {
    refundedSp,
    player: {
      ...player,
      skillPoints: player.skillPoints + refundedSp,
      unlockedSkillIds: [],
      equippedPowerIds: player.equippedPowerIds.filter((id) => !removedPowerIds.has(id)),
      ratings: nextRatings,
      ...(nextRetrains !== undefined ? { careerRetrainsUsed: nextRetrains } : {}),
    },
  };
}

/** Computes live simulation bonuses from a player's equipped skill tree capstones. */
export function computeSkillTreeCombatBonuses(player: Player): SkillTreeCombatBonuses {
  let pitchingStuffDelta = 0;
  let pitchingControlDelta = 0;
  let battingContactDelta = 0;
  let battingPowerDelta = 0;
  let fieldingDelta = 0;
  const equippedCapstoneIds: string[] = [];
  const equippedCapstoneNames: string[] = [];

  for (const powerId of player.equippedPowerIds) {
    const node = CAPSTONE_NODES_BY_POWER_ID[powerId];
    if (!node || !player.unlockedSkillIds.includes(node.id)) continue;
    equippedCapstoneIds.push(powerId);
    if (node.capstonePowerName) equippedCapstoneNames.push(node.capstonePowerName);
    if (node.branch === 'pitcher') {
      pitchingStuffDelta += 2;
      if (powerId === 'ice_veins') pitchingControlDelta += 2;
    } else if (node.branch === 'batter') {
      battingContactDelta += powerId === 'moonshot_bomb' ? 1 : 2;
      battingPowerDelta += powerId === 'moonshot_bomb' ? 3 : 1;
    } else {
      fieldingDelta += 3;
    }
  }

  return {
    pitchingStuffDelta,
    pitchingControlDelta,
    battingContactDelta,
    battingPowerDelta,
    fieldingDelta,
    equippedCapstoneIds,
    equippedCapstoneNames,
  };
}
