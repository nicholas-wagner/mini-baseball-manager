import { computeClubPayroll } from '../gm/offseasonEngine';
import { LEAGUE_TIER_ORDER, type Club } from '../models/club';

export type TimeCapsuleChallengeId =
  | 'june_miracle_1994'
  | 'small_ball_speed_blitz'
  | 'shoestring_dynasty'
  | 'coed_harmony_title'
  | 'home_run_showtime'
  | 'sandlot_to_cathedral';

export type TimeCapsuleMedalTier = 'bronze' | 'silver' | 'gold' | 'holo';

export interface TimeCapsuleChallenge {
  id: TimeCapsuleChallengeId;
  year: number;
  title: string;
  badgeEmoji: string;
  medalTier: TimeCapsuleMedalTier;
  goalText: string;
  flavorText: string;
  rewardCash: number;
  rewardHype: number;
  launchableScenario?: boolean;
}

export interface TimeCapsuleContext {
  wonHomeRunDerby?: boolean;
  wonGlobalCup?: boolean;
  activeScenarioIds?: readonly TimeCapsuleChallengeId[];
}

export interface TimeCapsuleEvaluationItem {
  challenge: TimeCapsuleChallenge;
  completed: boolean;
  progressPct: number;
  statusDetail: string;
}

export interface TimeCapsuleSummary {
  items: TimeCapsuleEvaluationItem[];
  completedCount: number;
  totalCount: number;
  completionPct: number;
}

export const TIME_CAPSULE_CHALLENGES: readonly TimeCapsuleChallenge[] = [
  {
    id: 'june_miracle_1994',
    year: 1994,
    title: '1994 June Miracle',
    badgeEmoji: '📻',
    medalTier: 'gold',
    goalText: 'Rally to 11+ wins (escape 1–10 June relegation brink!)',
    flavorText:
      'Step into the dugout on June 1st at 1–10 with a scrappy sandlot roster and pull off a comeback for the ages.',
    rewardCash: 3_500,
    rewardHype: 12,
    launchableScenario: true,
  },
  {
    id: 'small_ball_speed_blitz',
    year: 1995,
    title: '1995 Small-Ball Speed Blitz',
    badgeEmoji: '⚡',
    medalTier: 'bronze',
    goalText: 'Swipe 15+ team Stolen Bases in a single season',
    flavorText: 'Unleash basepath chaos with speedsters, hit-and-runs, and double steals.',
    rewardCash: 2_000,
    rewardHype: 8,
  },
  {
    id: 'shoestring_dynasty',
    year: 1996,
    title: '1996 Shoestring Dynasty',
    badgeEmoji: '💸',
    medalTier: 'silver',
    goalText: 'Reach High-A (or higher) with active payroll under $16,000',
    flavorText: 'Outsmart big-market spenders with savvy bargains, rookies, and platoon depth.',
    rewardCash: 4_000,
    rewardHype: 10,
  },
  {
    id: 'coed_harmony_title',
    year: 1997,
    title: '1997 Total Co-Ed Harmony',
    badgeEmoji: '🤝',
    medalTier: 'gold',
    goalText: 'Win a Championship Pennant with 4+ female & 4+ male players',
    flavorText: 'Blend raw slugging thunder with pinpoint spin, contact, and glove poise.',
    rewardCash: 4_500,
    rewardHype: 12,
  },
  {
    id: 'home_run_showtime',
    year: 1998,
    title: '1998 Home-Run Showtime',
    badgeEmoji: '💥',
    medalTier: 'silver',
    goalText: 'Mash 30+ team HRs in a season OR win the All-Star HR Derby',
    flavorText: 'Launch moonshots into the parking lot and ignite 1998 dinger fever!',
    rewardCash: 3_000,
    rewardHype: 10,
  },
  {
    id: 'sandlot_to_cathedral',
    year: 1999,
    title: '1999 Sandlot-to-Majors Cathedral',
    badgeEmoji: '👑',
    medalTier: 'holo',
    goalText: 'Reach Majors, expand to 28,000+ seats & win a Majors Pennant',
    flavorText: 'Complete the ultimate journey from chain-link sandlot to packed Major League cathedral.',
    rewardCash: 10_000,
    rewardHype: 20,
  },
];

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function evalJuneMiracle(club: Club): { completed: boolean; progressPct: number; statusDetail: string } {
  const wins = club.wins;
  const completed = wins >= 11;
  return {
    completed,
    progressPct: clampPct((wins / 11) * 100),
    statusDetail: `${wins} / 11 wins (${club.wins}-${club.losses})`,
  };
}

function evalSpeedBlitz(club: Club): { completed: boolean; progressPct: number; statusDetail: string } {
  const totalSb = club.roster.reduce((sum, p) => sum + p.seasonStats.stolenBases, 0);
  return {
    completed: totalSb >= 15,
    progressPct: clampPct((totalSb / 15) * 100),
    statusDetail: `${totalSb} / 15 team SB`,
  };
}

function evalShoestring(club: Club): { completed: boolean; progressPct: number; statusDetail: string } {
  const tierIndex = LEAGUE_TIER_ORDER.indexOf(club.leagueTier);
  const highAIndex = LEAGUE_TIER_ORDER.indexOf('high_a');
  const payroll = computeClubPayroll(club.roster);
  const tierMet = tierIndex >= highAIndex;
  const underBudget = payroll < 16_000;
  const completed = tierMet && underBudget;
  const tierPart = Math.min(50, Math.round((tierIndex / highAIndex) * 50));
  const budgetPart = underBudget ? 50 : Math.max(0, Math.round((16_000 / Math.max(1, payroll)) * 40));
  return {
    completed,
    progressPct: completed ? 100 : clampPct(tierPart + budgetPart),
    statusDetail: `${club.leagueTier.toUpperCase()} • Payroll $${payroll.toLocaleString()} / $16,000`,
  };
}

function evalCoEdHarmony(club: Club): { completed: boolean; progressPct: number; statusDetail: string } {
  const female = club.roster.filter((p) => p.traits.playerLook === 'female').length;
  const male = club.roster.filter((p) => p.traits.playerLook === 'male').length;
  const pennants = club.stadium.championshipPennants.length;
  const rosterBalanced = female >= 4 && male >= 4;
  const completed = rosterBalanced && pennants >= 1;
  const balanceScore = Math.min(50, Math.round(((Math.min(4, female) + Math.min(4, male)) / 8) * 50));
  const pennantScore = pennants >= 1 ? 50 : 0;
  return {
    completed,
    progressPct: completed ? 100 : clampPct(balanceScore + pennantScore),
    statusDetail: `${female}F / ${male}M active • ${pennants} Pennant(s)`,
  };
}

function evalHomeRunShowtime(
  club: Club,
  ctx: TimeCapsuleContext,
): { completed: boolean; progressPct: number; statusDetail: string } {
  const totalHr = club.roster.reduce((sum, p) => sum + p.seasonStats.homeRuns, 0);
  const completed = totalHr >= 30 || Boolean(ctx.wonHomeRunDerby);
  return {
    completed,
    progressPct: completed ? 100 : clampPct((totalHr / 30) * 100),
    statusDetail: ctx.wonHomeRunDerby ? 'All-Star HR Derby Winner!' : `${totalHr} / 30 team HR`,
  };
}

function evalMajorsCathedral(club: Club): { completed: boolean; progressPct: number; statusDetail: string } {
  const inMajors = club.leagueTier === 'majors';
  const bigStadium = club.stadium.capacity >= 28_000;
  const majorsPennant = club.stadium.championshipPennants.some((p) => p.leagueTier === 'majors');
  const completed = inMajors && bigStadium && majorsPennant;
  const score = (inMajors ? 35 : 0) + (bigStadium ? 35 : 0) + (majorsPennant ? 30 : 0);
  return {
    completed,
    progressPct: completed ? 100 : score,
    statusDetail: `${club.leagueTier.toUpperCase()} • ${club.stadium.capacity.toLocaleString()} seats`,
  };
}

function evaluateSingleChallenge(
  challenge: TimeCapsuleChallenge,
  club: Club,
  ctx: TimeCapsuleContext,
): TimeCapsuleEvaluationItem {
  const evaluators: Readonly<
    Record<TimeCapsuleChallengeId, () => { completed: boolean; progressPct: number; statusDetail: string }>
  > = {
    june_miracle_1994: () => evalJuneMiracle(club),
    small_ball_speed_blitz: () => evalSpeedBlitz(club),
    shoestring_dynasty: () => evalShoestring(club),
    coed_harmony_title: () => evalCoEdHarmony(club),
    home_run_showtime: () => evalHomeRunShowtime(club, ctx),
    sandlot_to_cathedral: () => evalMajorsCathedral(club),
  };
  const result = evaluators[challenge.id]();
  return {
    challenge,
    ...result,
  };
}

/** Transforms a club into the dramatic 1994 June Miracle 1–10 comeback rescue challenge. */
export function applyJuneMiracleScenario(club: Club): Club {
  return {
    ...club,
    wins: 1,
    losses: 10,
    streak: -4,
    economy: {
      ...club.economy,
      cash: club.economy.cash + 4_500,
      teamHype: Math.min(100, club.economy.teamHype + 10),
    },
  };
}

/** Evaluates live completion & progress across all 6 199X Time Capsule Challenge Scenarios. */
export function evaluateTimeCapsuleChallenges(
  club: Club,
  ctx: TimeCapsuleContext = {},
): TimeCapsuleSummary {
  const items = TIME_CAPSULE_CHALLENGES.map((challenge) =>
    evaluateSingleChallenge(challenge, club, ctx),
  );
  const completedCount = items.filter((i) => i.completed).length;
  return {
    items,
    completedCount,
    totalCount: items.length,
    completionPct: Math.round((completedCount / items.length) * 100),
  };
}

/** Claims the one-time Cash + Hype reward for a completed 199X Time Capsule Challenge. */
export function claimTimeCapsuleReward(
  club: Club,
  challengeId: TimeCapsuleChallengeId,
  claimedIds: readonly TimeCapsuleChallengeId[],
  ctx: TimeCapsuleContext = {},
): {
  claimed: boolean;
  reason?: string;
  club: Club;
  claimedIds: TimeCapsuleChallengeId[];
} {
  const challenge = TIME_CAPSULE_CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge) {
    return { claimed: false, reason: 'Unknown Time Capsule challenge.', club, claimedIds: [...claimedIds] };
  }
  if (claimedIds.includes(challengeId)) {
    return { claimed: false, reason: `${challenge.title} reward already claimed.`, club, claimedIds: [...claimedIds] };
  }
  const evalItem = evaluateSingleChallenge(challenge, club, ctx);
  if (!evalItem.completed) {
    return {
      claimed: false,
      reason: `Complete "${challenge.title}" first (${evalItem.statusDetail}).`,
      club,
      claimedIds: [...claimedIds],
    };
  }
  return {
    claimed: true,
    claimedIds: [...claimedIds, challengeId],
    club: {
      ...club,
      economy: {
        ...club.economy,
        cash: club.economy.cash + challenge.rewardCash,
        teamHype: Math.min(100, club.economy.teamHype + challenge.rewardHype),
      },
    },
  };
}
