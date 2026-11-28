import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import type { PlayEvent } from '../models/playEvent';
import { createSeededRng } from '../rng/seededRng';
import { simFullGame } from './baseballEngine';
import {
  canArgueLatestCall,
  computeHomeRunStatcast,
  detectBrokenBatBloop,
  evaluateRallyChain,
} from './arcadeJuice';

function makeBaseEvent(overrides: Partial<PlayEvent> = {}): PlayEvent {
  return {
    seq: 1,
    type: 'ball_in_play',
    inning: 1,
    half: 'BOT',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: 'Play!',
    ...overrides,
  };
}

describe('TASK-121 — Arcade Fun Juice Engine (HR Statcast, Broken-Bat Bloops, Rally Chain & Argue Call)', () => {
  it('computes deterministic, bounded HR Statcast with park-aware landmark calls', () => {
    const club = createClub(createSeededRng(121), {
      id: 'c-121',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Rocket Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'aa',
      isHuman: true,
    });
    const slugger = {
      ...club.roster[0],
      ratings: { ...club.roster[0].ratings, power: 94 },
    };
    const lightHitter = {
      ...club.roster[1],
      ratings: { ...club.roster[1].ratings, power: 42 },
    };

    const splash = computeHomeRunStatcast({
      batter: slugger,
      landingX: 14,
      landingZ: -46,
      ballparkId: 'bayfront_cove',
      eventSeq: 22,
    });
    const splashRepeat = computeHomeRunStatcast({
      batter: slugger,
      landingX: 14,
      landingZ: -46,
      ballparkId: 'bayfront_cove',
      eventSeq: 22,
    });
    expect(splash).toEqual(splashRepeat);
    expect(splash.landmarkCall).toBe('SPLASH HIT INTO THE COVE!');
    expect(splash.distanceFt).toBeGreaterThanOrEqual(358);
    expect(splash.distanceFt).toBeLessThanOrEqual(478);
    expect(splash.exitVeloMph).toBeGreaterThanOrEqual(96);
    expect(splash.exitVeloMph).toBeLessThanOrEqual(118);

    const emeraldWall = computeHomeRunStatcast({
      batter: slugger,
      landingX: -12,
      landingZ: -46,
      ballparkId: 'brickyard_classic',
      eventSeq: 23,
    });
    expect(emeraldWall.landmarkCall).toBe('OVER THE EMERALD WALL!');

    const cornfield = computeHomeRunStatcast({
      batter: slugger,
      landingX: 0,
      landingZ: -46,
      ballparkId: 'cornfield_twilight',
      eventSeq: 24,
    });
    expect(cornfield.landmarkCall).toBe('INTO THE CORNFIELD!');

    const mileHigh = computeHomeRunStatcast({
      batter: slugger,
      landingX: 0,
      landingZ: -48,
      ballparkId: 'high_altitude_mesa',
      eventSeq: 25,
      isPowerSwing: true,
    });
    expect(mileHigh.distanceFt).toBeGreaterThanOrEqual(435);
    expect(mileHigh.landmarkCall).toBe('MILE-HIGH MOONSHOT!');

    const upperDeck = computeHomeRunStatcast({
      batter: slugger,
      landingX: 0,
      landingZ: -52,
      ballparkId: 'grand_cathedral',
      eventSeq: 26,
      isPowerSwing: true,
    });
    expect(upperDeck.distanceFt).toBeGreaterThanOrEqual(440);
    expect(upperDeck.landmarkCall).toBe('UPPER DECK CRUSHER!');

    const standardHr = computeHomeRunStatcast({
      batter: lightHitter,
      landingX: 2,
      landingZ: -42,
      ballparkId: 'sandlot_commons',
      eventSeq: 11,
      isPowerSwing: false,
    });
    expect(standardHr.landmarkCall).toBe('NO-DOUBT HOME RUN!');
    expect(standardHr.distanceFt).toBeLessThan(mileHigh.distanceFt);
    expect(standardHr.exitVeloMph).toBeLessThan(mileHigh.exitVeloMph);
  });

  it('deterministically triggers broken-bat bloops on ~14% of singles off fastballs/cutters only', () => {
    expect(
      detectBrokenBatBloop({
        outcome: 'double',
        pitchType: 'four_seam',
        eventSeq: 7,
        batterId: 'p1',
      }),
    ).toBe(false);
    expect(
      detectBrokenBatBloop({
        outcome: 'single',
        pitchType: 'curveball',
        eventSeq: 7,
        batterId: 'p1',
      }),
    ).toBe(false);
    expect(
      detectBrokenBatBloop({
        outcome: 'single',
        pitchType: undefined,
        eventSeq: 7,
        batterId: 'p1',
      }),
    ).toBe(false);

    const pitchTypes = ['four_seam', 'two_seam', 'cutter'] as const;
    let hits = 0;
    const total = 450;
    for (let i = 0; i < total; i += 1) {
      const pitchType = pitchTypes[i % pitchTypes.length];
      const resultA = detectBrokenBatBloop({
        outcome: 'single',
        battedBallType: 'fly_ball',
        pitchType,
        eventSeq: i + 1,
        batterId: `player-${i % 19}`,
      });
      const resultB = detectBrokenBatBloop({
        outcome: 'single',
        battedBallType: 'fly_ball',
        pitchType,
        eventSeq: i + 1,
        batterId: `player-${i % 19}`,
      });
      expect(resultA).toBe(resultB);
      if (resultA) hits += 1;
    }

    const rate = hits / total;
    expect(rate).toBeGreaterThanOrEqual(0.09);
    expect(rate).toBeLessThanOrEqual(0.2);
  });

  it('evaluates Rally Chain streaks across hits/walks while ignoring count pitches and detects clean 3-up, 3-down half-innings', () => {
    const quiet = evaluateRallyChain(
      [makeBaseEvent({ seq: 1, outcome: 'single' })],
      1,
      'BOT',
    );
    expect(quiet.hitStreak).toBe(1);
    expect(quiet.label).toBeNull();
    expect(quiet.tone).toBeNull();
    expect(quiet.isThreeUpThreeDown).toBe(false);

    const twoRally = evaluateRallyChain(
      [
        makeBaseEvent({ seq: 1, outcome: 'single' }),
        makeBaseEvent({ seq: 2, type: 'pitch_thrown', outcome: 'ball' }),
        makeBaseEvent({ seq: 3, type: 'pitch_thrown', outcome: 'called_strike' }),
        makeBaseEvent({ seq: 4, outcome: 'walk', type: 'pitch_thrown' }),
      ],
      1,
      'BOT',
    );
    expect(twoRally.hitStreak).toBe(2);
    expect(twoRally.label).toBe('🔥 2× RALLY!');
    expect(twoRally.tone).toBe('gold');
    expect(twoRally.soundCue).toBe('organ_rally');

    const threeRally = evaluateRallyChain(
      [
        makeBaseEvent({ seq: 1, outcome: 'single' }),
        makeBaseEvent({ seq: 2, outcome: 'double' }),
        makeBaseEvent({ seq: 3, outcome: 'home_run' }),
      ],
      1,
      'BOT',
    );
    expect(threeRally.hitStreak).toBe(3);
    expect(threeRally.label).toBe('🔥🔥 3× RALLY CHAIN!');
    expect(threeRally.tone).toBe('fire');
    expect(threeRally.soundCue).toBe('stadium_stomp_clap');

    const fourRally = evaluateRallyChain(
      [
        makeBaseEvent({ seq: 1, outcome: 'single' }),
        makeBaseEvent({ seq: 2, outcome: 'walk', type: 'pitch_thrown' }),
        makeBaseEvent({ seq: 3, outcome: 'triple' }),
        makeBaseEvent({ seq: 4, outcome: 'bunt_single' }),
      ],
      1,
      'BOT',
    );
    expect(fourRally.hitStreak).toBe(4);
    expect(fourRally.label).toBe('⚡ 4× UNSTOPPABLE RALLY!');
    expect(fourRally.tone).toBe('electric');
    expect(fourRally.soundCue).toBe('stadium_stomp_clap');

    // Out breaks the streak
    const broken = evaluateRallyChain(
      [
        makeBaseEvent({ seq: 1, outcome: 'single' }),
        makeBaseEvent({ seq: 2, outcome: 'double' }),
        makeBaseEvent({ seq: 3, outcome: 'strikeout', outsBefore: 0, outsAfter: 1 }),
        makeBaseEvent({ seq: 4, outcome: 'single', outsBefore: 1, outsAfter: 1 }),
      ],
      1,
      'BOT',
    );
    expect(broken.hitStreak).toBe(1);
    expect(broken.label).toBeNull();

    // Clean 3-up, 3-down defensive half-inning
    const cleanThreeUp = evaluateRallyChain(
      [
        makeBaseEvent({ seq: 10, inning: 2, half: 'TOP', outcome: 'strikeout', outsBefore: 0, outsAfter: 1 }),
        makeBaseEvent({ seq: 11, inning: 2, half: 'TOP', outcome: 'ground_out', outsBefore: 1, outsAfter: 2 }),
        makeBaseEvent({ seq: 12, inning: 2, half: 'TOP', outcome: 'fly_out', outsBefore: 2, outsAfter: 3 }),
      ],
      2,
      'TOP',
    );
    expect(cleanThreeUp.isThreeUpThreeDown).toBe(true);
    expect(cleanThreeUp.hitStreak).toBe(0);

    // 3 outs with a walk is NOT 3-up, 3-down
    const dirtyThreeOuts = evaluateRallyChain(
      [
        makeBaseEvent({ seq: 20, inning: 3, half: 'TOP', outcome: 'walk', type: 'pitch_thrown', outsBefore: 0, outsAfter: 0 }),
        makeBaseEvent({ seq: 21, inning: 3, half: 'TOP', outcome: 'double_play', outsBefore: 0, outsAfter: 2 }),
        makeBaseEvent({ seq: 22, inning: 3, half: 'TOP', outcome: 'strikeout', outsBefore: 2, outsAfter: 3 }),
      ],
      3,
      'TOP',
    );
    expect(dirtyThreeOuts.isThreeUpThreeDown).toBe(false);
  });

  it('determines Argue the Call! chip eligibility generously for tough calls and blocks repeats', () => {
    expect(canArgueLatestCall(null, false, false)).toBe(false);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'called_strike', type: 'pitch_thrown' }), false, false),
    ).toBe(true);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'strikeout', outsAfter: 1 }), false, false),
    ).toBe(true);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'ground_out', outsAfter: 1 }), false, false),
    ).toBe(true);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'pickoff_out', type: 'pickoff', outsAfter: 1 }), false, false),
    ).toBe(true);
    expect(
      canArgueLatestCall(
        makeBaseEvent({ type: 'stolen_base_attempt', outsBefore: 0, outsAfter: 1 }),
        false,
        false,
      ),
    ).toBe(true);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'home_run' }), false, false),
    ).toBe(false);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'ball', type: 'pitch_thrown' }), false, false, true),
    ).toBe(true);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'ball', type: 'pitch_thrown' }), false, false, false),
    ).toBe(false);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'called_strike' }), true, false),
    ).toBe(false);
    expect(
      canArgueLatestCall(makeBaseEvent({ outcome: 'called_strike' }), false, true),
    ).toBe(false);
  });

  it('attaches hrStatcast to simulated home runs and brokenBat flavor to bloop singles without breaking determinism', () => {
    const away = createClub(createSeededRng(401), {
      id: 'away-121',
      city: 'Mesa',
      name: 'Coyotes',
      mascot: 'Dusty Fox',
      colors: { primary: '#F77F00', secondary: '#181B2C', accent: '#FFC300', monogram: 'MC' },
      leagueTier: 'majors',
      isHuman: false,
    });
    const home = createClub(createSeededRng(402), {
      id: 'home-121',
      city: 'Summit',
      name: 'Titans',
      mascot: 'Sky Bear',
      colors: { primary: '#1D63B8', secondary: '#181B2C', accent: '#00E5FF', monogram: 'ST' },
      leagueTier: 'majors',
      isHuman: true,
    });

    const allEvents: PlayEvent[] = [];
    for (let seed = 1; seed <= 12; seed += 1) {
      allEvents.push(...simFullGame(away, home, 5000 + seed, 9).events);
    }

    const hrs = allEvents.filter((e) => e.outcome === 'home_run');
    expect(hrs.length).toBeGreaterThan(0);
    for (const hr of hrs) {
      expect(hr.hrStatcast).toBeDefined();
      expect(hr.hrStatcast!.distanceFt).toBeGreaterThanOrEqual(358);
      expect(hr.hrStatcast!.distanceFt).toBeLessThanOrEqual(478);
      expect(hr.hrStatcast!.exitVeloMph).toBeGreaterThanOrEqual(96);
      expect(hr.hrStatcast!.exitVeloMph).toBeLessThanOrEqual(118);
    }

    const brokenSingles = allEvents.filter((e) => e.outcome === 'single' && e.brokenBat);
    expect(brokenSingles.length).toBeGreaterThan(0);
    for (const bloop of brokenSingles) {
      expect(bloop.soundCue).toBe('broken_bat');
    }
  });
});
