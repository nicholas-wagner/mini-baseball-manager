import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { generateSixTierWorld } from '../league/seasonEngine';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession, stepPitch } from './baseballEngine';
import {
  evaluateSacFlyTagUp,
  resolveAirOutWithTagUp,
  sampleAirOutDepth,
} from './sacFlyResolver';

function makePlayer(
  seed: number,
  position: 'CF' | 'RF' | '1B' | 'C',
  overrides: Partial<ReturnType<typeof createPlayer>['ratings']> = {},
) {
  const p = createPlayer(createSeededRng(seed), { position, tier: 'aa' });
  return { ...p, ratings: { ...p.ratings, ...overrides } };
}

describe('Sacrifice Fly & Pop-Up Tag-Up Engine (Depth, Runner Speed, Outfielder Arm & Outfield Assist DP)', () => {
  it('scales tag-up attempt and safe probabilities by fly depth, runner speed, and outfielder arm', () => {
    const deepAvg = evaluateSacFlyTagUp({ depth: 'deep', runnerSpeed: 60, outfielderArm: 60 });
    const mediumAvg = evaluateSacFlyTagUp({ depth: 'medium', runnerSpeed: 60, outfielderArm: 60 });
    const shallowAvg = evaluateSacFlyTagUp({ depth: 'shallow', runnerSpeed: 60, outfielderArm: 60 });

    // Deeper flies are far safer and tagged on far more often than shallow flies/pop-ups
    expect(deepAvg.attemptProb).toBeGreaterThan(mediumAvg.attemptProb);
    expect(mediumAvg.attemptProb).toBeGreaterThan(shallowAvg.attemptProb);
    expect(deepAvg.safeProb).toBeGreaterThan(mediumAvg.safeProb);
    expect(mediumAvg.safeProb).toBeGreaterThan(shallowAvg.safeProb);
    expect(deepAvg.scoreOrAdvancePct + deepAvg.thrownOutPct + deepAvg.holdPct).toBe(100);

    // Runner speed increases safe chance; great outfielder arm increases thrown-out risk
    const fastVsWeak = evaluateSacFlyTagUp({ depth: 'medium', runnerSpeed: 92, outfielderArm: 42 });
    const slowVsCannon = evaluateSacFlyTagUp({ depth: 'medium', runnerSpeed: 34, outfielderArm: 95 });
    expect(fastVsWeak.safeProb).toBeGreaterThan(0.85);
    expect(slowVsCannon.safeProb).toBeLessThan(0.38);
    expect(slowVsCannon.thrownOutPct).toBeGreaterThan(fastVsWeak.thrownOutPct * 2);
  });

  it('keeps most pop-ups in the infield while allowing deeper shallow-OF pop-ups and power-scaled fly depths', () => {
    let infieldPops = 0;
    let shallowOfPops = 0;
    for (let i = 0; i < 300; i += 1) {
      const d = sampleAirOutDepth(createSeededRng(100 + i), 'pop_up', 60);
      if (d === 'infield_pop') infieldPops += 1;
      else if (d === 'shallow') shallowOfPops += 1;
    }
    expect(infieldPops).toBeGreaterThan(180);
    expect(shallowOfPops).toBeGreaterThan(30);

    // Slugger hits deeper fly outs than weak-power batter
    let sluggerDeep = 0;
    let slapDeep = 0;
    for (let i = 0; i < 300; i += 1) {
      if (sampleAirOutDepth(createSeededRng(500 + i), 'fly_ball', 92) === 'deep') sluggerDeep += 1;
      if (sampleAirOutDepth(createSeededRng(500 + i), 'fly_ball', 32) === 'deep') slapDeep += 1;
    }
    expect(sluggerDeep).toBeGreaterThan(slapDeep + 30);
  });

  it('produces sac flies, holds, and outfield-assist double plays when slow runners or shallow popups test a great arm', () => {
    const batter = makePlayer(1, 'CF', { power: 60 });
    const fastRunner = makePlayer(2, 'CF', { speed: 92 });
    const slowRunner = makePlayer(3, '1B', { speed: 34 });
    const cannonRf = makePlayer(4, 'RF', { arm: 96, fielding: 75 });
    const weakRf = makePlayer(5, 'RF', { arm: 40, fielding: 60 });
    const catcher = makePlayer(6, 'C', { fielding: 72, arm: 70 });

    const runTrials = (
      battedBallType: 'fly_ball' | 'pop_up',
      runner: ReturnType<typeof makePlayer>,
      arm: number,
      outfielder: ReturnType<typeof makePlayer>,
    ) => {
      const counts = { sacFly: 0, thrownOutDp: 0, hold: 0, infieldPop: 0 };
      for (let i = 0; i < 400; i += 1) {
        const res = resolveAirOutWithTagUp({
          rng: createSeededRng(3000 + i),
          batter,
          outs: 0,
          bases: [null, null, runner.id],
          battedBallType,
          outfieldSpot: { pos: 'RF', x: 15, z: -28 },
          outfielder,
          effectiveArm: arm,
          catcher,
          thirdBaseRunner: runner,
          secondBaseRunner: null,
        });
        if (!res) counts.infieldPop += 1;
        else if (res.outcome === 'sac_fly') counts.sacFly += 1;
        else if (res.outsAdded === 2 && res.advanceOnOut === 'sac_fly_out_home') counts.thrownOutDp += 1;
        else counts.hold += 1;
      }
      return counts;
    };

    const fastVsWeakFly = runTrials('fly_ball', fastRunner, 40, weakRf);
    const slowVsCannonFly = runTrials('fly_ball', slowRunner, 96, cannonRf);
    const popTrials = runTrials('pop_up', slowRunner, 90, cannonRf);

    // Fast runner vs weak arm scores way more sac flies and gets thrown out far less
    expect(fastVsWeakFly.sacFly).toBeGreaterThan(slowVsCannonFly.sacFly * 2);
    expect(slowVsCannonFly.thrownOutDp).toBeGreaterThan(fastVsWeakFly.thrownOutDp * 2);
    expect(slowVsCannonFly.thrownOutDp).toBeGreaterThan(35);

    // Pop-ups mostly stay infield/hold, and when shallow-OF pop-ups ARE tagged against a cannon arm, runner gets gunned down more than scoring!
    expect(popTrials.infieldPop).toBeGreaterThan(220);
    expect(popTrials.thrownOutDp).toBeGreaterThan(popTrials.sacFly);
  });

  it('credits 2 outs and 0 runs on a live outfield-assist tag-up double play inside stepPitch', () => {
    const world = generateSixTierWorld(3131, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });
    const [away, home] = world.leagues.rookie;
    const thirdId = away.lineup[1].playerId;

    let sawTagOutDp = false;
    let sawSacFlyScore = false;
    for (let i = 0; i < 600; i += 1) {
      const base = createGameSession(away, home, 12000 + i);
      // Give 3B runner slow speed (36) and all home outfielders cannon arms (95) to surface tag-out DPs
      const awayPlayers = {
        ...base.away.playersById,
        [thirdId]: {
          ...base.away.playersById[thirdId],
          ratings: { ...base.away.playersById[thirdId].ratings, speed: i < 300 ? 36 : 92 },
        },
      };
      const homePlayers = Object.fromEntries(
        Object.entries(base.home.playersById).map(([id, p]) => [
          id,
          { ...p, ratings: { ...p.ratings, arm: i < 300 ? 96 : 45 } },
        ]),
      );
      const spot = {
        ...base,
        outs: 0,
        bases: [null, null, thirdId] as [string | null, string | null, string | null],
        away: { ...base.away, playersById: awayPlayers },
        home: { ...base.home, playersById: homePlayers },
      };
      const step = stepPitch(spot, 'normal');
      const dpEv = step.events.find(
        (e) => e.outcome === 'fly_out' && e.outsAfter - e.outsBefore === 2,
      );
      if (dpEv && step.nextSession.away.score === 0 && step.nextSession.bases[2] === null) {
        sawTagOutDp = true;
      }
      const sacEv = step.events.find((e) => e.outcome === 'sac_fly');
      if (sacEv && step.nextSession.away.score === 1 && step.nextSession.outs === 1) {
        sawSacFlyScore = true;
      }
      if (sawTagOutDp && sawSacFlyScore) break;
    }

    expect(sawTagOutDp).toBe(true);
    expect(sawSacFlyScore).toBe(true);
  });

  it('supports tagging up from 2B to 3B on deep/medium flies as well as outfield assists cutting down slow runners at 3B', () => {
    const batter = makePlayer(11, 'CF', { power: 78 });
    const fastRunner = makePlayer(12, 'CF', { speed: 92 });
    const slowRunner = makePlayer(13, '1B', { speed: 32 });
    const cannonRf = makePlayer(14, 'RF', { arm: 96, fielding: 75 });

    let tagSafe = 0;
    let tagOut = 0;
    for (let i = 0; i < 300; i += 1) {
      const resFast = resolveAirOutWithTagUp({
        rng: createSeededRng(4100 + i),
        batter,
        outs: 0,
        bases: [null, fastRunner.id, null],
        battedBallType: 'fly_ball',
        outfieldSpot: { pos: 'RF', x: 15, z: -32 },
        outfielder: cannonRf,
        effectiveArm: 55,
        thirdBaseRunner: null,
        secondBaseRunner: fastRunner,
      });
      if (resFast?.advanceOnOut === 'tag_up_2b') tagSafe += 1;

      const resSlow = resolveAirOutWithTagUp({
        rng: createSeededRng(4500 + i),
        batter,
        outs: 0,
        bases: [null, slowRunner.id, null],
        battedBallType: 'fly_ball',
        outfieldSpot: { pos: 'RF', x: 15, z: -32 },
        outfielder: cannonRf,
        effectiveArm: 96,
        thirdBaseRunner: null,
        secondBaseRunner: slowRunner,
      });
      if (resSlow?.advanceOnOut === 'tag_up_out_3b' && resSlow.outsAdded === 2) tagOut += 1;
    }

    expect(tagSafe).toBeGreaterThan(80);
    expect(tagOut).toBeGreaterThan(20);
  });
});
