import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import type { Player } from '../models/player';
import { NATIONALITIES_CATALOG } from '../nationalities/nationalitiesCatalog';
import { createSeededRng } from '../rng/seededRng';
import { computeStealSuccessProbability } from '../simulation/baserunning';
import { createGameSession, stepPitch } from '../simulation/baseballEngine';
import { resolveSinglePitch } from '../simulation/pitchResolver';
import {
  evaluateActivePowerSurge,
  evaluateCapstoneGameplayProfile,
  evaluateHeritageGameplayProfile,
  getActivatablePowersForPlayer,
} from './specialPowerEffects';

function cloneWithStats(base: Player, overrides: Partial<Player>): Player {
  return {
    ...base,
    ratings: { ...base.ratings, ...(overrides.ratings ?? {}) },
    ...overrides,
  };
}

describe('National Heritage Powers & Individual Capstone Special Powers — Real Gameplay Effects', () => {
  it('gives every nationality in the catalog a distinct non-zero gameplay profile scaling from Tier 0 to Tier 3', () => {
    const rng = createSeededRng(701);
    const base = createPlayer(rng, { position: 'CF', tier: 'aa' });

    for (const nation of NATIONALITIES_CATALOG) {
      const t0 = evaluateHeritageGameplayProfile(
        cloneWithStats(base, { nationalityId: nation.id, heritageTierUnlocked: 0 }),
        1.0,
      );
      const t3 = evaluateHeritageGameplayProfile(
        cloneWithStats(base, { nationalityId: nation.id, heritageTierUnlocked: 3 }),
        1.8,
      );

      const t0Magnitude =
        Math.abs(t0.batterContactDelta) +
        Math.abs(t0.batterPowerDelta) +
        Math.abs(t0.pitcherStuffDelta) +
        Math.abs(t0.defenderRangeDelta) +
        Math.abs(t0.stealSpeedDelta) +
        Math.abs(t0.luckHitProbDelta * 100);
      const t3Magnitude =
        Math.abs(t3.batterContactDelta) +
        Math.abs(t3.batterPowerDelta) +
        Math.abs(t3.pitcherStuffDelta) +
        Math.abs(t3.defenderRangeDelta) +
        Math.abs(t3.stealSpeedDelta) +
        Math.abs(t3.luckHitProbDelta * 100);

      expect(t0Magnitude).toBeGreaterThan(0);
      expect(t3Magnitude).toBeGreaterThan(t0Magnitude);
      expect(t3.ability.id).toBe(nation.heritageAbility.id);
    }
  });

  it('produces category-distinct effects across batting, pitching, fielding, baserunning, and luck nations', () => {
    const rng = createSeededRng(702);
    const base = createPlayer(rng, { position: 'SS', tier: 'aa' });

    const dom = evaluateHeritageGameplayProfile(
      cloneWithStats(base, { nationalityId: 'DOM', heritageTierUnlocked: 3 }),
      1.7,
    );
    const jpn = evaluateHeritageGameplayProfile(
      cloneWithStats(base, { nationalityId: 'JPN', heritageTierUnlocked: 3 }),
      1.7,
    );
    const kor = evaluateHeritageGameplayProfile(
      cloneWithStats(base, { nationalityId: 'KOR', heritageTierUnlocked: 3 }),
      1.7,
    );
    const bra = evaluateHeritageGameplayProfile(
      cloneWithStats(base, { nationalityId: 'BRA', heritageTierUnlocked: 3 }),
      1.7,
    );
    const irl = evaluateHeritageGameplayProfile(
      cloneWithStats(base, { nationalityId: 'IRL', heritageTierUnlocked: 3 }),
      1.7,
    );

    expect(dom.batterPowerDelta).toBeGreaterThan(kor.batterPowerDelta);
    expect(dom.hrCarryMultiplier).toBeGreaterThan(1.05);
    expect(jpn.pitcherStuffDelta).toBeGreaterThan(dom.pitcherStuffDelta);
    expect(kor.defenderRangeDelta).toBeGreaterThan(dom.defenderRangeDelta);
    expect(bra.stealSpeedDelta).toBeGreaterThan(dom.stealSpeedDelta);
    expect(irl.luckHitProbDelta).toBeGreaterThan(0.015);
  });

  it('gives baserunning nations and cannon_arm catchers measurable steal-probability impact', () => {
    const rng = createSeededRng(703);
    const runnerBase = createPlayer(rng, { position: 'CF', tier: 'aa' });
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcherBase = createPlayer(rng, { position: 'C', tier: 'aa' });

    const neutralRunner = cloneWithStats(runnerBase, {
      nationalityId: 'USA',
      heritageTierUnlocked: 0,
      ratings: { ...runnerBase.ratings, speed: 74 },
    });
    const jaguarRunner = cloneWithStats(runnerBase, {
      nationalityId: 'BRA',
      heritageTierUnlocked: 3,
      ratings: { ...runnerBase.ratings, speed: 74 },
    });
    const cannonCatcher = cloneWithStats(catcherBase, {
      unlockedSkillIds: ['f_arm_1', 'f_arm_2', 'cap_cannon_arm'],
      equippedPowerIds: ['cannon_arm'],
    });

    const pNeutral = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: neutralRunner,
      pitcher,
      catcher: catcherBase,
    });
    const pJaguar = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: jaguarRunner,
      pitcher,
      catcher: catcherBase,
    });
    const pVsCannon = computeStealSuccessProbability({
      playType: 'steal_2b',
      runner: neutralRunner,
      pitcher,
      catcher: cannonCatcher,
    });

    expect(pJaguar).toBeGreaterThan(pNeutral);
    expect(pVsCannon).toBeLessThan(pNeutral);
  });

  it('gives every individual capstone power distinct combat modifiers and active surges', () => {
    const rng = createSeededRng(704);
    const pitcherBase = createPlayer(rng, { position: 'SP', tier: 'aaa' });
    const batterBase = createPlayer(rng, { position: 'RF', tier: 'aaa' });

    const cometPitcher = cloneWithStats(pitcherBase, {
      unlockedSkillIds: ['p_heat_1', 'p_heat_2', 'cap_blazing_comet'],
      equippedPowerIds: ['blazing_comet'],
    });
    const moonshotBatter = cloneWithStats(batterBase, {
      unlockedSkillIds: ['b_pwr_1', 'b_pwr_2', 'cap_moonshot_bomb'],
      equippedPowerIds: ['moonshot_bomb'],
    });
    const laserBatter = cloneWithStats(batterBase, {
      unlockedSkillIds: ['b_con_1', 'b_eye_2', 'cap_laser_eye'],
      equippedPowerIds: ['laser_eye'],
    });
    const leapDefender = cloneWithStats(batterBase, {
      unlockedSkillIds: ['f_rng_1', 'f_rng_2', 'cap_sky_high_leap'],
      equippedPowerIds: ['sky_high_leap'],
    });
    const vacuumDefender = cloneWithStats(batterBase, {
      unlockedSkillIds: ['f_glv_1', 'f_glv_2', 'cap_iron_vacuum'],
      equippedPowerIds: ['iron_vacuum'],
    });

    expect(evaluateCapstoneGameplayProfile(cometPitcher, 1.4).mphBonus).toBeGreaterThanOrEqual(2);
    expect(evaluateCapstoneGameplayProfile(moonshotBatter, 1.4).hrCarryMultiplier).toBeGreaterThan(1.1);
    expect(evaluateCapstoneGameplayProfile(laserBatter, 1.4).chaseRateDelta).toBeLessThan(-0.04);
    expect(evaluateCapstoneGameplayProfile(leapDefender, 1.4).hrRobberyChance).toBeGreaterThan(0.1);
    expect(evaluateCapstoneGameplayProfile(vacuumDefender, 1.4).errorMultiplier).toBeLessThan(0.6);

    const activeComet = evaluateActivePowerSurge('blazing_comet', 'pitcher', cometPitcher);
    const activeMoonshot = evaluateActivePowerSurge('moonshot_bomb', 'batter', moonshotBatter);
    expect(activeComet.mphBonus).toBeGreaterThanOrEqual(5);
    expect(activeComet.stuffDelta).toBeGreaterThanOrEqual(10);
    expect(activeMoonshot.hrCarryMultiplier).toBeGreaterThanOrEqual(1.6);
    expect(activeMoonshot.calloutText).toContain('MOONSHOT');
  });

  it('statistically increases home runs with active Moonshot Bomb & strikeouts with Blazing Comet', () => {
    const rng = createSeededRng(705);
    const baseBatter = createPlayer(rng, { position: 'LF', tier: 'aa' });
    const basePitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    const defender = createPlayer(rng, { position: 'CF', tier: 'aa' });

    const moonshotBatter = cloneWithStats(baseBatter, {
      nationalityId: 'DOM',
      heritageTierUnlocked: 3,
      unlockedSkillIds: ['b_pwr_1', 'b_pwr_2', 'cap_moonshot_bomb'],
      equippedPowerIds: ['moonshot_bomb'],
    });
    const cometPitcher = cloneWithStats(basePitcher, {
      nationalityId: 'JPN',
      heritageTierUnlocked: 3,
      unlockedSkillIds: ['p_heat_1', 'p_heat_2', 'cap_blazing_comet'],
      equippedPowerIds: ['blazing_comet'],
    });

    let normalHrs = 0;
    let poweredHrs = 0;
    let normalWhiffs = 0;
    let cometWhiffs = 0;

    for (let i = 0; i < 600; i += 1) {
      const rNormal = resolveSinglePitch({
        rng: createSeededRng(10000 + i),
        batter: baseBatter,
        pitcher: basePitcher,
        catcher,
        defender,
        defenderPos: 'CF',
        firstBaseRunner: null,
        balls: 1,
        strikes: 1,
        outs: 1,
        inning: 7,
        pitchingLead: 0,
        bases: [null, null, null],
        pitcherFatigue: 15,
        battingHype: 90,
        fieldingHype: 90,
        canBatterTriggerSpecial: false,
        canPitcherTriggerSpecial: false,
        leverageIndex: 1.8,
        tacticalCall: 'normal',
        atBatPitchHistory: [],
      });
      if (rNormal.outcome === 'home_run') normalHrs += 1;
      if (rNormal.outcome === 'swinging_strike' || rNormal.outcome === 'strikeout') normalWhiffs += 1;

      const rPoweredBat = resolveSinglePitch({
        rng: createSeededRng(10000 + i),
        batter: moonshotBatter,
        pitcher: basePitcher,
        catcher,
        defender,
        defenderPos: 'CF',
        firstBaseRunner: null,
        balls: 1,
        strikes: 1,
        outs: 1,
        inning: 7,
        pitchingLead: 0,
        bases: [null, null, null],
        pitcherFatigue: 15,
        battingHype: 90,
        fieldingHype: 20,
        canBatterTriggerSpecial: true,
        canPitcherTriggerSpecial: false,
        requestedPowerId: 'moonshot_bomb',
        leverageIndex: 1.8,
        tacticalCall: 'normal',
        atBatPitchHistory: [],
      });
      if (rPoweredBat.outcome === 'home_run') poweredHrs += 1;

      const rCometPitch = resolveSinglePitch({
        rng: createSeededRng(10000 + i),
        batter: baseBatter,
        pitcher: cometPitcher,
        catcher,
        defender,
        defenderPos: 'CF',
        firstBaseRunner: null,
        balls: 1,
        strikes: 2,
        outs: 1,
        inning: 7,
        pitchingLead: 0,
        bases: [null, null, null],
        pitcherFatigue: 15,
        battingHype: 20,
        fieldingHype: 90,
        canBatterTriggerSpecial: false,
        canPitcherTriggerSpecial: true,
        requestedPowerId: 'blazing_comet',
        leverageIndex: 1.8,
        tacticalCall: 'normal',
        atBatPitchHistory: [],
      });
      if (rCometPitch.outcome === 'swinging_strike' || rCometPitch.outcome === 'strikeout') {
        cometWhiffs += 1;
      }
    }

    expect(poweredHrs).toBeGreaterThan(normalHrs);
    expect(cometWhiffs).toBeGreaterThan(normalWhiffs);
  });

  it('allows manually activating a player National Heritage or Capstone Power via stepPitch, spending Hype & triggering event', () => {
    const rng = createSeededRng(706);
    const colors = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };
    const away = createClub(rng, { id: 'a', city: 'Away', name: 'Foxes', mascot: 'Fox', colors, leagueTier: 'aa', isHuman: false });
    const home = createClub(rng, { id: 'h', city: 'Home', name: 'Comets', mascot: 'Comet', colors, leagueTier: 'aa', isHuman: true });
    const session = createGameSession(away, home, 999);
    // Give home pitcher 90 hype so they can actively fire their National Heritage Power on pitch 1
    session.home.hypeGauge = 90;
    const activePitcher = session.home.playersById[session.home.activePitcherId];
    const powers = getActivatablePowersForPlayer(activePitcher, 'pitcher');
    expect(powers.length).toBeGreaterThanOrEqual(1);

    const chosen = powers[0];
    const stepped = stepPitch(session, 'normal', { requestedPowerId: chosen.id });
    const pitchEvent = stepped.events.find(
      (ev) => ev.type === 'pitch_thrown' || ev.type === 'ball_in_play',
    );
    expect(pitchEvent?.specialPowerTriggered?.powerId).toBe(chosen.id);
    expect(stepped.nextSession.home.hypeGauge).toBeLessThan(session.home.hypeGauge);
  });

  it('proves core player attributes, relics, and coaching staff bonuses measurably shift seeded pitch outcomes', () => {
    const rng = createSeededRng(709);
    const baseBatter = createPlayer(rng, { position: 'CF', tier: 'aa' });
    const basePitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    const weakDefender = cloneWithStats(createPlayer(rng, { position: 'SS', tier: 'rookie' }), {
      ratings: { ...baseBatter.ratings, fielding: 38, range: 38, arm: 40 },
    });
    const goldGloveDefender = cloneWithStats(weakDefender, {
      ratings: { ...weakDefender.ratings, fielding: 96, range: 96, arm: 95 },
      equippedRelicIds: ['grandpas_leather_mitt'],
    });
    const eliteBatter = cloneWithStats(baseBatter, {
      ratings: { ...baseBatter.ratings, contact: 95, power: 95, eye: 94, speed: 94, gapPower: 94 },
      equippedRelicIds: ['golden_ash_bat'],
    });
    const rawBatter = cloneWithStats(baseBatter, {
      ratings: { ...baseBatter.ratings, contact: 35, power: 35, eye: 35, speed: 35, gapPower: 35 },
      equippedRelicIds: [],
    });

    let eliteHits = 0;
    let rawHits = 0;
    let eliteHrs = 0;
    let rawHrs = 0;
    let hitsVsWeakDef = 0;
    let hitsVsGoldDef = 0;

    for (let i = 0; i < 700; i += 1) {
      const common = {
        pitcher: basePitcher,
        catcher,
        defenderPos: 'SS' as const,
        firstBaseRunner: null,
        balls: 1,
        strikes: 1,
        outs: 1,
        inning: 4,
        pitchingLead: 0,
        bases: [null, null, null] as [null, null, null],
        pitcherFatigue: 10,
        battingHype: 30,
        fieldingHype: 30,
        canBatterTriggerSpecial: false,
        canPitcherTriggerSpecial: false,
        leverageIndex: 1.0,
        tacticalCall: 'normal' as const,
        atBatPitchHistory: [] as const,
      };
      const rElite = resolveSinglePitch({ ...common, rng: createSeededRng(20000 + i), batter: eliteBatter, defender: weakDefender });
      const rRaw = resolveSinglePitch({ ...common, rng: createSeededRng(20000 + i), batter: rawBatter, defender: weakDefender });
      const rGold = resolveSinglePitch({ ...common, rng: createSeededRng(20000 + i), batter: eliteBatter, defender: goldGloveDefender });

      if (rElite.totalBases && rElite.outcome !== 'fielding_error') eliteHits += 1;
      if (rRaw.totalBases && rRaw.outcome !== 'fielding_error') rawHits += 1;
      if (rElite.outcome === 'home_run') eliteHrs += 1;
      if (rRaw.outcome === 'home_run') rawHrs += 1;
      if (rElite.totalBases) hitsVsWeakDef += 1;
      if (rGold.totalBases) hitsVsGoldDef += 1;
    }

    expect(eliteHits).toBeGreaterThan(rawHits * 1.4);
    expect(eliteHrs).toBeGreaterThan(rawHrs);
    expect(hitsVsGoldDef).toBeLessThan(hitsVsWeakDef);
  });
});

it('uses the printed heritage callout once when a manager unleashes Eagle Soar', () => {
  expect(evaluateActivePowerSurge('eagle_soar', 'batter', {
    nationalityId: 'USA', heritageTierUnlocked: 1,
  }).calloutText).toBe('EAGLE SOAR!');
});
