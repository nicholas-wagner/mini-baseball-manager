import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import type { PlayEvent } from '../models/playEvent';
import { createGameSession } from '../simulation/baseballEngine';
import { getCurrentBatter, getCurrentPitcher } from '../simulation/gameState';
import {
  buildStickerAlbumShelf,
  CELEBRATION_STICKER_CATALOG,
  detectDerbyCelebrationSticker,
  detectLiveCelebrationSticker,
} from './celebrationStickers';
import { createClutchMomentSession } from './gameDayMoments';

function makeWorld(seed = 1994) {
  return generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFC300',
  });
}

function makeEvent(overrides: Partial<PlayEvent>): PlayEvent {
  return {
    seq: 1,
    inning: 4,
    half: 'TOP',
    type: 'ball_in_play',
    commentary: 'Play',
    awayScore: 0,
    homeScore: 0,
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    isClutchMoment: false,
    basesAfter: [null, null, null],
    ...overrides,
  };
}

describe('TASK-088 — Celebration Stickers & Opening Side Preference Engine', () => {
  it('steers Opening Day clutch moments symmetrically to batting-first OR pitching-first on demand', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];

    const battingMoment = createClutchMomentSession({
      awayClub: rival,
      homeClub: human,
      seed: 1995,
      regulationInnings: 5,
      preferHumanBattingFirst: true,
      chargeOpeningPower: true,
    });
    expect((battingMoment.session.half === 'BOT') === battingMoment.session.home.isHuman).toBe(true);

    const pitchingMoment = createClutchMomentSession({
      awayClub: rival,
      homeClub: human,
      seed: 2090,
      regulationInnings: 5,
      preferHumanPitchingFirst: true,
      chargeOpeningPower: true,
    });
    expect((pitchingMoment.session.half === 'BOT') === pitchingMoment.session.home.isHuman).toBe(false);

    // Works cleanly when human is away too
    const awayPitching = createClutchMomentSession({
      awayClub: human,
      homeClub: rival,
      seed: 1995,
      regulationInnings: 5,
      preferHumanPitchingFirst: true,
      chargeOpeningPower: true,
    });
    expect((awayPitching.session.half === 'BOT') === awayPitching.session.home.isHuman).toBe(false);
  });

  it('unlocks all 6 live celebration stickers only for human highlights and never duplicates earned IDs', () => {
    const world = makeWorld(1994);
    const human = world.leagues.rookie[0];
    const rival = world.leagues.rookie[1];

    // TOP 1: rival batting, human pitching
    const pitchingSession = createGameSession(rival, human, 1995, 'regular', 5);
    const humanPitcher = getCurrentPitcher(pitchingSession);
    const rivalBatter = getCurrentBatter(pitchingSession);

    // Rival home run does NOT unlock a sticker for human
    const rivalHr = detectLiveCelebrationSticker({
      event: makeEvent({
        half: 'TOP',
        outcome: 'home_run',
        batterId: rivalBatter.id,
        pitcherId: humanPitcher.id,
      }),
      before: pitchingSession,
      earnedStickerIds: [],
      mascotName: human.mascot,
    });
    expect(rivalHr).toBeNull();

    // Human pitching strikeout unlocks first_strikeout
    const kUnlock = detectLiveCelebrationSticker({
      event: makeEvent({
        half: 'TOP',
        outcome: 'strikeout',
        outsAfter: 1,
        batterId: rivalBatter.id,
        pitcherId: humanPitcher.id,
      }),
      before: pitchingSession,
      earnedStickerIds: [],
      mascotName: human.mascot,
    });
    expect(kUnlock?.sticker.id).toBe('first_strikeout');
    expect(kUnlock?.actorName).toBe(humanPitcher.name);

    // Already-earned strikeout returns null (no spam!)
    expect(
      detectLiveCelebrationSticker({
        event: makeEvent({
          half: 'TOP',
          outcome: 'strikeout',
          outsAfter: 1,
          batterId: rivalBatter.id,
          pitcherId: humanPitcher.id,
        }),
        before: pitchingSession,
        earnedStickerIds: ['first_strikeout'],
        mascotName: human.mascot,
      }),
    ).toBeNull();

    // Human pitcher triggering signature power unlocks first_signature_power
    const powerUnlock = detectLiveCelebrationSticker({
      event: makeEvent({
        half: 'TOP',
        outcome: 'ground_out',
        outsAfter: 1,
        batterId: rivalBatter.id,
        pitcherId: humanPitcher.id,
        specialPowerTriggered: {
          actor: 'pitcher',
          powerId: 'usa_heritage',
          calloutText: 'Eagle Soar!',
          vfxColor: '#FFC300',
        },
      }),
      before: pitchingSession,
      earnedStickerIds: [],
      mascotName: human.mascot,
    });
    expect(powerUnlock?.sticker.id).toBe('first_signature_power');

    // BOT 1: human batting, rival pitching
    const battingSession = { ...pitchingSession, half: 'BOT' as const };
    const humanBatter = getCurrentBatter(battingSession);
    const rivalPitcher = getCurrentPitcher(battingSession);

    const hrUnlock = detectLiveCelebrationSticker({
      event: makeEvent({
        half: 'BOT',
        outcome: 'home_run',
        batterId: humanBatter.id,
        pitcherId: rivalPitcher.id,
      }),
      before: battingSession,
      earnedStickerIds: [],
      mascotName: human.mascot,
    });
    expect(hrUnlock?.sticker.id).toBe('first_home_run');
    expect(hrUnlock?.actorName).toBe(humanBatter.name);

    const hitUnlock = detectLiveCelebrationSticker({
      event: makeEvent({
        half: 'BOT',
        outcome: 'double',
        batterId: humanBatter.id,
        pitcherId: rivalPitcher.id,
      }),
      before: battingSession,
      earnedStickerIds: [],
      mascotName: human.mascot,
    });
    expect(hitUnlock?.sticker.id).toBe('first_base_hit');

    const buntUnlock = detectLiveCelebrationSticker({
      event: makeEvent({
        half: 'BOT',
        outcome: 'bunt_single',
        batterId: humanBatter.id,
        pitcherId: rivalPitcher.id,
      }),
      before: battingSession,
      earnedStickerIds: [],
      mascotName: human.mascot,
    });
    expect(buntUnlock?.sticker.id).toBe('first_bunt_magic');

    const stealSession = {
      ...battingSession,
      bases: [humanBatter.id, null, null] as [string | null, string | null, string | null],
    };
    const stealUnlock = detectLiveCelebrationSticker({
      event: makeEvent({
        half: 'BOT',
        type: 'stolen_base_attempt',
        outsBefore: 0,
        outsAfter: 0,
        basesAfter: [null, humanBatter.id, null],
        batterId: humanBatter.id,
        pitcherId: rivalPitcher.id,
      }),
      before: stealSession,
      earnedStickerIds: [],
      mascotName: human.mascot,
    });
    expect(stealUnlock?.sticker.id).toBe('first_stolen_base');

    // Caught stealing does NOT unlock stolen base sticker
    expect(
      detectLiveCelebrationSticker({
        event: makeEvent({
          half: 'BOT',
          type: 'stolen_base_attempt',
          outsBefore: 0,
          outsAfter: 1,
          basesAfter: [null, null, null],
          batterId: humanBatter.id,
          pitcherId: rivalPitcher.id,
        }),
        before: stealSession,
        earnedStickerIds: [],
        mascotName: human.mascot,
      }),
    ).toBeNull();
  });

  it('unlocks first_home_run from the 30s HR Derby and projects the 6-sticker Album shelf', () => {
    expect(CELEBRATION_STICKER_CATALOG).toHaveLength(6);

    const derbyUnlock = detectDerbyCelebrationSticker({
      homeRuns: 1,
      sluggerName: 'Haoyu Luo',
      earnedStickerIds: [],
      mascotName: 'Rocket Dog',
    });
    expect(derbyUnlock?.sticker.id).toBe('first_home_run');
    expect(derbyUnlock?.actorName).toBe('Haoyu Luo');

    expect(
      detectDerbyCelebrationSticker({
        homeRuns: 0,
        sluggerName: 'Haoyu Luo',
        earnedStickerIds: [],
        mascotName: 'Rocket Dog',
      }),
    ).toBeNull();

    expect(
      detectDerbyCelebrationSticker({
        homeRuns: 2,
        sluggerName: 'Haoyu Luo',
        earnedStickerIds: ['first_home_run'],
        mascotName: 'Rocket Dog',
      }),
    ).toBeNull();

    const shelf = buildStickerAlbumShelf(['first_strikeout', 'first_home_run']);
    expect(shelf.totalCount).toBe(6);
    expect(shelf.unlockedCount).toBe(2);
    expect(shelf.stickers.find((s) => s.id === 'first_strikeout')?.unlocked).toBe(true);
    expect(shelf.stickers.find((s) => s.id === 'first_stolen_base')?.unlocked).toBe(false);
  });
});
