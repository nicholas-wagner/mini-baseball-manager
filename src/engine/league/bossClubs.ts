import { LEDGER_HISTORY_CAP } from '../economy/clubLedgerSettlement';
import type { Club, ClubLedgerEntry, LeagueTierId } from '../models/club';

export interface TierBossProfile {
  tier: LeagueTierId;
  clubNameMatch: string;
  bossTitle: string;
  badgeEmoji: string;
  tagline: string;
  signatureStyle: string;
  bountyCash: number;
  accentHex: string;
}

export interface BossShowdownBountyResult {
  isBossShowdown: boolean;
  boss: TierBossProfile | null;
  bountyAwarded: number;
  headline: string | null;
}

type BossClubCandidate = Pick<Club, 'leagueTier' | 'name' | 'isHuman'> & { city?: string };

const BOSS_CITY_BY_TIER: Readonly<Record<LeagueTierId, string>> = {
  rookie: 'Ironwood',
  low_a: 'Sunbeam',
  high_a: 'Dustbowl',
  aa: 'Rocketville',
  aaa: 'Metro',
  majors: 'Empire',
};

export const TIER_BOSS_PROFILES: Readonly<Record<LeagueTierId, TierBossProfile>> = {
  rookie: {
    tier: 'rookie',
    clubNameMatch: 'Knights',
    bossTitle: 'Sandlot Legends',
    badgeEmoji: '👑',
    tagline: 'Neighborhood kings of the diamond — beat them to earn sandlot respect!',
    signatureStyle: 'Lockdown Gloves & Clutch Sparks',
    bountyCash: 1_000,
    accentHex: '#5A4AE3',
  },
  low_a: {
    tier: 'low_a',
    clubNameMatch: 'Crickets',
    bossTitle: 'Neon Ninjas',
    badgeEmoji: '⚡',
    tagline: 'Flashy backyard speedsters turning every single into a double.',
    signatureStyle: 'Blistering Speed & Trick Bunts',
    bountyCash: 1_600,
    accentHex: '#FF9F1C',
  },
  high_a: {
    tier: 'high_a',
    clubNameMatch: 'Twisters',
    bossTitle: 'Dustbowl Outlaws',
    badgeEmoji: '🌪️',
    tagline: 'Dirt-cloud bandits who turn every inning into highway robbery.',
    signatureStyle: 'Chaos Baserunning & Dusty Sliders',
    bountyCash: 2_400,
    accentHex: '#FB8500',
  },
  aa: {
    tier: 'aa',
    clubNameMatch: 'Rockets',
    bossTitle: 'Iron Titans',
    badgeEmoji: '🚀',
    tagline: 'Heavy-metal mashers launching moonshots into the upper deck.',
    signatureStyle: 'Tape-Measure Power & High Cheese',
    bountyCash: 3_600,
    accentHex: '#E63946',
  },
  aaa: {
    tier: 'aaa',
    clubNameMatch: 'Express',
    bossTitle: 'Midnight Express',
    badgeEmoji: '🚄',
    tagline: 'Triple-digit radar guns and blur-speed track stars on the bases.',
    signatureStyle: '100-MPH Heaters & Speed Demons',
    bountyCash: 5_200,
    accentHex: '#EF233C',
  },
  majors: {
    tier: 'majors',
    clubNameMatch: 'Monarchs',
    bossTitle: 'Empire Dynasty',
    badgeEmoji: '👑',
    tagline: 'The undisputed Mini Major League throne-holders.',
    signatureStyle: 'Championship Juggernaut',
    bountyCash: 8_000,
    accentHex: '#F59E0B',
  },
};

/** Returns the flagship Rival Boss profile for a given league tier. */
export function getTierBossProfile(tier: LeagueTierId): TierBossProfile {
  return TIER_BOSS_PROFILES[tier];
}

function normalizeClubToken(value: string): string {
  return value.trim().toLowerCase();
}

/** Matches an AI club against its tier's flagship Boss Club profile. */
export function matchBossClubProfile(club: BossClubCandidate): TierBossProfile | null {
  if (club.isHuman) return null;
  const profile = TIER_BOSS_PROFILES[club.leagueTier];
  const expectedCity = normalizeClubToken(BOSS_CITY_BY_TIER[club.leagueTier]);
  const expectedName = normalizeClubToken(profile.clubNameMatch);
  const expectedFull = `${expectedCity} ${expectedName}`;

  const rawName = normalizeClubToken(club.name);
  if (rawName === expectedFull) return profile;
  if (rawName !== expectedName) return null;
  if (club.city && normalizeClubToken(club.city) !== expectedCity) return null;
  return profile;
}

/** Evaluates Boss Showdown bounty cash & headline for a completed matchup. */
export function evaluateBossShowdownBounty(
  opponent: BossClubCandidate,
  humanWon: boolean,
): BossShowdownBountyResult {
  const boss = matchBossClubProfile(opponent);
  if (!boss) {
    return { isBossShowdown: false, boss: null, bountyAwarded: 0, headline: null };
  }
  if (!humanWon) {
    return {
      isBossShowdown: true,
      boss,
      bountyAwarded: 0,
      headline: `Boss Showdown: ${boss.bossTitle} defended the crown`,
    };
  }
  return {
    isBossShowdown: true,
    boss,
    bountyAwarded: boss.bountyCash,
    headline: `Boss Showdown Bounty: Defeated ${boss.bossTitle} (+$${boss.bountyCash.toLocaleString()})`,
  };
}

/** Applies a won Boss Showdown cash bounty and appends a ClubLedgerEntry immutably. */
export function applyBossBountyLedgerEntry(
  club: Club,
  opponent: BossClubCandidate,
  humanWon: boolean,
  context: { season: number; gameIndex: number; ledgerCap?: number },
): { club: Club; bounty: BossShowdownBountyResult; ledgerEntry: ClubLedgerEntry | null } {
  const bounty = evaluateBossShowdownBounty(opponent, humanWon);
  if (!bounty.boss || bounty.bountyAwarded <= 0) {
    return { club, bounty, ledgerEntry: null };
  }

  const label = `Boss Showdown Bounty: Defeated ${bounty.boss.bossTitle}`;
  const endingCash = club.economy.cash + bounty.bountyAwarded;
  const ledgerEntry: ClubLedgerEntry = {
    id: `ldg-${context.season}-boss-${bounty.boss.tier}-${context.gameIndex}`,
    season: context.season,
    gameLabel: label,
    revenueTotal: bounty.bountyAwarded,
    expenseTotal: 0,
    netDelta: bounty.bountyAwarded,
    lines: [{ label, amount: bounty.bountyAwarded, kind: 'income' }],
    luxuryTaxPaid: 0,
    promoConsumedId: null,
    bailoutTriggered: false,
    bailoutAmount: 0,
    endingCash,
  };
  const cap = context.ledgerCap ?? LEDGER_HISTORY_CAP;
  const nextLedger = [ledgerEntry, ...(club.economy.recentLedgerEntries ?? [])].slice(0, cap);

  return {
    club: {
      ...club,
      economy: {
        ...club.economy,
        cash: endingCash,
        recentLedgerEntries: nextLedger,
      },
    },
    bounty,
    ledgerEntry,
  };
}
