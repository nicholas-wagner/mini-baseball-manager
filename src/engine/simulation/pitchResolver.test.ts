import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import type { Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { resolveSinglePitch } from './pitchResolver';

function buildMatchup(seed: number) {
  const rng = createSeededRng(seed);
  const slugger: Player = {
    ...createPlayer(rng, { position: 'RF', tier: 'majors' }),
    ratings: {
      contact: 96,
      power: 99,
      gapPower: 95,
      eye: 88,
      bunt: 40,
      velocity: 30,
      movement: 30,
      control: 30,
      stamina: 30,
      speed: 70,
      fielding: 70,
      range: 70,
      arm: 70,
      clutch: 90,
      luck: 65,
      popularity: 80,
      potential: 95,
    },
    battedBallProfile: {
      tendency: 'flyball',
      gbRateBias: -14,
      ldRateBias: 2,
      fbRateBias: 16,
      popUpRateBias: -4,
    },
  };
  const meatballPitcher: Player = {
    ...createPlayer(rng, { position: 'SP', tier: 'rookie' }),
    ratings: {
      contact: 30,
      power: 30,
      gapPower: 30,
      eye: 30,
      bunt: 30,
      velocity: 42,
      movement: 40,
      control: 82,
      stamina: 80,
      speed: 50,
      fielding: 55,
      range: 55,
      arm: 55,
      clutch: 45,
      luck: 40,
      popularity: 50,
      potential: 60,
    },
  };
  const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
  const defender = createPlayer(rng, { position: 'CF', tier: 'aa' });
  return { slugger, meatballPitcher, catcher, defender };
}

describe('TASK-118 — HR Robbery & Diving Web-Gem Engine Signals (pitchResolver)', () => {
  it('flags robbedHomeRun and webGem on sky_high_leap robberies', () => {
    const { slugger, meatballPitcher, catcher, defender } = buildMatchup(1181);
    const leapCf: Player = {
      ...defender,
      unlockedSkillIds: ['f_rng_1', 'f_rng_2', 'cap_sky_high_leap'],
      equippedPowerIds: ['sky_high_leap'],
      ratings: { ...defender.ratings, range: 78, fielding: 78 },
    };

    let sawLeapRobbery = false;
    for (let i = 0; i < 600; i += 1) {
      const res = resolveSinglePitch({
        rng: createSeededRng(31800 + i),
        batter: slugger,
        pitcher: meatballPitcher,
        catcher,
        defender: leapCf,
        defenderPos: 'CF',
        outfielders: { LF: leapCf, CF: leapCf, RF: leapCf },
        firstBaseRunner: null,
        balls: 2,
        strikes: 0,
        outs: 1,
        inning: 7,
        pitchingLead: 0,
        bases: [null, null, null],
        pitcherFatigue: 45,
        battingHype: 30,
        fieldingHype: 30,
        canBatterTriggerSpecial: false,
        canPitcherTriggerSpecial: false,
        leverageIndex: 1.6,
        tacticalCall: 'power',
        atBatPitchHistory: [],
      });
      if (res.specialPowerTriggered?.powerId === 'sky_high_leap') {
        sawLeapRobbery = true;
        expect(res.outcome).toBe('fly_out');
        expect(res.fieldingHighlight?.anim).toBe('field_high_jump');
        expect(res.fieldingHighlight?.robbedHomeRun).toBe(true);
        expect(res.fieldingHighlight?.webGem).toBe(true);
        break;
      }
    }
    expect(sawLeapRobbery).toBe(true);
  });

  it('allows elite outfielders (range >= 82 or fielding >= 84) without sky_high_leap to organically rob home runs at the wall', () => {
    const { slugger, meatballPitcher, catcher, defender } = buildMatchup(1182);
    const eliteCf: Player = {
      ...defender,
      unlockedSkillIds: [],
      equippedPowerIds: [],
      ratings: { ...defender.ratings, range: 88, fielding: 86 },
    };
    const ordinaryCf: Player = {
      ...defender,
      unlockedSkillIds: [],
      equippedPowerIds: [],
      ratings: { ...defender.ratings, range: 65, fielding: 65 },
    };

    let sawOrganicRobbery = false;
    let sawOrdinaryRobbery = false;

    for (let i = 0; i < 2000; i += 1) {
      const eliteRes = resolveSinglePitch({
        rng: createSeededRng(41800 + i),
        batter: slugger,
        pitcher: meatballPitcher,
        catcher,
        defender: eliteCf,
        defenderPos: 'CF',
        outfielders: { LF: eliteCf, CF: eliteCf, RF: eliteCf },
        firstBaseRunner: null,
        balls: 2,
        strikes: 0,
        outs: 1,
        inning: 7,
        pitchingLead: 0,
        bases: [null, null, null],
        pitcherFatigue: 45,
        battingHype: 30,
        fieldingHype: 30,
        canBatterTriggerSpecial: false,
        canPitcherTriggerSpecial: false,
        leverageIndex: 1.2,
        tacticalCall: 'power',
        atBatPitchHistory: [],
      });
      if (eliteRes.fieldingHighlight?.robbedHomeRun && !eliteRes.specialPowerTriggered) {
        sawOrganicRobbery = true;
        expect(eliteRes.outcome).toBe('fly_out');
        expect(eliteRes.fieldingHighlight.anim).toBe('field_high_jump');
        expect(eliteRes.fieldingHighlight.webGem).toBe(true);
        expect(eliteRes.commentary).toMatch(/ROBBED AT THE WALL! .* climbs the fence to steal a home run!/);
      }

      if (i < 400) {
        const ordRes = resolveSinglePitch({
          rng: createSeededRng(41800 + i),
          batter: slugger,
          pitcher: meatballPitcher,
          catcher,
          defender: ordinaryCf,
          defenderPos: 'CF',
          outfielders: { LF: ordinaryCf, CF: ordinaryCf, RF: ordinaryCf },
          firstBaseRunner: null,
          balls: 2,
          strikes: 0,
          outs: 1,
          inning: 7,
          pitchingLead: 0,
          bases: [null, null, null],
          pitcherFatigue: 45,
          battingHype: 30,
          fieldingHype: 30,
          canBatterTriggerSpecial: false,
          canPitcherTriggerSpecial: false,
          leverageIndex: 1.2,
          tacticalCall: 'power',
          atBatPitchHistory: [],
        });
        if (ordRes.fieldingHighlight?.robbedHomeRun) sawOrdinaryRobbery = true;
      }
    }
    expect(sawOrganicRobbery).toBe(true);
    expect(sawOrdinaryRobbery).toBe(false);
  });

  it('marks field_dive outs with webGem: true', () => {
    const { slugger, meatballPitcher, catcher, defender } = buildMatchup(1183);
    const linerBatter: Player = {
      ...slugger,
      ratings: { ...slugger.ratings, contact: 72, power: 68 },
      battedBallProfile: {
        tendency: 'line_drive',
        gbRateBias: -6,
        ldRateBias: 20,
        fbRateBias: -8,
        popUpRateBias: -6,
      },
    };
    const solidPitcher: Player = {
      ...meatballPitcher,
      ratings: { ...meatballPitcher.ratings, velocity: 78, movement: 78, control: 82 },
    };

    let sawDivingWebGem = false;
    for (let i = 0; i < 400; i += 1) {
      const res = resolveSinglePitch({
        rng: createSeededRng(51800 + i),
        batter: linerBatter,
        pitcher: solidPitcher,
        catcher,
        defender,
        defenderPos: 'SS',
        firstBaseRunner: null,
        balls: 1,
        strikes: 1,
        outs: 0,
        inning: 4,
        pitchingLead: 0,
        bases: [null, null, null],
        pitcherFatigue: 15,
        battingHype: 20,
        fieldingHype: 20,
        canBatterTriggerSpecial: false,
        canPitcherTriggerSpecial: false,
        leverageIndex: 1.0,
        tacticalCall: 'normal',
        atBatPitchHistory: [],
      });
      if (res.outcome === 'line_out' && res.fieldingHighlight?.anim === 'field_dive') {
        sawDivingWebGem = true;
        expect(res.fieldingHighlight.webGem).toBe(true);
        break;
      }
    }
    expect(sawDivingWebGem).toBe(true);
  });
});
