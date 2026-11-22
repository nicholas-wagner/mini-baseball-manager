import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession, stepPitch } from './baseballEngine';
import {
  applyMoundVisit,
  applyPinchHitter,
  applyPinchRunner,
  getAvailableBenchPlayers,
  resolveArgueCallGamble,
} from './dugoutDrama';
import {
  classifyPitchFamily,
  evaluateBatterGuessEffect,
  evaluatePitchTargetEffect,
} from './pitchMindGames';
import { resolveSinglePitch } from './pitchResolver';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

describe('Pitcher/Batter Mind Games (Guess Pitch & Zone Target) + Live Dugout Drama', () => {
  it('classifies pitch families accurately and rewards correct pitch guesses while penalizing wrong guesses', () => {
    expect(classifyPitchFamily('four_seam')).toBe('fastball');
    expect(classifyPitchFamily('two_seam')).toBe('fastball');
    expect(classifyPitchFamily('slider')).toBe('offspeed');
    expect(classifyPitchFamily('changeup')).toBe('offspeed');

    const lockedIn = evaluateBatterGuessEffect('fastball', 'four_seam');
    const fooled = evaluateBatterGuessEffect('fastball', 'slider');
    const neutral = evaluateBatterGuessEffect('none', 'four_seam');

    expect(lockedIn.status).toBe('locked_in');
    expect(lockedIn.contactDelta).toBeGreaterThanOrEqual(12);
    expect(lockedIn.powerDelta).toBeGreaterThanOrEqual(10);
    expect(fooled.status).toBe('fooled');
    expect(fooled.contactDelta).toBeLessThan(0);
    expect(neutral.status).toBe('none');
    expect(neutral.contactDelta).toBe(0);

    const highHeat = evaluatePitchTargetEffect('high_heat', 'four_seam');
    const highHeatOffspeed = evaluatePitchTargetEffect('high_heat', 'slider');
    const bury = evaluatePitchTargetEffect('bury_offspeed', 'slider');
    const buryFastball = evaluatePitchTargetEffect('bury_offspeed', 'four_seam');
    const attack = evaluatePitchTargetEffect('attack_zone', 'four_seam');
    const paint = evaluatePitchTargetEffect('paint_corners', 'curveball');
    expect(evaluatePitchTargetEffect(undefined, 'four_seam')).toBeNull();
    expect(highHeat?.mphBonus).toBeGreaterThanOrEqual(2);
    expect(highHeatOffspeed?.mphBonus).toBe(0);
    expect(bury?.chaseRateDelta).toBeGreaterThanOrEqual(0.08);
    expect(buryFastball?.chaseRateDelta).toBeLessThan(bury?.chaseRateDelta ?? 1);
    expect(attack?.zoneProbDelta).toBeGreaterThan(0);
    expect(paint?.controlDelta).toBeGreaterThan(0);
  });

  it('statistically increases hits & HRs when guessing pitch right vs guessing wrong in pitchResolver', () => {
    const rng = createSeededRng(1001);
    const batter = createPlayer(rng, { position: 'RF', tier: 'aa' });
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    const defender = createPlayer(rng, { position: 'CF', tier: 'aa' });

    const baseCtx = {
      batter,
      pitcher,
      catcher,
      defender,
      defenderPos: 'CF' as const,
      firstBaseRunner: null,
      balls: 1,
      strikes: 1,
      outs: 1,
      inning: 5,
      pitchingLead: 0,
      bases: [null, null, null] as [null, null, null],
      pitcherFatigue: 10,
      battingHype: 30,
      fieldingHype: 30,
      canBatterTriggerSpecial: false,
      canPitcherTriggerSpecial: false,
      leverageIndex: 1.2,
      tacticalCall: 'normal' as const,
      atBatPitchHistory: [] as const,
      requestedPitchType: 'four_seam' as const,
    };

    let hitsLocked = 0;
    let hitsFooled = 0;
    for (let i = 0; i < 600; i += 1) {
      const rRight = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(70000 + i),
        batterGuess: 'fastball',
      });
      const rWrong = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(70000 + i),
        batterGuess: 'offspeed',
      });
      if (rRight.totalBases && rRight.outcome !== 'fielding_error') hitsLocked += 1;
      if (rWrong.totalBases && rWrong.outcome !== 'fielding_error') hitsFooled += 1;
    }

    expect(hitsLocked).toBeGreaterThan(hitsFooled * 1.3);
  });

  it('supports Pinch Hitter, Pinch Runner, Mound Visit & Argue-Call Kick Dirt gamble in live games', () => {
    const rng = createSeededRng(1002);
    const away = createClub(rng, { id: 'a', city: 'Away', name: 'Foxes', mascot: 'Fox', colors: COLORS, leagueTier: 'aa', isHuman: false });
    const home = createClub(rng, { id: 'h', city: 'Home', name: 'Comets', mascot: 'Comet', colors: COLORS, leagueTier: 'aa', isHuman: true });
    let session = createGameSession(away, home, 555);
    session.half = 'BOT';

    const bench = getAvailableBenchPlayers(session, 'home');
    expect(bench.length).toBeGreaterThanOrEqual(2);

    // 1. Pinch Hitter
    const phRes = applyPinchHitter(session, 'home', bench[0].id);
    expect(phRes.applied).toBe(true);
    expect(phRes.nextSession.home.lineup[phRes.nextSession.home.lineupIndex].playerId).toBe(bench[0].id);
    expect(phRes.nextSession.boxScore.homeBatters[bench[0].id]).toBeDefined();
    session = phRes.nextSession;

    // 2. Pinch Runner on 2B
    const originalRunnerId = session.home.lineup[(session.home.lineupIndex + 1) % 9].playerId;
    session.bases = [null, originalRunnerId, null];
    const prRes = applyPinchRunner(session, 'home', 1, bench[1].id);
    expect(prRes.applied).toBe(true);
    expect(prRes.nextSession.bases[1]).toBe(bench[1].id);
    session = prRes.nextSession;

    // 3. Mound Visit variants: calm_breath, fire_up_crowd, quick_hook & guard rails
    session.home.pitcherFatigue = 50;
    const visit = applyMoundVisit(session, 'home', 'calm_breath');
    expect(visit.applied).toBe(true);
    expect(visit.nextSession.home.pitcherFatigue).toBeLessThan(50);
    expect(visit.nextSession.home.hypeGauge).toBeGreaterThan(session.home.hypeGauge);

    const roarVisit = applyMoundVisit(session, 'away', 'fire_up_crowd');
    expect(roarVisit.applied).toBe(true);
    expect(roarVisit.nextSession.away.hypeGauge).toBeGreaterThan(session.away.hypeGauge);

    const bullpenRp = session.home.bullpenIds[0];
    if (bullpenRp) {
      const hookOk = applyMoundVisit(session, 'home', 'quick_hook', bullpenRp);
      expect(hookOk.applied).toBe(true);
      expect(hookOk.nextSession.home.activePitcherId).toBe(bullpenRp);
    }
    expect(applyMoundVisit(session, 'home', 'quick_hook', 'invalid-rp').applied).toBe(false);
    expect(applyPinchHitter(session, 'home', 'missing-player').applied).toBe(false);
    expect(applyPinchRunner(session, 'home', 0, bench[1].id).applied).toBe(false);
    expect(
      applyMoundVisit({ ...session, status: 'completed' }, 'home', 'calm_breath').applied,
    ).toBe(false);

    // Also verify away-side pinch hit, pinch run & argue-call paths
    const awayBench = getAvailableBenchPlayers(session, 'away');
    expect(applyPinchHitter(session, 'away', awayBench[0].id).applied).toBe(true);
    session.bases = [session.away.lineup[0].playerId, null, null];
    expect(applyPinchRunner(session, 'away', 0, awayBench[1].id).applied).toBe(true);
    expect(resolveArgueCallGamble(createSeededRng(77), session, 'away').hypeGained).toBeGreaterThan(0);

    // 4. Argue Call / Kick Dirt gamble triggers either fire-up or humorous ejection across seeds
    let sawFireUp = false;
    let sawEjection = false;
    for (let s = 1; s <= 40; s += 1) {
      const argue = resolveArgueCallGamble(createSeededRng(s * 97), session, 'home');
      expect(argue.nextSession.home.hypeGauge).toBeGreaterThan(session.home.hypeGauge);
      if (argue.ejected) sawEjection = true;
      else sawFireUp = true;
    }
    expect(sawFireUp).toBe(true);
    expect(sawEjection).toBe(true);

    // 5. stepPitch threads pitchTarget & batterGuess into mathBreakdown modifiers
    const stepped = stepPitch(session, 'normal', {
      pitchTarget: 'paint_corners',
      batterGuess: 'fastball',
    });
    const ev = stepped.events.find((e) => e.mathBreakdown);
    expect(ev?.mathBreakdown?.activeModifiers.some((m) => /paint corners/i.test(m))).toBe(true);
  });
});
