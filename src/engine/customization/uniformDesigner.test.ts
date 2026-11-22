import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  applyUniformToClub,
  CAP_STYLES,
  CREST_EMBLEMS,
  extractClubUniformCustomization,
  JERSEY_PATTERNS,
  normalizeHexColor,
  normalizeMonogram,
  STIRRUP_STYLES,
  UNIFORM_PRESETS,
} from './uniformDesigner';

describe('Custom Uniform, Jersey Pattern & Crest Designer (100X)', () => {
  it('provides rich retro 90s jersey patterns, cap styles, stirrups, crests, and 6 team kit presets', () => {
    expect(JERSEY_PATTERNS.length).toBeGreaterThanOrEqual(6);
    expect(STIRRUP_STYLES.length).toBeGreaterThanOrEqual(4);
    expect(CAP_STYLES.length).toBeGreaterThanOrEqual(4);
    expect(CREST_EMBLEMS.length).toBeGreaterThanOrEqual(6);
    expect(UNIFORM_PRESETS).toHaveLength(6);
  });

  it('normalizes hex colors and club monograms safely with clean fallbacks', () => {
    expect(normalizeHexColor('#ff4d6d', '#111111')).toBe('#FF4D6D');
    expect(normalizeHexColor('not-a-color', '#1D3557')).toBe('#1D3557');
    expect(normalizeMonogram('  ab9! ')).toBe('AB9');
    expect(normalizeMonogram('longword')).toBe('LON');
    expect(normalizeMonogram('   ', 'MB')).toBe('MB');
  });

  it('extracts defaults and applies custom uniform design immutably to a Club', () => {
    const club = createClub(createSeededRng(1994), {
      id: 'uni-club',
      isHuman: true,
      city: 'Metro',
      name: 'Comets',
      mascot: 'Comet',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'MC' },
      leagueTier: 'rookie',
    });

    const initial = extractClubUniformCustomization(club);
    expect(initial.primary).toBe('#E63946');
    expect(initial.jerseyPattern).toBe('classic_solid');
    expect(initial.capStyle).toBe('classic_crown');

    const updated = applyUniformToClub(club, {
      ...UNIFORM_PRESETS[0].config,
      monogram: 's94',
    });

    expect(updated).not.toBe(club);
    expect(updated.colors.monogram).toBe('S94');
    expect(updated.colors.jerseyPattern).toBe(UNIFORM_PRESETS[0].config.jerseyPattern);
    expect(updated.colors.stirrupStyle).toBe(UNIFORM_PRESETS[0].config.stirrupStyle);
    expect(updated.colors.capStyle).toBe(UNIFORM_PRESETS[0].config.capStyle);
    expect(updated.colors.crestEmblem).toBe(UNIFORM_PRESETS[0].config.crestEmblem);

    const extractedAfter = extractClubUniformCustomization(updated);
    expect(extractedAfter.monogram).toBe('S94');
    expect(extractedAfter.jerseyPattern).toBe(UNIFORM_PRESETS[0].config.jerseyPattern);
  });
});
