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
