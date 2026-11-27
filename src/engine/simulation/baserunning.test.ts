import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  computeEffectiveStealSpeed,
  computePickoffOutProbability,
  computeStealSuccessProbability,
  computeStealSuccessRate,
  getEligibleStealPlays,
  isStealForcedByWalk,
  isStealPlayLegal,
  resolveBaseStealPlay,
  resolveDefaultStealPlay,
  resolvePickoffAttempt,
  shouldAiAttemptSteal,
  stealPlayToTacticalCall,
  tacticalCallToStealPlay,
} from './baserunning';

describe('Speed-Driven Base Stealing & Baserunning Engine (TASK-070)', () => {
  it('strongly rewards higher runner Speed over slow runners across steal odds and simulations', () => {
    const rng = createSeededRng(7010);
    const speedster = createPlayer(rng, { position: 'CF', tier: 'aa' });
    speedster.ratings.speed = 94;
    speedster.specialistArchetype = 'speed_smallball';
    const slugger = createPlayer(rng, { position: '1B', tier: 'aa' });
    slugger.ratings.speed = 32;
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    pitcher.throws = 'R';
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    catcher.ratings.arm = 65;
    catcher.ratings.fielding = 65;

    const fastProb = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: speedster,
      pitcher,
      catcher,
    });
    const slowProb = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: slugger,
      pitcher,
      catcher,
    });

    expect(computeEffectiveStealSpeed(speedster)).toBeGreaterThan(computeEffectiveStealSpeed(slugger) + 50);
    expect(fastProb).toBeGreaterThan(0.78);
    expect(slowProb).toBeLessThan(0.36);

    // Verify empirical Monte Carlo outcomes match
    const simRngFast = createSeededRng(8801);
    const simRngSlow = createSeededRng(8801);
    let fastSteals = 0;
    let slowSteals = 0;
    for (let i = 0; i < 200; i += 1) {
      const f = resolveBaseStealPlay(
        simRngFast,
        'steal_2b',
        [speedster.id, null, null],
        { [speedster.id]: speedster },
        pitcher,
        catcher,
      );
      if (f?.success) fastSteals += 1;
      const s = resolveBaseStealPlay(
        simRngSlow,
        'steal_2b',
        [slugger.id, null, null],
        { [slugger.id]: slugger },
        pitcher,
        catcher,
      );
      if (s?.success) slowSteals += 1;
    }
    expect(fastSteals).toBeGreaterThan(slowSteals + 70);
  });

  it('supports Steal 2B, Steal 3B, Double Steal, Steal Home, and Pitchout/Hold/Bullpen Coach counters', () => {
    const rng = createSeededRng(7020);
    const fast = createPlayer(rng, { position: 'SS', tier: 'aaa' });
    fast.ratings.speed = 92;
    const trail = createPlayer(rng, { position: '2B', tier: 'aaa' });
    trail.ratings.speed = 80;
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aaa' });
    pitcher.throws = 'R';
    pitcher.ratings.velocity = 65;
    const catcher = createPlayer(rng, { position: 'C', tier: 'aaa' });
    catcher.ratings.arm = 60;
    catcher.ratings.fielding = 60;

    const map = { [fast.id]: fast, [trail.id]: trail };

    const prob2b = computeStealSuccessProbability({ playType: 'steal_2b', runner: fast, pitcher, catcher });
    const prob3b = computeStealSuccessProbability({ playType: 'steal_3b', runner: fast, pitcher, catcher });
    const probHome = computeStealSuccessProbability({ playType: 'steal_home', runner: fast, pitcher, catcher });
    const probPitchout = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: fast,
      pitcher,
      catcher,
      defenseCall: 'pitchout',
    });
    const probCoach = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: fast,
      pitcher,
      catcher,
      catcherPopTimeBonus: 5,
    });

    expect(prob2b).toBeGreaterThan(prob3b);
    expect(prob3b).toBeGreaterThan(probHome);
    expect(probPitchout).toBeLessThan(prob2b - 0.25);
    expect(probCoach).toBeLessThan(prob2b);

    // Legal play preview & default resolution across base configurations
    expect(resolveDefaultStealPlay([null, null, null])).toBeNull();
    expect(resolveDefaultStealPlay([fast.id, null, null])).toBe('steal_2b');
    expect(resolveDefaultStealPlay([trail.id, fast.id, null])).toBe('double_steal');
    expect(resolveDefaultStealPlay([null, fast.id, null])).toBe('steal_3b');
    expect(resolveDefaultStealPlay([null, null, fast.id])).toBe('steal_home');

    const optsDouble = getEligibleStealPlays([trail.id, fast.id, null], map, pitcher, catcher);
    expect(optsDouble[0]?.playType).toBe('double_steal');
    expect(optsDouble[0]?.riskTier).toBe('green');

    const optsHome = getEligibleStealPlays([null, null, fast.id], map, pitcher, catcher);
    expect(optsHome[0]?.playType).toBe('steal_home');
    expect(optsHome[0]?.riskTier).toBe('red');

    // Resolve Double Steal & Steal 3B & Steal Home both safe and out across deterministic seeds
    let sawDoubleSafe = false;
    let sawDoubleOut = false;
    let saw3bSafe = false;
    let sawHomeSafe = false;
    let sawHomeOut = false;
    for (let s = 1; s <= 120; s += 1) {
      const ds = resolveBaseStealPlay(createSeededRng(s), 'double_steal', [trail.id, fast.id, null], map, pitcher, catcher);
      if (ds?.success) {
        sawDoubleSafe = true;
        expect(ds.stolenBaseRunnerIds).toHaveLength(2);
        expect(ds.basesAfter).toEqual([null, trail.id, fast.id]);
      } else if (ds) {
        sawDoubleOut = true;
        expect(ds.caughtStealingRunnerId).toBe(fast.id);
        expect(ds.outsAdded).toBe(1);
      }

      const s3 = resolveBaseStealPlay(createSeededRng(s), 'steal_3b', [null, fast.id, null], map, pitcher, catcher);
      if (s3?.success) {
        saw3bSafe = true;
        expect(s3.basesAfter).toEqual([null, null, fast.id]);
      }

      const sh = resolveBaseStealPlay(createSeededRng(s), 'steal_home', [null, null, fast.id], map, pitcher, catcher);
      if (sh?.success) {
        sawHomeSafe = true;
        expect(sh.runsScoredIds).toEqual([fast.id]);
      } else if (sh) {
        sawHomeOut = true;
      }
    }
    expect(sawDoubleSafe && sawDoubleOut && saw3bSafe && sawHomeSafe && sawHomeOut).toBe(true);
    expect(resolveBaseStealPlay(rng, 'steal_2b', [null, null, null], map, pitcher, catcher)).toBeNull();
  });

  it('triggers autonomous AI steals for speedy runners and formats SB% cleanly', () => {
    const club = createClub(createSeededRng(7030), {
      id: 'ai-speed',
      isHuman: false,
      city: 'Metro',
      name: 'Jets',
      mascot: 'Jet',
      colors: { primary: '#2FB356', secondary: '#181B2C', accent: '#FFC300', monogram: 'MJ' },
      leagueTier: 'aa',
      aiArchetype: 'speed_demons',
    });
    const runner = club.roster[0];
    runner.ratings.speed = 92;
    const pitcher = club.roster[club.roster.length - 1];
    const catcher = club.roster[1];
    catcher.ratings.arm = 55;
    const map = { [runner.id]: runner };

    let attempts = 0;
    for (let i = 1; i <= 80; i += 1) {
      const call = shouldAiAttemptSteal(createSeededRng(i), {
        bases: [runner.id, null, null],
        playersById: map,
        pitcher,
        catcher,
        outs: 1,
        scoreDiff: 0,
        aiArchetype: 'speed_demons',
        pitcherFatigue: 40,
        catcherPopTimeBonus: 0,
      });
      if (call === 'steal_2b') attempts += 1;
    }
    expect(attempts).toBeGreaterThan(5);

    // Blowout suppresses pointless steals
    expect(
      shouldAiAttemptSteal(createSeededRng(1), {
        bases: [runner.id, null, null],
        playersById: map,
        pitcher,
        catcher,
        outs: 2,
        scoreDiff: 7,
        aiArchetype: 'speed_demons',
        pitcherFatigue: 0,
        catcherPopTimeBonus: 0,
      }),
    ).toBeNull();

    expect(computeStealSuccessRate(0, 0)).toBe(0);
    expect(computeStealSuccessRate(15, 5)).toBe(75);
  });

  it('validates legal steal plays, forced-by-walk rules, and tactical call conversions (TASK-109)', () => {
    expect(isStealPlayLegal('steal_2b', ['r1', null, null])).toBe(true);
    expect(isStealPlayLegal('steal_2b', ['r1', 'r2', null])).toBe(false);
    expect(isStealPlayLegal('steal_3b', [null, 'r2', null])).toBe(true);
    expect(isStealPlayLegal('steal_3b', [null, 'r2', 'r3'])).toBe(false);
    expect(isStealPlayLegal('double_steal', ['r1', 'r2', null])).toBe(true);
    expect(isStealPlayLegal('double_steal', [null, 'r2', null])).toBe(false);
    expect(isStealPlayLegal('steal_home', [null, null, 'r3'])).toBe(true);
    expect(isStealPlayLegal('steal_home', ['r1', null, null])).toBe(false);

    // Forced-by-walk rules: 1B steals & double steals are always forced; 2B->3B only if 1B occupied; home only if loaded
    expect(isStealForcedByWalk('steal_2b', ['r1', null, null])).toBe(true);
    expect(isStealForcedByWalk('double_steal', ['r1', 'r2', null])).toBe(true);
    expect(isStealForcedByWalk('steal_3b', [null, 'r2', null])).toBe(false);
    expect(isStealForcedByWalk('steal_3b', ['r1', 'r2', null])).toBe(true);
    expect(isStealForcedByWalk('steal_home', [null, null, 'r3'])).toBe(false);
    expect(isStealForcedByWalk('steal_home', ['r1', null, 'r3'])).toBe(false);
    expect(isStealForcedByWalk('steal_home', ['r1', 'r2', 'r3'])).toBe(true);

    expect(stealPlayToTacticalCall('steal_2b')).toBe('steal');
    expect(stealPlayToTacticalCall('steal_3b')).toBe('steal_3b');
    expect(stealPlayToTacticalCall('double_steal')).toBe('double_steal');
    expect(stealPlayToTacticalCall('steal_home')).toBe('steal_home');

    expect(tacticalCallToStealPlay('steal', ['r1', null, null])).toBe('steal_2b');
    expect(tacticalCallToStealPlay('steal', [null, 'r2', null])).toBe('steal_3b');
    expect(tacticalCallToStealPlay('steal_3b', [null, 'r2', null])).toBe('steal_3b');
    expect(tacticalCallToStealPlay('normal', ['r1', null, null])).toBeNull();
  });

  it('computes realistic 1B/2B pickoff odds (LHP edge, runner speed/eye) and lowers steal odds with pickoffHoldModifier (TASK-118)', () => {
    const rng = createSeededRng(11801);
    const lhp = createPlayer(rng, { position: 'SP', tier: 'aa' });
    lhp.throws = 'L';
    lhp.ratings.control = 80;
    lhp.ratings.fielding = 78;
    const rhp = { ...lhp, id: 'rhp-118', throws: 'R' as const };
    const fastRunner = createPlayer(rng, { position: 'CF', tier: 'aa' });
    fastRunner.ratings.speed = 92;
    fastRunner.ratings.eye = 86;
    const slowRunner = createPlayer(rng, { position: '1B', tier: 'aa' });
    slowRunner.ratings.speed = 40;
    slowRunner.ratings.eye = 45;
    const firstBaseman = createPlayer(rng, { position: '1B', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });

    const lhp1b = computePickoffOutProbability(lhp, slowRunner, 1);
    const rhp1b = computePickoffOutProbability(rhp, slowRunner, 1);
    const lhpFast1b = computePickoffOutProbability(lhp, fastRunner, 1);
    const lhp2b = computePickoffOutProbability(lhp, slowRunner, 2);

    expect(lhp1b).toBeGreaterThanOrEqual(0.06);
    expect(lhp1b).toBeLessThanOrEqual(0.14);
    expect(lhp2b).toBeGreaterThanOrEqual(0.04);
    expect(lhp2b).toBeLessThanOrEqual(0.1);
    expect(lhp1b).toBeGreaterThan(rhp1b);
    expect(lhp1b).toBeGreaterThan(lhpFast1b);
    expect(lhp1b).toBeGreaterThan(lhp2b);

    let sawOut = false;
    let sawSafe = false;
    for (let s = 1; s <= 120; s += 1) {
      const res = resolvePickoffAttempt(createSeededRng(11850 + s), {
        base: 1,
        pitcher: lhp,
        runner: slowRunner,
        fielder: firstBaseman,
        fielderPos: '1B',
      });
      if (res.out) {
        sawOut = true;
        expect(res.soundCue).toBe('double_play_snap');
        expect(res.commentary).toMatch(/picked off/i);
      } else {
        sawSafe = true;
        expect(res.soundCue).toBe('dirt_slide');
        expect(res.commentary).toMatch(/safe|back/i);
      }
    }
    expect(sawOut && sawSafe).toBe(true);

    // pickoffHoldModifier reduces next-pitch steal success chance cleanly (up to -12%)
    const baseSteal = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: fastRunner,
      pitcher: rhp,
      catcher,
    });
    const heldOnce = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: fastRunner,
      pitcher: rhp,
      catcher,
      pickoffHoldModifier: 0.06,
    });
    const heldTwice = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: fastRunner,
      pitcher: rhp,
      catcher,
      pickoffHoldModifier: 0.12,
    });
    expect(baseSteal - heldOnce).toBeCloseTo(0.06, 2);
    expect(baseSteal - heldTwice).toBeCloseTo(0.12, 2);
  });
});
