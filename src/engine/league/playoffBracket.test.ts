import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import type { RetiredLegendCoachCandidate } from '../rpg/lifecycle';
import {
  buildCoachStaffFromRetiredLegend,
  createPlayoffBracketFromClubs,
  getNextHumanPlayoffMatchup,
  hireRetiredLegendCoachForClub,
  recordPlayoffGameResult,
  simNextPlayoffBracketGame,
} from './playoffBracket';

const TEST_COLORS = {
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#FFC300',
  monogram: 'SC',
};

function makeFourClubs() {
  const rng = createSeededRng(441);
  const clubs = [
    createClub(rng, { id: 'c1', city: 'Sandlot', name: 'Comets', mascot: 'Comet', colors: TEST_COLORS, leagueTier: 'rookie', isHuman: true }),
    createClub(rng, { id: 'c2', city: 'Bayside', name: 'Pelicans', mascot: 'Pelican', colors: TEST_COLORS, leagueTier: 'rookie', isHuman: false }),
    createClub(rng, { id: 'c3', city: 'Pinewood', name: 'Raccoons', mascot: 'Raccoon', colors: TEST_COLORS, leagueTier: 'rookie', isHuman: false }),
    createClub(rng, { id: 'c4', city: 'Harbor', name: 'Otters', mascot: 'Otter', colors: TEST_COLORS, leagueTier: 'rookie', isHuman: false }),
  ];
  clubs[0].wins = 16;
  clubs[0].losses = 5;
  clubs[1].wins = 14;
  clubs[1].losses = 7;
  clubs[2].wins = 12;
  clubs[2].losses = 9;
  clubs[3].wins = 11;
  clubs[3].losses = 10;
  return clubs;
}

describe('Playable Best-of-3 Postseason Bracket & Retired-Legend Coach Hiring', () => {
  it('builds a 4-team Best-of-3 bracket (#1 vs #4, #2 vs #3) and advances to Championship Series', () => {
    const clubs = makeFourClubs();
    let bracket = createPlayoffBracketFromClubs(clubs, 'rookie', 1);

    expect(bracket.semifinalA.highSeedClubId).toBe('c1');
    expect(bracket.semifinalA.lowSeedClubId).toBe('c4');
    expect(bracket.semifinalB.highSeedClubId).toBe('c2');
    expect(bracket.semifinalB.lowSeedClubId).toBe('c3');
    expect(bracket.championship).toBeNull();

    const humanNext = getNextHumanPlayoffMatchup(bracket, 'c1');
    expect(humanNext?.seriesId).toBe('semifinal_a');
    expect(humanNext?.opponentClubId).toBe('c4');
    expect(humanNext?.pressureLevel).toBe('playoff_game');

    bracket = recordPlayoffGameResult(bracket, 'semifinal_a', 'c1', 2, 5);
    bracket = recordPlayoffGameResult(bracket, 'semifinal_a', 'c1', 1, 4);
    expect(bracket.semifinalA.winnerClubId).toBe('c1');

    bracket = recordPlayoffGameResult(bracket, 'semifinal_b', 'c2', 3, 6);
    bracket = recordPlayoffGameResult(bracket, 'semifinal_b', 'c2', 2, 3);
    expect(bracket.semifinalB.winnerClubId).toBe('c2');
    expect(bracket.championship).not.toBeNull();
    expect(bracket.championship?.highSeedClubId).toBe('c1');
    expect(bracket.championship?.lowSeedClubId).toBe('c2');

    const finalsMatch = getNextHumanPlayoffMatchup(bracket, 'c1');
    expect(finalsMatch?.seriesId).toBe('championship');
    expect(finalsMatch?.pressureLevel).toBe('elimination_championship');

    bracket = recordPlayoffGameResult(bracket, 'championship', 'c1', 4, 5);
    bracket = recordPlayoffGameResult(bracket, 'championship', 'c1', 2, 7);
    expect(bracket.championClubId).toBe('c1');
    expect(getNextHumanPlayoffMatchup(bracket, 'c1')).toBeNull();
  });

  it('deterministically sims playoff games to a champion with a single seed', () => {
    const clubs = makeFourClubs();
    const clubsById = Object.fromEntries(clubs.map((c) => [c.id, c]));
    let b1 = createPlayoffBracketFromClubs(clubs, 'rookie', 1);
    let b2 = createPlayoffBracketFromClubs(clubs, 'rookie', 1);

    for (let i = 0; i < 12 && !b1.championClubId; i += 1) {
      b1 = simNextPlayoffBracketGame(b1, clubsById, 8800 + i).bracket;
      b2 = simNextPlayoffBracketGame(b2, clubsById, 8800 + i).bracket;
    }

    expect(b1.championClubId).not.toBeNull();
    expect(b1.championClubId).toBe(b2.championClubId);
  });

  it('converts a retiring club legend into a StaffMember and hires them onto the club staff', () => {
    const clubs = makeFourClubs();
    const club = clubs[0];
    club.economy.cash = 20_000;
    const legend: RetiredLegendCoachCandidate = {
      formerPlayerId: 'legend-99',
      name: 'Rico Comet',
      portraitSeed: 1994,
      clubLegendOf: club.name,
      recommendedRole: 'hitting_coach',
      startingTier: 3,
      specialtyId: 'launch_angle_guru',
      seasonsPlayed: 8,
      careerOvrPeak: 88,
    };

    const staff = buildCoachStaffFromRetiredLegend(legend);
    expect(staff.formerPlayerId).toBe('legend-99');
    expect(staff.name).toContain('Rico Comet');

    const hired = hireRetiredLegendCoachForClub(club, legend);
    expect(hired.hired).toBe(true);
    expect(hired.club.coaches.activeStaff.some((s) => s.formerPlayerId === 'legend-99')).toBe(true);
  });
});
