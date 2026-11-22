import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  applyJuneMiracleScenario,
  claimTimeCapsuleReward,
  evaluateTimeCapsuleChallenges,
  TIME_CAPSULE_CHALLENGES,
} from './timeCapsuleChallenges';

function makeClub(seed: number, tier: 'rookie' | 'high_a' | 'majors' = 'rookie') {
  return createClub(createSeededRng(seed), {
    id: `club-${seed}`,
    isHuman: true,
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: tier,
  });
}

describe('199X Time Capsule Challenge Scenarios', () => {
  it('defines 6 distinct retro challenge scenarios with rewards and evaluates initial progress cleanly', () => {
    expect(TIME_CAPSULE_CHALLENGES).toHaveLength(6);
    const ids = new Set(TIME_CAPSULE_CHALLENGES.map((c) => c.id));
    expect(ids.size).toBe(6);

    const club = makeClub(1994, 'rookie');
    const summary = evaluateTimeCapsuleChallenges(club);
    expect(summary.items).toHaveLength(6);
    expect(summary.completedCount).toBe(0);
    expect(summary.completionPct).toBe(0);
    expect(summary.items.every((item) => item.progressPct >= 0 && item.progressPct <= 100)).toBe(true);
  });

  it('launches the 1994 June Miracle 1-10 rescue scenario and detects completion once club reaches 11+ wins', () => {
    const baseClub = makeClub(1995, 'rookie');
    const scenarioClub = applyJuneMiracleScenario(baseClub);

    expect(scenarioClub.wins).toBe(1);
    expect(scenarioClub.losses).toBe(10);
    expect(scenarioClub.streak).toBe(-4);
    expect(scenarioClub.economy.cash).toBe(baseClub.economy.cash + 4_500);

    const inProgress = evaluateTimeCapsuleChallenges(scenarioClub, {
      activeScenarioIds: ['june_miracle_1994'],
    });
    const juneItem = inProgress.items.find((i) => i.challenge.id === 'june_miracle_1994')!;
    expect(juneItem.completed).toBe(false);
    expect(juneItem.progressPct).toBeGreaterThan(0);

    const rescued = { ...scenarioClub, wins: 11, losses: 10 };
    const afterRescue = evaluateTimeCapsuleChallenges(rescued, {
      activeScenarioIds: ['june_miracle_1994'],
    });
    const juneDone = afterRescue.items.find((i) => i.challenge.id === 'june_miracle_1994')!;
    expect(juneDone.completed).toBe(true);
    expect(juneDone.progressPct).toBe(100);
  });

  it('evaluates Speed Blitz, Shoestring Dynasty, Co-Ed Harmony, Home-Run Showtime, and Majors Cathedral challenges', () => {
    const club = makeClub(1998, 'majors');
    // Boost roster stats to satisfy speed blitz, co-ed harmony, home-run showtime, shoestring & majors cathedral
    const boostedRoster = club.roster.map((player, idx) => ({
      ...player,
      traits: {
        ...player.traits,
        playerLook: (idx % 2 === 0 ? 'female' : 'male') as 'female' | 'male',
      },
      contract: { ...player.contract, salaryPerSeason: 700 },
      seasonStats: {
        ...player.seasonStats,
        stolenBases: idx < 5 ? 4 : 0,
        homeRuns: idx < 6 ? 6 : 0,
      },
    }));

    const championshipClub = {
      ...club,
      wins: 15,
      losses: 6,
      roster: boostedRoster,
      stadium: {
        ...club.stadium,
        capacity: 30_000,
        championshipPennants: [{ season: 1, leagueTier: 'majors' as const }],
      },
    };

    const summary = evaluateTimeCapsuleChallenges(championshipClub, {
      wonHomeRunDerby: true,
    });

    const byId = new Map(summary.items.map((i) => [i.challenge.id, i]));
    expect(byId.get('small_ball_speed_blitz')?.completed).toBe(true);
    expect(byId.get('shoestring_dynasty')?.completed).toBe(true);
    expect(byId.get('coed_harmony_title')?.completed).toBe(true);
    expect(byId.get('home_run_showtime')?.completed).toBe(true);
    expect(byId.get('sandlot_to_cathedral')?.completed).toBe(true);
    expect(summary.completedCount).toBe(6);
    expect(summary.completionPct).toBe(100);
  });

  it('pays out cash and hype rewards once per completed challenge and rejects duplicate or incomplete claims', () => {
    const club = makeClub(1999, 'rookie');
    const incompleteClaim = claimTimeCapsuleReward(club, 'small_ball_speed_blitz', []);
    expect(incompleteClaim.claimed).toBe(false);

    const speedyClub = {
      ...club,
      roster: club.roster.map((p, i) => ({
        ...p,
        seasonStats: { ...p.seasonStats, stolenBases: i === 0 ? 16 : 0 },
      })),
    };
    const firstClaim = claimTimeCapsuleReward(speedyClub, 'small_ball_speed_blitz', []);
    expect(firstClaim.claimed).toBe(true);
    expect(firstClaim.club.economy.cash).toBeGreaterThan(speedyClub.economy.cash);
    expect(firstClaim.claimedIds).toContain('small_ball_speed_blitz');

    const duplicateClaim = claimTimeCapsuleReward(
      firstClaim.club,
      'small_ball_speed_blitz',
      firstClaim.claimedIds,
    );
    expect(duplicateClaim.claimed).toBe(false);

    const unknownClaim = claimTimeCapsuleReward(speedyClub, 'nonexistent_id' as never, []);
    expect(unknownClaim.claimed).toBe(false);
  });
});
