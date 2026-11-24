import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { generateSixTierWorld } from '../league/seasonEngine';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession, stepPitch } from './baseballEngine';
import { evaluateBuntOdds, resolveBuntPitch } from './buntResolver';

function makeTestPlayer(
  seed: number,
  position: 'CF' | '1B' | '3B' | 'SP',
  ratingOverrides: Partial<ReturnType<typeof createPlayer>['ratings']>,
) {
  const base = createPlayer(createSeededRng(seed), { position, tier: 'aa' });
  return {
    ...base,
    ratings: { ...base.ratings, ...ratingOverrides },
  };
}

describe('TASK-081 — Realistic Bunt Engine (Whiff / Foul / Pop-Up / Speed / Fielding / Shift / Pitch Quality)', () => {
  it('centers baseline bunt probabilities around ~5% whiff, ~20% foul, ~15% pop-up and ~60% in-play for a neutral 60-rated matchup', () => {
    const batter = makeTestPlayer(10, 'CF', { bunt: 60, speed: 60 });
    const pitcher = makeTestPlayer(20, 'SP', { velocity: 60, movement: 60, control: 60, fielding: 60 });
    const charger = makeTestPlayer(30, '3B', { fielding: 60, range: 60, arm: 60 });

    const odds = evaluateBuntOdds({
      batter,
      pitcher,
      pitchType: 'two_seam',
      pitchQuality: 60,
      pitchTarget: 'attack_zone',
      defenseShift: 'standard',
      charger,
      firstBaseBonus: 0,
      extraBuntBonus: 0,
      outs: 0,
      hasRunners: true,
    });

    expect(odds.whiffPct).toBeGreaterThanOrEqual(4);
    expect(odds.whiffPct).toBeLessThanOrEqual(6);
    expect(odds.foulPct).toBeGreaterThanOrEqual(18);
    expect(odds.foulPct).toBeLessThanOrEqual(22);
    expect(odds.popUpPct).toBeGreaterThanOrEqual(13);
    expect(odds.popUpPct).toBeLessThanOrEqual(17);
    expect(odds.inPlayPct).toBeGreaterThanOrEqual(56);
    expect(odds.inPlayPct).toBeLessThanOrEqual(64);
    expect(odds.whiffPct + odds.foulPct + odds.popUpPct + odds.inPlayPct).toBe(100);
  });

  it('scales bunt hit, whiff, foul, and pop-up odds by infield alignment, defender fielding/arm, batter speed, bunt skill, and pitch quality', () => {
    const fastSlickBunter = makeTestPlayer(11, 'CF', { bunt: 88, speed: 92 });
    const slowPoorBunter = makeTestPlayer(12, '1B', { bunt: 28, speed: 34 });
    const pitcher = makeTestPlayer(21, 'SP', { velocity: 65, movement: 65, control: 65 });
    const eliteCharger = makeTestPlayer(31, '3B', { fielding: 92, range: 90, arm: 90 });
    const avgCharger = makeTestPlayer(32, '3B', { fielding: 62, range: 62, arm: 62 });

    const standardFast = evaluateBuntOdds({
      batter: fastSlickBunter,
      pitcher,
      pitchType: 'changeup',
      pitchQuality: 55,
      pitchTarget: 'attack_zone',
      defenseShift: 'standard',
      charger: avgCharger,
      firstBaseBonus: 2,
      extraBuntBonus: 0,
      outs: 0,
      hasRunners: false,
    });
    const buntDefFast = evaluateBuntOdds({
      batter: fastSlickBunter,
      pitcher,
      pitchType: 'changeup',
      pitchQuality: 55,
      pitchTarget: 'attack_zone',
      defenseShift: 'bunt_defense',
      charger: eliteCharger,
      firstBaseBonus: 2,
      extraBuntBonus: 0,
      outs: 0,
      hasRunners: false,
    });
    const noDoublesFast = evaluateBuntOdds({
      batter: fastSlickBunter,
      pitcher,
      pitchType: 'changeup',
      pitchQuality: 55,
      pitchTarget: 'attack_zone',
      defenseShift: 'no_doubles',
      charger: avgCharger,
      firstBaseBonus: 2,
      extraBuntBonus: 0,
      outs: 0,
      hasRunners: false,
    });
    const poorVsFilthyHeat = evaluateBuntOdds({
      batter: slowPoorBunter,
      pitcher,
      pitchType: 'four_seam',
      pitchQuality: 92,
      pitchTarget: 'high_heat',
      defenseShift: 'standard',
      charger: eliteCharger,
      firstBaseBonus: 0,
      extraBuntBonus: 0,
      outs: 0,
      hasRunners: false,
    });

    // Infield alignment & defender glove dramatically cut bunt single chance
    expect(buntDefFast.buntSinglePct).toBeLessThan(standardFast.buntSinglePct);
    expect(noDoublesFast.buntSinglePct).toBeGreaterThan(standardFast.buntSinglePct);

    // Poor bunt skill vs elite high heat raises whiff, foul, and pop-up risk and crushes hit chance
    expect(poorVsFilthyHeat.whiffPct).toBeGreaterThan(standardFast.whiffPct);
    expect(poorVsFilthyHeat.foulPct).toBeGreaterThan(standardFast.foulPct);
    expect(poorVsFilthyHeat.popUpPct).toBeGreaterThan(standardFast.popUpPct);
    expect(poorVsFilthyHeat.buntSinglePct).toBeLessThan(standardFast.buntSinglePct);
  });

  it('produces all 5 baseball bunt outcomes across seeded trials and enforces the 2-strike foul-bunt automatic strikeout rule', () => {
    const batter = makeTestPlayer(15, 'CF', { bunt: 62, speed: 74 });
    const pitcher = makeTestPlayer(25, 'SP', { velocity: 72, movement: 70, control: 65 });
    const catcher = createPlayer(createSeededRng(26), { position: 'C', tier: 'aa' });
    const charger = makeTestPlayer(35, '3B', { fielding: 62, range: 60, arm: 64 });

    const counts = { whiff: 0, foul: 0, pop: 0, popByPitcherOrCatcher: 0, single: 0, out: 0 };
    for (let i = 0; i < 400; i += 1) {
      const res = resolveBuntPitch({
        rng: createSeededRng(5000 + i),
        batter,
        pitcher,
        catcher,
        pitchType: 'four_seam',
        pitchSpeedMph: 91,
        pitchQuality: 68,
        pitchTarget: 'attack_zone',
        defenseShift: 'standard',
        charger,
        firstBaseBonus: 1,
        sideX: -1,
        extraBuntBonus: 0,
        strikes: 0,
        outs: 0,
        hasRunners: true,
      });
      expect(res.pitchThrown?.pitchType).toBe('four_seam');
      if (res.outcome === 'swinging_strike') counts.whiff += 1;
      else if (res.outcome === 'foul') counts.foul += 1;
      else if (res.outcome === 'fly_out' && res.battedBallType === 'pop_up') {
        counts.pop += 1;
        const pos = res.fieldingHighlight?.fielderPos;
        if (pos === 'C' || pos === 'SP' || pos === 'RP') counts.popByPitcherOrCatcher += 1;
      }
      else if (res.outcome === 'bunt_single') counts.single += 1;
      else if (res.outcome === 'bunt_out') counts.out += 1;
    }

    expect(counts.whiff).toBeGreaterThan(5);
    expect(counts.foul).toBeGreaterThan(30);
    expect(counts.pop).toBeGreaterThan(20);
    // Pitcher or catcher catches the vast majority (>= 85%) of popped-up bunts
    expect(counts.popByPitcherOrCatcher / counts.pop).toBeGreaterThanOrEqual(0.85);
    expect(counts.single).toBeGreaterThan(20);
    expect(counts.out).toBeGreaterThan(50);

    // 2-strike bunt foul MUST trigger automatic strikeout!
    let sawTwoStrikeBuntK = false;
    for (let i = 0; i < 100; i += 1) {
      const res = resolveBuntPitch({
        rng: createSeededRng(9000 + i),
        batter: makeTestPlayer(16, '1B', { bunt: 40, speed: 45 }),
        pitcher,
        pitchType: 'slider',
        pitchSpeedMph: 84,
        pitchQuality: 78,
        pitchTarget: 'paint_corners',
        defenseShift: 'standard',
        charger,
        firstBaseBonus: 0,
        sideX: -1,
        extraBuntBonus: 0,
        strikes: 2,
        outs: 0,
        hasRunners: true,
      });
      if (res.outcome === 'strikeout' && /foul/i.test(res.commentary)) {
        sawTwoStrikeBuntK = true;
        break;
      }
    }
    expect(sawTwoStrikeBuntK).toBe(true);
  });

  it('advances base runners on a sacrifice bunt out inside stepPitch', () => {
    const world = generateSixTierWorld(1994, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });
    const [away, home] = world.leagues.rookie;

    let sawSacAdvance = false;
    for (let i = 0; i < 80; i += 1) {
      const base = createGameSession(away, home, 7100 + i);
      const runnerId = away.lineup[1].playerId;
      const withRunner = {
        ...base,
        bases: [runnerId, null, null] as [string | null, string | null, string | null],
      };
      const step = stepPitch(withRunner, 'bunt');
      const buntOutEv = step.events.find((e) => e.outcome === 'bunt_out');
      if (buntOutEv && step.nextSession.bases[1] === runnerId && step.nextSession.outs === 1) {
        sawSacAdvance = true;
        break;
      }
    }
    expect(sawSacAdvance).toBe(true);
  });
});
