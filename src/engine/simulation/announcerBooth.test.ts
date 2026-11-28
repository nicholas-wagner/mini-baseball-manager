import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import type { PlayEvent } from '../models/playEvent';
import { createSeededRng } from '../rng/seededRng';
import { enhanceBroadcastCommentary } from './announcerBooth';
import { createGameSession } from './baseballEngine';
import { getCurrentBatter } from './gameState';

function makeFixture() {
  const awayClub = createClub(createSeededRng(7101), {
    id: 'away-club',
    isHuman: false,
    city: 'Ironwood',
    name: 'Knights',
    mascot: 'Hawk',
    colors: { primary: '#5A4AE3', secondary: '#181B2C', accent: '#00E5FF', monogram: 'IK' },
    leagueTier: 'rookie',
  });
  const homeClub = createClub(createSeededRng(7102), {
    id: 'home-club',
    isHuman: true,
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'rookie',
  });
  const session = createGameSession(awayClub, homeClub, 7103, 'regular', 5);
  return { awayClub, homeClub, session };
}

function makeEvent(overrides: Partial<PlayEvent>): PlayEvent {
  return {
    seq: 10,
    type: 'ball_in_play',
    inning: 1,
    half: 'TOP',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: 'Line drive base hit to center.',
    ...overrides,
  };
}

describe('90s Broadcast Booth Announcer (TASK-124 Part A)', () => {
  it('elevates Bayfront Cove splash hits, Brickyard Emerald Wall blasts, and Cornfield homers', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const batter = getCurrentBatter(session);

    const splashEvent = makeEvent({
      outcome: 'home_run',
      batterId: batter.id,
      ballFlight: { style: 'moonshot_hr', landingX: 12, landingZ: -44, apexY: 16, durationSec: 2.2 },
      hrStatcast: { distanceFt: 418, exitVeloMph: 109, landmarkCall: 'SPLASH HIT INTO THE COVE!' },
      commentary: `${batter.name} homers to right.`,
    });
    const splashCall = enhanceBroadcastCommentary({
      event: splashEvent,
      session,
      awayClub,
      homeClub,
      ballparkId: 'bayfront_cove',
    });
    expect(splashCall).toContain('SPLASH HIT into Bayfront Cove — kayaks scrambling for the souvenir!');
    expect(splashCall).toContain('418 FT!');
    expect(splashCall.length).toBeLessThanOrEqual(165);
    // Pure: never mutates event.commentary
    expect(splashEvent.commentary).toBe(`${batter.name} homers to right.`);

    // Non-cove right/left landing at Bayfront does not fake a splash hit
    const leftFieldHr = makeEvent({
      outcome: 'home_run',
      batterId: batter.id,
      ballFlight: { style: 'moonshot_hr', landingX: -10, landingZ: -42, apexY: 14, durationSec: 2.1 },
      commentary: `${batter.name} pulls a homer to left.`,
    });
    expect(
      enhanceBroadcastCommentary({
        event: leftFieldHr,
        session,
        awayClub,
        homeClub,
        ballparkId: 'bayfront_cove',
      }),
    ).not.toContain('SPLASH HIT into Bayfront Cove');

    // Brickyard Emerald Wall HR & Double
    const wallDouble = makeEvent({
      outcome: 'double',
      batterId: batter.id,
      ballFlight: { style: 'line_drive', landingX: -8, landingZ: -38, apexY: 8, durationSec: 1.7 },
      commentary: `${batter.name} doubles off the left-field wall.`,
    });
    expect(
      enhanceBroadcastCommentary({
        event: wallDouble,
        session,
        awayClub,
        homeClub,
        ballparkId: 'brickyard_classic',
      }),
    ).toContain("Brickyard's towering 37-foot Emerald Wall!");

    const wallHr = makeEvent({
      outcome: 'home_run',
      batterId: batter.id,
      ballFlight: { style: 'moonshot_hr', landingX: -6, landingZ: -41, apexY: 15, durationSec: 2.1 },
      hrStatcast: { distanceFt: 404, exitVeloMph: 106, landmarkCall: 'OVER THE EMERALD WALL!' },
      commentary: `${batter.name} homers to left.`,
    });
    const wallHrCall = enhanceBroadcastCommentary({
      event: wallHr,
      session,
      awayClub,
      homeClub,
      ballparkId: 'brickyard_classic',
    });
    expect(wallHrCall).toContain("Brickyard's towering 37-foot Emerald Wall!");
    expect(wallHrCall).toContain('404 FT!');

    // Cornfield Twilight HR
    const cornHr = makeEvent({
      outcome: 'home_run',
      batterId: batter.id,
      hrStatcast: { distanceFt: 412, exitVeloMph: 107, landmarkCall: 'INTO THE CORNFIELD!' },
      commentary: `${batter.name} blasts one out.`,
    });
    expect(
      enhanceBroadcastCommentary({
        event: cornHr,
        session,
        awayClub,
        homeClub,
        ballparkId: 'cornfield_twilight',
      }),
    ).toContain('Sails deep into the golden cornstalks!');
  });

  it('calls broken-bat bloops and wall-climb HR robberies cleanly', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const batter = getCurrentBatter(session);
    const cfSlot = session.home.lineup.find((s) => s.defensivePosition === 'CF') ?? session.home.lineup[0];
    const fielder = session.home.playersById[cfSlot.playerId];

    const brokenBatEvent = makeEvent({
      outcome: 'single',
      batterId: batter.id,
      brokenBat: true,
      commentary: `${batter.name} flares a single into shallow right.`,
    });
    expect(
      enhanceBroadcastCommentary({
        event: brokenBatEvent,
        session,
        awayClub,
        homeClub,
      }),
    ).toBe(`SHATTERED LUMBER! ${batter.name} fights it off with a broken-bat bloop single!`);

    const robberyEvent = makeEvent({
      outcome: 'fly_out',
      outsAfter: 1,
      batterId: batter.id,
      fieldingHighlight: {
        fielderId: fielder.id,
        fielderPos: 'CF',
        anim: 'field_high_jump',
        robbedHomeRun: true,
        webGem: true,
      },
      commentary: `${fielder.name} makes the catch at the wall.`,
    });
    expect(
      enhanceBroadcastCommentary({
        event: robberyEvent,
        session,
        awayClub,
        homeClub,
      }),
    ).toBe(`UNBELIEVABLE! ${fielder.name} scales the fence and steals a home run right out of the seats!`);
  });

  it('appends rally chain hype on 3+ straight knocks and pitcher-batter K duel memory cleanly', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const batter = getCurrentBatter(session);

    const rallyHit = makeEvent({
      outcome: 'single',
      batterId: batter.id,
      commentary: `${batter.name} lines a single into left.`,
    });
    const rallyCall = enhanceBroadcastCommentary({
      event: rallyHit,
      session,
      awayClub,
      homeClub,
      rallyHitStreak: 3,
    });
    expect(rallyCall).toContain("— that's 3 straight knocks! The crowd is shaking the bleachers!");
    expect(rallyCall.length).toBeLessThanOrEqual(165);

    // Outs do not get rally-knock praise
    const rallyOut = makeEvent({
      outcome: 'ground_out',
      outsAfter: 1,
      batterId: batter.id,
      commentary: `${batter.name} grounds out to short.`,
    });
    expect(
      enhanceBroadcastCommentary({
        event: rallyOut,
        session,
        awayClub,
        homeClub,
        rallyHitStreak: 3,
      }),
    ).toBe(rallyOut.commentary);

    // Pitcher-batter duel memory on repeat K
    const repeatK = makeEvent({
      type: 'pitch_thrown',
      outcome: 'strikeout',
      outsAfter: 1,
      batterId: batter.id,
      commentary: `${batter.name} strikes out swinging!`,
    });
    const duelCall = enhanceBroadcastCommentary({
      event: repeatK,
      session,
      awayClub,
      homeClub,
      priorAtBatSummary: '1st K (Slider) · 3rd GO (4-Seam)',
    });
    expect(duelCall).toContain('Got him again — pitcher owns this matchup today!');
    expect(duelCall.length).toBeLessThanOrEqual(165);

    // Pitch name "Knuckle" should NOT falsely trigger repeat-K duel memory
    const nonRepeatK = enhanceBroadcastCommentary({
      event: repeatK,
      session,
      awayClub,
      homeClub,
      priorAtBatSummary: '1st 1B (Knuckle)',
    });
    expect(nonRepeatK).not.toContain('Got him again');
  });

  it('flavors Boss Showdown and high-leverage moments while staying deterministic and <= 165 chars', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const batter = getCurrentBatter(session);

    const bossClutchEvent = makeEvent({
      outcome: 'double',
      batterId: batter.id,
      leverageIndex: 2.3,
      isClutchMoment: true,
      commentary: `${batter.name} rips a go-ahead double into the right-center gap with runners flying around the bases and the dugout erupting!`,
    });

    const first = enhanceBroadcastCommentary({
      event: bossClutchEvent,
      session,
      awayClub,
      homeClub,
      rallyHitStreak: 4,
      isBossShowdown: true,
    });
    const second = enhanceBroadcastCommentary({
      event: bossClutchEvent,
      session,
      awayClub,
      homeClub,
      rallyHitStreak: 4,
      isBossShowdown: true,
    });

    expect(first).toBe(second);
    expect(first.length).toBeLessThanOrEqual(165);
    expect(first).toMatch(/4 straight knocks|Boss Showdown|clutch/i);

    const highLevHit = enhanceBroadcastCommentary({
      event: makeEvent({
        outcome: 'single',
        batterId: batter.id,
        leverageIndex: 1.9,
        commentary: `${batter.name} pokes a single into center.`,
      }),
      session,
      awayClub,
      homeClub,
    });
    expect(highLevHit).toMatch(/clutch/i);
    expect(highLevHit.length).toBeLessThanOrEqual(165);

    // Routine pitch passes through cleanly unchanged
    const routine = makeEvent({
      type: 'pitch_thrown',
      outcome: 'ball',
      commentary: 'Ball outside.',
    });
    expect(
      enhanceBroadcastCommentary({
        event: routine,
        session,
        awayClub,
        homeClub,
      }),
    ).toBe('Ball outside.');
  });
});
