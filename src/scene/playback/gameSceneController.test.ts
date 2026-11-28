import { describe, expect, it } from 'vitest';
import { computeRgbColorDistance } from '../../engine/customization/uniformDesigner';
import type { Club } from '../../engine/models/club';
import { resolveMatchupTeamColors } from './gameSceneController';

function makeColorClub(colors: Club['colors']): Pick<Club, 'colors'> {
  return { colors };
}

describe('GameSceneController matchup uniform resolution (TASK-146)', () => {
  it('keeps distinct away and home colors intact for 3D painted rigs', () => {
    const away = makeColorClub({
      primary: '#008080',
      secondary: '#102A43',
      accent: '#A8F9FF',
      monogram: 'TE',
    });
    const home = makeColorClub({
      primary: '#E63946',
      secondary: '#1D3557',
      accent: '#FFD166',
      monogram: 'SC',
    });

    const { awayTeamColors, homeTeamColors, clashAdjusted } = resolveMatchupTeamColors(away, home);
    expect(clashAdjusted).toBe(false);
    expect(homeTeamColors).toEqual({
      primary: '#E63946',
      secondary: '#1D3557',
      accent: '#FFD166',
      monogram: 'SC',
    });
    expect(awayTeamColors).toEqual({
      primary: '#008080',
      secondary: '#102A43',
      accent: '#A8F9FF',
      monogram: 'TE',
    });
  });

  it('auto-adjusts away 3D colors when away and home primaries clash while preserving home kit', () => {
    const away = makeColorClub({
      primary: '#E63946',
      secondary: '#1D3557',
      accent: '#FFD166',
      monogram: 'AW',
    });
    const home = makeColorClub({
      primary: '#D62828',
      secondary: '#370617',
      accent: '#FAA307',
      monogram: 'HM',
    });

    const { awayTeamColors, homeTeamColors, clashAdjusted } = resolveMatchupTeamColors(away, home);
    expect(clashAdjusted).toBe(true);
    expect(homeTeamColors.primary).toBe('#D62828');
    expect(
      computeRgbColorDistance(awayTeamColors.primary, homeTeamColors.primary),
    ).toBeGreaterThanOrEqual(110);
  });
});
