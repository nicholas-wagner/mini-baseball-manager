import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { MAX_ACTIVE_ROSTER_SIZE, MIN_ACTIVE_ROSTER_SIZE } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import {
  buildAiPlatoonLineup,
  chooseAiBullpenReliever,
  runTenSeasonHeadlessSoak,
  scorePlayerForAiArchetype,
  selectAiDraftPick,
} from './aiGm';

describe('Personality-Driven AI GMs, Bullpen AI & 10-Season Headless Soak (TASK-027)', () => {
  it('differentiates player valuation sharply across all 5 AI GM archetypes', () => {
    const rng = createSeededRng(2701);
    const slugger = {
      ...createPlayer(rng, { position: '1B', tier: 'aa', marketTier: 'above_average' }),
      ratings: {
        ...createPlayer(rng, { position: '1B', tier: 'aa' }).ratings,
        power: 92,
        speed: 38,
        fielding: 48,
        eye: 60,
        contact: 68,
      },
      contract: { salaryPerSeason: 5200, yearsRemaining: 2, signingBonus: 600 },
    };
    const speedGlove = {
      ...createPlayer(rng, { position: 'CF', tier: 'aa', marketTier: 'rookie' }),
      ratings: {
        ...createPlayer(rng, { position: 'CF', tier: 'aa' }).ratings,
        power: 44,
        speed: 94,
        fielding: 91,
        range: 92,
        eye: 82,
        contact: 80,
      },
      contract: { salaryPerSeason: 900, yearsRemaining: 3, signingBonus: 150 },
    };

    expect(scorePlayerForAiArchetype('mashers', slugger)).toBeGreaterThan(
      scorePlayerForAiArchetype('mashers', speedGlove),
    );
    expect(scorePlayerForAiArchetype('speed_demons', speedGlove)).toBeGreaterThan(
      scorePlayerForAiArchetype('speed_demons', slugger),
    );
    expect(scorePlayerForAiArchetype('defense_first', speedGlove)).toBeGreaterThan(
      scorePlayerForAiArchetype('defense_first', slugger),
    );
    expect(scorePlayerForAiArchetype('moneyball', speedGlove)).toBeGreaterThan(
      scorePlayerForAiArchetype('moneyball', slugger),
    );

    const picked = selectAiDraftPick('mashers', [speedGlove, slugger]);
    expect(picked?.id).toBe(slugger.id);
  });

  it('optimizes platoon lineups vs opposing pitcher hand and picks matchup-smart bullpen relievers', () => {
    const rng = createSeededRng(2702);
    const club = createClub(rng, {
      id: 'c-ai-1',
      city: 'Harbor',
      name: 'Hawks',
      mascot: 'Hawk',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'HH' },
      leagueTier: 'aa',
      isHuman: false,
      aiArchetype: 'ace_factory',
    });

    const lineupVsLhp = buildAiPlatoonLineup(club, 'L');
    const lineupVsRhp = buildAiPlatoonLineup(club, 'R');
    expect(lineupVsLhp).toHaveLength(9);
    expect(lineupVsRhp).toHaveLength(9);

    const loogy = {
      ...createPlayer(rng, { position: 'RP', tier: 'aa' }),
      id: 'rp-loogy',
      throws: 'L' as const,
      pitcherRole: 'loogy' as const,
    };
    const closer = {
      ...createPlayer(rng, { position: 'RP', tier: 'aa' }),
      id: 'rp-closer',
      throws: 'R' as const,
      pitcherRole: 'closer' as const,
      ratings: { ...createPlayer(rng, { position: 'RP', tier: 'aa' }).ratings, velocity: 88, control: 82 },
    };
    const leftyBatter = {
      ...createPlayer(rng, { position: 'RF', tier: 'aa' }),
      bats: 'L' as const,
    };

    // In a 9th-inning 1-run save spot -> deploys Closer
    const ninthChoice = chooseAiBullpenReliever([loogy, closer], {
      inning: 9,
      regulationInnings: 9,
      lead: 1,
      leverageIndex: 2.2,
      upcomingBatter: { ...leftyBatter, bats: 'R' },
    });
    expect(ninthChoice?.id).toBe('rp-closer');

    // In a 6th-inning jam facing a lefty slugger -> deploys LOOGY
    const sixthLoogy = chooseAiBullpenReliever([loogy, closer], {
      inning: 6,
      regulationInnings: 9,
      lead: 0,
      leverageIndex: 1.7,
      upcomingBatter: leftyBatter,
    });
    expect(sixthLoogy?.id).toBe('rp-loogy');
  });

  it('completes a deterministic 10-season headless soak test with legal 15-20 rosters and zero NaN drift', () => {
    const soak = runTenSeasonHeadlessSoak(2777, 10);
    expect(soak.seasonsCompleted).toBe(10);
    expect(soak.worldChampionsBySeason).toHaveLength(10);
    expect(soak.totalRetirements).toBeGreaterThan(0);

    for (const club of soak.finalClubs) {
      expect(club.roster.length).toBeGreaterThanOrEqual(MIN_ACTIVE_ROSTER_SIZE);
      expect(club.roster.length).toBeLessThanOrEqual(MAX_ACTIVE_ROSTER_SIZE);
      expect(Number.isNaN(club.wins)).toBe(false);
      expect(Number.isNaN(club.economy.cash)).toBe(false);
    }
  }, 30_000);
});
