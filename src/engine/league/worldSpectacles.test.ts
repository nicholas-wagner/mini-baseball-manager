import { describe, expect, it } from 'vitest';
import {
  applySurpriseEventChoice,
  drawSurpriseEvent,
  SURPRISE_EVENTS_DECK,
} from '../events/surpriseDeck';
import { createClub } from '../gm/rosterFactory';
import { runWinterBallAssignment, WINTER_LEAGUE_DESTINATIONS } from '../gm/winterBall';
import type { Club } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import {
  awardChampionshipPennant,
  evaluateHallOfFameCandidate,
  retirePlayerJerseyNumber,
  voteSeasonAwards,
} from './awards';
import {
  draftGlobalCupSquads,
  isGlobalCupSeason,
  runGlobalChibiCup,
} from './globalCup';
import { runHomeRunDerby, selectAllStarRoster } from './homeRunDerby';

function buildTierClubs(seed: number, count = 8): Club[] {
  const rng = createSeededRng(seed);
  return Array.from({ length: count }, (_, idx) => {
    const club = createClub(rng, {
      id: `club-${seed}-${idx}`,
      isHuman: idx === 0,
      city: `City${idx}`,
      name: `Squad${idx}`,
      mascot: 'Mascot',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: `C${idx}` },
      leagueTier: 'aa',
    });
    club.wins = 14 - idx;
    club.losses = 7 + idx;
    club.roster[0].seasonStats.hits = 28 + (8 - idx) * 2;
    club.roster[0].seasonStats.homeRuns = 6 + (8 - idx);
    club.roster[0].seasonStats.rbis = 18 + (8 - idx) * 2;
    const sp = club.roster.find((p) => p.position === 'SP')!;
    sp.seasonStats.wins = 5;
    sp.seasonStats.pitchingStrikeouts = 38 + (8 - idx) * 3;
    sp.seasonStats.inningsPitchedOuts = 90;
    return club;
  });
}

describe('Milestone 8 World Spectacles (TASK-043..TASK-047)', () => {
  it('runs All-Star selection and 8-slugger bracketed Home Run Derby (TASK-043)', () => {
    const clubs = buildTierClubs(4300, 8);
    const allStars = selectAllStarRoster(clubs, 16);
    expect(allStars).toHaveLength(16);
    // Every club is guaranteed at least 1 All-Star representative
    const representedClubs = new Set(allStars.map((s) => s.clubId));
    expect(representedClubs.size).toBe(8);

    const derby = runHomeRunDerby(createSeededRng(4301), clubs, 'high_altitude_mesa');
    expect(derby.participants).toHaveLength(8);
    expect(derby.matchups).toHaveLength(7); // 4 QF + 2 SF + 1 Final
    expect(derby.championId).toBeTruthy();
    expect(derby.longestHomeRunFt).toBeGreaterThanOrEqual(390);
    expect(derby.cashPrize).toBe(3_500);
  });

  it('drafts national squads and crowns a Global Chibi Cup champion every 3 seasons (TASK-044)', () => {
    expect(isGlobalCupSeason(1)).toBe(false);
    expect(isGlobalCupSeason(2)).toBe(false);
    expect(isGlobalCupSeason(3)).toBe(true);
    expect(isGlobalCupSeason(6)).toBe(true);

    const clubs = buildTierClubs(4400, 12);
    const squads = draftGlobalCupSquads(clubs);
    expect(squads.length).toBeGreaterThanOrEqual(11);

    const cup = runGlobalChibiCup(createSeededRng(4401), clubs, 3);
    expect(cup.squads).toHaveLength(8);
    expect(cup.matches).toHaveLength(7);
    expect(cup.championNationId).toBeTruthy();
    expect(cup.championNationId).not.toBe(cup.runnerUpNationId);
    expect(cup.medals.some((m) => m.medal === 'gold')).toBe(true);
    expect(cup.medals.some((m) => m.medal === 'silver')).toBe(true);
  });

  it('sends up to 3 young players to Offseason Winter Ball for SP & cross-cultural traits (TASK-045)', () => {
    const clubs = buildTierClubs(4500, 1);
    const club = clubs[0];
    club.economy.cash = 10_000;
    const young = club.roster.slice(0, 2).map((p) => ({ ...p, age: 21 }));
    club.roster[0] = young[0];
    club.roster[1] = young[1];

    expect(WINTER_LEAGUE_DESTINATIONS).toHaveLength(4);
    const res = runWinterBallAssignment(
      createSeededRng(4501),
      club,
      [young[0].id, young[1].id],
      'japan',
    );
    expect(res.sent).toBe(true);
    expect(res.graduates).toHaveLength(2);
    expect(res.club.economy.cash).toBe(club.economy.cash - 1700);
    expect(res.club.roster[0].skillPoints).toBe(young[0].skillPoints + 2);
    expect(res.club.roster[0].mentalTraits).toContain('ice_veins');

    // Guard rails: unknown dest, too many, missing id, over-age, insufficient cash
    expect(runWinterBallAssignment(createSeededRng(1), club, [young[0].id], 'mars' as never).sent).toBe(false);
    expect(runWinterBallAssignment(createSeededRng(1), club, [], 'dominican').sent).toBe(false);
    expect(runWinterBallAssignment(createSeededRng(1), club, ['ghost-id'], 'dominican').sent).toBe(false);
    const vet = { ...club.roster[2], age: 31 };
    club.roster[2] = vet;
    expect(runWinterBallAssignment(createSeededRng(1), club, [vet.id], 'mexico').sent).toBe(false);
    expect(
      runWinterBallAssignment(
        createSeededRng(1),
        { ...club, economy: { ...club.economy, cash: 50 } },
        [young[0].id],
        'australia',
      ).sent,
    ).toBe(false);
  });

  it('ships 52 distinct 90s Narrative Surprise Events with branching choice outcomes (TASK-046)', () => {
    expect(SURPRISE_EVENTS_DECK.length).toBeGreaterThanOrEqual(50);
    const uniqueIds = new Set(SURPRISE_EVENTS_DECK.map((c) => c.id));
    expect(uniqueIds.size).toBe(SURPRISE_EVENTS_DECK.length);

    const club = buildTierClubs(4600, 1)[0];
    const card = drawSurpriseEvent(createSeededRng(4601), [], 'training');
    expect(card.category).toBe('training');

    const boldChoice = card.choices[0];
    const applied = applySurpriseEventChoice(createSeededRng(4602), club, card, boldChoice.id);
    expect(applied.applied).toBe(true);
    expect(applied.choice?.id).toBe(boldChoice.id);
    expect(applied.boostedPlayerName).toBeTruthy();

    // Invalid choice & wrap-around when all seen
    expect(applySurpriseEventChoice(createSeededRng(1), club, card, 'bad-choice').applied).toBe(false);
    const recycled = drawSurpriseEvent(
      createSeededRng(4603),
      SURPRISE_EVENTS_DECK.map((c) => c.id),
    );
    expect(recycled.id).toBeTruthy();
  });

  it('votes end-of-season awards, evaluates Hall of Fame, retires jersey numbers & hangs pennants (TASK-047)', () => {
    const clubs = buildTierClubs(4700, 8);
    const awards = voteSeasonAwards(clubs, 2, 'aa', 'Coach Alex');
    expect(awards.map((a) => a.award)).toEqual([
      'mvp',
      'golden_arm',
      'iron_glove',
      'rookie_of_the_year',
      'manager_of_the_year',
    ]);
    expect(awards.find((a) => a.award === 'manager_of_the_year')?.winnerName).toBe('Coach Alex');

    const legend = {
      ...clubs[0].roster[0],
      careerService: {
        seasonsPlayed: 10,
        careerGames: 200,
        careerPlateAppearances: 800,
        careerInningsPitched: 0,
        careerPlayoffGames: 18,
        experienceScore: 95,
        experienceTier: 'cagey_veteran' as const,
      },
    };
    const hof = evaluateHallOfFameCandidate(legend, 2, 2);
    expect(hof.eligible).toBe(true);
    expect(hof.tierLabel).toBe('First-Ballot Legend');

    const midVet = { ...clubs[0].roster[1], careerService: { ...legend.careerService, seasonsPlayed: 5, careerPlayoffGames: 5 } };
    expect(evaluateHallOfFameCandidate(midVet, 1, 0).eligible).toBe(true);

    const rookie = { ...clubs[0].roster[2], careerService: { ...legend.careerService, seasonsPlayed: 0, careerPlayoffGames: 0 } };
    expect(evaluateHallOfFameCandidate(rookie, 0, 0).eligible).toBe(false);

    const retired = retirePlayerJerseyNumber(clubs[0], legend);
    expect(retired.retired).toBe(true);
    expect(retired.club.stadium.retiredNumbers).toContainEqual({
      jerseyNumber: legend.jerseyNumber,
      playerName: legend.name,
    });
    expect(retirePlayerJerseyNumber(retired.club, legend).retired).toBe(false);

    const withPennant = awardChampionshipPennant(retired.club, 2);
    expect(withPennant.stadium.championshipPennants).toHaveLength(1);
    // Duplicate pennant for same season & tier is idempotent
    expect(awardChampionshipPennant(withPennant, 2).stadium.championshipPennants).toHaveLength(1);
  });
});
