import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import { createSeededRng } from '../rng/seededRng';
import {
  chooseAiBattingCall,
  chooseAiDefensiveShift,
  chooseAiPitchTarget,
  resolveIsolatedStepInputs,
  type HumanLiveSelections,
} from './aiManager';
import { createGameSession, stepHalfInning, stepPitch } from './baseballEngine';
import type { GameSessionState } from './gameState';

function makeHumanVsAiSession(humanHome: boolean, seed = 4100): GameSessionState {
  const world = generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  });
  const human = world.leagues.rookie[0];
  const ai = world.leagues.rookie[1];
  return humanHome ? createGameSession(ai, human, seed + 1) : createGameSession(human, ai, seed + 1);
}

const DEFAULT_HUMAN: HumanLiveSelections = {
  tacticalCall: 'normal',
  pitchTarget: 'high_heat',
  selectedPitchType: null,
  defensiveShift: 'standard',
  batterGuess: 'none',
  armedPowerId: null,
};

describe('PC / AI Manager Independence & Human Role Isolation', () => {
  it('never forces human bunt, swing call, or batterGuess onto the PC batting team', () => {
    // Human is HOME -> TOP of inning 1 means PC (away) is batting and Human (home) is pitching
    const pcBatting = makeHumanVsAiSession(true, 4100);
    expect(pcBatting.away.isHuman).toBe(false);
    expect(pcBatting.home.isHuman).toBe(true);

    const leakedHuman: HumanLiveSelections = {
      tacticalCall: 'bunt',
      pitchTarget: 'paint_corners',
      selectedPitchType: 'four_seam',
      defensiveShift: 'infield_in',
      batterGuess: 'fastball',
      armedPowerId: null,
    };

    // Bases empty, 0 outs: PC should NEVER be forced to bunt despite human's leftover 'bunt' call!
    let aiBuntCount = 0;
    for (let i = 0; i < 40; i += 1) {
      const resolved = resolveIsolatedStepInputs(pcBatting, leakedHuman, createSeededRng(7000 + i));
      if (resolved.tacticalCall === 'bunt') aiBuntCount += 1;
      expect(resolved.options.batterGuess).toBe('none');
      // Human's defensive controls STILL apply to the human pitcher/defense
      expect(resolved.options.pitchTarget).toBe('paint_corners');
      expect(resolved.options.defensiveShift).toBe('infield_in');
    }
    expect(aiBuntCount).toBe(0);

    // Passing human 'hold_runner' preserves stealDefenseCall while PC batter still bats normally
    const holdRes = resolveIsolatedStepInputs(
      pcBatting,
      { ...DEFAULT_HUMAN, tacticalCall: 'hold_runner' },
      createSeededRng(7200),
    );
    expect(holdRes.options.stealDefenseCall).toBe('hold_runner');
    expect(holdRes.tacticalCall).not.toBe('hold_runner');

    // Passing human 'intentional_walk' or 'pitchout' DOES execute the human defensive call
    const ibbRes = resolveIsolatedStepInputs(
      pcBatting,
      { ...DEFAULT_HUMAN, tacticalCall: 'intentional_walk' },
      createSeededRng(7201),
    );
    expect(ibbRes.tacticalCall).toBe('intentional_walk');
  });

  it('never forces human defensiveShift, pitchTarget, or selectedPitchType onto the PC fielding team', () => {
    // Human is AWAY -> TOP of inning 1 means Human (away) is batting and PC (home) is pitching/fielding
    const humanBatting = makeHumanVsAiSession(false, 4200);
    expect(humanBatting.away.isHuman).toBe(true);
    expect(humanBatting.home.isHuman).toBe(false);

    const leakedDefense: HumanLiveSelections = {
      tacticalCall: 'bunt',
      pitchTarget: 'bury_offspeed',
      selectedPitchType: 'curveball',
      defensiveShift: 'bunt_defense',
      batterGuess: 'offspeed',
      armedPowerId: null,
    };

    const resolved = resolveIsolatedStepInputs(humanBatting, leakedDefense, createSeededRng(7300));
    // Human's offensive controls apply
    expect(resolved.tacticalCall).toBe('bunt');
    expect(resolved.options.batterGuess).toBe('offspeed');
    // PC pitching/fielding controls are completely independent of human's leftover pitch/shift choices!
    expect(resolved.options.requestedPitchType).toBeUndefined();
    expect(resolved.options.defensiveShift).toBe('standard'); // Bases empty 0 outs -> PC plays standard, NOT human's bunt_defense!
  });

  it('makes independent situational PC defensive shifts, pitch targets, and batting calls', () => {
    const humanBatting = makeHumanVsAiSession(false, 4300);

    // 1. PC brings infield_in with a runner on 3B and < 2 outs in a close game
    const runnerOnThird: GameSessionState = {
      ...humanBatting,
      outs: 1,
      bases: [null, null, humanBatting.away.lineup[0].playerId],
    };
    expect(chooseAiDefensiveShift(runnerOnThird)).toBe('infield_in');

    // 2. PC plays standard with bases empty in inning 1
    expect(chooseAiDefensiveShift(humanBatting)).toBe('standard');

    // 3. PC pitch target varies meaningfully by count (behind 3-0 attacks zone vs ahead 0-2 goes chase/heat/corners)
    const behind30: GameSessionState = { ...humanBatting, balls: 3, strikes: 0 };
    const ahead02: GameSessionState = { ...humanBatting, balls: 0, strikes: 2 };
    let zoneWhenBehind = 0;
    let chaseOrHeatWhenAhead = 0;
    for (let i = 0; i < 60; i += 1) {
      if (chooseAiPitchTarget(createSeededRng(8000 + i), behind30) === 'attack_zone') {
        zoneWhenBehind += 1;
      }
      const aheadTarget = chooseAiPitchTarget(createSeededRng(8500 + i), ahead02);
      if (aheadTarget === 'bury_offspeed' || aheadTarget === 'high_heat') {
        chaseOrHeatWhenAhead += 1;
      }
    }
    expect(zoneWhenBehind).toBeGreaterThan(35);
    expect(chaseOrHeatWhenAhead).toBeGreaterThan(30);

    // 4. PC batter chooses varied independent approaches across counts without spamming bunts
    const pcBatting = makeHumanVsAiSession(true, 4400);
    const twoStrikeSession: GameSessionState = { ...pcBatting, balls: 0, strikes: 2 };
    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      seen.add(chooseAiBattingCall(createSeededRng(9000 + i), twoStrikeSession));
    }
    expect(seen.has('contact')).toBe(true);
    expect(seen.has('bunt')).toBe(false);
  });

  it('enforces PC independence inside stepPitch and stepHalfInning when enforceSideOwnership is true', () => {
    // PC (away) batting, Human (home) pitching — passing stale 'bunt' MUST NOT make PC bunt!
    const pcBatting = makeHumanVsAiSession(true, 4500);
    let sawBuntEvent = false;
    let current = pcBatting;
    for (let i = 0; i < 20 && current.half === 'TOP' && current.status === 'in_progress'; i += 1) {
      const step = stepPitch(current, 'bunt', { enforceSideOwnership: true });
      current = step.nextSession;
      if (
        step.events.some(
          (e) =>
            e.outcome === 'bunt_out' ||
            e.outcome === 'bunt_single' ||
            e.mathBreakdown?.activeModifiers?.some((m) => /\bbunt\b/i.test(m)),
        )
      ) {
        sawBuntEvent = true;
      }
    }
    expect(sawBuntEvent).toBe(false);

    // Simming a half-inning with stale 'bunt' does NOT make an entire PC inning bunt either
    const half = stepHalfInning(pcBatting, 'bunt', { enforceSideOwnership: true });
    const pcBunts = half.events.filter(
      (e) =>
        e.outcome === 'bunt_out' ||
        e.outcome === 'bunt_single' ||
        e.mathBreakdown?.activeModifiers?.some((m) => /\bbunt\b/i.test(m)),
    );
    expect(pcBunts.length).toBeLessThanOrEqual(1);
  });
});
