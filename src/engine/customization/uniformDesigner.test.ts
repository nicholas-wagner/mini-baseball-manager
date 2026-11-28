import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import type { ClubColors, CrestEmblemId } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import {
  applyUniformToClub,
  CAP_STYLES,
  computeRgbColorDistance,
  CREST_EMBLEMS,
  deriveRoadPreviewCustomization,
  extractClubUniformCustomization,
  JERSEY_PATTERNS,
  normalizeHexColor,
  normalizeMonogram,
  resolveMatchupUniforms,
  STIRRUP_STYLES,
  UNIFORM_CLASH_RGB_THRESHOLD,
  UNIFORM_PRESETS,
} from './uniformDesigner';

const EXPECTED_CREST_EMBLEMS: readonly CrestEmblemId[] = [
  'baseball_diamond',
  'lightning_bolt',
  'comet_star',
  'crown_shield',
  'crossed_bats',
  'rocket_paw',
  'flaming_baseball',
  'winged_cleat',
  'anchor_bay',
  'sakura_blossom',
  'thunder_bird',
  'rocket_ship',
  'desert_cactus',
  'mountain_peak',
  'shamrock_clover',
  'dragon_crest',
  'vintage_mitt',
  'sunburst_wave',
];

const HEX_6_RE = /^#[0-9A-F]{6}$/;

describe('Custom Uniform, Jersey Pattern & Crest Designer (TASK-138 / TASK-146)', () => {
  it('provides 18 club crest emblems including all 6 originals and 12 new 90s vector icons', () => {
    expect(JERSEY_PATTERNS.length).toBeGreaterThanOrEqual(6);
    expect(STIRRUP_STYLES.length).toBeGreaterThanOrEqual(4);
    expect(CAP_STYLES.length).toBeGreaterThanOrEqual(4);
    expect(CREST_EMBLEMS).toHaveLength(18);

    const ids = CREST_EMBLEMS.map((emblem) => emblem.id);
    expect(new Set(ids).size).toBe(18);
    expect(ids).toEqual(EXPECTED_CREST_EMBLEMS);
    for (const emblem of CREST_EMBLEMS) {
      expect(emblem.label.trim().length).toBeGreaterThan(0);
      expect(emblem.tagline.trim().length).toBeGreaterThan(0);
    }
  });

  it('provides 16 distinct 1-tap 90s throwback presets with valid hex colors, monograms, and crest IDs', () => {
    expect(UNIFORM_PRESETS).toHaveLength(16);

    const ids = new Set<string>();
    const names = new Set<string>();
    const validPatterns = new Set(JERSEY_PATTERNS.map((p) => p.id));
    const validStirrups = new Set(STIRRUP_STYLES.map((s) => s.id));
    const validCaps = new Set(CAP_STYLES.map((c) => c.id));
    const validCrests = new Set(CREST_EMBLEMS.map((e) => e.id));

    for (const preset of UNIFORM_PRESETS) {
      expect(ids.has(preset.id)).toBe(false);
      expect(names.has(preset.name)).toBe(false);
      ids.add(preset.id);
      names.add(preset.name);

      expect(preset.description.trim().length).toBeGreaterThan(0);
      expect(preset.config.primary).toMatch(HEX_6_RE);
      expect(preset.config.secondary).toMatch(HEX_6_RE);
      expect(preset.config.accent).toMatch(HEX_6_RE);
      expect(preset.config.monogram).toMatch(/^[A-Z0-9]{1,3}$/);
      expect(validPatterns.has(preset.config.jerseyPattern)).toBe(true);
      expect(validStirrups.has(preset.config.stirrupStyle)).toBe(true);
      expect(validCaps.has(preset.config.capStyle)).toBe(true);
      expect(validCrests.has(preset.config.crestEmblem)).toBe(true);
    }

    // Preserves all 6 original preset IDs
    for (const originalId of [
      'sandlot_pinstripes_94',
      'neon_nightwave_90s',
      'turf_raglan_classic',
      'golden_monarchs',
      'coral_sunset_racers',
      'brickyard_sluggers',
    ]) {
      expect(ids.has(originalId)).toBe(true);
    }
  });

  it('normalizes hex colors and club monograms safely with clean fallbacks', () => {
    expect(normalizeHexColor('#ff4d6d', '#111111')).toBe('#FF4D6D');
    expect(normalizeHexColor('not-a-color', '#1D3557')).toBe('#1D3557');
    expect(normalizeMonogram('  ab9! ')).toBe('AB9');
    expect(normalizeMonogram('longword')).toBe('LON');
    expect(normalizeMonogram('   ', 'MB')).toBe('MB');
  });

  it('extracts defaults and applies custom uniform design immutably to a Club (including optional road colors)', () => {
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
      roadPrimary: '#d0d7de',
      roadSecondary: '#1d3557',
      roadAccent: '#ffd166',
    });

    expect(updated).not.toBe(club);
    expect(updated.colors.monogram).toBe('S94');
    expect(updated.colors.jerseyPattern).toBe(UNIFORM_PRESETS[0].config.jerseyPattern);
    expect(updated.colors.stirrupStyle).toBe(UNIFORM_PRESETS[0].config.stirrupStyle);
    expect(updated.colors.capStyle).toBe(UNIFORM_PRESETS[0].config.capStyle);
    expect(updated.colors.crestEmblem).toBe(UNIFORM_PRESETS[0].config.crestEmblem);
    expect(updated.colors.roadPrimary).toBe('#D0D7DE');
    expect(updated.colors.roadSecondary).toBe('#1D3557');
    expect(updated.colors.roadAccent).toBe('#FFD166');

    const extractedAfter = extractClubUniformCustomization(updated);
    expect(extractedAfter.monogram).toBe('S94');
    expect(extractedAfter.roadPrimary).toBe('#D0D7DE');
    expect(extractedAfter.roadSecondary).toBe('#1D3557');
    expect(extractedAfter.roadAccent).toBe('#FFD166');
  });

  describe('Home & Away Uniform Anti-Clash Contrast Guard (TASK-146)', () => {
    it('keeps distinct away and home club colors faithful without clash adjustment', () => {
      const away: ClubColors = {
        primary: '#1D3557',
        secondary: '#0B132B',
        accent: '#FFB703',
        monogram: 'AW',
      };
      const home: ClubColors = {
        primary: '#E63946',
        secondary: '#1D3557',
        accent: '#FFD166',
        monogram: 'HM',
      };

      const res = resolveMatchupUniforms(away, home);
      expect(res.clashAdjusted).toBe(false);
      expect(res.home.primary).toBe('#E63946');
      expect(res.away.primary).toBe('#1D3557');
      expect(computeRgbColorDistance(res.away.primary, res.home.primary)).toBeGreaterThanOrEqual(
        UNIFORM_CLASH_RGB_THRESHOLD,
      );
    });

    it('honors configured away road colors when they contrast cleanly and guards them if they still clash', () => {
      const away: ClubColors = {
        primary: '#E63946',
        secondary: '#1D3557',
        accent: '#FFD166',
        monogram: 'RD',
        roadPrimary: '#D0D7DE',
      };
      const home: ClubColors = {
        primary: '#D62828',
        secondary: '#003049',
        accent: '#FCBF49',
        monogram: 'HM',
      };

      const res = resolveMatchupUniforms(away, home);
      expect(res.clashAdjusted).toBe(false);
      expect(res.away.primary).toBe('#D0D7DE');
      expect(res.away.secondary).toBe('#1D3557');
      expect(res.away.accent).toBe('#FFD166');
      expect(res.home.primary).toBe('#D62828');

      // Even if a custom roadPrimary clashes with home, the contrast guard protects readability
      const clashingRoadAway: ClubColors = {
        primary: '#A0A0A0',
        secondary: '#969696',
        accent: '#FFD166',
        monogram: 'GR',
        roadPrimary: '#6E6E6E',
      };
      const midGrayHome: ClubColors = {
        primary: '#686868',
        secondary: '#181B2C',
        accent: '#FFD166',
        monogram: 'MH',
      };
      const guarded = resolveMatchupUniforms(clashingRoadAway, midGrayHome);
      expect(guarded.clashAdjusted).toBe(true);
      expect(computeRgbColorDistance(guarded.away.primary, guarded.home.primary)).toBeGreaterThanOrEqual(110);
      expect(computeRgbColorDistance(guarded.away.primary, guarded.away.secondary)).toBeGreaterThanOrEqual(110);
    });

    it('separates clashing red-vs-red matchups so away switches to a high-contrast road kit while home stays vibrant', () => {
      const away: ClubColors = {
        primary: '#E63946',
        secondary: '#1D3557',
        accent: '#FFD166',
        monogram: 'SC',
      };
      const home: ClubColors = {
        primary: '#D62828',
        secondary: '#370617',
        accent: '#FAA307',
        monogram: 'BR',
      };

      const res = resolveMatchupUniforms(away, home);
      expect(res.clashAdjusted).toBe(true);
      expect(res.home.primary).toBe('#D62828');
      expect(computeRgbColorDistance(res.away.primary, res.home.primary)).toBeGreaterThanOrEqual(110);
    });

    it('separates clashing navy-vs-navy matchups (even with dark secondaries) into classic road gray contrast', () => {
      const away: ClubColors = {
        primary: '#1D3557',
        secondary: '#0B132B',
        accent: '#FFB703',
        monogram: 'MK',
      };
      const home: ClubColors = {
        primary: '#16324F',
        secondary: '#2A4D69',
        accent: '#F4A261',
        monogram: 'HC',
      };

      const res = resolveMatchupUniforms(away, home);
      expect(res.clashAdjusted).toBe(true);
      expect(res.home.primary).toBe('#16324F');
      expect(computeRgbColorDistance(res.away.primary, res.home.primary)).toBeGreaterThanOrEqual(110);
      expect(computeRgbColorDistance(res.away.primary, res.away.secondary)).toBeGreaterThanOrEqual(110);
    });

    it('separates identical colors and light-vs-light kits with >= 110 RGB separation', () => {
      const identical: ClubColors = {
        primary: '#2D6A4F',
        secondary: '#1B4332',
        accent: '#FFC300',
        monogram: 'BG',
      };
      const sameRes = resolveMatchupUniforms(identical, identical);
      expect(sameRes.clashAdjusted).toBe(true);
      expect(sameRes.home.primary).toBe('#2D6A4F');
      expect(computeRgbColorDistance(sameRes.away.primary, sameRes.home.primary)).toBeGreaterThanOrEqual(110);

      const lightAway: ClubColors = {
        primary: '#F4F1EA',
        secondary: '#E2DDD0',
        accent: '#E63946',
        monogram: 'LA',
      };
      const lightHome: ClubColors = {
        primary: '#FFFDF7',
        secondary: '#D8D4C8',
        accent: '#1D3557',
        monogram: 'LH',
      };
      const lightRes = resolveMatchupUniforms(lightAway, lightHome);
      expect(lightRes.clashAdjusted).toBe(true);
      expect(lightRes.home.primary).toBe('#FFFDF7');
      expect(computeRgbColorDistance(lightRes.away.primary, lightRes.home.primary)).toBeGreaterThanOrEqual(110);
    });

    it('guarantees >= 110 RGB separation across every self-matchup of all 16 presets and produces distinct road previews', () => {
      for (const preset of UNIFORM_PRESETS) {
        const res = resolveMatchupUniforms(preset.config, preset.config);
        expect(res.clashAdjusted).toBe(true);
        expect(computeRgbColorDistance(res.away.primary, res.home.primary)).toBeGreaterThanOrEqual(110);

        const roadPreview = deriveRoadPreviewCustomization(preset.config);
        expect(computeRgbColorDistance(roadPreview.primary, preset.config.primary)).toBeGreaterThanOrEqual(110);
      }
    });
  });
});
