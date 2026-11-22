import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../engine/rng/seededRng';
import { renderMiniPlayerSvgString } from '../playerSvg/renderMiniPlayerSvg';
import { evaluateMiniPlayerPose } from '../playerSvg/miniPlayerPose';
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
    const rig = renderMiniPlayerSvgString({traits, team, role:'pitcher', facing:'front', jerseyNumber:5}, evaluateMiniPlayerPose('idle',0));
    for (const svg of [card, rig]) {
      const dom = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const opening = dom.querySelector('[data-collar]');
      expect(opening?.getAttribute('data-collar')).toBe(openCollar ? 'open' : 'standard');
      expect(opening?.getAttribute('fill')).toBe(traits.skinTone);
    }
  });

  it('rolls crop and V-neck independently and keeps the fabric cut consistent across views', () => {
    const team = SAMPLE_TEAM_PALETTES[0];
    const roster = Array.from({length: 600}, (_, seed) => createPortraitTraits(seed, 'female'));
    for (const player of roster) {
      const uniform = createSeededRng(player.seed ^ 0x4a525359);
      expect(player.croppedJersey).toBe(uniform.chance(.10));
      expect(player.openCollar).toBe(uniform.chance(.10));
    }
    expect(new Set(roster.map(p => [p.croppedJersey, p.openCollar].join('/'))).size).toBe(4);
    const player = roster.find(p => p.croppedJersey && p.openCollar)!;
    const pose = evaluateMiniPlayerPose('idle', 0, 'fielder');
    for (const facing of ['front', 'back'] as const) {
      const rig = renderMiniPlayerSvgString({traits:player, team, role:'fielder', facing, jerseyNumber:7}, pose);
      expect(rig).toContain('data-jersey="cropped"');
      if (facing === 'front') expect(rig).toContain('data-collar="open"');
    }
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

  it.each(['sidearm','underhand'] as const)('draws the %s arm only while delivering a pitch, from either side', pitchingMotion => {
    const traits = {...createPortraitTraits(17), pitchingMotion};
    for (const facing of ['front','back'] as const) {
      const render = (role: 'pitcher' | 'fielder', winding: boolean) => renderMiniPlayerSvgString({
        traits, team:SAMPLE_TEAM_PALETTES[0], role, facing, jerseyNumber:17,
      }, evaluateMiniPlayerPose(winding ? 'pitch_windup' : 'idle', .4, role));
      expect(render('pitcher', true)).toContain(`data-throw="${pitchingMotion}"`);
      expect(render('pitcher', false)).not.toContain('data-throw=');
      expect(render('fielder', true)).not.toContain('data-throw=');
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
      const player = {...traits, jerseyFit};
      return [
        renderPortraitSvgString(player, SAMPLE_TEAM_PALETTES[0]),
        renderMiniPlayerSvgString({traits:player, team:SAMPLE_TEAM_PALETTES[0], jerseyNumber:17, role:'fielder', facing:'front'}, evaluateMiniPlayerPose('idle', 0, 'fielder')),
      ];
    });
    expect(new Set(outputs.map(([card]) => card)).size).toBe(6);
    expect(new Set(outputs.map(([, rig]) => rig)).size).toBe(6);
    for (const index of [0, 1]) {
      const sideSeams = outputs.map(pair => new DOMParser().parseFromString(pair[index], 'image/svg+xml')
        .querySelector('[data-part="jersey-shell"]')!.getAttribute('d'));
      expect(new Set(sideSeams).size).toBe(1);
    }
    expect(createPortraitTraits(17, 'male').jerseyFit).toBe('standard');
  });

  it('puts the same beard and clear lenses under the front mask and keeps the beard off the back of the head', () => {
    const traits = {...createPortraitTraits(10, 'male'), glasses:'square', facialHair:'goatee'} as const;
    const team = SAMPLE_TEAM_PALETTES[0];
    const card = renderPortraitSvgString(traits, team, 'happy', 'card', true);
    const pose = evaluateMiniPlayerPose('field_ready', 0.1, 'catcher');
    const rig = (facing: 'front' | 'back') => renderMiniPlayerSvgString({traits, team, jerseyNumber: 12, role:'catcher', facing}, pose);
    for (const art of [card, rig('front')]) {
      expect(art).toContain('data-facial-hair="goatee"');
      expect(art).toContain('data-glasses="square"');
    }
    expect(rig('front').indexOf('data-glasses')).toBeLessThan(rig('front').indexOf('data-gear="mask"'));
    expect(rig('back')).not.toContain('data-facial-hair');
  });
});

it('keeps each athlete’s uniform consistent on cards and both rig views, including catcher gear', () => {
  const women = Array.from({length: 48}, (_, seed) => createPortraitTraits(seed, 'female'));
  expect(new Set(women.map(traits => traits.bottoms))).toEqual(new Set(['shorts', 'skirt']));
  const male = createPortraitTraits(8, 'male');
  expect(male.bottoms).toBe('pants');
  const team = SAMPLE_TEAM_PALETTES[0];
  for (const traits of [women.find(p => p.bottoms === 'skirt')!, women.find(p => p.bottoms === 'shorts')!, male]) {
    const card = renderPortraitSvgString(traits, team);
    expect(card).toContain(`data-uniform="${traits.bottoms}"`);
    for (const facing of ['front', 'back'] as const) {
      const rig = renderMiniPlayerSvgString({traits, team, jerseyNumber: 9, role:'catcher', facing},
        evaluateMiniPlayerPose('field_ready', 0.2, 'catcher'));
      expect(rig).toContain(`data-uniform="${traits.bottoms}"`);
      expect(rig.match(/data-gear="leg-guard"/g)).toHaveLength(2);
      if (traits.bottoms === 'skirt') expect(rig).toContain(`data-underlayer="${traits.skirtLiner}"`);
    }
  }
});

it('uses the same 80/20 underlayer roll on both sides of a skirt and on the card', () => {
  const team = SAMPLE_TEAM_PALETTES[0];
  const pose = evaluateMiniPlayerPose('field_ready', 0, 'catcher');
  const skirts = Array.from({length: 200}, (_, seed) => createPortraitTraits(seed, 'female')).filter(p => p.bottoms === 'skirt');
  for (const player of skirts) {
    const briefs = createSeededRng(player.seed ^ 0x4c494e52).chance(.2);
    expect(player.skirtLiner).toBe(briefs ? 'briefs' : 'shorts');
  }
  for (const liner of ['briefs', 'shorts'] as const) {
    const traits = skirts.find(p => p.skirtLiner === liner)!;
    const card = renderPortraitSvgString(traits, team);
    const rigs = (['front', 'back'] as const).map(facing =>
      renderMiniPlayerSvgString({traits, team, role:'catcher', jerseyNumber:12, facing}, pose));
    for (const svg of [card, ...rigs]) expect(svg).toContain(`data-underlayer="${liner}"`);
  }
});
