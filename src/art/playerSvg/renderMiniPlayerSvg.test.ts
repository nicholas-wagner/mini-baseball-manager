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

  it('mirrors glove/ball hands for left-handed pitchers and bat side/ear-flap for left-handed batters', () => {
    const idlePose = evaluateMiniPlayerPose('idle', 0, 'pitcher');
    const rhpFront = renderMiniPlayerSvgString(
      { traits, team, jerseyNumber: 24, role: 'pitcher', facing: 'front', throwsHand: 'R' },
      idlePose,
    );
    const lhpFront = renderMiniPlayerSvgString(
      { traits, team, jerseyNumber: 51, role: 'pitcher', facing: 'front', throwsHand: 'L' },
      idlePose,
    );
    expect(rhpFront).not.toEqual(lhpFront);
    expect(rhpFront).toContain('translate(164 169)');
    expect(lhpFront).toContain('translate(76 169)');

    const stancePose = evaluateMiniPlayerPose('bat_stance', 0, 'batter');
    const rhbFront = renderMiniPlayerSvgString(
      { traits, team, jerseyNumber: 7, role: 'batter', facing: 'front', batSide: 'R' },
      stancePose,
    );
    const lhbFront = renderMiniPlayerSvgString(
      { traits, team, jerseyNumber: 7, role: 'batter', facing: 'front', batSide: 'L' },
      stancePose,
    );
    expect(rhbFront).toContain('translate(71 156)');
    expect(lhbFront).toContain('translate(169 156)');
  });
});
