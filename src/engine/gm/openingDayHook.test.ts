import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import {
  applyOpeningDaySparkSp,
  buildFirstPitchCoachTip,
  buildMvpDugoutQuote,
  evaluateTrophyCaseProgress,
  evaluateWelcomeChecklist,
  selectClubSpotlightTrio,
} from './openingDayHook';

function makeClub(seed = 1994) {
  return generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  }).leagues.rookie[0];
}

describe('Opening Day First-Time Hook Engine (Spotlight Trio & First-Pitch Coach Tip)', () => {
  it('picks 3 distinct memorable stars (Captain hitter, Staff Ace pitcher, Speedster) with kid-friendly taglines', () => {
    const club = makeClub(1994);
    const trio = selectClubSpotlightTrio(club);

    expect(trio).toHaveLength(3);
    const ids = new Set(trio.map((t) => t.player.id));
    expect(ids.size).toBe(3);

    expect(trio[0].roleBadge).toMatch(/captain/i);
    expect(trio[1].roleBadge).toMatch(/ace/i);
    expect(trio[2].roleBadge).toMatch(/speed/i);
    for (const star of trio) {
      expect(star.tagline.length).toBeGreaterThan(6);
    }
  });

  it('handles tiny or pitcher-only fallback rosters safely without crashing', () => {
    const club = makeClub(2026);
    const tiny = {
      ...club,
      rotationIds: [],
      roster: club.roster.slice(0, 2),
    };
    const trio = selectClubSpotlightTrio(tiny);
    expect(trio.length).toBeGreaterThanOrEqual(1);
    expect(trio.length).toBeLessThanOrEqual(2);

    const pitchersOnly = {
      ...club,
      rotationIds: [],
      roster: club.roster.filter((p) => p.position === 'SP' || p.position === 'RP').slice(0, 3),
    };
    const pitcherTrio = selectClubSpotlightTrio(pitchersOnly);
    expect(pitcherTrio.length).toBeGreaterThanOrEqual(1);

    const empty = { ...club, rotationIds: [], roster: [] };
    expect(selectClubSpotlightTrio(empty)).toEqual([]);
  });

  it('returns a friendly first-pitch Coach Pops tip before Pitch #1 of Opening Day and hides it afterward', () => {
    const pitchingTip = buildFirstPitchCoachTip({
      isOpeningDay: true,
      isBatting: false,
      hasThrownPitch: false,
    });
    expect(pitchingTip).toMatch(/heat|trick|corner|smart watch/i);

    const battingTip = buildFirstPitchCoachTip({
      isOpeningDay: true,
      isBatting: true,
      hasThrownPitch: false,
    });
    expect(battingTip).toMatch(/contact|swing|power|smart watch/i);

    expect(
      buildFirstPitchCoachTip({
        isOpeningDay: true,
        isBatting: true,
        hasThrownPitch: true,
      }),
    ).toBeNull();

    expect(
      buildFirstPitchCoachTip({
        isOpeningDay: false,
        isBatting: false,
        hasThrownPitch: false,
      }),
    ).toBeNull();
  });

  it('grants Day-1 Opening Spark SP to Captain and Ace and evaluates the 3-step Welcome Checklist', () => {
    const club = makeClub(1994);
    const sparked = applyOpeningDaySparkSp(club);
    const totalSp = sparked.roster.reduce((sum, p) => sum + p.skillPoints, 0);
    expect(totalSp).toBeGreaterThanOrEqual(2);

    const startCheck = evaluateWelcomeChecklist({
      packsOpenedCount: 0,
      gamesPlayed: 0,
      skillsUnlockedCount: 0,
      rewardClaimed: false,
    });
    expect(startCheck.showStrip).toBe(true);
    expect(startCheck.completedCount).toBe(0);
    expect(startCheck.canClaimReward).toBe(false);

    const readyCheck = evaluateWelcomeChecklist({
      packsOpenedCount: 1,
      gamesPlayed: 1,
      skillsUnlockedCount: 1,
      rewardClaimed: false,
    });
    expect(readyCheck.allDone).toBe(true);
    expect(readyCheck.canClaimReward).toBe(true);

    const doneCheck = evaluateWelcomeChecklist({
      packsOpenedCount: 2,
      gamesPlayed: 5,
      skillsUnlockedCount: 3,
      rewardClaimed: true,
    });
    expect(doneCheck.showStrip).toBe(false);
  });

  it('builds cute personality-driven MVP dugout quotes and tracks Trophy & Sticker Album milestones', () => {
    const hrWin = buildMvpDugoutQuote({
      playerName: 'Maya Tanaka',
      nickname: 'Starlight',
      won: true,
      isPitcher: false,
      homeRuns: 2,
      strikeouts: 0,
    });
    expect(hrWin.length).toBeGreaterThan(15);

    const pitcherWin = buildMvpDugoutQuote({
      playerName: 'Leo Cruz',
      nickname: 'Ace',
      won: true,
      isPitcher: true,
      homeRuns: 0,
      strikeouts: 6,
    });
    expect(pitcherWin.length).toBeGreaterThan(15);

    const hitWin = buildMvpDugoutQuote({
      playerName: 'Sam Park',
      nickname: 'Spark',
      won: true,
      isPitcher: false,
      homeRuns: 0,
      strikeouts: 0,
    });
    expect(hitWin.length).toBeGreaterThan(15);

    const toughLoss = buildMvpDugoutQuote({
      playerName: 'Sam Park',
      nickname: 'Spark',
      won: false,
      isPitcher: false,
      homeRuns: 0,
      strikeouts: 0,
    });
    expect(toughLoss.length).toBeGreaterThan(15);

    const club = makeClub(1994);
    const album = evaluateTrophyCaseProgress({
      club: {
        ...club,
        wins: 4,
        roster: club.roster.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                unlockedSkillIds: ['bat_1'],
                equippedRelicIds: ['lucky_gum'],
                seasonStats: { ...p.seasonStats, homeRuns: 4 },
              }
            : p,
        ),
      },
      packsOpenedCount: 2,
      derbyWins: 1,
      sweepsCount: 1,
      favoriteCount: 2,
    });
    expect(album.badges.length).toBeGreaterThanOrEqual(8);
    expect(album.unlockedCount).toBeGreaterThanOrEqual(5);
    expect(album.relicsOwnedCount).toBe(1);
    expect(album.favoriteCount).toBe(2);
  });
});
