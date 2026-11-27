import ballparkPanorama from './illustrations/ballpark.webp';
import { mangaUniform, type CardPose } from './mangaUniform';
import { CARD_EXPRESSIONS, cardExpression, mangaFace, mangaFringe, visorSpikes } from './mangaFace';
import { pinkSportsShades } from './faceDetails';
import type { BatsHand, FieldPosition, ThrowsHand } from '../../engine/handedness/types';
import { hairband, isLongCut, longHair, templeLocks } from './ponytail';
import { resolveAthleteAppearance, type AthleteAppearance } from './athleteAppearance';
import { createSeededRng } from '../../engine/rng/seededRng';
import type {
  AccessoryStyle,
  BackdropStyle,
  CapStyle,
  EyeStyle,
  HairStyle,
  HairAccessory,
  HeadShape,
  MouthStyle,
  PortraitMood,
  PlayerLook,
  PortraitTeamColors,
  PortraitTraits,
} from './types';

const SKIN_TONES: readonly { base: string; shadow: string; highlight: string }[] = [
  { base: '#FFE0C4', shadow: '#D9A782', highlight: '#FFF3E6' },
  { base: '#FAD0A8', shadow: '#CF9568', highlight: '#FFE8D1' },
  { base: '#F0B888', shadow: '#C28252', highlight: '#FFD6B0' },
  { base: '#D99968', shadow: '#A8693C', highlight: '#F2BA8D' },
  { base: '#B87648', shadow: '#874D27', highlight: '#D69669' },
  { base: '#8F5734', shadow: '#613419', highlight: '#B0754F' },
  { base: '#6A3E25', shadow: '#422210', highlight: '#8C593B' },
  { base: '#FFE7D1', shadow: '#DEB18E', highlight: '#FFF7F0' },
];

const HAIR_PALETTES: readonly { base: string; highlight: string }[] = [
  { base: '#1E1B28', highlight: '#4C4666' },
  { base: '#4A2B18', highlight: '#825235' },
  { base: '#8C461E', highlight: '#C9723E' },
  { base: '#D9821E', highlight: '#FFB84D' },
  { base: '#E8BE38', highlight: '#FFF099' },
  { base: '#C93022', highlight: '#FF6B57' },
  { base: '#23499D', highlight: '#5B8CFF' },
  { base: '#6D32A8', highlight: '#B37BFF' },
  { base: '#4E5B6E', highlight: '#8FA2BD' },
];

const IRIS_COLORS = [
  '#3B2314',
  '#1D63B8',
  '#258A4E',
  '#8C5822',
  '#6A359C',
  '#293242',
] as const;

const HEAD_SHAPES: readonly HeadShape[] = ['round', 'oval', 'square', 'chubby', 'heart'];
const HAIR_STYLES: readonly HairStyle[] = [
  'spiky90s',
  'flattop',
  'mullet',
  'pigtails',
  'afro',
  'pompadour',
  'sideSweep',
  'curlyTop',
  'bob',
  'mohawk',
];
const CAP_STYLES: readonly CapStyle[] = ['forward', 'forward', 'forward', 'backwards', 'visor', 'none'];
const EYE_STYLES: readonly EyeStyle[] = ['bright', 'determined', 'starry', 'chill', 'wide', 'wink'];
const MOUTH_STYLES: readonly MouthStyle[] = [
  'bigGrin',
  'smirk',
  'bubblegum',
  'tongueOut',
  'openLaugh',
  'focused',
];
const ACCESSORIES: readonly AccessoryStyle[] = [
  'none',
  'shades90s',
  'eyeBlack',
  'cheekBandage',
  'freckles',
  'handlebarStache',
  'headband',
  'starEarrings',
];
const BACKDROPS: readonly BackdropStyle[] = ['starburst', 'stripes', 'halftone', 'lightning', 'stadium'];

const INK = '#181B2C';

export function createPortraitTraits(seed: number, playerLook?: PlayerLook): AthleteAppearance {
  const rng = createSeededRng(seed);
  const skin = rng.pick(SKIN_TONES);
  const hair = rng.pick(HAIR_PALETTES);

  return resolveAthleteAppearance({
    seed,
    playerLook,
    headShape: rng.pick(HEAD_SHAPES),
    skinTone: skin.base,
    skinShadow: skin.shadow,
    skinHighlight: skin.highlight,
    irisColor: rng.pick(IRIS_COLORS),
    hairStyle: rng.pick(HAIR_STYLES),
    hairColor: hair.base,
    hairHighlight: hair.highlight,
    capStyle: rng.pick(CAP_STYLES),
    eyeStyle: rng.pick(EYE_STYLES),
    mouthStyle: rng.pick(MOUTH_STYLES),
    accessory: rng.pick(ACCESSORIES),
    backdropStyle: rng.pick(BACKDROPS),
  });
}

function renderBackdrop(
  style: BackdropStyle,
  mood: PortraitMood,
): string {
  // Different crops of the same continuous outfield keep the horizon in perspective.
  const cameraX: Record<BackdropStyle, number> = {
    starburst: -30, stripes: -118, halftone: -4, lightning: -93, stadium: -150,
  };
  const air = mood === 'rival_glare' ? '#69719F' : mood === 'fired_up' ? '#E59559' : '#F7E4BE';
  return `<rect x="-16" y="-40" width="232" height="282" fill="#C5D8CD"/>
  <image href="${ballparkPanorama}" x="${cameraX[style]}" y="-36" width="402" height="268"/>
  <rect x="-16" y="-40" width="232" height="282" fill="${air}" opacity=".09"/>`;

}

export function renderSculptedHeadParts(shape: HeadShape): {
  silhouette: string;
  celShadow: string;
  rimHighlight: string;
} {
  switch (shape) {
    case 'square':
      return {
        silhouette:
          'M52 84 C52 54 148 54 148 84 L147 122 C147 144 128 154 100 154 C72 154 53 144 53 122 Z',
        celShadow:
          'M53 92 C53 128 66 146 104 153 C72 153 53 142 53 122 Z',
        rimHighlight: 'M138 78 C143 94 143 116 136 132',
      };
    case 'chubby':
      return {
        silhouette:
          'M48 98 C48 58 152 58 152 98 C156 128 136 155 100 155 C64 155 44 128 48 98 Z',
        celShadow:
          'M49 96 C49 130 68 148 106 154 C66 154 45 130 49 96 Z',
        rimHighlight: 'M141 84 C147 102 145 124 134 138',
      };
    case 'oval':
      return {
        silhouette:
          'M55 92 C55 50 145 50 145 92 C145 132 125 156 100 156 C75 156 55 132 55 92 Z',
        celShadow:
          'M56 92 C57 128 72 148 104 155 C74 155 56 132 56 92 Z',
        rimHighlight: 'M136 78 C140 98 138 122 128 138',
      };
    case 'heart':
      return {
        silhouette:
          'M50 90 C50 54 150 54 150 90 C150 124 122 150 100 156 C78 150 50 124 50 90 Z',
        celShadow:
          'M51 90 C53 122 76 146 102 155 C78 149 51 124 51 90 Z',
        rimHighlight: 'M139 78 C143 98 136 120 122 138',
      };
    case 'round':
    default:
      return {
        silhouette:
          'M50 96 C50 54 150 54 150 96 C150 134 130 155 100 155 C70 155 50 134 50 96 Z',
        celShadow:
          'M51 94 C52 130 70 148 105 154 C70 154 51 133 51 94 Z',
        rimHighlight: 'M139 80 C144 98 142 120 131 136',
      };
  }
}

export function renderBackHairSvg(style: HairStyle, color: string, highlight: string, band = '#FFBF54', trim: HairAccessory = 'tie'): string {
  if (isLongCut(style)) return longHair(style, color, highlight, band, trim);
  switch (style) {
    case 'mullet':
      return `
        <path d="M46 96 C34 122 34 152 44 170 L59 161 L58 171 Q68 167 76 150 Q99 137 123 150 Q131 166 142 172 L136 162 L156 170 C166 152 166 122 154 96 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M46 132 Q54 150 49 164 M154 132 Q146 150 151 164" fill="none" stroke="${highlight}" stroke-width="3.5" stroke-linecap="round" />`;
    case 'afro':
      return `
        <path d="M36 96 C26 70 44 36 72 34 C88 20 112 20 128 34 C156 36 174 70 164 96 C172 118 158 140 142 140 L58 140 C42 140 28 118 36 96 Z" fill="${color}" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        <path d="M62 46 Q82 34 104 40 M122 44 Q142 50 148 68" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round" opacity="0.75" />`;
    case 'bob':
      return `
        <path d="M44 82 C38 118 42 148 64 158 Q77 159 81 145 Q101 140 120 145 Q125 156 136 158 C158 148 162 118 156 82 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />`;
    default:
      return '';
  }
}

export function renderFrontHairSvg(
  style: HairStyle,
  color: string,
  highlight: string,
  capStyle: CapStyle,
): string {
  if (capStyle === 'forward' || capStyle === 'backwards') {
    if (isLongCut(style) || style === 'sideSweep' || style === 'bob') {
      return `<path d="M50 73 Q101 56 151 74 L151 86 L144 101 L141 84 Q126 93 115 92 L120 84 Q98 96 87 96 L93 86 Q74 96 54 99 L59 87 L49 91Z" fill="${color}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
        <path d="M61 89 Q79 85 89 77 M124 84 Q135 82 142 77" fill="none" stroke="${highlight}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    if (style === 'spiky90s') {
      return `
        <path d="M51 78 L58 95 L70 81 L84 97 L98 81 L114 96 L128 81 L142 94 L149 78 L146 68 L54 68 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
        <path d="M64 82 L70 76 L78 84 M110 82 L118 76 L124 84" fill="none" stroke="${highlight}" stroke-width="2.5" stroke-linecap="round" />`;
    }
    if (style === 'curlyTop' || style === 'afro') {
      return `<path d="M48 74 Q101 57 153 76 L151 90 Q147 101 141 91 Q135 99 129 89 Q122 96 117 87 Q110 94 103 86 Q93 95 88 87 Q80 97 74 89 Q64 101 61 90 Q51 99 48 91Z" fill="${color}" stroke="${INK}" stroke-width="3.6"/>
        <path d="M55 86 q5 -5 9 -2 M73 84 q5 -5 9 -3 M131 85 q5 -5 10 0" fill="none" stroke="${highlight}" stroke-width="2.5"/>`;
    }
    if (style === 'flattop' || style === 'pompadour') {
      return `<path d="M49 75 Q101 66 151 76 L150 98 L143 101 L140 80 Q99 77 60 84 L56 103 L50 100Z" fill="${color}" stroke="${INK}" stroke-width="3.2"/>
        <path d="M51 90 l9 -5 M141 84 l8 4" stroke="${highlight}" stroke-width="2.7"/>`;
    }
    return `
      <path d="M51 80 C66 93 82 86 95 79 C110 92 130 91 149 80 L147 68 L53 68 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
      <path d="M64 81 Q78 86 88 79 M114 82 Q128 86 140 79" fill="none" stroke="${highlight}" stroke-width="2.6" stroke-linecap="round" />`;
  }

  switch (style) {
    case 'waves':
    case 'pigtails':
    case 'braid':
    case 'ponytail':
      return `<path d="M47 93 Q40 80 46 65 Q52 43 76 40 L71 33 Q90 32 101 39 Q123 33 144 50 Q159 64 153 91 L145 102 L143 82 Q124 88 115 84 L123 77 Q101 88 85 90 L92 80 Q72 93 51 95Z" fill="${color}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/>
        <path d="M56 67 Q78 42 108 45 Q85 48 67 65Z M112 46 Q137 46 146 67 Q131 54 117 54Z" fill="${highlight}"/>
        <path d="M57 84 Q85 77 99 64 M123 74 Q134 71 140 64" fill="none" stroke="${highlight}" stroke-width="2.9" stroke-linecap="round"/>`;
    case 'spiky90s':
      return `
        <path d="M48 92 L36 66 L60 70 L66 36 L88 60 L104 28 L120 58 L146 38 L142 68 L164 64 L150 92 C126 76 74 76 48 92 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M68 58 L84 68 L102 46 L116 66 L138 52" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />`;
    case 'flattop':
      return `
        <path d="M50 88 L47 40 L153 40 L150 88 C124 74 76 74 50 88 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M56 49 L144 49" stroke="${highlight}" stroke-width="5" stroke-linecap="round" />`;
    case 'pompadour':
      return `
        <path d="M49 90 C40 44 96 18 156 50 C168 68 154 90 132 82 C104 72 74 76 49 90 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M68 54 C96 36 132 42 146 58" fill="none" stroke="${highlight}" stroke-width="5" stroke-linecap="round" />`;
    case 'mohawk':
      return `
        <path d="M82 78 L74 24 L94 36 L102 18 L112 36 L128 24 L118 78 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M88 46 L101 30 L114 46" fill="none" stroke="${highlight}" stroke-width="3.5" stroke-linecap="round" />`;
    case 'curlyTop':
      return `
        <path d="M48 86 C42 64 58 46 76 52 C86 34 114 34 124 52 C144 46 158 64 152 86 C126 74 74 74 48 86 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M68 60 Q78 50 88 58 M108 54 Q120 46 132 58" fill="none" stroke="${highlight}" stroke-width="3.5" stroke-linecap="round" />`;
    case 'sideSweep':
      return `
        <path d="M48 92 C48 44 138 38 154 84 C126 72 92 96 48 92 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M68 64 C96 52 126 56 140 70" fill="none" stroke="${highlight}" stroke-width="4.5" stroke-linecap="round" />`;
    default:
      return `
        <path d="M49 88 C66 44 134 44 151 88 C124 72 76 72 49 88 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M72 60 Q100 50 128 60" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round" />`;
  }
}

export function renderCapSvg(capStyle: CapStyle, team: PortraitTeamColors): string {
  if (capStyle === 'none') return '';
  const reverse = capStyle === 'backwards';
  const crown = capStyle === 'visor' ? '' : `
    <path d="M49 75 Q47 61 55 47 Q67 28 99 26 Q131 23 148 50 Q156 64 151 81 Q112 72 85 76Z" fill="${team.primary}" stroke="${INK}" stroke-width="3.1"/>
    <path d="M100 28 Q73 34 61 53 L57 64 Q72 51 89 47 L83 52 Q104 45 119 45Z" fill="#FFF" opacity=".27"/>
    <path d="M125 35 Q142 50 140 71 L151 79 Q156 56 141 43Z" fill="${team.secondary}" opacity=".76"/>
    <path d="M99 28 Q82 43 80 68 M106 28 Q128 40 132 71" fill="none" stroke="${INK}" stroke-width="1.65" opacity=".65"/>
    <ellipse cx="102" cy="26" rx="5" ry="2.6" fill="${team.secondary}" stroke="${INK}" stroke-width="1.8"/>
    ${reverse ? '' : `<path d="M78 44 L89 40 L95 48 L84 60 L76 55Z" fill="${team.secondary}" stroke="#FFE9BD" stroke-width="1.5"/><path d="M80 52 l7 -8 -2 6 5 -2 -8 9 2 -6Z" fill="${team.accent}"/>`}`;
  return `<g stroke-linejoin="round" stroke-linecap="round">
    ${reverse ? `<path d="M137 63 Q163 63 178 72 Q179 79 160 82 L141 77Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3"/>` : ''}
    ${crown}
    <path d="M49 71 Q92 59 152 72 L151 83 Q104 72 49 83Z" fill="${team.primary}" stroke="${INK}" stroke-width="2.8"/>
    ${reverse ? `<path d="M67 76 Q69 62 91 65 Q99 66 99 73Z" fill="${INK}"/><path d="M68 77 L99 72" stroke="${team.accent}" stroke-width="3"/>` :
      `<path d="M52 70 Q79 62 107 63 L128 71 Q91 72 54 84 Q28 93 14 89 Q22 81 52 70Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3.2"/>
       <path d="M18 87 Q47 76 70 72 Q96 67 115 69" fill="none" stroke="#B9DEDF" stroke-width="1.8" opacity=".85"/>`}
  </g>`;
}

export function renderDetailedEyesSvg(
  eyeStyle: EyeStyle,
  irisColor: string,
  mood: PortraitMood,
  blink = false,
  playerLook?: PlayerLook,
): string {
  const angryBrows =
    mood === 'rival_glare' || mood === 'fired_up' || mood === 'determined' || eyeStyle === 'determined';

  const feminine = playerLook === 'female';
  const browPath = angryBrows ? 'M64 88 L90 97 M110 97 L136 88'
    : feminine ? 'M65 91 Q78 82 91 90 M109 90 Q122 82 135 91'
      : 'M64 91 L76 86 L91 89 M109 89 L123 86 L136 90';
  const brows = `<path d="${browPath}" fill="none" stroke="${INK}" stroke-width="${feminine ? 3.1 : 5.2}" stroke-linejoin="round" stroke-linecap="round"/>`;

  if (blink) {
    return `
      ${brows}
      <path d="M68 107 Q80 114 91 107" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />
      <path d="M109 107 Q120 114 132 107" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />`;
  }

  if (mood === 'shocked') {
    return `
      <path d="M66 84 Q80 76 91 84 M109 84 Q120 76 134 84" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />
      <ellipse cx="79" cy="105" rx="12" ry="13.5" fill="#FFFFFF" stroke="${INK}" stroke-width="4" />
      <circle cx="79" cy="105" r="5" fill="${irisColor}" />
      <circle cx="79" cy="105" r="2.8" fill="${INK}" />
      <circle cx="81" cy="102" r="2" fill="#FFFFFF" />
      <ellipse cx="121" cy="105" rx="12" ry="13.5" fill="#FFFFFF" stroke="${INK}" stroke-width="4" />
      <circle cx="121" cy="105" r="5" fill="${irisColor}" />
      <circle cx="121" cy="105" r="2.8" fill="${INK}" />
      <circle cx="123" cy="102" r="2" fill="#FFFFFF" />`;
  }

  const renderSingleEye = (cx: number, cy: number, isRight: boolean): string => {
    if (eyeStyle === 'wink' && isRight && mood === 'happy') {
      return `<path d="M${cx - 11} ${cy + 2} Q${cx} ${cy - 9} ${cx + 11} ${cy + 2}" fill="none" stroke="${INK}" stroke-width="4.8" stroke-linecap="round" />`;
    }

    const rx = (eyeStyle === 'wide' ? 11.5 : 10.5) + (feminine ? 1.6 : 0);
    const ry = (eyeStyle === 'chill' ? 8.5 : eyeStyle === 'wide' ? 13 : 11.5) + (feminine ? 1.8 : -0.5);

    const starSparkle =
      eyeStyle === 'starry' || mood === 'fired_up'
        ? `<polygon points="${cx},${cy - 6} ${cx + 2},${cy - 1} ${cx + 7},${cy - 1} ${cx + 3},${cy + 2} ${cx + 4.5},${cy + 7} ${cx},${cy + 4} ${cx - 4.5},${cy + 7} ${cx - 3},${cy + 2} ${cx - 7},${cy - 1} ${cx - 2},${cy - 1}" fill="#FFC300" />`
        : `<circle cx="${cx + 3.2}" cy="${cy - 3.6}" r="3.4" fill="#FFFFFF" />
           <circle cx="${cx - 2.6}" cy="${cy + 3.4}" r="1.5" fill="#FFFFFF" opacity="0.85" />`;

    return `
      <g>
        <!-- Crisp white sclera -->
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="${INK}" stroke-width="3.6" />
        <!-- Subtle top lid shadow -->
        <path d="M${cx - rx + 1} ${cy - 3} Q${cx} ${cy - ry + 2} ${cx + rx - 1} ${cy - 3}" fill="#C7D6E8" opacity="0.55" />
        <!-- Colored Iris & Pupil -->
        <ellipse cx="${cx + 0.8}" cy="${cy + 0.5}" rx="${feminine ? 8.3 : 6.6}" ry="${feminine ? 9.4 : 7.6}" fill="${irisColor}" />
        <ellipse cx="${cx + 0.8}" cy="${cy + 0.8}" rx="4.1" ry="4.9" fill="${INK}" />
        <!-- Glossy 90s Catchlights -->
        <path d="M${cx - 4.5} ${cy + 5.4} Q${cx} ${cy + 9.2} ${cx + 5.3} ${cy + 5.6}" fill="none" stroke="#B3EAED" stroke-width="1.8" opacity=".8"/>
        ${starSparkle}
        ${playerLook === 'female' ? `<path d="M${cx + (isRight ? rx : -rx)} ${cy - 3} l${isRight ? 5 : -5} -6 l${isRight ? -1 : 1} 7Z" fill="${INK}"/>` : ''}
        <!-- Chunky upper comic lash crease -->
        <path d="M${cx - rx - 1} ${cy - 2} Q${cx} ${cy - ry - 2.5} ${cx + rx + 1} ${cy - 1.5}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round" />
      </g>`;
  };

  return `
    ${brows}
    ${renderSingleEye(79, 106, false)}
    ${renderSingleEye(121, 106, true)}
  `;
}

export function renderDetailedMouthSvg(mouthStyle: MouthStyle, mood: PortraitMood): string {
  if (mood === 'shocked') {
    return `
      <ellipse cx="100" cy="133" rx="10" ry="12.5" fill="#4A1222" stroke="${INK}" stroke-width="3.8" />
      <path d="M93 139 Q100 134 107 139" fill="#FF6B8B" />`;
  }
  if (mood === 'rival_glare') {
    return `
      <path d="M80 128 L120 126 L117 137 L83 137 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
      <path d="M82 132 L118 131 M91 127 L91 137 M100 127 L100 137 M109 127 L109 137" stroke="${INK}" stroke-width="2.2" />`;
  }
  if (mood === 'sweating') {
    return `
      <path d="M84 134 Q100 125 116 134" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" />
      <path d="M88 132 L112 132" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />`;
  }

  switch (mouthStyle) {
    case 'bubblegum':
      return `
        <path d="M86 129 Q100 137 114 129" fill="none" stroke="${INK}" stroke-width="3.8" stroke-linecap="round" />
        <circle cx="115" cy="133" r="15" fill="#FF6FA5" stroke="${INK}" stroke-width="3.8" />
        <path d="M106 125 A9 9 0 0 1 120 123" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
        <circle cx="122" cy="139" r="2.2" fill="#FFD1E3" />`;
    case 'tongueOut':
      return `
        <path d="M80 125 Q100 145 120 125 Z" fill="#591124" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
        <path d="M84 126 Q100 131 116 126" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
        <path d="M91 132 C91 148 109 148 109 132 Z" fill="#FF5D8F" stroke="${INK}" stroke-width="3.2" />
        <line x1="100" y1="133" x2="100" y2="142" stroke="#D9386A" stroke-width="2" stroke-linecap="round" />`;
    case 'smirk':
      return `
        <path d="M82 131 Q104 138 120 123" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" />
        <path d="M108 129 L117 125 L114 133 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2" stroke-linejoin="round" />`;
    case 'focused':
      return `
        <path d="M87 131 Q100 129 113 131" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" />
        <path d="M95 137 Q100 139 105 137" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity="0.5" />`;
    case 'openLaugh':
      return `
        <path d="M78 123 C80 149 120 149 122 123 Z" fill="#6B1329" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        <path d="M82 125 Q100 131 118 125" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" />
        <path d="M89 139 Q100 132 111 139 Q100 146 89 139 Z" fill="#FF6B95" />`;
    case 'bigGrin':
    default:
      return `
        <path d="M79 125 C83 145 117 145 121 125 Z" fill="#591124" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
        <path d="M82 126 L118 126 C115 134 85 134 82 126 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.2" />
        <path d="M90 138 Q100 133 110 138 Q100 143 90 138 Z" fill="#FF6B95" />
        <path d="M75 123 Q77 127 75 130 M125 123 Q123 127 125 130" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" />`;
  }
}

export function renderAccessorySvg(accessory: AccessoryStyle, team: PortraitTeamColors): string {
  switch (accessory) {
    case 'pinkShades':
      return pinkSportsShades;
    case 'shades90s':
      return `
        <g>
          <!-- Rad 90s Wrap-Around Sport Blades -->
          <path d="M55 96 L145 96 L140 115 L108 116 L100 106 L92 116 L60 115 Z" fill="#141829" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
          <path d="M54 96 L146 96" stroke="${team.accent}" stroke-width="4.5" stroke-linecap="round" />
          <!-- Iridescent 90s lens shine -->
          <polygon points="63,100 76,100 68,113 59,113" fill="#00E5FF" opacity="0.85" />
          <polygon points="79,100 85,100 77,113 71,113" fill="#FF4D6D" opacity="0.75" />
          <polygon points="113,100 126,100 118,113 109,113" fill="#00E5FF" opacity="0.85" />
          <polygon points="129,100 135,100 127,113 121,113" fill="#FFC300" opacity="0.75" />
        </g>`;
    case 'eyeBlack':
      return `
        <path d="M64 118 Q77 116 88 119 L86 124 Q76 122 65 123 Z" fill="${INK}" />
        <path d="M112 119 Q123 116 136 118 L135 123 Q124 122 114 124 Z" fill="${INK}" />`;
    case 'cheekBandage':
      return `
        <g transform="rotate(-14 128 122)">
          <rect x="115" y="115" width="24" height="11" rx="3.5" fill="#FBF4E4" stroke="${INK}" stroke-width="2.6" />
          <line x1="123" y1="115" x2="123" y2="126" stroke="${INK}" stroke-width="1.8" opacity="0.45" />
          <line x1="131" y1="115" x2="131" y2="126" stroke="${INK}" stroke-width="1.8" opacity="0.45" />
          <circle cx="127" cy="119" r="1" fill="${INK}" />
          <circle cx="127" cy="122" r="1" fill="${INK}" />
        </g>`;
    case 'freckles':
      return `
        <g fill="#8F4B29" opacity="0.78">
          <circle cx="68" cy="119" r="1.9" /><circle cx="75" cy="122" r="1.8" /><circle cx="64" cy="123" r="1.6" />
          <circle cx="132" cy="119" r="1.9" /><circle cx="125" cy="122" r="1.8" /><circle cx="136" cy="123" r="1.6" />
        </g>`;
    case 'handlebarStache':
      return `<path d="M72 126 C82 116 94 120 100 125 C106 120 118 116 128 126 C122 135 108 132 100 128 C92 132 78 135 72 126 Z" fill="#3B2314" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" />`;
    case 'headband':
      return `
        <path d="M50 81 Q100 71 150 81 L149 91 Q100 81 51 91 Z" fill="${team.accent}" stroke="${INK}" stroke-width="3.6" />
        <path d="M56 85 Q100 76 144 85" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.6" />`;
    case 'starEarrings':
      return `
        <polygon points="48,114 50,118 54,118 51,121 52,125 48,123 44,125 45,121 42,118 46,118" fill="#FFC300" stroke="${INK}" stroke-width="2" />
        <polygon points="152,114 154,118 158,118 155,121 156,125 152,123 148,125 149,121 146,118 150,118" fill="#FFC300" stroke="${INK}" stroke-width="2" />`;
    case 'none':
    default:
      return '';
  }
}

function raisedMask(team: PortraitTeamColors) {
  const cage = 'M46 64 L49 46 Q68 22 104 21 Q135 20 151 43 L155 62 Q108 83 46 64Z M50 48 Q97 61 151 44 M63 35 Q86 40 110 36 L126 31 M73 30 L69 51 L72 68 M129 31 L134 48 L130 68';
  return `<g data-gear="raised-mask" stroke-linejoin="round">
    <path d="M51 81 Q44 27 98 24 Q151 18 152 78 L142 90 Q97 74 54 91Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.5"/>
    <path d="M53 63 Q105 78 150 60 L150 77 Q99 91 52 79Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3.6"/>
    <path d="${cage}" fill="none" stroke="${INK}" stroke-width="6.5"/>
    <path d="${cage}" fill="none" stroke="#C3D5D8" stroke-width="2.6"/>
    <path d="M82 22 Q101 13 120 20 L119 29 Q99 35 83 31Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3"/>
    <path d="M91 25 Q102 21 112 23" fill="none" stroke="${team.accent}" stroke-width="2.5"/>
  </g>`;
}

export function renderPortraitSvgString(
  input: PortraitTraits,
  team: PortraitTeamColors,
  mood: PortraitMood = 'happy',
  instanceId = '',
  catcher = false,
  player?: { throws: ThrowsHand; bats: BatsHand; jerseyNumber?: number; position?: FieldPosition },
): string {
  const traits = resolveAthleteAppearance(input);
  const rng = createSeededRng(traits.seed ^ 0x4d414e47);
  const emotion = cardExpression(mood, rng.pick(CARD_EXPRESSIONS));
  const pitching = player?.position === 'SP' || player?.position === 'RP';
  const pose: CardPose = catcher ? 'glove' : pitching ? 'windup' : rng.pick(['bat', 'glove', 'rally', 'ready'] as const);
  const flipped = pose === 'bat' ? player?.bats === 'L' : player?.throws === 'L';
  const tilt = emotion === 'playful' || emotion === 'dreamy' ? -8 : emotion === 'rival' || emotion === 'intense' ? 5 : -2;
  const lean = { bat: -13, glove: 7, ready: -4, rally: 8, windup: -3 }[pose];
  const head = `translate(99 72) rotate(${tilt}) scale(.53 .54) translate(-92 -158)`;
  const uid = `p${traits.seed}-${instanceId}`;
  const kit = mangaUniform(traits, team, pose, catcher, uid, flipped, player?.jerseyNumber);
  const flow = { ponytail: 'translate(153 87) rotate(-23) scale(1.16 1.65) translate(-153 -87)',
    braid: 'translate(152 84) rotate(-12) scale(1.04 1.64) translate(-152 -84)',
    pigtails: 'translate(100 90) scale(1.05 1.45) translate(-100 -90)',
    waves: 'translate(100 79) scale(1.05 1.31) translate(-100 -79)' };
  const hairFlow = flow[traits.hairStyle as keyof typeof flow] ?? '';
  const capStyle = catcher ? 'forward' : traits.capStyle;
  const accessory = traits.accessory === 'handlebarStache' || traits.accessory === 'headband' ||
    (traits.glasses !== 'none' && (traits.accessory === 'shades90s' || traits.accessory === 'pinkShades')) ? '' : renderAccessorySvg(traits.accessory, team);
  const lively = emotion === 'playful' || emotion === 'delighted';
  const printMarks = lively ? `<path d="M41 52 Q45 52 47 44 Q48 52 54 52 Q49 53 47 60 Q46 54 41 52Z M153 39 l2 -5 1 4 5 2 -5 1 -2 5 -1 -5 -4 -1Z" fill="#FFF9D8" stroke="${team.secondary}" stroke-width=".85"/>`
    : emotion === 'intense' || emotion === 'rival' ? `<path d="M8 47 l46 22 -43 -16Z M9 72 l34 8 -34 -4Z M191 26 l-39 38 36 -31Z M188 103 l-31 5 31 -1Z" fill="${team.secondary}" opacity=".72"/>` : '';
  const framing: Record<CardPose, string> = {
    bat: '10 -3 162 202.5', glove: '25 -4 150 187.5', ready: '17 -5 166 207.5',
    rally: '17 -5 166 207.5', windup: traits.pitchingMotion === 'sidearm' ? '0 -35 200 250' : '8 -14 184 230',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${framing[pose]}" role="img" aria-label="Manga baseball card portrait">
    ${renderBackdrop(traits.backdropStyle, mood)}
    ${printMarks}
    <g data-card-pose="${pose}" data-expression="${emotion}" transform="${flipped ? 'translate(200 0) scale(-1 1)' : ''}">
      <g transform="rotate(${lean} 100 145)" stroke-linejoin="round" stroke-linecap="round">
        ${kit.far}
        <g data-part="back-hair" transform="${head}"><g transform="${hairFlow}">${renderBackHairSvg(traits.hairStyle, traits.hairColor, traits.hairHighlight, team.accent, traits.hairAccessory)}</g></g>
        ${kit.body}
        <g transform="${head}">
          ${mangaFace(traits, emotion, uid)}
          ${traits.hairStyle === 'spiky90s' && (capStyle === 'visor' || capStyle === 'none')
            ? visorSpikes(traits) : renderFrontHairSvg(traits.hairStyle, traits.hairColor, traits.hairHighlight, capStyle)}
          ${mangaFringe(traits)}
          ${templeLocks(traits.hairStyle, traits.hairColor, traits.hairHighlight)}
          ${traits.hairAccessory === 'headband' ? hairband(team.accent) : ''}
          ${catcher ? raisedMask(team) : renderCapSvg(capStyle, team)}
          ${accessory}
        </g>
        ${kit.near}
      </g>
    </g>
  </svg>`;
}
