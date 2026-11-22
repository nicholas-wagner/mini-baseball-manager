import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../engine/rng/seededRng';
import { SAMPLE_TEAM_PALETTES } from '../themes/teamPalettes';
import { createPortraitTraits, renderPortraitSvgString } from './generatePortrait';
import { resolveAthleteAppearance } from './athleteAppearance';
import { generateRandomCardPlayer } from './sampleRoster';

describe('athlete art direction', () => {
  it('uses a separate one-in-four female appearance roll for new Design Lab players', () => {
    for (let seed = 0; seed < 100; seed++) {
      const look = createSeededRng(seed ^ 0x4c4f4f4b).chance(.25) ? 'female' : 'male';
      expect(generateRandomCardPlayer(seed, 'JPN').traits.playerLook).toBe(look);
      expect(generateRandomCardPlayer(seed, 'USA').traits.playerLook).toBe(look);
    }
  });
  it.each(['female','male'] as const)('rolls independent stature and build with the %s hairstyles', look => {
    const roster = Array.from({length: 420}, (_, seed) => createPortraitTraits(seed, look));
    expect(new Set(roster.map(p => p.stature + '/' + p.build)).size).toBe(9);
    expect(new Set(roster.map(p => p.hairStyle)).size).toBeGreaterThanOrEqual(5);
    if (look === 'female') {
      expect(roster.every(p => ['bob','ponytail','braid','pigtails','waves'].includes(p.hairStyle))).toBe(true);
      expect(new Set(roster.map(p => p.hairAccessory))).toContain('scrunchie');
      expect(roster.every(p => p.facialHair === 'none')).toBe(true);
    } else {
      expect(new Set(roster.map(p => p.facialHair)).size).toBeGreaterThanOrEqual(6);
    }
  });

  it('uses a separate ten-percent glasses roll, including when a player look is explicitly chosen', () => {
    for (let seed = 0; seed < 250; seed++) {
      const expected = createSeededRng(seed ^ 0x65796573).chance(0.10);
      for (const look of ['female', 'male'] as const) {
        expect(createPortraitTraits(seed, look).glasses !== 'none').toBe(expected);
      }
    }
  });

  it('resolves older career art without mutating the saved player', () => {
    const original = createPortraitTraits(72);
    const legacy = {...original, playerLook: undefined, stature: undefined, build: undefined,
      facialHair: undefined, hairAccessory: undefined, glasses: undefined};
    expect(resolveAthleteAppearance(legacy)).toEqual(resolveAthleteAppearance({...legacy}));
    expect(resolveAthleteAppearance(legacy).stature).toBeTruthy();
    expect(legacy.stature).toBeUndefined();
  });

  it.each([false, true])('shows a single jersey with a skin-backed neckline on women (open collar %s)', openCollar => {
    const traits = {...createPortraitTraits(1652, 'female'), openCollar};
    const team = SAMPLE_TEAM_PALETTES[0];
    const card = renderPortraitSvgString(traits, team);
    const dom = new DOMParser().parseFromString(card, 'image/svg+xml');
    const opening = dom.querySelector('[data-collar]');
    expect(opening?.getAttribute('data-collar')).toBe(openCollar ? 'open' : 'standard');
    expect(opening?.getAttribute('fill')).toBe(traits.skinTone);
  });

  it('rolls crop and V-neck independently and uses the rolled fabric cut on the portrait', () => {
    const team = SAMPLE_TEAM_PALETTES[0];
    const roster = Array.from({length: 600}, (_, seed) => createPortraitTraits(seed, 'female'));
    for (const player of roster) {
      const uniform = createSeededRng(player.seed ^ 0x4a525359);
      expect(player.croppedJersey).toBe(uniform.chance(.10));
      expect(player.openCollar).toBe(uniform.chance(.10));
    }
    expect(new Set(roster.map(p => [p.croppedJersey, p.openCollar].join('/'))).size).toBe(4);
    const player = roster.find(p => p.croppedJersey && p.openCollar)!;
    const card = renderPortraitSvgString(player, team);
    expect(card).toContain('data-jersey="cropped"');
    expect(card).toContain('data-collar="open"');
  });

  it('rolls a signature mound delivery independently for each player look', () => {
    for (let seed = 0; seed < 400; seed++) {
      const draw = createSeededRng(seed ^ 0x534c4f54).next();
      expect(createPortraitTraits(seed, 'male').pitchingMotion).toBe(draw < .10 ? 'sidearm' : 'overhand');
      expect(createPortraitTraits(seed, 'female').pitchingMotion).toBe(draw < .20 ? 'underhand' : 'overhand');
    }
  });

  it('uses the six requested jersey-fit weights independently of height, build and uniform', () => {
    const counts = new Map<number, string>();
    for (let seed = 0; counts.size < 100 && seed < 5000; seed++) {
      const ticket = createSeededRng(seed ^ 0x464954).int(1, 100);
      counts.set(ticket, createPortraitTraits(seed, 'female').jerseyFit);
    }
    const histogram: Record<string, number> = {};
    for (const fit of counts.values()) histogram[fit] = (histogram[fit] ?? 0) + 1;
    expect(histogram).toEqual({ AA: 5, A: 10, B: 20, C: 50, D: 10, DD: 5 });
    const traits = createPortraitTraits(17, 'female');
    const outputs = (['AA', 'A', 'B', 'C', 'D', 'DD'] as const).map(jerseyFit => {
      return renderPortraitSvgString({...traits, jerseyFit}, SAMPLE_TEAM_PALETTES[0]);
    });
    expect(new Set(outputs).size).toBe(6);
    const sideSeams = outputs.map(card => new DOMParser().parseFromString(card, 'image/svg+xml')
        .querySelector('[data-part="jersey-shell"]')!.getAttribute('d'));
    expect(new Set(sideSeams).size).toBe(1);
    expect(createPortraitTraits(17, 'male').jerseyFit).toBe('standard');
  });

  it('puts the beard and clear lenses under the catcher’s portrait mask', () => {
    const traits = {...createPortraitTraits(10, 'male'), glasses:'square', facialHair:'goatee'} as const;
    const team = SAMPLE_TEAM_PALETTES[0];
    const card = renderPortraitSvgString(traits, team, 'happy', 'card', true);
    expect(card).toContain('data-facial-hair="goatee"');
    expect(card).toContain('data-glasses="square"');
  });
});

it('uses the athlete’s uniform cut on the card', () => {
  const women = Array.from({length: 48}, (_, seed) => createPortraitTraits(seed, 'female'));
  expect(new Set(women.map(traits => traits.bottoms))).toEqual(new Set(['shorts', 'skirt']));
  const male = createPortraitTraits(8, 'male');
  expect(male.bottoms).toBe('pants');
  const team = SAMPLE_TEAM_PALETTES[0];
  for (const traits of [women.find(p => p.bottoms === 'skirt')!, women.find(p => p.bottoms === 'shorts')!, male]) {
    const card = renderPortraitSvgString(traits, team);
    expect(card).toContain(`data-uniform="${traits.bottoms}"`);
  }
});

it('uses the seeded 80/20 skirt liner on the card', () => {
  const team = SAMPLE_TEAM_PALETTES[0];
  const skirts = Array.from({length: 200}, (_, seed) => createPortraitTraits(seed, 'female')).filter(p => p.bottoms === 'skirt');
  for (const player of skirts) {
    const briefs = createSeededRng(player.seed ^ 0x4c494e52).chance(.2);
    expect(player.skirtLiner).toBe(briefs ? 'briefs' : 'shorts');
  }
  for (const liner of ['briefs', 'shorts'] as const) {
    const traits = skirts.find(p => p.skirtLiner === liner)!;
    const card = renderPortraitSvgString(traits, team);
    expect(card).toContain(`data-underlayer="${liner}"`);
  }
});
