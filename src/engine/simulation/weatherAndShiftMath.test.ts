import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession, stepPitch } from './baseballEngine';
import { resolveSinglePitch } from './pitchResolver';
import { evaluateWeatherSimulationImpact } from './weather';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

describe('Live Weather, Defensive Shifts & Pitch Math / Dice-Roll Breakdown', () => {
  it('makes Defensive Shifts (Bunt Def, No Doubles, Infield In) measurably affect outcomes', () => {
    const rng = createSeededRng(910);
    const batter = createPlayer(rng, { position: 'CF', tier: 'aa' });
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    const defender = createPlayer(rng, { position: 'SS', tier: 'aa' });

    const baseCtx = {
      batter,
      pitcher,
      catcher,
      defender,
      defenderPos: 'SS' as const,
      firstBaseRunner: null,
      balls: 1,
      strikes: 1,
      outs: 1,
      inning: 5,
      pitchingLead: 0,
      bases: [null, null, null] as [null, null, null],
      pitcherFatigue: 15,
      battingHype: 30,
      fieldingHype: 30,
      canBatterTriggerSpecial: false,
      canPitcherTriggerSpecial: false,
      leverageIndex: 1.1,
      atBatPitchHistory: [] as const,
    };

    let buntStd = 0;
    let buntDef = 0;
    let xbhStd = 0;
    let xbhNoDoubles = 0;

    for (let i = 0; i < 650; i += 1) {
      const rBuntStd = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(30000 + i),
        tacticalCall: 'bunt',
        defensiveShift: 'standard',
      });
      const rBuntDef = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(30000 + i),
        tacticalCall: 'bunt',
        defensiveShift: 'bunt_defense',
      });
      if (rBuntStd.outcome === 'bunt_single') buntStd += 1;
      if (rBuntDef.outcome === 'bunt_single') buntDef += 1;

      const rStd = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(40000 + i),
        tacticalCall: 'normal',
        defensiveShift: 'standard',
      });
      const rDeep = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(40000 + i),
        tacticalCall: 'normal',
        defensiveShift: 'no_doubles',
      });
      if (rStd.outcome === 'double' || rStd.outcome === 'triple') xbhStd += 1;
      if (rDeep.outcome === 'double' || rDeep.outcome === 'triple') xbhNoDoubles += 1;
    }

    expect(buntDef).toBeLessThan(buntStd);
    expect(xbhNoDoubles).toBeLessThan(xbhStd);
  });

  it('makes Ballpark Weather (blowing out vs blowing in wind & wet drizzle) measurably affect HRs, walks & errors', () => {
    const rng = createSeededRng(911);
    const batter = createPlayer(rng, { position: 'RF', tier: 'aaa' });
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    const defender = createPlayer(rng, { position: '3B', tier: 'rookie' });

    const windOut = evaluateWeatherSimulationImpact({
      condition: 'breezy',
      windDirection: 'blowing_out',
      windMph: 18,
      isNightGame: false,
      rainDelayRisk: 0,
    });
    const windIn = evaluateWeatherSimulationImpact({
      condition: 'breezy',
      windDirection: 'blowing_in',
      windMph: 18,
      isNightGame: false,
      rainDelayRisk: 0,
    });
    const drizzle = evaluateWeatherSimulationImpact({
      condition: 'drizzle',
      windDirection: 'calm',
      windMph: 4,
      isNightGame: false,
      rainDelayRisk: 0.22,
    });
    const dome = evaluateWeatherSimulationImpact({
      condition: 'dome_controlled',
      windDirection: 'calm',
      windMph: 0,
      isNightGame: false,
      rainDelayRisk: 0,
    });

    const baseCtx = {
      batter,
      pitcher,
      catcher,
      defender,
      defenderPos: '3B' as const,
      firstBaseRunner: null,
      balls: 1,
      strikes: 1,
      outs: 1,
      inning: 6,
      pitchingLead: 0,
      bases: [null, null, null] as [null, null, null],
      pitcherFatigue: 15,
      battingHype: 30,
      fieldingHype: 30,
      canBatterTriggerSpecial: false,
      canPitcherTriggerSpecial: false,
      leverageIndex: 1.0,
      tacticalCall: 'normal' as const,
      atBatPitchHistory: [] as const,
    };

    let hrOut = 0;
    let hrIn = 0;
    let ballsDrizzle = 0;
    let ballsDome = 0;

    for (let i = 0; i < 800; i += 1) {
      const rOut = resolveSinglePitch({ ...baseCtx, rng: createSeededRng(50000 + i), weatherImpact: windOut });
      const rIn = resolveSinglePitch({ ...baseCtx, rng: createSeededRng(50000 + i), weatherImpact: windIn });
      if (rOut.outcome === 'home_run') hrOut += 1;
      if (rIn.outcome === 'home_run') hrIn += 1;

      const rWet = resolveSinglePitch({ ...baseCtx, rng: createSeededRng(60000 + i), weatherImpact: drizzle });
      const rDry = resolveSinglePitch({ ...baseCtx, rng: createSeededRng(60000 + i), weatherImpact: dome });
      if (rWet.outcome === 'ball') ballsDrizzle += 1;
      if (rDry.outcome === 'ball') ballsDome += 1;
    }

    expect(hrOut).toBeGreaterThan(hrIn);
    expect(ballsDrizzle).toBeGreaterThan(ballsDome);
  });

  it('attaches structured mathBreakdown (ratings, probabilities, shift/weather tags & dice roll) on every pitch via stepPitch', () => {
    const rng = createSeededRng(912);
    const away = createClub(rng, { id: 'a', city: 'Away', name: 'Foxes', mascot: 'Fox', colors: COLORS, leagueTier: 'aa', isHuman: false });
    const home = createClub(rng, { id: 'h', city: 'Home', name: 'Comets', mascot: 'Comet', colors: COLORS, leagueTier: 'aa', isHuman: true });
    const session = createGameSession(away, home, 2026);

    const windOut = evaluateWeatherSimulationImpact({
      condition: 'breezy',
      windDirection: 'blowing_out',
      windMph: 15,
      isNightGame: false,
      rainDelayRisk: 0,
    });
    const stepped = stepPitch(session, 'normal', {
      defensiveShift: 'no_doubles',
      weatherImpact: windOut,
    });
    const pitchEvent = stepped.events.find(
      (ev) => ev.type === 'pitch_thrown' || ev.type === 'ball_in_play',
    );
    expect(pitchEvent?.mathBreakdown).toBeDefined();
    expect(pitchEvent?.mathBreakdown?.effContact).toBeGreaterThan(0);
    expect(pitchEvent?.mathBreakdown?.effStuff).toBeGreaterThan(0);
    expect(pitchEvent?.mathBreakdown?.zonePct).toBeGreaterThanOrEqual(38);
    expect(pitchEvent?.mathBreakdown?.diceRoll).toBeGreaterThanOrEqual(1);
    expect(pitchEvent?.mathBreakdown?.diceRoll).toBeLessThanOrEqual(100);
    expect(pitchEvent?.mathBreakdown?.activeModifiers.some((m) => /no doubles/i.test(m))).toBe(true);
    expect(pitchEvent?.mathBreakdown?.activeModifiers.some((m) => /wind|hr/i.test(m))).toBe(true);
  });
});
