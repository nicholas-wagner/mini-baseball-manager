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

  it.each(['front', 'back'] as const)('puts the helmet guard opposite the bat in the %s view', (facing) => {
    const pose = evaluateMiniPlayerPose('bat_stance', 0, 'batter');
    for (const batSide of ['R', 'L'] as const) {
      const markup = renderMiniPlayerSvgString(
        { traits, team, jerseyNumber: 7, role: 'batter', facing, batSide }, pose,
      );
      const guard = new DOMParser().parseFromString(markup, 'image/svg+xml')
        .querySelector('[data-gear="helmet-guard"]');
      const batOnLeft = (facing === 'front') === (batSide === 'R');
      expect(guard?.getAttribute('transform')).toBe(batOnLeft ? 'translate(170 0)' : 'translate(58 0)');
    }
  });

  it('removes the held baseball after release in either view', () => {
    for (const facing of ['front', 'back'] as const) {
      for (const throwsHand of ['R', 'L'] as const) {
        const player = { traits, team, jerseyNumber: 24, role: 'pitcher' as const, facing, throwsHand };
        const windup = renderMiniPlayerSvgString(player, evaluateMiniPlayerPose('pitch_super', 0.4, 'pitcher'));
        const follow = renderMiniPlayerSvgString(player, evaluateMiniPlayerPose('pitch_super', 1.5, 'pitcher'));
        expect(windup).toContain('fill="url(#ball-');
        expect(follow).not.toContain('fill="url(#ball-');
      }
    }
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

it.each(['R', 'L'] as const)('fits position-specific gloves and articulated catcher gear for %s throwers', throwsHand => {
  for (const facing of ['front', 'back'] as const) {
    for (const role of ['fielder', 'catcher'] as const) {
      const doc = new DOMParser().parseFromString(renderMiniPlayerSvgString({
        traits: createPortraitTraits(88), team: SAMPLE_TEAM_PALETTES[0], jerseyNumber: 2, role, facing, throwsHand,
      }, evaluateMiniPlayerPose('field_ready', 0, role)), 'image/svg+xml');
      const glove = doc.querySelector('[data-gear="field-glove"], [data-gear="catchers-mitt"]')!;
      expect(glove.getAttribute('data-gear')).toBe(role === 'catcher' ? 'catchers-mitt' : 'field-glove');
      const left = (facing === 'back') === (throwsHand === 'R');
      expect(glove.getAttribute('transform')).toContain(left ? 'translate(76 169)' : 'translate(164 169)');
      const legs = [...doc.querySelectorAll('[data-gear="leg-guard"]')];
      expect(legs).toHaveLength(role === 'catcher' ? 2 : 0);
      if (role === 'catcher') {
        expect(legs[0].parentElement).not.toBe(legs[1].parentElement);
        expect(doc.querySelector(facing === 'front' ? '[data-gear="mask"]' : '[data-gear="mask-harness"]')).toBeTruthy();
        expect(doc.querySelector(facing === 'front' ? '[data-gear="chest-protector"]' : '[data-gear="back-harness"]')).toBeTruthy();
      }
    }
  }
});
