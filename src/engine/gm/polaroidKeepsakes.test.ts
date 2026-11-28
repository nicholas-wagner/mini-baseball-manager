import { describe, expect, it } from 'vitest';
import { createClub } from './rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  appendPolaroidKeepsake,
  CLUB_SNACK_CATALOG,
  DEFAULT_CLUB_RITUALS,
  getClubSnackMeta,
  getHrCelebrationMeta,
  HR_CELEBRATION_CATALOG,
  maybeCreateVictoryPolaroid,
  sanitizeClubRituals,
  type PolaroidKeepsake,
} from './polaroidKeepsakes';

function makeClub(seed = 122) {
  return createClub(createSeededRng(seed), {
    id: 'club-122',
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'rookie',
    isHuman: true,
  });
}

describe('TASK-122 — Club Rituals & Polaroid Victory Keepsakes', () => {
  it('provides rich HR Celebration and Lucky Snack catalogs plus safe sanitization', () => {
    expect(HR_CELEBRATION_CATALOG).toHaveLength(4);
    expect(CLUB_SNACK_CATALOG).toHaveLength(5);
    expect(DEFAULT_CLUB_RITUALS).toEqual({
      hrCelebration: 'helmet_high_five',
      luckySnack: 'strawberry_milkshakes',
    });

    expect(getHrCelebrationMeta('dugout_dance_line').label).toMatch(/dance/i);
    expect(getClubSnackMeta('rally_nachos').label).toMatch(/nachos/i);

    const sanitized = sanitizeClubRituals({
      hrCelebration: 'invalid_id' as never,
      luckySnack: 'soft_pretzels',
    });
    expect(sanitized).toEqual({
      hrCelebration: DEFAULT_CLUB_RITUALS.hrCelebration,
      luckySnack: 'soft_pretzels',
    });
  });

  it('snaps victory Polaroids for walk-offs, boss wins, shutouts, opening wins, playoff clinches & championships, weaving lucky snack & mascot', () => {
    const club = {
      ...makeClub(122),
      clubRituals: {
        hrCelebration: 'mascot_confetti' as const,
        luckySnack: 'strawberry_milkshakes' as const,
      },
    };
    const [p1, p2, p3] = club.roster;

    // Loss returns null
    expect(
      maybeCreateVictoryPolaroid({
        club,
        opponentName: 'Harbor Otters',
        humanScore: 2,
        opponentScore: 5,
        isWalkOff: false,
        isBossVictory: false,
        isOpeningWin: true,
        mvpId: p1.id,
        starPlayerIds: [p2.id],
        season: 1,
        gameNumber: 1,
      }),
    ).toBeNull();

    // Ordinary mid-season win returns null
    expect(
      maybeCreateVictoryPolaroid({
        club,
        opponentName: 'Harbor Otters',
        humanScore: 6,
        opponentScore: 3,
        isWalkOff: false,
        isBossVictory: false,
        isOpeningWin: false,
        mvpId: p1.id,
        starPlayerIds: [p2.id],
        season: 1,
        gameNumber: 7,
      }),
    ).toBeNull();

    // Walk-off win weaves lucky snack & mascot and captures up to 3 deduplicated players
    const walkOff = maybeCreateVictoryPolaroid({
      club,
      opponentName: 'Harbor Otters',
      humanScore: 4,
      opponentScore: 3,
      isWalkOff: true,
      isBossVictory: false,
      mvpId: p1.id,
      starPlayerIds: [p1.id, p2.id, p3.id, club.roster[4].id],
      season: 1,
      gameNumber: 5,
    });
    expect(walkOff).not.toBeNull();
    expect(walkOff!.occasion).toBe('walk_off');
    expect(walkOff!.badgeLabel).toMatch(/walk-off/i);
    expect(walkOff!.caption.toLowerCase()).toContain('strawberry milkshakes');
    expect(walkOff!.caption).toContain('Rocket Dog');
    expect(walkOff!.scoreLine).toContain('4-3');
    expect(walkOff!.playerIds).toEqual([p1.id, p2.id, p3.id]);
    expect(walkOff!.playerNames).toEqual([p1.name, p2.name, p3.name]);

    // Boss showdown win
    const bossWin = maybeCreateVictoryPolaroid({
      club: { ...club, clubRituals: { hrCelebration: 'curtain_call', luckySnack: 'rally_nachos' } },
      opponentName: 'Iron Wolves',
      humanScore: 5,
      opponentScore: 2,
      isWalkOff: false,
      isBossVictory: true,
      mvpId: p2.id,
      starPlayerIds: [],
      season: 1,
      gameNumber: 9,
    });
    expect(bossWin!.occasion).toBe('boss_victory');
    expect(bossWin!.badgeLabel).toMatch(/boss/i);
    expect(bossWin!.caption.toLowerCase()).toContain('rally nachos');
    expect(bossWin!.playerIds).toHaveLength(3);

    // Shutout gem
    const shutout = maybeCreateVictoryPolaroid({
      club,
      opponentName: 'Pine Hawks',
      humanScore: 3,
      opponentScore: 0,
      isWalkOff: false,
      isBossVictory: false,
      mvpId: p3.id,
      starPlayerIds: [p1.id],
      season: 1,
      gameNumber: 6,
    });
    expect(shutout!.occasion).toBe('shutout_gem');
    expect(shutout!.badgeLabel).toMatch(/shutout/i);

    // Opening win
    const opening = maybeCreateVictoryPolaroid({
      club,
      opponentName: 'Pine Hawks',
      humanScore: 5,
      opponentScore: 4,
      isWalkOff: false,
      isBossVictory: false,
      isOpeningWin: true,
      mvpId: p1.id,
      starPlayerIds: [],
      season: 1,
      gameNumber: 1,
    });
    expect(opening!.occasion).toBe('opening_win');

    // Championship outranks playoff clinch and walk-off
    const champ = maybeCreateVictoryPolaroid({
      club,
      opponentName: 'Metro Kings',
      humanScore: 7,
      opponentScore: 6,
      isWalkOff: true,
      isBossVictory: true,
      isPlayoffClinch: true,
      isChampionship: true,
      mvpId: p1.id,
      starPlayerIds: [p2.id],
      season: 2,
      gameNumber: 24,
    });
    expect(champ!.occasion).toBe('championship');

    const clinch = maybeCreateVictoryPolaroid({
      club,
      opponentName: 'Metro Kings',
      humanScore: 5,
      opponentScore: 2,
      isWalkOff: false,
      isBossVictory: false,
      isPlayoffClinch: true,
      mvpId: p1.id,
      starPlayerIds: [p2.id],
      season: 2,
      gameNumber: 20,
    });
    expect(clinch!.occasion).toBe('playoff_clinch');
  });

  it('deduplicates Polaroids by id and caps history at 24 keepsakes', () => {
    const makeShot = (idx: number): PolaroidKeepsake => ({
      id: `shot-${idx}`,
      season: 1,
      occasion: 'walk_off',
      badgeLabel: 'WALK-OFF WIN!',
      headline: `Game ${idx}`,
      caption: 'Celebration!',
      scoreLine: '4-3 vs Rivals',
      stadiumName: 'Sandlot Park',
      playerIds: ['p1'],
      playerNames: ['Ace'],
      createdAtGameNumber: idx,
    });

    let list: PolaroidKeepsake[] = [];
    for (let i = 1; i <= 30; i += 1) {
      list = appendPolaroidKeepsake(list, makeShot(i));
    }
    expect(list).toHaveLength(24);
    expect(list[0].id).toBe('shot-30');

    // Deduplicates existing id without growing length
    const deduped = appendPolaroidKeepsake(list, { ...makeShot(30), caption: 'Updated!' });
    expect(deduped).toHaveLength(24);
    expect(deduped.filter((p) => p.id === 'shot-30')).toHaveLength(1);
    expect(deduped[0].caption).toBe('Updated!');
  });
});
