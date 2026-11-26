import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { generateSixTierWorld } from '../league/seasonEngine';
import type { PitchType } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { selectPitchForCount } from '../rpg/pitchArsenals';
import { resolveIsolatedStepInputs, type HumanLiveSelections } from './aiManager';
import { createGameSession, stepPitch } from './baseballEngine';
import { buildCatcherCallSequence, getCatcherCall } from './catcherCalls';
import { getCurrentPitcher, type GameSessionState } from './gameState';
import {
  classifyPitchFamily,
  evaluatePitchTargetEffect,
  formatPitchTargetLabel,
  PITCH_TARGET_OPTIONS,
} from './pitchMindGames';
import { resolveSinglePitch } from './pitchResolver';

const FASTBALLS: ReadonlySet<PitchType> = new Set(['four_seam', 'two_seam', 'cutter']);

function makeHumanPitchingSession(seed = 5100): GameSessionState {
  const world = generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  });
  // Human is HOME -> TOP 1 means AI bats and Human pitches
  return createGameSession(world.leagues.rookie[1], world.leagues.rookie[0], seed + 7);
}

describe('Pitching Modes, Location Trade-Offs & Catcher Calling', () => {
  it('exposes exactly Over Plate, Corner, and Low Chase as manual PITCH_TARGET_OPTIONS (no High Heat button)', () => {
    expect(PITCH_TARGET_OPTIONS.map((o) => o.id)).toEqual([
      'attack_zone',
      'paint_corners',
      'bury_offspeed',
    ]);
    expect(formatPitchTargetLabel('attack_zone')).toBe('Over Plate');
    expect(formatPitchTargetLabel('paint_corners')).toBe('Corner');
    expect(formatPitchTargetLabel('bury_offspeed')).toBe('Low Chase');
    expect(formatPitchTargetLabel('high_heat')).toBe('High Heat');
  });

  it('produces distinct statistical baseball trade-offs for Over Plate, Corner, and Low Chase', () => {
    const rng = createSeededRng(2026);
    const batter = createPlayer(rng, { position: 'CF', tier: 'aa' });
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    const defender = createPlayer(rng, { position: 'SS', tier: 'aa' });

    // Normalize ratings to neutral 65s so target trade-offs are tested cleanly
    const balancedBatter = {
      ...batter,
      formState: 'neutral' as const,
      ratings: { ...batter.ratings, contact: 65, power: 65, eye: 65, luck: 50 },
    };
    const balancedPitcher = {
      ...pitcher,
      formState: 'neutral' as const,
      ratings: { ...pitcher.ratings, velocity: 65, movement: 65, control: 65, luck: 50 },
      pitchArsenal: {
        repertoire: [
          { pitchType: 'four_seam' as const, mastery: 70 },
          { pitchType: 'slider' as const, mastery: 70 },
          { pitchType: 'changeup' as const, mastery: 68 },
          { pitchType: 'curveball' as const, mastery: 66 },
        ],
        favoritePitch: 'four_seam' as const,
        weakestPitch: 'curveball' as const,
      },
    };

    const simulate = (target: 'attack_zone' | 'paint_corners' | 'bury_offspeed') => {
      let balls = 0;
      let calledStrikes = 0;
      let whiffs = 0;
      let hits = 0;
      const samples = 2400;
      for (let i = 0; i < samples; i += 1) {
        const res = resolveSinglePitch({
          rng: createSeededRng(90000 + i),
          batter: balancedBatter,
          pitcher: balancedPitcher,
          catcher,
          defender,
          defenderPos: 'SS',
          firstBaseRunner: null,
          balls: 1,
          strikes: 1,
          outs: 1,
          inning: 3,
          pitchingLead: 0,
          bases: [null, null, null],
          pitcherFatigue: 10,
          battingHype: 20,
          fieldingHype: 20,
          canBatterTriggerSpecial: false,
          canPitcherTriggerSpecial: false,
          leverageIndex: 1.0,
          tacticalCall: 'normal',
          atBatPitchHistory: [],
          pitchTarget: target,
        });
        if (res.outcome === 'ball') balls += 1;
        if (res.outcome === 'called_strike') calledStrikes += 1;
        if (res.outcome === 'swinging_strike') whiffs += 1;
        if (res.totalBases && res.outcome !== 'fielding_error') hits += 1;
      }
      return { balls, calledStrikes, whiffs, hits };
    };

    const overPlate = simulate('attack_zone');
    const corner = simulate('paint_corners');
    const lowChase = simulate('bury_offspeed');

    // Over Plate: fewest balls (most strikes) AND most hits!
    expect(overPlate.balls).toBeLessThan(corner.balls);
    expect(overPlate.hits).toBeGreaterThan(corner.hits * 1.25);
    expect(overPlate.hits).toBeGreaterThan(lowChase.hits * 1.25);

    // Corner: MOST called strikes (batters take strikes!) AND more balls than Over Plate!
    expect(corner.calledStrikes).toBeGreaterThan(overPlate.calledStrikes * 1.15);
    expect(corner.calledStrikes).toBeGreaterThan(lowChase.calledStrikes * 1.4);
    expect(corner.balls).toBeGreaterThan(overPlate.balls * 1.15);

    // Low Chase: MOST balls AND MOST whiffs!
    expect(lowChase.balls).toBeGreaterThan(corner.balls);
    expect(lowChase.whiffs).toBeGreaterThan(corner.whiffs * 1.25);
    expect(lowChase.whiffs).toBeGreaterThan(overPlate.whiffs * 1.4);

    // Direct target effect assertions
    expect(evaluatePitchTargetEffect('paint_corners', 'slider')?.inZoneSwingDelta).toBeLessThan(-0.1);
    expect(evaluatePitchTargetEffect('attack_zone', 'four_seam')?.hitProbBonus).toBeGreaterThan(0);
  });

  it('makes automatic pitch selection location-aware for Normal mode targets', () => {
    const rng = createSeededRng(777);
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const batter = createPlayer(rng, { position: 'LF', tier: 'aa' });
    const balancedPitcher = {
      ...pitcher,
      pitchArsenal: {
        repertoire: [
          { pitchType: 'four_seam' as const, mastery: 74 },
          { pitchType: 'two_seam' as const, mastery: 72 },
          { pitchType: 'slider' as const, mastery: 74 },
          { pitchType: 'changeup' as const, mastery: 72 },
        ],
        favoritePitch: 'four_seam' as const,
        weakestPitch: 'changeup' as const,
      },
    };

    let offspeedOnLowChase = 0;
    let fastballOnOverPlate = 0;
    let fastballOnHighHeat = 0;
    const trials = 300;
    for (let i = 0; i < trials; i += 1) {
      const pLow = selectPitchForCount(createSeededRng(1000 + i), balancedPitcher, batter, 0, 2, [], undefined, 'bury_offspeed');
      const pPlate = selectPitchForCount(createSeededRng(2000 + i), balancedPitcher, batter, 2, 0, [], undefined, 'attack_zone');
      const pHigh = selectPitchForCount(createSeededRng(3000 + i), balancedPitcher, batter, 0, 2, [], undefined, 'high_heat');
      if (classifyPitchFamily(pLow) === 'offspeed') offspeedOnLowChase += 1;
      if (classifyPitchFamily(pPlate) === 'fastball') fastballOnOverPlate += 1;
      if (classifyPitchFamily(pHigh) === 'fastball') fastballOnHighHeat += 1;
    }

    expect(offspeedOnLowChase / trials).toBeGreaterThan(0.68);
    expect(fastballOnOverPlate / trials).toBeGreaterThan(0.65);
    expect(fastballOnHighHeat / trials).toBeGreaterThan(0.8);
  });

  it('builds smart, deterministic, arsenal-legal Catcher Call sequences with Shake Off support and fastball-only High Heat', () => {
    const base = makeHumanPitchingSession(5100);
    const pitcher = getCurrentPitcher(base);
    const owned = new Set(pitcher.pitchArsenal!.repertoire.map((s) => s.pitchType));

    // Deterministic & 2-3 distinct options
    const seqA = buildCatcherCallSequence(base);
    const seqB = buildCatcherCallSequence(base);
    expect(seqA).toEqual(seqB);
    expect(seqA.length).toBeGreaterThanOrEqual(2);
    expect(seqA.length).toBeLessThanOrEqual(3);
    const keys = new Set(seqA.map((c) => `${c.pitchType}:${c.target}`));
    expect(keys.size).toBe(seqA.length);
    for (const call of seqA) {
      expect(owned.has(call.pitchType)).toBe(true);
    }

    // Shake Off cycles cleanly and wraps around
    expect(getCatcherCall(base, 0)).toEqual(seqA[0]);
    expect(getCatcherCall(base, 1)).toEqual(seqA[1]);
    expect(getCatcherCall(base, seqA.length)).toEqual(seqA[0]);

    // Behind 3-0 -> primary call attacks the zone (never chase on 3 balls!)
    const behind30: GameSessionState = { ...base, balls: 3, strikes: 0 };
    const behindCall = getCatcherCall(behind30, 0);
    expect(behindCall.target).toBe('attack_zone');
    expect(buildCatcherCallSequence(behind30).every((c) => c.target !== 'bury_offspeed')).toBe(true);

    // Ahead 0-2 -> primary call goes for put-away (Low Chase, High Heat, or Corner)
    const ahead02: GameSessionState = { ...base, balls: 0, strikes: 2 };
    expect(['bury_offspeed', 'high_heat', 'paint_corners']).toContain(getCatcherCall(ahead02, 0).target);

    // High Heat is ALWAYS paired with a fastball across diverse counts & seeds, and appears naturally on 2-strike high-velo spots
    let sawHighHeat = false;
    for (let s = 0; s < 60; s += 1) {
      const probe: GameSessionState = {
        ...base,
        rngSeed: 1000 + s * 37,
        stepCounter: s,
        balls: s % 4,
        strikes: s % 3,
      };
      for (const call of buildCatcherCallSequence(probe)) {
        expect(owned.has(call.pitchType)).toBe(true);
        if (call.target === 'high_heat') {
          expect(FASTBALLS.has(call.pitchType)).toBe(true);
          sawHighHeat = true;
        }
      }
    }
    expect(sawHighHeat).toBe(true);

    // Avoids repeating the same pitch 3x in a row as primary call
    const fav = pitcher.pitchArsenal!.favoritePitch;
    const repeated: GameSessionState = { ...base, atBatPitchHistory: [fav, fav] };
    expect(getCatcherCall(repeated, 0).pitchType).not.toBe(fav);
  });

  it('enforces Simple, Normal, and Advanced pitching modes inside resolveIsolatedStepInputs and stepPitch', () => {
    const session = makeHumanPitchingSession(5200);
    const pitcher = getCurrentPitcher(session);
    const nonPrimaryPitch = pitcher.pitchArsenal!.repertoire[1].pitchType;

    // 1. Simple mode: ignores manual target/pitch and executes exact catcher call (including after Shake Off!)
    const catcherFirst = getCatcherCall(session, 0);
    const catcherShaken = getCatcherCall(session, 1);
    const simpleBase: HumanLiveSelections = {
      tacticalCall: 'normal',
      pitchingMode: 'simple',
      shakeOffCount: 0,
      pitchTarget: 'bury_offspeed',
      selectedPitchType: nonPrimaryPitch,
      defensiveShift: 'standard',
      batterGuess: 'none',
      armedPowerId: null,
    };
    const simpleResolved = resolveIsolatedStepInputs(session, simpleBase, createSeededRng(10));
    expect(simpleResolved.options.pitchTarget).toBe(catcherFirst.target);
    expect(simpleResolved.options.requestedPitchType).toBe(catcherFirst.pitchType);

    const shakenResolved = resolveIsolatedStepInputs(
      session,
      { ...simpleBase, shakeOffCount: 1 },
      createSeededRng(10),
    );
    expect(shakenResolved.options.pitchTarget).toBe(catcherShaken.target);
    expect(shakenResolved.options.requestedPitchType).toBe(catcherShaken.pitchType);

    // Executing stepPitch with simpleResolved throws the exact pitch displayed by the catcher!
    const stepped = stepPitch(session, simpleResolved.tacticalCall, simpleResolved.options);
    const pitchEv = stepped.events.find((e) => e.pitchThrown);
    expect(pitchEv?.pitchThrown?.pitchType).toBe(catcherFirst.pitchType);

    // 2. Normal mode: honors manual pitchTarget, clears requestedPitchType to undefined (auto pitch)
    const normalResolved = resolveIsolatedStepInputs(
      session,
      {
        ...simpleBase,
        pitchingMode: 'normal',
        pitchTarget: 'paint_corners',
        selectedPitchType: nonPrimaryPitch,
      },
      createSeededRng(11),
    );
    expect(normalResolved.options.pitchTarget).toBe('paint_corners');
    expect(normalResolved.options.requestedPitchType).toBeUndefined();

    // 3. Advanced mode: honors both manual pitchTarget and manual selectedPitchType
    const advancedResolved = resolveIsolatedStepInputs(
      session,
      {
        ...simpleBase,
        pitchingMode: 'advanced',
        pitchTarget: 'bury_offspeed',
        selectedPitchType: nonPrimaryPitch,
      },
      createSeededRng(12),
    );
    expect(advancedResolved.options.pitchTarget).toBe('bury_offspeed');
    expect(advancedResolved.options.requestedPitchType).toBe(nonPrimaryPitch);
  });

  it('handles clubs with minimal 1-pitch fallback gracefully without crashing', () => {
    const rng = createSeededRng(909);
    const away = createClub(rng, {
      id: 'a',
      city: 'Away',
      name: 'Foxes',
      mascot: 'Fox',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'AF' },
      leagueTier: 'rookie',
      isHuman: false,
    });
    const home = createClub(rng, {
      id: 'h',
      city: 'Home',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#1B4332', secondary: '#1D3557', accent: '#FFC300', monogram: 'HC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const session = createGameSession(away, home, 999);
    const activeId = session.home.activePitcherId;
    session.home.playersById = {
      ...session.home.playersById,
      [activeId]: {
        ...session.home.playersById[activeId],
        pitchArsenal: undefined,
      },
    };
    const call = getCatcherCall(session, 0);
    expect(call.pitchType).toBe('four_seam');
    expect(['attack_zone', 'paint_corners', 'bury_offspeed', 'high_heat']).toContain(call.target);

    // Full count (3-2), 2-2 count, and offspeed-only pitcher without fastballs (no High Heat allowed!)
    const activePitcher = session.home.playersById[activeId];
    session.home.playersById = {
      ...session.home.playersById,
      [activeId]: {
        ...activePitcher,
        pitchArsenal: {
          repertoire: [
            { pitchType: 'slider', mastery: 78 },
            { pitchType: 'changeup', mastery: 70 },
          ],
          favoritePitch: 'slider',
          weakestPitch: 'changeup',
        },
      },
    };
    for (const [balls, strikes] of [
      [3, 2],
      [2, 2],
      [0, 2],
      [2, 0],
      [0, 0],
    ] as const) {
      const seq = buildCatcherCallSequence({ ...session, balls, strikes, stepCounter: balls * 7 + strikes });
      expect(seq.length).toBeGreaterThanOrEqual(2);
      expect(seq.every((c) => c.target !== 'high_heat')).toBe(true);
    }

    // Single-pitch repertoire triggers fallback augmentation cleanly without crashing
    session.home.playersById = {
      ...session.home.playersById,
      [activeId]: {
        ...activePitcher,
        pitchArsenal: {
          repertoire: [{ pitchType: 'slider', mastery: 75 }],
          favoritePitch: 'slider',
          weakestPitch: 'slider',
        },
      },
    };
    const singleSeq = buildCatcherCallSequence({ ...session, balls: 3, strikes: 1 });
    expect(singleSeq.length).toBeGreaterThanOrEqual(2);
  });
});
