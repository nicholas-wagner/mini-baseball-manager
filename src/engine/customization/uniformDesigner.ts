import type {
  CapStyleId,
  Club,
  CrestEmblemId,
  JerseyPatternId,
  StirrupStyleId,
} from '../models/club';

export interface UniformCustomization {
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
  jerseyPattern: JerseyPatternId;
  stirrupStyle: StirrupStyleId;
  capStyle: CapStyleId;
  crestEmblem: CrestEmblemId;
}

export interface UniformOptionSpec<T extends string> {
  id: T;
  label: string;
  tagline: string;
}

export interface UniformPresetSpec {
  id: string;
  name: string;
  description: string;
  config: UniformCustomization;
}

export const JERSEY_PATTERNS: readonly UniformOptionSpec<JerseyPatternId>[] = [
  { id: 'classic_solid', label: 'Classic Solid', tagline: 'Timeless crisp wool flannel look' },
  { id: 'vintage_pinstripes', label: 'Vintage Pinstripes', tagline: 'Iconic 1990s championship vertical stripes' },
  { id: 'raglan_sleeves', label: 'Raglan Sleeves', tagline: 'Two-tone contrast sandlot sleeves' },
  { id: 'neon_90s_gradient', label: '90s Neon Fade', tagline: 'Rad Saturday-morning cartoon sunset fade' },
  { id: 'racing_chest_stripe', label: 'Racing Chest Stripe', tagline: 'Bold horizontal dugout speed stripe' },
  { id: 'retro_vest', label: 'Retro Sleeveless Vest', tagline: 'Throwback button-up vest over tee' },
];

export const STIRRUP_STYLES: readonly UniformOptionSpec<StirrupStyleId>[] = [
  { id: 'classic_solid', label: 'Classic Solid', tagline: 'Clean single-color ballpark hose' },
  { id: 'double_stripe', label: 'Double Stripe', tagline: 'Old-school double-band stirrups' },
  { id: 'high_neon_90s', label: 'High Neon 90s', tagline: 'Electric high-cuff accent pop' },
  { id: 'candy_cane', label: 'Triple Barber', tagline: 'Playful 3-stripe throwback socks' },
];

export const CAP_STYLES: readonly UniformOptionSpec<CapStyleId>[] = [
  { id: 'classic_crown', label: 'Classic Crown', tagline: 'Solid team-color dome & brim' },
  { id: 'two_tone_panel', label: 'Two-Tone Panel', tagline: 'Contrasting front panel & bill' },
  { id: 'trucker_bill', label: 'Sandlot Mesh', tagline: 'Breezy backyard ballclub cap' },
  { id: 'throwback_pillbox', label: 'Throwback Pillbox', tagline: 'Flat-top 70s/90s striped crown' },
];

export const CREST_EMBLEMS: readonly UniformOptionSpec<CrestEmblemId>[] = [
  { id: 'baseball_diamond', label: 'Diamond Emblem', tagline: 'Classic infield chalk diamond' },
  { id: 'lightning_bolt', label: 'Lightning Bolt', tagline: 'High-voltage 90s power bolt' },
  { id: 'comet_star', label: 'Comet Star', tagline: 'Blazing arcade championship star' },
  { id: 'crown_shield', label: 'Crown Shield', tagline: 'Royal Major League crest' },
  { id: 'crossed_bats', label: 'Crossed Bats', tagline: 'Pure slugger sandlot badge' },
  { id: 'rocket_paw', label: 'Mascot Paw', tagline: 'Beloved ballpark mascot mark' },
];

export const UNIFORM_PRESETS: readonly UniformPresetSpec[] = [
  {
    id: 'sandlot_pinstripes_94',
    name: '1994 Sandlot Pinstripes',
    description: 'Cream pinstripes, scarlet trim, gold accents & pillbox throwback.',
    config: {
      primary: '#E63946',
      secondary: '#1D3557',
      accent: '#FFD166',
      monogram: 'SC',
      jerseyPattern: 'vintage_pinstripes',
      stirrupStyle: 'double_stripe',
      capStyle: 'two_tone_panel',
      crestEmblem: 'comet_star',
    },
  },
  {
    id: 'neon_nightwave_90s',
    name: 'Neon Nightwave 90s',
    description: 'Electric purple, cyber cyan & hot coral gradient swagger.',
    config: {
      primary: '#7209B7',
      secondary: '#181B2C',
      accent: '#00E5FF',
      monogram: 'NW',
      jerseyPattern: 'neon_90s_gradient',
      stirrupStyle: 'high_neon_90s',
      capStyle: 'two_tone_panel',
      crestEmblem: 'lightning_bolt',
    },
  },
  {
    id: 'turf_raglan_classic',
    name: 'Ballpark Raglan Green',
    description: 'Forest green raglan sleeves with sunny gold stirrups.',
    config: {
      primary: '#2D6A4F',
      secondary: '#1B4332',
      accent: '#FFC300',
      monogram: 'BG',
      jerseyPattern: 'raglan_sleeves',
      stirrupStyle: 'double_stripe',
      capStyle: 'classic_crown',
      crestEmblem: 'baseball_diamond',
    },
  },
  {
    id: 'golden_monarchs',
    name: 'Majors Crown Vest',
    description: 'Royal navy vest over crisp trim with gold crown crest.',
    config: {
      primary: '#1D3557',
      secondary: '#0B132B',
      accent: '#FFB703',
      monogram: 'MK',
      jerseyPattern: 'retro_vest',
      stirrupStyle: 'candy_cane',
      capStyle: 'throwback_pillbox',
      crestEmblem: 'crown_shield',
    },
  },
  {
    id: 'coral_sunset_racers',
    name: 'Coral Sunset Racers',
    description: 'Hot coral racing chest stripe with sky-blue pop.',
    config: {
      primary: '#FF4D6D',
      secondary: '#2B2D42',
      accent: '#4CC3FF',
      monogram: 'CR',
      jerseyPattern: 'racing_chest_stripe',
      stirrupStyle: 'high_neon_90s',
      capStyle: 'trucker_bill',
      crestEmblem: 'rocket_paw',
    },
  },
  {
    id: 'brickyard_sluggers',
    name: 'Brickyard Heritage',
    description: 'Rust brick wool solid with crossed bats emblem.',
    config: {
      primary: '#9D0208',
      secondary: '#370617',
      accent: '#FAA307',
      monogram: 'BH',
      jerseyPattern: 'classic_solid',
      stirrupStyle: 'classic_solid',
      capStyle: 'classic_crown',
      crestEmblem: 'crossed_bats',
    },
  },
];

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Validates and uppercases a 6-digit hex color string, returning fallback when invalid. */
export function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toUpperCase() : fallback.toUpperCase();
}

/** Sanitizes a 1–3 character uppercase club monogram for jerseys and caps. */
export function normalizeMonogram(value: string, fallback = 'MB'): string {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
  return cleaned.length > 0 ? cleaned : fallback.toUpperCase().slice(0, 3);
}

/** Extracts the complete UniformCustomization from a club with clean defaults for older saves. */
export function extractClubUniformCustomization(club: Club): UniformCustomization {
  return {
    primary: normalizeHexColor(club.colors.primary, '#E63946'),
    secondary: normalizeHexColor(club.colors.secondary, '#1D3557'),
    accent: normalizeHexColor(club.colors.accent, '#FFD166'),
    monogram: normalizeMonogram(club.colors.monogram, 'MB'),
    jerseyPattern: club.colors.jerseyPattern ?? 'classic_solid',
    stirrupStyle: club.colors.stirrupStyle ?? 'classic_solid',
    capStyle: club.colors.capStyle ?? 'classic_crown',
    crestEmblem: club.colors.crestEmblem ?? 'baseball_diamond',
  };
}

/** Applies a custom uniform & crest kit immutably to a club's colors configuration. */
export function applyUniformToClub(club: Club, custom: UniformCustomization): Club {
  return {
    ...club,
    colors: {
      primary: normalizeHexColor(custom.primary, club.colors.primary),
      secondary: normalizeHexColor(custom.secondary, club.colors.secondary),
      accent: normalizeHexColor(custom.accent, club.colors.accent),
      monogram: normalizeMonogram(custom.monogram, club.colors.monogram),
      jerseyPattern: custom.jerseyPattern,
      stirrupStyle: custom.stirrupStyle,
      capStyle: custom.capStyle,
      crestEmblem: custom.crestEmblem,
    },
  };
}
