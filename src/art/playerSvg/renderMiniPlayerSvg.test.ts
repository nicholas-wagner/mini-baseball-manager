import { describe, expect, it } from 'vitest';
import { createPortraitTraits } from '../portraits/generatePortrait';
import { SAMPLE_TEAM_PALETTES } from '../themes/teamPalettes';
import { evaluateMiniPlayerPose } from './miniPlayerPose';
import { renderMiniPlayerSvgString } from './renderMiniPlayerSvg';

describe('Articulated Mini-Player SVG Renderer', () => {
  const traits = createPortraitTraits(1994);
  const team = SAMPLE_TEAM_PALETTES[0];

  it('renders valid front and back SVGs with team monogram on front and jersey number on back', () => {
    const pose = evaluateMiniPlayerPose('idle', 0.25, 'pitcher');

    const frontSvg = renderMiniPlayerSvgString(
      { traits, team, jerseyNumber: 24, role: 'pitcher', facing: 'front' },
      pose,
    );
    const backSvg = renderMiniPlayerSvgString(
      { traits, team, jerseyNumber: 24, role: 'pitcher', facing: 'back' },
      pose,
    );

    expect(frontSvg.startsWith('<svg')).toBe(true);
    expect(frontSvg).toContain(team.monogram);
    expect(backSvg.startsWith('<svg')).toBe(true);
    expect(backSvg).toContain('>24<');
  });

  it('renders bat and swing smear for batters during Bomb-Swing', () => {
    const swingPose = evaluateMiniPlayerPose('bat_bomb', 0.7, 'batter');
    const batterSvg = renderMiniPlayerSvgString(
      { traits, team, jerseyNumber: 9, role: 'batter', facing: 'front' },
      swingPose,
    );

    expect(batterSvg).toContain('#FFC300');
    expect(batterSvg.endsWith('</svg>')).toBe(true);
  });
});
