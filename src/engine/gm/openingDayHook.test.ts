import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import {
  applyOpeningDaySparkSp,
  buildFirstPitchCoachTip,
  buildMvpDugoutQuote,
  buildPostGameMvpHeadline,
  evaluateMatchupCardSparkle,
  evaluateTrophyCaseProgress,
  evaluateWelcomeChecklist,
  selectClubSpotlightTrio,
} from './openingDayHook';
import { buildManagerActionInbox } from './managerActionInbox';
import { createManagerProfile } from '../models/manager';
import type { PlayEvent } from '../models/playEvent';

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

  it('starts fresh rosters at 0 SP so Day-1 Spark yields exactly 2 player SP (+1 Manager = 3 total) and hides Ballpark badge before Game 1', () => {
    const club = makeClub(1994);
    expect(club.roster.every((p) => p.skillPoints === 0)).toBe(true);

    const sparked = applyOpeningDaySparkSp(club);
    const totalPlayerSp = sparked.roster.reduce((sum, p) => sum + p.skillPoints, 0);
    expect(totalPlayerSp).toBe(2);

    const manager = createManagerProfile({ name: 'Coach Skip', avatarSeed: 1994 });
    const preGameInbox = buildManagerActionInbox({
      club: { ...sparked, economy: { ...sparked.economy, cash: 25_000 } },
      manager,
      currentSeriesIndex: 0,
      unopenedPackCount: 1,
    });
    expect(preGameInbox.tabBadges.skills).toBe('⚡ 3');
    expect(preGameInbox.tabBadges.economy).toBeUndefined();

    const postGameInbox = buildManagerActionInbox({
      club: { ...sparked, wins: 1, economy: { ...sparked.economy, cash: 25_000 } },
      manager,
      currentSeriesIndex: 0,
      unopenedPackCount: 1,
    });
    expect(postGameInbox.tabBadges.economy).toBe('⬆');
  });

  it('builds energetic 90s sports headlines for post-game MVPs instead of robotic copy', () => {
    expect(buildPostGameMvpHeadline('Rowan Hayes', { homeRuns: 1 })).toMatch(/crushed a home run/i);
    expect(buildPostGameMvpHeadline('Rowan Hayes', { homeRuns: 2 })).toMatch(/launched 2 home runs/i);
    expect(buildPostGameMvpHeadline('Inés Torres', { pitchingStrikeouts: 5 })).toMatch(/fanned 5 batters/i);
    expect(buildPostGameMvpHeadline('Inés Torres', { pitchingStrikeouts: 3 })).toMatch(/mowed down 3 batters/i);
    expect(buildPostGameMvpHeadline('Inés Torres', { pitchingStrikeouts: 1 })).toMatch(/key k/i);
    expect(buildPostGameMvpHeadline('Kiko Sato', { rbis: 3 })).toMatch(/drove in 3/i);
    expect(buildPostGameMvpHeadline('Kiko Sato', { rbis: 1 })).toMatch(/knocked in/i);
    expect(buildPostGameMvpHeadline('Finn Reed', { hits: 3 })).toMatch(/racked up 3/i);
    expect(buildPostGameMvpHeadline('Finn Reed', { hits: 1 })).toMatch(/clutch hit/i);
    expect(buildPostGameMvpHeadline('Finn Reed', { hits: 2 })).toMatch(/2 hits/i);
    expect(buildPostGameMvpHeadline('Sam Park', undefined)).toMatch(/player of the game/i);
  });

  it('computes reactive sparkle glow rings, badges, and live play reactions for MatchupPrints', () => {
    const club = makeClub(1994);
    const batter = { ...club.roster[0], formState: 'hot' as const };
    const pitcher = { ...club.roster.find((p) => p.position === 'SP')!, formState: 'neutral' as const };

    const hrEvent: PlayEvent = {
      seq: 10,
      inning: 3,
      half: 'BOT',
      type: 'ball_in_play',
      outsBefore: 0,
      outsAfter: 0,
      balls: 1,
      strikes: 1,
      basesAfter: [null, null, null],
      isClutchMoment: false,
      outcome: 'home_run',
      batterId: batter.id,
      pitcherId: pitcher.id,
      awayScore: 1,
      homeScore: 2,
      commentary: 'Boom!',
    };

    const hrSparkle = evaluateMatchupCardSparkle({
      player: batter,
      role: 'batter',
      isFavorite: true,
      powerReady: true,
      powerArmed: false,
      latestEvent: hrEvent,
    });
    expect(hrSparkle.ringTone).toBe('celebrate');
    expect(hrSparkle.reactionBubble).toMatch(/boom/i);
    expect(hrSparkle.badges.some((b) => /fav/i.test(b))).toBe(true);

    const kEvent: PlayEvent = {
      ...hrEvent,
      seq: 11,
      outcome: 'strikeout',
    };
    const kSparkle = evaluateMatchupCardSparkle({
      player: pitcher,
      role: 'pitcher',
      isFavorite: false,
      powerReady: true,
      powerArmed: true,
      latestEvent: kEvent,
    });
    expect(kSparkle.ringTone).toBe('celebrate');
    expect(kSparkle.reactionBubble).toMatch(/filthy k/i);
    expect(kSparkle.badges.some((b) => /armed/i.test(b))).toBe(true);

    const powerReadyOnly = evaluateMatchupCardSparkle({
      player: pitcher,
      role: 'pitcher',
      isFavorite: false,
      powerReady: true,
      powerArmed: false,
      latestEvent: null,
    });
    expect(powerReadyOnly.ringTone).toBe('power');
    expect(powerReadyOnly.badges.some((b) => /power/i.test(b))).toBe(true);

    const surgeEvent: PlayEvent = {
      ...hrEvent,
      seq: 12,
      outcome: 'single',
      specialPowerTriggered: {
        actor: 'batter',
        powerId: 'comet',
        calloutText: 'COMET!',
        vfxColor: '#FFC300',
      },
    };
    const surgeSparkle = evaluateMatchupCardSparkle({
      player: batter,
      role: 'batter',
      isFavorite: false,
      powerReady: false,
      powerArmed: false,
      latestEvent: surgeEvent,
    });
    expect(surgeSparkle.reactionBubble).toMatch(/surge/i);

    const doubleEvent: PlayEvent = { ...hrEvent, seq: 13, outcome: 'double' };
    expect(
      evaluateMatchupCardSparkle({
        player: batter,
        role: 'batter',
        isFavorite: false,
        powerReady: false,
        powerArmed: false,
        latestEvent: doubleEvent,
      }).reactionBubble,
    ).toMatch(/ripped/i);

    const walkEvent: PlayEvent = { ...hrEvent, seq: 14, outcome: 'walk' };
    expect(
      evaluateMatchupCardSparkle({
        player: batter,
        role: 'batter',
        isFavorite: false,
        powerReady: false,
        powerArmed: false,
        latestEvent: walkEvent,
      }).reactionBubble,
    ).toMatch(/on base/i);

    const outEvent: PlayEvent = { ...hrEvent, seq: 15, outcome: 'ground_out' };
    expect(
      evaluateMatchupCardSparkle({
        player: pitcher,
        role: 'pitcher',
        isFavorite: false,
        powerReady: false,
        powerArmed: false,
        latestEvent: outEvent,
      }).reactionBubble,
    ).toMatch(/got 'em/i);

    const coldCalm = evaluateMatchupCardSparkle({
      player: { ...pitcher, formState: 'cold' },
      role: 'pitcher',
      isFavorite: false,
      powerReady: false,
      powerArmed: false,
      latestEvent: null,
    });
    expect(coldCalm.ringTone).toBe('none');
    expect(coldCalm.badges.some((b) => /cold/i.test(b))).toBe(true);
  });
});
