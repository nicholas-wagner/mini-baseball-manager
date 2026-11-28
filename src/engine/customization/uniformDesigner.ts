import type {
  CapStyleId,
  Club,
  ClubColors,
  CrestEmblemId,
  JerseyPatternId,
  StirrupStyleId,
} from '../models/club';

export interface UniformCustomization {
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
  roadPrimary?: string;
  roadSecondary?: string;
  roadAccent?: string;
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

export interface MatchupUniformResolution {
  away: ClubColors;
  home: ClubColors;
  clashAdjusted: boolean;
}

export const UNIFORM_CLASH_RGB_THRESHOLD = 110;

const ROAD_FLANNEL_GRAY = '#D0D7DE';
const ROAD_CHARCOAL_SLATE = '#222B3A';
const DARK_INK_TRIM = '#181B2C';
const LIGHT_CREAM_TRIM = '#FFFDF7';

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
  { id: 'flaming_baseball', label: 'Flaming Ball', tagline: 'Blazing triple-digit heater crest' },
  { id: 'winged_cleat', label: 'Winged Cleat', tagline: 'Speedster base-stealing wings' },
  { id: 'anchor_bay', label: 'Harbor Anchor', tagline: 'Coastal waterfront captains mark' },
  { id: 'sakura_blossom', label: 'Sakura Blossom', tagline: 'Spring cherry blossom ballpark crest' },
  { id: 'thunder_bird', label: 'Thunder Bird', tagline: 'Soaring 90s pennant storm bird' },
  { id: 'rocket_ship', label: 'Retro Rocket', tagline: 'Space-age moonshot slugger badge' },
  { id: 'desert_cactus', label: 'Desert Cactus', tagline: 'Southwest sunbelt saguaro emblem' },
  { id: 'mountain_peak', label: 'Mountain Peak', tagline: 'Mile-high alpine summit crest' },
  { id: 'shamrock_clover', label: 'Lucky Shamrock', tagline: 'Emerald diamond four-leaf charm' },
  { id: 'dragon_crest', label: 'Cyber Dragon', tagline: 'Mythic roaring neon ballpark dragon' },
  { id: 'vintage_mitt', label: 'Gold Mitt', tagline: 'Classic leather web-gem glove' },
  { id: 'sunburst_wave', label: 'Sunburst Wave', tagline: '90s coastal surf & sunshine badge' },
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
  {
    id: 'teal_expansion_94',
    name: '94 Teal Expansion',
    description: 'Classic 90s expansion teal pinstripes with icy mint surf crest.',
    config: {
      primary: '#008080',
      secondary: '#102A43',
      accent: '#A8F9FF',
      monogram: 'TE',
      jerseyPattern: 'vintage_pinstripes',
      stirrupStyle: 'high_neon_90s',
      capStyle: 'two_tone_panel',
      crestEmblem: 'sunburst_wave',
    },
  },
  {
    id: 'sakura_tokyo_swallows',
    name: 'Sakura Tokyo Swallows',
    description: 'Cherry blossom pink raglan kit with deep indigo trim.',
    config: {
      primary: '#F2849E',
      secondary: '#1E2749',
      accent: '#FFE066',
      monogram: 'TK',
      jerseyPattern: 'raglan_sleeves',
      stirrupStyle: 'double_stripe',
      capStyle: 'classic_crown',
      crestEmblem: 'sakura_blossom',
    },
  },
  {
    id: 'powder_blue_sunday',
    name: 'Powder Blue Sunday',
    description: 'Matinee powder blue flannel with winged speedster cleat.',
    config: {
      primary: '#5FA8D3',
      secondary: '#1B3A6B',
      accent: '#E63946',
      monogram: 'PB',
      jerseyPattern: 'classic_solid',
      stirrupStyle: 'double_stripe',
      capStyle: 'two_tone_panel',
      crestEmblem: 'winged_cleat',
    },
  },
  {
    id: 'miami_vice_electric',
    name: 'Miami Vice Electric',
    description: 'Neon cyan & hot magenta sunset fade with flaming fastball crest.',
    config: {
      primary: '#00C2D1',
      secondary: '#191D2E',
      accent: '#FF2E93',
      monogram: 'MV',
      jerseyPattern: 'neon_90s_gradient',
      stirrupStyle: 'high_neon_90s',
      capStyle: 'trucker_bill',
      crestEmblem: 'flaming_baseball',
    },
  },
  {
    id: 'emerald_shamrock_club',
    name: 'Emerald Shamrock Club',
    description: 'Kelly green vintage pinstripes with lucky shamrock gold.',
    config: {
      primary: '#16A34A',
      secondary: '#14532D',
      accent: '#FACC15',
      monogram: 'ES',
      jerseyPattern: 'vintage_pinstripes',
      stirrupStyle: 'candy_cane',
      capStyle: 'throwback_pillbox',
      crestEmblem: 'shamrock_clover',
    },
  },
  {
    id: 'desert_sunset_mesa',
    name: 'Desert Sunset Mesa',
    description: 'Terracotta chest stripe, mesa purple trim & southwest saguaro.',
    config: {
      primary: '#D95D39',
      secondary: '#3D2B56',
      accent: '#2EC4B6',
      monogram: 'DM',
      jerseyPattern: 'racing_chest_stripe',
      stirrupStyle: 'double_stripe',
      capStyle: 'trucker_bill',
      crestEmblem: 'desert_cactus',
    },
  },
  {
    id: 'midnight_cyber_dragons',
    name: 'Midnight Cyber Dragons',
    description: 'Cobalt indigo arcade gradient with acid-lime cyber dragon.',
    config: {
      primary: '#2B3A67',
      secondary: '#121629',
      accent: '#80ED99',
      monogram: 'CD',
      jerseyPattern: 'neon_90s_gradient',
      stirrupStyle: 'high_neon_90s',
      capStyle: 'two_tone_panel',
      crestEmblem: 'dragon_crest',
    },
  },
  {
    id: 'harbor_navy_captains',
    name: 'Harbor Navy Captains',
    description: 'Maritime navy sleeveless vest with anchor badge & signal gold.',
    config: {
      primary: '#16324F',
      secondary: '#2A4D69',
      accent: '#F4A261',
      monogram: 'HC',
      jerseyPattern: 'retro_vest',
      stirrupStyle: 'classic_solid',
      capStyle: 'classic_crown',
      crestEmblem: 'anchor_bay',
    },
  },
  {
    id: 'astro_rainbow_retro',
    name: 'Astro Rainbow Retro',
    description: 'Tangerine space-age racing stripe & pillbox cap with retro rocket.',
    config: {
      primary: '#F77F00',
      secondary: '#003049',
      accent: '#FCBF49',
      monogram: 'AR',
      jerseyPattern: 'racing_chest_stripe',
      stirrupStyle: 'candy_cane',
      capStyle: 'throwback_pillbox',
      crestEmblem: 'rocket_ship',
    },
  },
  {
    id: 'gold_glove_cream_classic',
    name: 'Gold Glove Cream Classic',
    description: 'Antique gold & espresso heritage vest celebrating leather web gems.',
    config: {
      primary: '#C9A227',
      secondary: '#3B2314',
      accent: '#FFF8E7',
      monogram: 'GG',
      jerseyPattern: 'retro_vest',
      stirrupStyle: 'double_stripe',
      capStyle: 'throwback_pillbox',
      crestEmblem: 'vintage_mitt',
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

function parseHexChannels(hex: string): readonly [number, number, number] {
  const clean = normalizeHexColor(hex, DARK_INK_TRIM);
  return [
    Number.parseInt(clean.slice(1, 3), 16),
    Number.parseInt(clean.slice(3, 5), 16),
    Number.parseInt(clean.slice(5, 7), 16),
  ];
}

/** Euclidean RGB distance between two 6-digit hex colors (0..441.67). */
export function computeRgbColorDistance(hexA: string, hexB: string): number {
  const [rA, gA, bA] = parseHexChannels(hexA);
  const [rB, gB, bB] = parseHexChannels(hexB);
  return Math.hypot(rA - rB, gA - gB, bA - bB);
}

type OptionalRoadColors = Pick<ClubColors, 'roadPrimary' | 'roadSecondary' | 'roadAccent'>;

function normalizeOptionalRoadColors(source: OptionalRoadColors): OptionalRoadColors {
  const road: OptionalRoadColors = {};
  if (source.roadPrimary) {
    road.roadPrimary = normalizeHexColor(source.roadPrimary, ROAD_FLANNEL_GRAY);
  }
  if (source.roadSecondary) {
    road.roadSecondary = normalizeHexColor(source.roadSecondary, DARK_INK_TRIM);
  }
  if (source.roadAccent) {
    road.roadAccent = normalizeHexColor(source.roadAccent, '#FFD166');
  }
  return road;
}

function normalizeClubColors(colors: ClubColors): ClubColors {
  return {
    ...colors,
    primary: normalizeHexColor(colors.primary, '#E63946'),
    secondary: normalizeHexColor(colors.secondary, '#1D3557'),
    accent: normalizeHexColor(colors.accent, '#FFD166'),
    monogram: normalizeMonogram(colors.monogram, 'MB'),
    ...normalizeOptionalRoadColors(colors),
  };
}

function buildBaseRoadColors(away: ClubColors): ClubColors {
  if (!away.roadPrimary) return away;
  return {
    ...away,
    primary: away.roadPrimary,
    secondary: away.roadSecondary ?? away.secondary,
    accent: away.roadAccent ?? away.accent,
  };
}

function pickRoadTrim(roadPrimary: string, away: ClubColors): string {
  if (computeRgbColorDistance(roadPrimary, away.primary) >= UNIFORM_CLASH_RGB_THRESHOLD) {
    return away.primary;
  }
  if (computeRgbColorDistance(roadPrimary, away.secondary) >= UNIFORM_CLASH_RGB_THRESHOLD) {
    return away.secondary;
  }
  return roadPrimary === ROAD_CHARCOAL_SLATE ? LIGHT_CREAM_TRIM : DARK_INK_TRIM;
}

function buildAntiClashRoadCandidates(away: ClubColors): readonly ClubColors[] {
  const swapped: ClubColors = {
    ...away,
    primary: away.secondary,
    secondary: away.primary,
  };
  const roadGray: ClubColors = {
    ...away,
    primary: ROAD_FLANNEL_GRAY,
    secondary: pickRoadTrim(ROAD_FLANNEL_GRAY, away),
  };
  const roadCharcoal: ClubColors = {
    ...away,
    primary: ROAD_CHARCOAL_SLATE,
    secondary: pickRoadTrim(ROAD_CHARCOAL_SLATE, away),
  };
  return [swapped, roadGray, roadCharcoal];
}

/**
 * Resolves Home vs. Away uniform colors for live 3D games.
 * Home keeps its vibrant home look; Away uses configured road colors if set
 * and automatically shifts to a high-contrast Road kit when RGB distance < 110.
 */
export function resolveMatchupUniforms(
  away: ClubColors,
  home: ClubColors,
): MatchupUniformResolution {
  const normalizedHome = normalizeClubColors(home);
  const normalizedAway = normalizeClubColors(away);
  const baseAway = buildBaseRoadColors(normalizedAway);

  if (computeRgbColorDistance(baseAway.primary, normalizedHome.primary) >= UNIFORM_CLASH_RGB_THRESHOLD) {
    return { away: baseAway, home: normalizedHome, clashAdjusted: false };
  }

  const candidates = buildAntiClashRoadCandidates(normalizedAway);
  const resolved =
    candidates.find(
      (candidate) =>
        computeRgbColorDistance(candidate.primary, normalizedHome.primary) >= UNIFORM_CLASH_RGB_THRESHOLD,
    ) ?? candidates[candidates.length - 1];

  return { away: resolved, home: normalizedHome, clashAdjusted: true };
}

/** Derives the club's Away / Road preview kit for Uniform Studio live inspection. */
export function deriveRoadPreviewCustomization(
  custom: UniformCustomization,
): UniformCustomization {
  const resolved = resolveMatchupUniforms(custom, custom).away;
  return {
    ...custom,
    primary: resolved.primary,
    secondary: resolved.secondary,
    accent: resolved.accent,
    monogram: resolved.monogram,
  };
}

/** Extracts the complete UniformCustomization from a club with clean defaults for older saves. */
export function extractClubUniformCustomization(club: Club): UniformCustomization {
  return {
    primary: normalizeHexColor(club.colors.primary, '#E63946'),
    secondary: normalizeHexColor(club.colors.secondary, '#1D3557'),
    accent: normalizeHexColor(club.colors.accent, '#FFD166'),
    monogram: normalizeMonogram(club.colors.monogram, 'MB'),
    ...normalizeOptionalRoadColors(club.colors),
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
      ...normalizeOptionalRoadColors({
        roadPrimary: custom.roadPrimary ?? club.colors.roadPrimary,
        roadSecondary: custom.roadSecondary ?? club.colors.roadSecondary,
        roadAccent: custom.roadAccent ?? club.colors.roadAccent,
      }),
      jerseyPattern: custom.jerseyPattern,
      stirrupStyle: custom.stirrupStyle,
      capStyle: custom.capStyle,
      crestEmblem: custom.crestEmblem,
    },
  };
}
