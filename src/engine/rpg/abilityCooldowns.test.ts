import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  canTriggerSpecialAbility,
  canUseManagerPower,
  createInitialAbilityCooldownState,
  getMaxSpecialUsesForPlayer,
  recordManagerPowerUse,
  recordSpecialAbilityUse,
  SPECIAL_ABILITY_FATIGUE_COST,
  SPECIAL_ABILITY_HYPE_COST,
  tickAbilityCooldownsOnPitch,
  tickAbilityCooldownsOnPlateAppearance,
} from './abilityCooldowns';

describe('Limited-Use Special Ability Cooldowns & Charge Gates (TASK-056)', () => {
  it('enforces max per-game charges for batters (1, or 2 at Legend Lv 12+), RP (1), and SP (2)', () => {
    const batter = createPlayer(createSeededRng(10), { position: 'CF', tier: 'aa' });
    const legendBatter = { ...batter, level: 12 };
    const rp = createPlayer(createSeededRng(11), { position: 'RP', tier: 'aa' });
    const sp = createPlayer(createSeededRng(12), { position: 'SP', tier: 'aa' });

    expect(getMaxSpecialUsesForPlayer(batter, 'batter')).toBe(1);
    expect(getMaxSpecialUsesForPlayer(legendBatter, 'batter')).toBe(2);
    expect(getMaxSpecialUsesForPlayer(rp, 'pitcher')).toBe(1);
    expect(getMaxSpecialUsesForPlayer(sp, 'pitcher')).toBe(2);
  });

  it('requires Hype >= 75, consumes Hype & adds fatigue, enforces batter 1/game + team 2-PA cooldown', () => {
    const batterA = createPlayer(createSeededRng(20), { position: '1B', tier: 'aa' });
    const batterB = createPlayer(createSeededRng(21), { position: 'RF', tier: 'aa' });
    const pitcher = createPlayer(createSeededRng(22), { position: 'SP', tier: 'aa' });

    let state = createInitialAbilityCooldownState();

    // Insufficient hype blocked
    const lowHype = canTriggerSpecialAbility(state, 'home', batterA, 'batter', 60);
    expect(lowHype.allowed).toBe(false);
    expect(lowHype.hypeRequired).toBe(SPECIAL_ABILITY_HYPE_COST);

    // Ready at >= 75 Hype
    const ready = canTriggerSpecialAbility(state, 'home', batterA, 'batter', 85);
    expect(ready.allowed).toBe(true);
    expect(ready.chargesLeft).toBe(1);

    const used = recordSpecialAbilityUse(state, 'home', batterA, 'batter', 85, 10);
    state = used.nextState;
    expect(used.nextHype).toBe(85 - SPECIAL_ABILITY_HYPE_COST);
    expect(used.nextFatigue).toBe(10 + SPECIAL_ABILITY_FATIGUE_COST);

    // Batter A is now spent (0/1), AND teammate Batter B is blocked by team 2-PA cooldown
    expect(canTriggerSpecialAbility(state, 'home', batterA, 'batter', 100).allowed).toBe(false);
    const teammateBlocked = canTriggerSpecialAbility(state, 'home', batterB, 'batter', 100);
    expect(teammateBlocked.allowed).toBe(false);
    expect(teammateBlocked.cooldownRemaining).toBe(2);

    // Tick 2 plate appearances -> teammate B becomes ready, Batter A still spent
    state = tickAbilityCooldownsOnPlateAppearance(state, 'home', pitcher.id);
    expect(canTriggerSpecialAbility(state, 'home', batterB, 'batter', 100).allowed).toBe(false);
    state = tickAbilityCooldownsOnPlateAppearance(state, 'home', pitcher.id);
    expect(canTriggerSpecialAbility(state, 'home', batterB, 'batter', 100).allowed).toBe(true);
    expect(canTriggerSpecialAbility(state, 'home', batterA, 'batter', 100).allowed).toBe(false);
  });

  it('enforces SP 3-batter & 12-pitch cooldown between super-pitches, RP 1/outing cap, and Manager 1/game power cap', () => {
    const sp = createPlayer(createSeededRng(30), { position: 'SP', tier: 'aa' });
    const rp = createPlayer(createSeededRng(31), { position: 'RP', tier: 'aa' });

    let state = createInitialAbilityCooldownState();
    const firstSp = recordSpecialAbilityUse(state, 'away', sp, 'pitcher', 90, 20);
    state = firstSp.nextState;
    expect(firstSp.nextHype).toBe(15);
    expect(firstSp.nextFatigue).toBe(28);

    // SP still has 1 charge left, but must wait BOTH 3 batters AND 12 pitches
    const cooling = canTriggerSpecialAbility(state, 'away', sp, 'pitcher', 100);
    expect(cooling.allowed).toBe(false);
    expect(cooling.chargesLeft).toBe(1);
    expect(cooling.cooldownRemaining).toBeGreaterThan(0);

    for (let p = 0; p < 12; p += 1) {
      state = tickAbilityCooldownsOnPitch(state, sp.id);
    }
    // 12 pitches elapsed, still 3 batters left -> still cooling
    expect(canTriggerSpecialAbility(state, 'away', sp, 'pitcher', 100).allowed).toBe(false);

    for (let pa = 0; pa < 3; pa += 1) {
      state = tickAbilityCooldownsOnPlateAppearance(state, 'home', sp.id);
    }
    // Now second SP charge is ready!
    expect(canTriggerSpecialAbility(state, 'away', sp, 'pitcher', 100).allowed).toBe(true);
    state = recordSpecialAbilityUse(state, 'away', sp, 'pitcher', 100, 30).nextState;
    // After 2nd use, SP is spent (0/2)
    expect(canTriggerSpecialAbility(state, 'away', sp, 'pitcher', 100).chargesLeft).toBe(0);

    // RP gets strictly 1 use per outing
    expect(canTriggerSpecialAbility(state, 'away', rp, 'pitcher', 100).allowed).toBe(true);
    state = recordSpecialAbilityUse(state, 'away', rp, 'pitcher', 100, 0).nextState;
    expect(canTriggerSpecialAbility(state, 'away', rp, 'pitcher', 100).allowed).toBe(false);

    // Manager Skipper powers: strictly 1 charge per power per game
    expect(canUseManagerPower(state, 'home', 'pep_talk')).toBe(true);
    state = recordManagerPowerUse(state, 'home', 'pep_talk');
    expect(canUseManagerPower(state, 'home', 'pep_talk')).toBe(false);
    expect(canUseManagerPower(state, 'home', 'mound_whisper')).toBe(true);
    expect(canUseManagerPower(state, 'away', 'pep_talk')).toBe(true);
  });
});
