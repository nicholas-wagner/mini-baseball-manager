import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { LEAGUE_TIER_ORDER, type Club, type LeagueTierId } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import { AI_CLUB_CATALOG } from './clubCatalog';
import {
  applyBossBountyLedgerEntry,
  evaluateBossShowdownBounty,
  getTierBossProfile,
  matchBossClubProfile,
  TIER_BOSS_PROFILES,
} from './bossClubs';
import { generateSixTierWorld } from './seasonEngine';

function makeClub(overrides: Partial<Club> & Pick<Club, 'leagueTier' | 'name' | 'isHuman'>): Club {
  const base = createClub(createSeededRng(4201), {
    id: overrides.id ?? 'club-test',
    isHuman: overrides.isHuman,
    city: overrides.city ?? 'Ironwood',
    name: overrides.name,
    mascot: 'Hawk',
    colors: { primary: '#5A4AE3', secondary: '#181B2C', accent: '#00E5FF', monogram: 'IK' },
    leagueTier: overrides.leagueTier,
  });
  return { ...base, ...overrides };
}

describe('Iconic Themed Rival Boss Clubs (TASK-120)', () => {
  it('maps exactly one Boss Profile to a real AI_CLUB_CATALOG club in every tier with escalating bounties', () => {
    const expectedBounties: Record<LeagueTierId, { fullName: string; bossTitle: string; bountyCash: number }> = {
      rookie: { fullName: 'Ironwood Knights', bossTitle: 'Sandlot Legends', bountyCash: 1_000 },
      low_a: { fullName: 'Sunbeam Crickets', bossTitle: 'Neon Ninjas', bountyCash: 1_600 },
      high_a: { fullName: 'Dustbowl Twisters', bossTitle: 'Dustbowl Outlaws', bountyCash: 2_400 },
      aa: { fullName: 'Rocketville Rockets', bossTitle: 'Iron Titans', bountyCash: 3_600 },
      aaa: { fullName: 'Metro Express', bossTitle: 'Midnight Express', bountyCash: 5_200 },
      majors: { fullName: 'Empire Monarchs', bossTitle: 'Empire Dynasty', bountyCash: 8_000 },
    };

    let prevBounty = 0;
    for (const tier of LEAGUE_TIER_ORDER) {
      const profile = getTierBossProfile(tier);
      const expected = expectedBounties[tier];
      expect(profile).toEqual(TIER_BOSS_PROFILES[tier]);
      expect(profile.tier).toBe(tier);
      expect(profile.bossTitle).toBe(expected.bossTitle);
      expect(profile.bountyCash).toBe(expected.bountyCash);
      expect(profile.bountyCash).toBeGreaterThan(prevBounty);
      prevBounty = profile.bountyCash;

      expect(profile.badgeEmoji.length).toBeGreaterThan(0);
      expect(profile.tagline.length).toBeGreaterThan(5);
      expect(profile.signatureStyle.length).toBeGreaterThan(5);
      expect(profile.accentHex).toMatch(/^#[0-9A-Fa-f]{6}$/);

      // Must correspond to an exact club in AI_CLUB_CATALOG[tier]
      const catalogClub = AI_CLUB_CATALOG[tier].find(
        (tpl) => `${tpl.city} ${tpl.name}` === expected.fullName,
      );
      expect(catalogClub).toBeDefined();
      expect(
        profile.clubNameMatch === catalogClub!.name ||
          profile.clubNameMatch === `${catalogClub!.city} ${catalogClub!.name}`,
      ).toBe(true);
    }
  });

  it('matches exactly one Boss Club per tier in a seeded six-tier world without mutating RNG', () => {
    const world = generateSixTierWorld(1994, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });

    for (const tier of LEAGUE_TIER_ORDER) {
      const matched = world.leagues[tier].filter((club) => matchBossClubProfile(club) !== null);
      expect(matched).toHaveLength(1);
      expect(matched[0].isHuman).toBe(false);
    }
  });

  it('returns null for human clubs, non-boss AI clubs, and wrong-tier matches, while matching both short and full club names', () => {
    expect(
      matchBossClubProfile({ leagueTier: 'rookie', name: 'Knights', isHuman: false }),
    )?.toMatchObject({ bossTitle: 'Sandlot Legends' });
    expect(
      matchBossClubProfile({ leagueTier: 'rookie', name: 'Ironwood Knights', isHuman: false }),
    )?.toMatchObject({ bossTitle: 'Sandlot Legends' });

    // Human clubs never match even if identically named
    expect(
      matchBossClubProfile({ leagueTier: 'rookie', name: 'Knights', isHuman: true }),
    ).toBeNull();
    expect(
      matchBossClubProfile({ leagueTier: 'majors', name: 'Empire Monarchs', isHuman: true }),
    ).toBeNull();

    // Non-boss AI club in same tier
    expect(
      matchBossClubProfile({ leagueTier: 'rookie', name: 'Lumberjacks', isHuman: false }),
    ).toBeNull();

    // Boss name in the wrong tier
    expect(
      matchBossClubProfile({ leagueTier: 'aa', name: 'Knights', isHuman: false }),
    ).toBeNull();

    // Different city with matching nickname does not falsely match
    expect(
      matchBossClubProfile({ leagueTier: 'rookie', city: 'Bayside', name: 'Knights', isHuman: false }),
    ).toBeNull();
  });

  it('evaluates Boss Showdown bounty on wins, losses, and regular opponents', () => {
    const bossOpp = { leagueTier: 'high_a' as const, city: 'Dustbowl', name: 'Twisters', isHuman: false };
    const winRes = evaluateBossShowdownBounty(bossOpp, true);
    expect(winRes.isBossShowdown).toBe(true);
    expect(winRes.boss?.bossTitle).toBe('Dustbowl Outlaws');
    expect(winRes.bountyAwarded).toBe(2_400);
    expect(winRes.headline).toMatch(/Dustbowl Outlaws/i);
    expect(winRes.headline).toMatch(/\$2,400/);

    const lossRes = evaluateBossShowdownBounty(bossOpp, false);
    expect(lossRes.isBossShowdown).toBe(true);
    expect(lossRes.boss?.bossTitle).toBe('Dustbowl Outlaws');
    expect(lossRes.bountyAwarded).toBe(0);
    expect(lossRes.headline).toMatch(/Dustbowl Outlaws/i);

    const normalOpp = { leagueTier: 'high_a' as const, city: 'Tidewater', name: 'Crabs', isHuman: false };
    expect(evaluateBossShowdownBounty(normalOpp, true)).toEqual({
      isBossShowdown: false,
      boss: null,
      bountyAwarded: 0,
      headline: null,
    });
  });

  it('awards bounty cash and appends a ClubLedgerEntry when the human defeats their tier Boss', () => {
    const human = makeClub({
      id: 'human-1',
      city: 'Sandlot',
      name: 'Comets',
      leagueTier: 'rookie',
      isHuman: true,
    });
    const startCash = human.economy.cash;
    const bossOpp = makeClub({
      id: 'boss-1',
      city: 'Ironwood',
      name: 'Knights',
      leagueTier: 'rookie',
      isHuman: false,
    });

    const settled = applyBossBountyLedgerEntry(human, bossOpp, true, {
      season: 1,
      gameIndex: 4,
    });
    expect(settled.bounty.bountyAwarded).toBe(1_000);
    expect(settled.club.economy.cash).toBe(startCash + 1_000);
    expect(settled.ledgerEntry).not.toBeNull();
    expect(settled.ledgerEntry?.gameLabel).toBe('Boss Showdown Bounty: Defeated Sandlot Legends');
    expect(settled.ledgerEntry?.revenueTotal).toBe(1_000);
    expect(settled.ledgerEntry?.netDelta).toBe(1_000);
    expect(settled.ledgerEntry?.endingCash).toBe(startCash + 1_000);
    expect(settled.club.economy.recentLedgerEntries?.[0]).toEqual(settled.ledgerEntry);

    // Loss against boss awards no cash and adds no ledger entry
    const lossSettled = applyBossBountyLedgerEntry(human, bossOpp, false, {
      season: 1,
      gameIndex: 5,
    });
    expect(lossSettled.bounty.isBossShowdown).toBe(true);
    expect(lossSettled.bounty.bountyAwarded).toBe(0);
    expect(lossSettled.ledgerEntry).toBeNull();
    expect(lossSettled.club.economy.cash).toBe(startCash);
  });
});
