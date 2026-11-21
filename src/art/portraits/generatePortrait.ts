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

const SKIN_TONES: readonly { base: string; shadow: string }[] = [
  { base: '#FFE0C4', shadow: '#EBC09C' },
  { base: '#FAD0A8', shadow: '#E2AC7E' },
  { base: '#F0B888', shadow: '#D39462' },
  { base: '#D99968', shadow: '#B8784A' },
  { base: '#B87648', shadow: '#945831' },
  { base: '#8F5734', shadow: '#6E3F22' },
  { base: '#6A3E25', shadow: '#4E2B18' },
  { base: '#FFE7D1', shadow: '#E8C5A8' },
];

const HAIR_COLORS = [
  '#221E29',
  '#4A2E1B',
  '#8C4A22',
  '#D98A2B',
  '#EBC558',
  '#C93B2B',
  '#2D54A8',
  '#6B3FA0',
  '#5A6577',
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

  return {
    seed,
    headShape: rng.pick(HEAD_SHAPES),
    skinTone: skin.base,
    skinShadow: skin.shadow,
    hairStyle: rng.pick(HAIR_STYLES),
    hairColor: rng.pick(HAIR_COLORS),
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
  const skyTop = mood === 'fired_up' ? '#FF9F1C' : mood === 'rival_glare' ? '#FF4D6D' : '#7CE0FF';
  const skyBottom = mood === 'fired_up' ? '#FF4D6D' : mood === 'rival_glare' ? '#590D22' : '#3AA6FF';

  let pattern = '';
  if (style === 'starburst') {
    const rays: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const a1 = (i * 30 * Math.PI) / 180;
      const a2 = ((i * 30 + 15) * Math.PI) / 180;
      const x1 = 100 + Math.cos(a1) * 160;
      const y1 = 105 + Math.sin(a1) * 160;
      const x2 = 100 + Math.cos(a2) * 160;
      const y2 = 105 + Math.sin(a2) * 160;
      rays.push(`<polygon points="100,105 ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${team.accent}" opacity="0.28" />`);
    }
    pattern = rays.join('');
  } else if (style === 'stripes') {
    pattern = `
      <g opacity="0.22" transform="rotate(-18 100 100)">
        <rect x="-40" y="-20" width="28" height="260" fill="#FFFFFF" />
        <rect x="20" y="-20" width="28" height="260" fill="${team.accent}" />
        <rect x="80" y="-20" width="28" height="260" fill="#FFFFFF" />
        <rect x="140" y="-20" width="28" height="260" fill="${team.accent}" />
        <rect x="200" y="-20" width="28" height="260" fill="#FFFFFF" />
      </g>`;
  } else if (style === 'lightning') {
    pattern = `
      <polygon points="35,10 68,10 48,78 74,78 24,158 42,96 18,96" fill="#FFC300" opacity="0.45" />
      <polygon points="164,18 192,18 168,84 190,84 140,162 158,102 136,102" fill="#FFFFFF" opacity="0.35" />`;
  } else if (style === 'stadium') {
    pattern = `
      <path d="M0 148 Q100 124 200 148 L200 200 L0 200 Z" fill="#2FB356" />
      <rect x="18" y="34" width="32" height="16" rx="4" fill="#FBF4E4" stroke="${INK}" stroke-width="3" />
      <rect x="150" y="34" width="32" height="16" rx="4" fill="#FBF4E4" stroke="${INK}" stroke-width="3" />
      <circle cx="28" cy="42" r="3" fill="#FFD166" />
      <circle cx="40" cy="42" r="3" fill="#FFD166" />
      <circle cx="160" cy="42" r="3" fill="#FFD166" />
      <circle cx="172" cy="42" r="3" fill="#FFD166" />`;
  } else {
    pattern = `
      <pattern id="dots-${uid}" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="7" r="2.8" fill="${INK}" opacity="0.14" />
      </pattern>
      <rect width="200" height="200" fill="url(#dots-${uid})" />`;
  }

  const moodAura =
    mood === 'fired_up'
      ? `<path d="M22 185 Q48 118 32 72 Q65 104 78 52 Q100 94 124 48 Q138 102 170 74 Q152 124 180 185 Z" fill="#FFC300" opacity="0.48" />`
      : mood === 'rival_glare'
        ? `<path d="M12 18 L48 64 L28 66 L54 108" fill="none" stroke="#FFC300" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
           <path d="M188 18 L152 64 L172 66 L146 108" fill="none" stroke="#FFC300" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />`
        : '';

  return `
    <defs>
      <linearGradient id="bg-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${skyTop}" />
        <stop offset="100%" stop-color="${skyBottom}" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#bg-${uid})" />
    ${pattern}
    ${moodAura}
  `;
}

function renderBackHair(style: HairStyle, color: string): string {
  switch (style) {
    case 'mullet':
      return `<path d="M46 95 Q36 140 50 165 L150 165 Q164 140 154 95 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
    case 'pigtails':
      return `
        <circle cx="42" cy="112" r="24" fill="${color}" stroke="${INK}" stroke-width="5" />
        <circle cx="158" cy="112" r="24" fill="${color}" stroke="${INK}" stroke-width="5" />
        <circle cx="56" cy="100" r="7" fill="#FF4D6D" stroke="${INK}" stroke-width="3.5" />
        <circle cx="144" cy="100" r="7" fill="#FF4D6D" stroke="${INK}" stroke-width="3.5" />`;
    case 'afro':
      return `<circle cx="100" cy="84" r="64" fill="${color}" stroke="${INK}" stroke-width="5" />`;
    case 'bob':
      return `<path d="M46 84 Q42 146 66 156 L134 156 Q158 146 154 84 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
    default:
      return '';
  }
}

function renderHeadPath(shape: HeadShape): { base: string; shade: string } {
  switch (shape) {
    case 'square':
      return {
        base: '<rect x="52" y="54" width="96" height="98" rx="28" />',
        shade: '<path d="M54 128 Q100 156 146 128 L146 138 Q100 160 54 138 Z" />',
      };
    case 'chubby':
      return {
        base: '<ellipse cx="100" cy="106" rx="54" ry="48" />',
        shade: '<path d="M52 126 Q100 158 148 126 Q100 144 52 126 Z" />',
      };
    case 'oval':
      return {
        base: '<ellipse cx="100" cy="103" rx="45" ry="52" />',
        shade: '<path d="M58 128 Q100 156 142 128 Q100 145 58 128 Z" />',
      };
    case 'heart':
      return {
        base: '<path d="M52 94 C52 56 148 56 148 94 C148 128 118 152 100 154 C82 152 52 128 52 94 Z" />',
        shade: '<path d="M62 128 Q100 156 138 128 Q100 146 62 128 Z" />',
      };
    case 'round':
    default:
      return {
        base: '<circle cx="100" cy="104" r="49" />',
        shade: '<path d="M56 126 Q100 156 144 126 Q100 144 56 126 Z" />',
      };
  }
}

function renderFrontHair(style: HairStyle, color: string, capStyle: CapStyle): string {
  if (capStyle === 'forward' || capStyle === 'backwards') {
    // Charming bangs / hair tufts peeking beneath the cap
    if (style === 'spiky90s') {
      return `<path d="M55 82 L66 96 L78 82 L94 98 L108 82 L124 96 L144 82 L144 72 L55 72 Z" fill="${color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />`;
    }
    return `<path d="M54 84 Q74 96 90 82 Q112 96 146 82 L144 72 L56 72 Z" fill="${color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />`;
  }

  switch (style) {
    case 'spiky90s':
      return `<path d="M48 92 L42 64 L66 72 L72 40 L94 64 L108 36 L124 64 L148 44 L144 72 L162 66 L150 92 Q100 76 48 92 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
    case 'flattop':
      return `<path d="M52 88 L50 44 L150 44 L148 88 Q100 74 52 88 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
    case 'pompadour':
      return `<path d="M50 88 C44 46 98 22 156 54 C166 72 152 90 132 82 Q96 72 50 88 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
    case 'mohawk':
      return `<path d="M84 78 L80 28 L100 38 L120 28 L116 78 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
    case 'curlyTop':
      return `
        <g fill="${color}" stroke="${INK}" stroke-width="4.5">
          <circle cx="66" cy="64" r="18" />
          <circle cx="92" cy="54" r="20" />
          <circle cx="118" cy="56" r="19" />
          <circle cx="138" cy="68" r="16" />
        </g>`;
    case 'sideSweep':
      return `<path d="M48 94 C50 48 136 42 154 84 C128 74 96 96 48 94 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
    default:
      return `<path d="M50 88 Q74 52 100 56 Q128 52 150 88 Q100 72 50 88 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />`;
  }
}

function renderCap(capStyle: CapStyle, team: PortraitTeamColors): string {
  if (capStyle === 'none') return '';

  if (capStyle === 'visor') {
    return `
      <g>
        <path d="M48 76 Q100 62 152 76 L148 88 Q100 76 52 88 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <ellipse cx="108" cy="83" rx="54" ry="12" fill="${team.secondary}" stroke="${INK}" stroke-width="4.5" />
      </g>`;
  }

  if (capStyle === 'backwards') {
    return `
      <g>
        <path d="M138 72 L176 78 L170 90 L138 86 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <path d="M48 82 C52 30 148 30 152 82 Z" fill="${team.primary}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />
        <path d="M84 80 Q100 66 116 80 Z" fill="#FBF4E4" stroke="${INK}" stroke-width="3.5" />
        <circle cx="100" cy="40" r="6" fill="${team.accent}" stroke="${INK}" stroke-width="3.5" />
      </g>`;
  }

  // Classic forward 90s ballcap
  return `
    <g>
      <path d="M48 80 C52 28 148 28 152 80 Z" fill="${team.primary}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />
      <path d="M44 80 Q100 62 168 78 Q120 96 44 80 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" />
      <circle cx="100" cy="37" r="6" fill="${team.accent}" stroke="${INK}" stroke-width="3.5" />
      <rect x="85" y="49" width="30" height="22" rx="6" fill="${team.accent}" stroke="${INK}" stroke-width="3.5" />
      <text x="100" y="65" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="13" font-weight="900" fill="${INK}">${team.monogram.slice(0, 2)}</text>
    </g>`;
}

function renderEyes(eyeStyle: EyeStyle, mood: PortraitMood): string {
  if (mood === 'shocked') {
    return `
      <circle cx="80" cy="104" r="11" fill="#FFFFFF" stroke="${INK}" stroke-width="4" />
      <circle cx="80" cy="104" r="4" fill="${INK}" />
      <circle cx="120" cy="104" r="11" fill="#FFFFFF" stroke="${INK}" stroke-width="4" />
      <circle cx="120" cy="104" r="4" fill="${INK}" />
      <path d="M68 88 Q80 80 90 88" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
      <path d="M110 88 Q120 80 132 88" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />`;
  }

  const angryBrows =
    mood === 'rival_glare' || mood === 'fired_up' || mood === 'determined' || eyeStyle === 'determined';

  const brows = angryBrows
    ? `<path d="M67 89 L91 96" stroke="${INK}" stroke-width="5" stroke-linecap="round" />
       <path d="M133 89 L109 96" stroke="${INK}" stroke-width="5" stroke-linecap="round" />`
    : `<path d="M69 91 Q80 86 90 91" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
       <path d="M110 91 Q120 86 131 91" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />`;

  if (eyeStyle === 'starry' || mood === 'fired_up') {
    return `
      ${brows}
      <circle cx="80" cy="106" r="9.5" fill="${INK}" />
      <polygon points="80,99 82,104 87,104 83,107 84,112 80,109 76,112 77,107 73,104 78,104" fill="#FFC300" />
      <circle cx="120" cy="106" r="9.5" fill="${INK}" />
      <polygon points="120,99 122,104 127,104 123,107 124,112 120,109 116,112 117,107 113,104 118,104" fill="#FFC300" />`;
  }

  if (eyeStyle === 'wink' && mood === 'happy') {
    return `
      ${brows}
      <ellipse cx="80" cy="106" rx="7.5" ry="10" fill="${INK}" />
      <circle cx="83" cy="102" r="3" fill="#FFFFFF" />
      <path d="M111 107 Q120 98 129 107" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />`;
  }

  if (eyeStyle === 'chill') {
    return `
      ${brows}
      <ellipse cx="80" cy="107" rx="8" ry="6" fill="${INK}" />
      <circle cx="82" cy="105" r="2.2" fill="#FFFFFF" />
      <ellipse cx="120" cy="107" rx="8" ry="6" fill="${INK}" />
      <circle cx="122" cy="105" r="2.2" fill="#FFFFFF" />`;
  }

  const rx = eyeStyle === 'wide' ? 9 : 7.5;
  const ry = eyeStyle === 'wide' ? 11.5 : 10;
  return `
    ${brows}
    <ellipse cx="80" cy="106" rx="${rx}" ry="${ry}" fill="${INK}" />
    <circle cx="83" cy="102" r="3.2" fill="#FFFFFF" />
    <ellipse cx="120" cy="106" rx="${rx}" ry="${ry}" fill="${INK}" />
    <circle cx="123" cy="102" r="3.2" fill="#FFFFFF" />`;
}

function renderMouth(mouthStyle: MouthStyle, mood: PortraitMood): string {
  if (mood === 'shocked') {
    return `<ellipse cx="100" cy="131" rx="10" ry="12" fill="${INK}" stroke="${INK}" stroke-width="3" />`;
  }
  if (mood === 'rival_glare') {
    return `<path d="M84 132 L116 128" stroke="${INK}" stroke-width="5" stroke-linecap="round" />
            <path d="M88 131 L92 136 L98 130 L104 135 L110 129" fill="none" stroke="#FFFFFF" stroke-width="2.5" />`;
  }
  if (mood === 'sweating') {
    return `<path d="M86 133 Q100 124 114 133" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />`;
  }

  switch (mouthStyle) {
    case 'bubblegum':
      return `
        <path d="M88 130 Q100 138 112 130" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
        <circle cx="114" cy="132" r="14" fill="#FF7AA2" stroke="${INK}" stroke-width="4" />
        <ellipse cx="109" cy="127" rx="4.5" ry="3" fill="#FFFFFF" opacity="0.75" />`;
    case 'tongueOut':
      return `
        <path d="M82 126 Q100 144 118 126 Z" fill="${INK}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" />
        <path d="M92 134 Q100 147 108 134 Z" fill="#FF5D8F" stroke="${INK}" stroke-width="3" />`;
    case 'smirk':
      return `<path d="M84 132 Q104 137 118 124" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />`;
    case 'focused':
      return `<path d="M88 131 L112 131" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />`;
    case 'openLaugh':
      return `
        <path d="M80 124 Q100 148 120 124 Z" fill="#D92B4B" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        <path d="M84 126 Q100 131 116 126" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" />`;
    case 'bigGrin':
    default:
      return `
        <path d="M81 126 Q100 144 119 126 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />`;
  }
}

function renderAccessory(accessory: AccessoryStyle, team: PortraitTeamColors): string {
  switch (accessory) {
    case 'shades90s':
      return `
        <g>
          <path d="M58 98 L94 98 L90 116 L62 114 Z" fill="#181B2C" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" />
          <path d="M106 98 L142 98 L138 114 L110 116 Z" fill="#181B2C" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" />
          <path d="M94 103 L106 103" stroke="${team.accent}" stroke-width="4.5" />
          <path d="M64 102 L76 112" stroke="#00E5FF" stroke-width="3" stroke-linecap="round" />
          <path d="M112 102 L124 112" stroke="#00E5FF" stroke-width="3" stroke-linecap="round" />
        </g>`;
    case 'eyeBlack':
      return `
        <rect x="68" y="117" width="18" height="5" rx="2" fill="${INK}" />
        <rect x="114" y="117" width="18" height="5" rx="2" fill="${INK}" />`;
    case 'cheekBandage':
      return `
        <g transform="rotate(-14 128 122)">
          <rect x="117" y="116" width="22" height="10" rx="3" fill="#FBF4E4" stroke="${INK}" stroke-width="2.5" />
          <circle cx="124" cy="121" r="1.2" fill="${INK}" />
          <circle cx="132" cy="121" r="1.2" fill="${INK}" />
        </g>`;
    case 'freckles':
      return `
        <g fill="#9E5B37" opacity="0.8">
          <circle cx="70" cy="118" r="1.8" /><circle cx="76" cy="121" r="1.8" /><circle cx="66" cy="122" r="1.6" />
          <circle cx="130" cy="118" r="1.8" /><circle cx="124" cy="121" r="1.8" /><circle cx="134" cy="122" r="1.6" />
        </g>`;
    case 'handlebarStache':
      return `<path d="M74 125 Q86 118 100 125 Q114 118 126 125 Q118 134 100 128 Q82 134 74 125 Z" fill="#3B2314" stroke="${INK}" stroke-width="3" stroke-linejoin="round" />`;
    case 'headband':
      return `<path d="M52 82 Q100 72 148 82 L147 91 Q100 81 53 91 Z" fill="${team.accent}" stroke="${INK}" stroke-width="3.5" />`;
    case 'starEarrings':
      return `
        <circle cx="48" cy="119" r="5" fill="#FFC300" stroke="${INK}" stroke-width="2.5" />
        <circle cx="152" cy="119" r="5" fill="#FFC300" stroke="${INK}" stroke-width="2.5" />`;
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
  const head = renderHeadPath(traits.headShape);

  const sweatDrop =
    mood === 'sweating'
      ? `<path d="M144 76 Q152 92 144 98 Q136 92 144 76 Z" fill="#4CC3FF" stroke="${INK}" stroke-width="3" />`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Retro 90s player portrait">
  ${renderBackdrop(traits.backdropStyle, team, mood, uid)}
  <!-- Jersey shoulders -->
  <path d="M36 202 C40 160 66 150 100 150 C134 150 160 160 164 202 Z" fill="${team.primary}" stroke="${INK}" stroke-width="5" />
  <path d="M78 152 L100 176 L122 152" fill="#FBF4E4" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
  <path d="M100 176 L100 202" stroke="${team.accent}" stroke-width="5" />
  <!-- Neck -->
  <rect x="88" y="138" width="24" height="22" rx="8" fill="${traits.skinShadow}" stroke="${INK}" stroke-width="4" />
  <!-- Back Hair -->
  ${renderBackHair(traits.hairStyle, traits.hairColor)}
  <!-- Ears -->
  <circle cx="51" cy="108" r="11" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.5" />
  <circle cx="149" cy="108" r="11" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.5" />
  <!-- Head -->
  <g fill="${traits.skinTone}" stroke="${INK}" stroke-width="5">
    ${head.base}
  </g>
  <g fill="${traits.skinShadow}" opacity="0.55">
    ${head.shade}
  </g>
  <!-- Cute Cheek Blush -->
  <ellipse cx="67" cy="120" rx="9" ry="5" fill="#FF7AA2" opacity="0.45" />
  <ellipse cx="133" cy="120" rx="9" ry="5" fill="#FF7AA2" opacity="0.45" />
  <!-- Nose -->
  <path d="M98 113 Q104 117 98 120" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" />
  <!-- Eyes & Mouth -->
  ${renderEyes(traits.eyeStyle, mood)}
  ${renderMouth(traits.mouthStyle, mood)}
  <!-- Front Hair & Cap -->
  ${renderFrontHair(traits.hairStyle, traits.hairColor, traits.capStyle)}
  ${renderCap(traits.capStyle, team)}
  <!-- Accessories & Mood FX -->
  ${renderAccessory(traits.accessory, team)}
  ${sweatDrop}
</svg>`;
}
