import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import { createManagerProfile } from '../models/manager';
import type { PlayEvent } from '../models/playEvent';
import { canTriggerSpecialAbility, SPECIAL_ABILITY_HYPE_COST } from '../rpg/abilityCooldowns';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession, stepPitch } from '../simulation/baseballEngine';
import { getCurrentBatter, getCurrentPitcher } from '../simulation/gameState';
import { buildComicPopArtBanner, estimateHomeRunDistanceFt } from '../simulation/liveWatchPacing';
import {
  evaluateArcadeTimingCursor,
  evaluateArcadeTimingEffect,
} from '../simulation/pitchMindGames';
import { createClutchMomentSession } from './gameDayMoments';
import { buildManagerActionInbox } from './managerActionInbox';
import {
  buildMascotCheerQuip,
  buildMatchupScoutLine,
  PITCH_CALL_GUIDE,
  selectBetweenGameSpotlight,
  selectClubSpotlightTrio,
} from './openingDayHook';
import { createPlayer, PITCHER_NICKNAMES, pickNicknameForRole } from './rosterFactory';

function makeWorld(seed = 1994) {
  return generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  });
}

describe('TASK-079 — First-Time Magic Engine Foundations', () => {
  it('assigns role-accurate nicknames so hitters never get pitcher nicknames like Corner Painter', () => {
    const pitcherNickSet = new Set<string>(PITCHER_NICKNAMES);
    for (let i = 0; i < 40; i += 1) {
      const hitter = createPlayer(createSeededRng(700 + i), {
        position: (['1B', 'RF', 'LF', 'CF', 'SS', '2B', '3B', 'C'] as const)[i % 8],
        tier: 'rookie',
      });
      expect(pitcherNickSet.has(hitter.nickname)).toBe(false);

      const pitcher = createPlayer(createSeededRng(900 + i), {
        position: i % 2 === 0 ? 'SP' : 'RP',
        tier: 'rookie',
      });
      expect(pitcherNickSet.has(pitcher.nickname)).toBe(true);
    }

    const fastNick = pickNicknameForRole(createSeededRng(12), 'CF', {
      speed: 82,
      fielding: 74,
      power: 45,
    });
    const sluggerNick = pickNicknameForRole(createSeededRng(12), '1B', {
      speed: 40,
      fielding: 50,
      power: 84,
    });
    expect(pitcherNickSet.has(fastNick)).toBe(false);
    expect(pitcherNickSet.has(sluggerNick)).toBe(false);
  });

  it('guarantees at least one female star in selectClubSpotlightTrio when the roster is co-ed and avoids exaggerated speedster taglines', () => {
    for (const seed of [1994, 2025, 2089, 3001, 4040]) {
      const club = makeWorld(seed).leagues.rookie[0];
      const hasFemaleOnRoster = club.roster.some((p) => p.traits.playerLook === 'female');
      const trio = selectClubSpotlightTrio(club);
      expect(trio).toHaveLength(3);
      if (hasFemaleOnRoster) {
        expect(trio.some((s) => s.player.traits.playerLook === 'female')).toBe(true);
      }
      for (const star of trio) {
        if (star.player.ratings.speed < 65) {
          expect(star.tagline).not.toMatch(/base stealer/i);
        }
      }
    }
  });

  it('steers Opening Day hero clutch moments so the human bats first with a charged Signature Power while keeping batting-first seeds intact', () => {
    const world1994 = makeWorld(1994);
    const human = world1994.leagues.rookie[0];
    const rival = world1994.leagues.rookie[1];

    const opening = createClutchMomentSession({
      awayClub: rival,
      homeClub: human,
      seed: 1995,
      regulationInnings: 5,
      preferHumanBattingFirst: true,
      chargeOpeningPower: true,
    });
    expect(opening.session.status).toBe('in_progress');
    const humanIsBatting =
      (opening.session.half === 'BOT') === opening.session.home.isHuman;
    expect(humanIsBatting).toBe(true);
    const humanSide = opening.session.home.isHuman ? opening.session.home : opening.session.away;
    expect(humanSide.hypeGauge).toBeGreaterThanOrEqual(SPECIAL_ABILITY_HYPE_COST);

    // Also works on road trips (human is away)
    const roadOpening = createClutchMomentSession({
      awayClub: human,
      homeClub: rival,
      seed: 1995,
      regulationInnings: 5,
      preferHumanBattingFirst: true,
      chargeOpeningPower: true,
    });
    expect(roadOpening.session.status).toBe('in_progress');
    expect((roadOpening.session.half === 'BOT') === roadOpening.session.home.isHuman).toBe(true);
    expect(roadOpening.session.away.hypeGauge).toBeGreaterThanOrEqual(SPECIAL_ABILITY_HYPE_COST);
    const roadBatter = getCurrentBatter(roadOpening.session);
    expect(
      canTriggerSpecialAbility(
        roadOpening.session.abilityCooldowns,
        'away',
        roadBatter,
        'batter',
        roadOpening.session.away.hypeGauge,
      ).allowed,
    ).toBe(true);

    // Pitching Opening Day also guarantees the featured pitcher has an active Signature Power ready
    const pitchingOpening = createClutchMomentSession({
      awayClub: rival,
      homeClub: human,
      seed: 2090,
      regulationInnings: 5,
      chargeOpeningPower: true,
    });
    const isBatting = (pitchingOpening.session.half === 'BOT') === pitchingOpening.session.home.isHuman;
    const hero = isBatting
      ? getCurrentBatter(pitchingOpening.session)
      : getCurrentPitcher(pitchingOpening.session);
    expect(
      canTriggerSpecialAbility(
        pitchingOpening.session.abilityCooldowns,
        'home',
        hero,
        isBatting ? 'batter' : 'pitcher',
        pitchingOpening.session.home.hypeGauge,
      ).allowed,
    ).toBe(true);
  });

  it('provides plain-English pitching trade-off hints, 2-second matchup scouting lines, mascot cheers, and a prioritized 1-card Between-Game Spotlight', () => {
    expect(PITCH_CALL_GUIDE.length).toBeGreaterThanOrEqual(4);
    for (const opt of PITCH_CALL_GUIDE) {
      expect(opt.tradeoff.length).toBeGreaterThan(8);
      expect(opt.actionLabel.length).toBeGreaterThan(5);
    }

    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];
    const session = createGameSession(rival, human, 1994, 'regular', 5);
    const batter = session.away.playersById[session.away.lineup[0].playerId];
    const pitcher = session.home.playersById[session.home.activePitcherId];

    const scout = buildMatchupScoutLine(batter, pitcher, session);
    expect(scout.batterLine).toMatch(/RHB|LHB|SHB/);
    expect(scout.pitcherLine).toMatch(/RHP|LHP/);
    expect(scout.pitcherLine).toMatch(/%/);

    expect(buildMascotCheerQuip('Rocket Dog', 'cheering', 0).length).toBeGreaterThan(6);
    expect(buildMascotCheerQuip('Splash Otter', 'rally', 1).length).toBeGreaterThan(6);
    expect(buildMascotCheerQuip('Lucky Fox', 'determined', 2).length).toBeGreaterThan(6);
    expect(buildMascotCheerQuip('Astro Bear', 'happy', 3).length).toBeGreaterThan(6);

    const spotlight = selectBetweenGameSpotlight({
      canClaimStarterReward: false,
      unopenedPackCount: 1,
      hasUnreadStoryBeat: true,
      storyBeatTitle: 'The Sandlot Promise',
      hasGmDilemma: true,
      gmDilemmaHeadline: 'Rival Trade Call',
      totalUnspentSp: 3,
      hasSeriesRecap: true,
      seriesRecapHeadline: 'Comets Take Series!',
    });
    expect(spotlight.primary?.id).toBe('foil_pack');
    expect(spotlight.secondaryCount).toBeGreaterThanOrEqual(3);

    const rewardFirst = selectBetweenGameSpotlight({
      canClaimStarterReward: true,
      unopenedPackCount: 2,
      hasUnreadStoryBeat: false,
      hasGmDilemma: false,
      totalUnspentSp: 0,
      hasSeriesRecap: false,
    });
    expect(rewardFirst.primary?.id).toBe('starter_reward');

    const quietFallback = selectBetweenGameSpotlight({
      canClaimStarterReward: false,
      unopenedPackCount: 0,
      hasUnreadStoryBeat: false,
      hasGmDilemma: false,
      totalUnspentSp: 0,
      hasSeriesRecap: false,
    });
    expect(quietFallback.primary?.id).toBe('derby_invite');
  });

  it('evaluates optional Arcade Timing cursor grades and applies batting & pitching bonuses cleanly inside stepPitch', () => {
    expect(evaluateArcadeTimingCursor(50)).toBe('perfect');
    expect(evaluateArcadeTimingCursor(34)).toBe('good');
    expect(evaluateArcadeTimingCursor(10)).toBe('late');

    const perfectBat = evaluateArcadeTimingEffect({ actor: 'batter', grade: 'perfect' });
    const lateBat = evaluateArcadeTimingEffect({ actor: 'batter', grade: 'late' });
    const perfectPitch = evaluateArcadeTimingEffect({ actor: 'pitcher', grade: 'perfect' });
    const latePitch = evaluateArcadeTimingEffect({ actor: 'pitcher', grade: 'late' });

    expect(perfectBat.contactDelta).toBeGreaterThan(0);
    expect(perfectBat.powerDelta).toBeGreaterThan(0);
    expect(lateBat.contactDelta).toBeLessThan(0);
    expect(perfectPitch.stuffDelta).toBeGreaterThan(0);
    expect(perfectPitch.mphBonus).toBeGreaterThan(0);
    expect(latePitch.controlDelta).toBeLessThan(0);

    const world = makeWorld(1994);
    const session = createGameSession(world.leagues.rookie[1], world.leagues.rookie[0], 1994, 'regular', 5);
    const res = stepPitch(session, 'normal', {
      arcadeTiming: { actor: 'pitcher', grade: 'perfect' },
    });
    const pitchEv = res.events.find((e) => e.mathBreakdown);
    expect(pitchEv?.mathBreakdown?.activeModifiers.some((m) => /timing/i.test(m))).toBe(true);
  });

  it('adds HR distance (FT) and K radar velocity (MPH) to 3D diamond pop-art callouts', () => {
    const world = makeWorld(1994);
    const session = createGameSession(world.leagues.rookie[1], world.leagues.rookie[0], 1994, 'regular', 5);

    const hrEvent: PlayEvent = {
      seq: 12,
      inning: 4,
      half: 'BOT',
      type: 'ball_in_play',
      outsBefore: 1,
      outsAfter: 1,
      balls: 2,
      strikes: 1,
      basesAfter: [null, null, null],
      isClutchMoment: true,
      outcome: 'home_run',
      batterId: session.home.lineup[0].playerId,
      pitcherId: session.away.activePitcherId,
      awayScore: 2,
      homeScore: 3,
      commentary: 'Deep drive!',
      ballFlight: { style: 'moonshot_hr', landingX: 12, landingZ: -46, apexY: 16, durationSec: 1.8 },
    };
    const ft = estimateHomeRunDistanceFt(hrEvent);
    expect(ft).toBeGreaterThanOrEqual(365);
    expect(ft).toBeLessThanOrEqual(460);
    const hrBanner = buildComicPopArtBanner(hrEvent, session);
    expect(hrBanner?.title).toMatch(/\d{3}\s*FT/i);

    const kEvent: PlayEvent = {
      ...hrEvent,
      seq: 13,
      type: 'pitch_thrown',
      outcome: 'strikeout',
      outsAfter: 2,
      pitchThrown: {
        pitchType: 'four_seam',
        mph: 96,
        isFavoritePitch: true,
        isWeakPitchForPitcher: false,
        batterAffinity: 'neutral',
      },
    };
    const kBanner = buildComicPopArtBanner(kEvent, session);
    expect(kBanner?.title).toMatch(/96\s*MPH/i);
  });

  it('quiets noisy Skill Tree and Ballpark tab badges on Opening Day before Game 1 while keeping inbox items intact', () => {
    const world = makeWorld(1994);
    const club = {
      ...world.leagues.rookie[0],
      roster: world.leagues.rookie[0].roster.map((p, i) => (i < 2 ? { ...p, skillPoints: 1 } : p)),
      economy: { ...world.leagues.rookie[0].economy, cash: 25_000 },
    };
    const manager = createManagerProfile({ name: 'Coach Skip', avatarSeed: 1994 });

    const preGame = buildManagerActionInbox({
      club,
      manager,
      currentSeriesIndex: 0,
      unopenedPackCount: 1,
    });
    expect(preGame.tabBadges.skills).toBeUndefined();
    expect(preGame.tabBadges.economy).toBeUndefined();
    expect(preGame.items.some((i) => i.kind === 'skill_points_ready')).toBe(true);

    const postGame = buildManagerActionInbox({
      club: { ...club, wins: 1 },
      manager,
      currentSeriesIndex: 0,
      unopenedPackCount: 1,
    });
    expect(postGame.tabBadges.skills).toBe('⚡ 3');
    expect(postGame.tabBadges.economy).toBe('⬆');
  });
});
