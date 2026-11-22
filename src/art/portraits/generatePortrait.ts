import { createSeededRng } from '../../engine/rng/seededRng';
import type {
  AccessoryStyle,
  BackdropStyle,
  CapStyle,
  EyeStyle,
  HairStyle,
  HeadShape,
  MouthStyle,
  PortraitMood,
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

export function createPortraitTraits(seed: number): PortraitTraits {
  const rng = createSeededRng(seed);
  const skin = rng.pick(SKIN_TONES);
  const hair = rng.pick(HAIR_PALETTES);

  return {
    seed,
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
  };
}

function renderBackdrop(
  style: BackdropStyle,
  team: PortraitTeamColors,
  mood: PortraitMood,
  uid: string,
): string {
  const skyTop = mood === 'fired_up' ? '#FF9F1C' : mood === 'rival_glare' ? '#FF3355' : '#85E4FF';
  const skyBottom = mood === 'fired_up' ? '#FF3B6B' : mood === 'rival_glare' ? '#4A0A1E' : '#248EFF';

  let pattern = '';
  if (style === 'starburst') {
    const rays: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      const a1 = (i * (360 / 14) * Math.PI) / 180;
      const a2 = ((i * (360 / 14) + 12) * Math.PI) / 180;
      const x1 = 100 + Math.cos(a1) * 165;
      const y1 = 108 + Math.sin(a1) * 165;
      const x2 = 100 + Math.cos(a2) * 165;
      const y2 = 108 + Math.sin(a2) * 165;
      rays.push(
        `<polygon points="100,108 ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${team.accent}" opacity="0.32" />`,
      );
    }
    pattern = rays.join('');
  } else if (style === 'stripes') {
    pattern = `
      <g opacity="0.26" transform="rotate(-20 100 100)">
        <rect x="-40" y="-30" width="24" height="270" fill="#FFFFFF" />
        <rect x="16" y="-30" width="24" height="270" fill="${team.accent}" />
        <rect x="72" y="-30" width="24" height="270" fill="#FFFFFF" />
        <rect x="128" y="-30" width="24" height="270" fill="${team.accent}" />
        <rect x="184" y="-30" width="24" height="270" fill="#FFFFFF" />
      </g>`;
  } else if (style === 'lightning') {
    pattern = `
      <polygon points="30,8 66,8 44,74 72,74 20,162 40,94 14,94" fill="#FFC300" stroke="${INK}" stroke-width="2.5" opacity="0.72" />
      <polygon points="162,14 192,14 166,80 190,80 138,164 156,98 134,98" fill="#FFFFFF" opacity="0.45" />`;
  } else if (style === 'stadium') {
    pattern = `
      <path d="M0 144 Q100 120 200 144 L200 200 L0 200 Z" fill="#2FB356" stroke="${INK}" stroke-width="3.5" />
      <path d="M0 156 Q100 134 200 156" fill="none" stroke="#279E4B" stroke-width="8" />
      <g stroke="${INK}" stroke-width="3">
        <line x1="28" y1="50" x2="28" y2="140" />
        <rect x="12" y="28" width="32" height="18" rx="4" fill="#FBF4E4" />
        <line x1="172" y1="50" x2="172" y2="140" />
        <rect x="156" y="28" width="32" height="18" rx="4" fill="#FBF4E4" />
      </g>
      <circle cx="22" cy="37" r="3.5" fill="#FFD166" />
      <circle cx="34" cy="37" r="3.5" fill="#FFD166" />
      <circle cx="166" cy="37" r="3.5" fill="#FFD166" />
      <circle cx="178" cy="37" r="3.5" fill="#FFD166" />`;
  } else {
    pattern = `
      <pattern id="dots-${uid}" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="6" r="2.6" fill="${INK}" opacity="0.14" />
      </pattern>
      <rect width="200" height="200" fill="url(#dots-${uid})" />`;
  }

  const moodAura =
    mood === 'fired_up'
      ? `<path d="M16 196 Q38 118 24 66 Q58 98 76 38 Q100 84 126 36 Q142 96 176 66 Q158 122 184 196 Z" fill="#FFC300" stroke="#FF4D6D" stroke-width="3" opacity="0.65" />`
      : mood === 'rival_glare'
        ? `<path d="M10 14 L48 64 L26 66 L58 112" fill="none" stroke="#FFC300" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
           <path d="M190 14 L152 64 L174 66 L142 112" fill="none" stroke="#FFC300" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />`
        : '';

  return `
    <defs>
      <linearGradient id="bg-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${skyTop}" />
        <stop offset="100%" stop-color="${skyBottom}" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#bg-${uid})" />
    <circle cx="100" cy="104" r="76" fill="#FFFFFF" opacity="0.16" />
    ${pattern}
    ${moodAura}
  `;
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

export function renderBackHairSvg(style: HairStyle, color: string, highlight: string): string {
  switch (style) {
    case 'mullet':
      return `
        <path d="M46 96 C34 122 34 152 44 170 L64 162 L58 172 L142 172 L136 162 L156 170 C166 152 166 122 154 96 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M46 132 Q54 150 49 164 M154 132 Q146 150 151 164" fill="none" stroke="${highlight}" stroke-width="3.5" stroke-linecap="round" />`;
    case 'pigtails':
      return `
        <path d="M48 98 C24 98 18 132 32 150 C42 142 46 132 52 120 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M152 98 C176 98 182 132 168 150 C158 142 154 132 148 120 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M30 116 Q26 130 33 140 M170 116 Q174 130 167 140" fill="none" stroke="${highlight}" stroke-width="3.5" stroke-linecap="round" />
        <circle cx="51" cy="100" r="7.5" fill="#FF4D6D" stroke="${INK}" stroke-width="3.5" />
        <circle cx="149" cy="100" r="7.5" fill="#FF4D6D" stroke="${INK}" stroke-width="3.5" />`;
    case 'afro':
      return `
        <path d="M36 96 C26 70 44 36 72 34 C88 20 112 20 128 34 C156 36 174 70 164 96 C172 118 158 140 142 140 L58 140 C42 140 28 118 36 96 Z" fill="${color}" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        <path d="M62 46 Q82 34 104 40 M122 44 Q142 50 148 68" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round" opacity="0.75" />`;
    case 'bob':
      return `
        <path d="M44 82 C38 118 42 148 64 158 L136 158 C158 148 162 118 156 82 Z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />`;
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
    if (style === 'spiky90s') {
      return `
        <path d="M51 78 L58 95 L70 81 L84 97 L98 81 L114 96 L128 81 L142 94 L149 78 L146 68 L54 68 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
        <path d="M64 82 L70 76 L78 84 M110 82 L118 76 L124 84" fill="none" stroke="${highlight}" stroke-width="2.5" stroke-linecap="round" />`;
    }
    return `
      <path d="M51 80 C66 93 82 86 95 79 C110 92 130 91 149 80 L147 68 L53 68 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
      <path d="M64 81 Q78 86 88 79 M114 82 Q128 86 140 79" fill="none" stroke="${highlight}" stroke-width="2.6" stroke-linecap="round" />`;
  }

  switch (style) {
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

  if (capStyle === 'visor') {
    return `
      <g>
        <path d="M48 74 Q100 58 152 74 L149 86 Q100 72 51 86 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
        <!-- 90s curved brim with classic green underbrim -->
        <path d="M46 80 Q106 62 166 80 Q124 96 46 80 Z" fill="#1E7A44" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
        <path d="M46 78 Q106 60 166 78 Q118 89 46 78 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
      </g>`;
  }

  if (capStyle === 'backwards') {
    return `
      <g>
        <!-- Backwards bill sticking out right -->
        <path d="M138 69 L180 76 C182 84 174 90 166 90 L136 84 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
        <path d="M142 82 L172 87" stroke="#1E7A44" stroke-width="3.5" stroke-linecap="round" />
        <!-- 6-panel crown -->
        <path d="M48 80 C50 26 150 26 152 80 Q100 72 48 80 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.6" stroke-linejoin="round" />
        <path d="M100 35 L100 64 M74 41 Q82 58 78 76 M126 41 Q118 58 122 76" fill="none" stroke="${INK}" stroke-width="2" opacity="0.35" />
        <!-- Snapback cutout + strap -->
        <path d="M82 77 C82 62 118 62 118 77 Z" fill="#2A1E17" stroke="${INK}" stroke-width="3.5" />
        <rect x="82" y="72" width="36" height="6" rx="2" fill="${team.accent}" stroke="${INK}" stroke-width="2.5" />
        <circle cx="100" cy="35" r="5.5" fill="${team.accent}" stroke="${INK}" stroke-width="3" />
      </g>`;
  }

  // Classic Forward 90s Pro Ballcap with 6-panel stitching, raised monogram patch & green underbrim!
  return `
    <g>
      <!-- Crown -->
      <path d="M48 79 C50 24 150 24 152 79 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
      <!-- Crown cel highlight & panel seams -->
      <path d="M62 56 C68 38 84 32 96 32" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.28" />
      <path d="M74 37 Q70 56 68 74 M126 37 Q130 56 132 74" fill="none" stroke="${INK}" stroke-width="2" opacity="0.3" />
      <!-- Top squatchee button -->
      <circle cx="100" cy="32" r="5.5" fill="${team.accent}" stroke="${INK}" stroke-width="3.2" />
      <!-- Embroidered 3D Team Patch -->
      <rect x="83" y="42" width="34" height="24" rx="7" fill="${team.accent}" stroke="${INK}" stroke-width="3.5" />
      <rect x="86" y="45" width="28" height="18" rx="5" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.65" />
      <text x="100" y="59" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="13" font-weight="900" fill="${INK}">${team.monogram.slice(0, 2)}</text>
      <!-- Classic 90s Green Underbrim + Curved Top Brim -->
      <path d="M42 79 Q104 58 170 77 Q122 96 42 79 Z" fill="#1E7A44" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
      <path d="M42 77 Q104 55 170 75 Q118 88 42 77 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
    </g>`;
}

export function renderDetailedEyesSvg(
  eyeStyle: EyeStyle,
  irisColor: string,
  mood: PortraitMood,
  blink = false,
): string {
  const angryBrows =
    mood === 'rival_glare' || mood === 'fired_up' || mood === 'determined' || eyeStyle === 'determined';

  const brows = angryBrows
    ? `<path d="M63 87 L92 95 L90 99 L62 92 Z" fill="${INK}" />
       <path d="M137 87 L108 95 L110 99 L138 92 Z" fill="${INK}" />`
    : `<path d="M65 90 Q79 83 91 90" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />
       <path d="M109 90 Q121 83 135 90" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />`;

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

    const rx = eyeStyle === 'wide' ? 11.5 : 10.5;
    const ry = eyeStyle === 'chill' ? 8.5 : eyeStyle === 'wide' ? 13 : 11.5;

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
        <ellipse cx="${cx + 0.8}" cy="${cy + 0.5}" rx="6.6" ry="7.6" fill="${irisColor}" />
        <ellipse cx="${cx + 0.8}" cy="${cy + 0.8}" rx="4.1" ry="4.9" fill="${INK}" />
        <!-- Glossy 90s Catchlights -->
        ${starSparkle}
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

export function renderPortraitSvgString(
  traits: PortraitTraits,
  team: PortraitTeamColors,
  mood: PortraitMood = 'happy',
): string {
  const uid = `p${Math.abs(traits.seed)}`;
  const head = renderSculptedHeadParts(traits.headShape);

  const sweatDrop =
    mood === 'sweating'
      ? `<path d="M146 74 C154 88 154 98 146 101 C138 98 138 88 146 74 Z" fill="#4CC3FF" stroke="${INK}" stroke-width="3.2" />
         <circle cx="144" cy="93" r="2.2" fill="#FFFFFF" />`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Retro 90s player portrait">
  ${renderBackdrop(traits.backdropStyle, team, mood, uid)}
  <!-- Piped 90s Raglan Baseball Jersey & Undershirt -->
  <path d="M28 204 C34 158 64 148 100 148 C136 148 166 158 172 204 Z" fill="#FBF4E4" stroke="${INK}" stroke-width="4.8" />
  <path d="M28 204 C33 166 52 154 74 151 L62 204 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
  <path d="M172 204 C167 166 148 154 126 151 L138 204 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
  <!-- Undershirt V-neck -->
  <polygon points="81,150 100,177 119,150" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
  <!-- Jersey center piping & buttons -->
  <path d="M77 151 L96 180 L96 204 M123 151 L104 180 L104 204" fill="none" stroke="${team.accent}" stroke-width="3" />
  <circle cx="100" cy="187" r="2.5" fill="${INK}" />
  <circle cx="100" cy="196" r="2.5" fill="${INK}" />
  <!-- Neck with cast chin shadow -->
  <rect x="87" y="136" width="26" height="22" rx="9" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.2" />
  <path d="M88 138 Q100 150 112 138 L112 146 Q100 154 88 146 Z" fill="${traits.skinShadow}" />
  <!-- Back Hair -->
  ${renderBackHairSvg(traits.hairStyle, traits.hairColor, traits.hairHighlight)}
  <!-- Sculpted Ears with Inner Tragus Curve -->
  <g>
    <circle cx="49" cy="108" r="11.5" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.4" />
    <path d="M46 104 Q52 108 47 113" fill="none" stroke="${traits.skinShadow}" stroke-width="3" stroke-linecap="round" />
    <circle cx="151" cy="108" r="11.5" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.4" />
    <path d="M154 104 Q148 108 153 113" fill="none" stroke="${traits.skinShadow}" stroke-width="3" stroke-linecap="round" />
  </g>
  <!-- Sculpted Head Base + Cel Shadow + Rim Highlight -->
  <path d="${head.silhouette}" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
  <path d="${head.celShadow}" fill="${traits.skinShadow}" opacity="0.55" />
  <path d="${head.rimHighlight}" fill="none" stroke="${traits.skinHighlight}" stroke-width="4" stroke-linecap="round" opacity="0.8" />
  <!-- Cute Cheek Blush -->
  <ellipse cx="66" cy="119" rx="9.5" ry="5" fill="#FF6B95" opacity="0.42" />
  <ellipse cx="134" cy="119" rx="9.5" ry="5" fill="#FF6B95" opacity="0.42" />
  <!-- Sculpted Cartoon Nose & Bridge Highlight -->
  <path d="M97 110 C105 114 105 120 96 121" fill="${traits.skinShadow}" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="99" cy="114" r="1.8" fill="${traits.skinHighlight}" />
  <!-- Layered Eyes & Mouth -->
  ${renderDetailedEyesSvg(traits.eyeStyle, traits.irisColor, mood)}
  ${renderDetailedMouthSvg(traits.mouthStyle, mood)}
  <!-- Sculpted Front Hair & 6-Panel 90s Cap -->
  ${renderFrontHairSvg(traits.hairStyle, traits.hairColor, traits.hairHighlight, traits.capStyle)}
  ${renderCapSvg(traits.capStyle, team)}
  <!-- Accessories & Mood FX -->
  ${renderAccessorySvg(traits.accessory, team)}
  ${sweatDrop}
</svg>`;
}
