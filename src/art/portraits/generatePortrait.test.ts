import { describe, expect, it } from 'vitest';
import { SAMPLE_TEAM_PALETTES } from '../themes/teamPalettes';
import { createPortraitTraits, renderPortraitSvgString } from './generatePortrait';
import type { PortraitMood } from './types';

describe('Retro 90s Procedural Portrait Generator', () => {
  const team = SAMPLE_TEAM_PALETTES[0];

  it('generates identical portrait traits for the same seed', () => {
    const first = createPortraitTraits(1996);
    const second = createPortraitTraits(1996);
    expect(first).toEqual(second);
  });

  it('produces visual variety across seeds', () => {
    const generated = Array.from({ length: 24 }, (_, idx) => createPortraitTraits(idx + 1));
    const distinctHeads = new Set(generated.map((t) => t.headShape));
    const distinctHair = new Set(generated.map((t) => t.hairStyle));
    const distinctMouths = new Set(generated.map((t) => t.mouthStyle));

    expect(distinctHeads.size).toBeGreaterThanOrEqual(3);
    expect(distinctHair.size).toBeGreaterThanOrEqual(5);
    expect(distinctMouths.size).toBeGreaterThanOrEqual(3);
  });

  it('renders a valid SVG containing team colors for every mood', () => {
    const traits = createPortraitTraits(88);
    const moods: PortraitMood[] = [
      'happy',
      'determined',
      'fired_up',
      'sweating',
      'shocked',
      'rival_glare',
    ];

    for (const mood of moods) {
      const svg = renderPortraitSvgString(traits, team, mood);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain(team.primary);
    }
  });

  it('includes mood-specific elements like sweat drops when sweating', () => {
    const traits = createPortraitTraits(12);
    const happySvg = renderPortraitSvgString(traits, team, 'happy');
    const sweatSvg = renderPortraitSvgString(traits, team, 'sweating');

    expect(sweatSvg).not.toEqual(happySvg);
    expect(sweatSvg).toContain('#4CC3FF');
  });
});

it.each(['bob', 'mullet'] as const)('keeps the neck in front of the %s at the jersey opening', hairStyle => {
  const traits = { ...createPortraitTraits(88), hairStyle };
  const svg = new DOMParser().parseFromString(renderPortraitSvgString(traits, SAMPLE_TEAM_PALETTES[0], 'happy'), 'image/svg+xml');
  const neck = svg.querySelector('[data-part="neck"]')!;
  const hair = svg.querySelector('[data-part="back-hair"]')!;
  expect(hair.compareDocumentPosition(neck) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('includes both player looks in seeded art and preserves coloring when choosing a look', () => {
  expect(new Set(Array.from({ length: 48 }, (_, seed) => createPortraitTraits(seed).playerLook))).toEqual(new Set(['male', 'female']));
  const male = createPortraitTraits(1994, 'male');
  const female = createPortraitTraits(1994, 'female');
  expect([male.skinTone, male.hairColor, male.irisColor]).toEqual([female.skinTone, female.hairColor, female.irisColor]);
  expect(renderPortraitSvgString(male, SAMPLE_TEAM_PALETTES[0], 'happy'))
    .not.toBe(renderPortraitSvgString(female, SAMPLE_TEAM_PALETTES[0], 'happy'));
});

it('prints reproducible manga poses and expressions and honors an explicit game mood', () => {
  const team = SAMPLE_TEAM_PALETTES[0];
  const poses = new Set();
  const expressions = new Set();
  for (let seed = 0; seed < 60; seed++) {
    const traits = createPortraitTraits(seed);
    const art = renderPortraitSvgString(traits, team);
    const panel = new DOMParser().parseFromString(art, 'image/svg+xml').querySelector('[data-card-pose]')!;
    poses.add(panel.getAttribute('data-card-pose'));
    expressions.add(panel.getAttribute('data-expression'));
    expect(renderPortraitSvgString(traits, team)).toBe(art);
  }
  expect(poses.size).toBeGreaterThanOrEqual(3);
  expect(expressions.size).toBeGreaterThanOrEqual(5);
  expect(renderPortraitSvgString(createPortraitTraits(3), team, 'rival_glare')).toContain('data-expression="rival"');
});
