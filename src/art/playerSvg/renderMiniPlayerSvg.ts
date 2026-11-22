import type {
  AccessoryStyle,
  HairStyle,
  MouthStyle,
  PortraitMood,
  PortraitTeamColors,
  PortraitTraits,
} from '../portraits/types';
import type {
  JointTransform2D,
  MiniPlayerFacing,
  MiniPlayerRigPose,
  MiniPlayerRole,
} from './miniPlayerPose';

export interface MiniPlayerSvgOptions {
  traits: PortraitTraits;
  team: PortraitTeamColors;
  jerseyNumber: number;
  role: MiniPlayerRole;
  facing: MiniPlayerFacing;
  moodOverride?: PortraitMood;
  transparentBg?: boolean;
  includeGroundShadow?: boolean;
}

const INK = '#181B2C';

function groupTransform(pivotX: number, pivotY: number, j: JointTransform2D): string {
  const sx = j.sx ?? 1;
  const sy = j.sy ?? 1;
  return `translate(${(pivotX + j.tx).toFixed(1)} ${(pivotY + j.ty).toFixed(1)}) rotate(${j.rotDeg.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-pivotX} ${-pivotY})`;
}

function renderDefs(
  uid: string,
  traits: PortraitTraits,
  team: PortraitTeamColors,
): string {
  return `
    <defs>
      <!-- Spherical 2.5D Mochi Skin Gradient (Top-Right Key Light -> Warm Shadow) -->
      <radialGradient id="skin-${uid}" cx="62%" cy="34%" r="68%">
        <stop offset="0%" stop-color="${traits.skinHighlight}" />
        <stop offset="52%" stop-color="${traits.skinTone}" />
        <stop offset="100%" stop-color="${traits.skinShadow}" />
      </radialGradient>

      <!-- Soft Kawaii Cheek Blush -->
      <radialGradient id="blush-${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FF5C8D" stop-opacity="0.62" />
        <stop offset="100%" stop-color="#FF5C8D" stop-opacity="0" />
      </radialGradient>

      <!-- Luminous Chibi Gem Iris Gradient -->
      <linearGradient id="iris-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${INK}" />
        <stop offset="45%" stop-color="${traits.irisColor}" />
        <stop offset="100%" stop-color="#7CE8FF" />
      </linearGradient>

      <!-- 3D Domed Baseball Cap Gradient -->
      <radialGradient id="cap-${uid}" cx="58%" cy="28%" r="72%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
        <stop offset="28%" stop-color="${team.primary}" />
        <stop offset="100%" stop-color="${INK}" />
      </radialGradient>
      <radialGradient id="capbase-${uid}" cx="58%" cy="32%" r="72%">
        <stop offset="0%" stop-color="${team.primary}" />
        <stop offset="78%" stop-color="${team.primary}" />
        <stop offset="100%" stop-color="${team.secondary}" />
      </radialGradient>

      <!-- Cylindrical 3D Bean Jersey Gradient (Cream Home & Primary Back) -->
      <linearGradient id="jersey-cream-${uid}" x1="0" y1="0" x2="1" y2="0.2">
        <stop offset="0%" stop-color="#DFD0B4" />
        <stop offset="48%" stop-color="#FFFDF7" />
        <stop offset="85%" stop-color="#F5E9D0" />
        <stop offset="100%" stop-color="#D6C4A5" />
      </linearGradient>
      <linearGradient id="jersey-team-${uid}" x1="0" y1="0" x2="1" y2="0.2">
        <stop offset="0%" stop-color="${team.secondary}" />
        <stop offset="42%" stop-color="${team.primary}" />
        <stop offset="82%" stop-color="${team.primary}" />
        <stop offset="100%" stop-color="${INK}" />
      </linearGradient>

      <!-- Plush 3D Honey-Leather Mitt Gradient -->
      <radialGradient id="mitt-${uid}" cx="38%" cy="32%" r="70%">
        <stop offset="0%" stop-color="#F5A65B" />
        <stop offset="58%" stop-color="#C97328" />
        <stop offset="100%" stop-color="#7D3E0D" />
      </radialGradient>

      <!-- Lathed 3D Maple Bat Gradient -->
      <linearGradient id="bat-${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#BA7A32" />
        <stop offset="42%" stop-color="#FFE0A3" />
        <stop offset="75%" stop-color="#E5A557" />
        <stop offset="100%" stop-color="#9E6220" />
      </linearGradient>

      <!-- Glossy 3D Bubblegum Sphere -->
      <radialGradient id="gum-${uid}" cx="35%" cy="30%" r="68%">
        <stop offset="0%" stop-color="#FFD6E7" />
        <stop offset="45%" stop-color="#FF6FA5" />
        <stop offset="100%" stop-color="#C92A68" />
      </radialGradient>

      <!-- 3D Spherical Baseball -->
      <radialGradient id="ball-${uid}" cx="38%" cy="32%" r="68%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="65%" stop-color="#F5ECD8" />
        <stop offset="100%" stop-color="#C7B89E" />
      </radialGradient>
    </defs>`;
}

function renderChibiStubbyLeg(
  hipX: number,
  hipY: number,
  uid: string,
  team: PortraitTeamColors,
  joint: JointTransform2D,
  isBackDepth: boolean,
): string {
  const shadeOverlay = isBackDepth
    ? `<ellipse cx="${hipX}" cy="${hipY + 26}" rx="15" ry="12" fill="${INK}" opacity="0.16" />`
    : '';
  return `
    <g transform="${groupTransform(hipX, hipY, joint)}">
      <!-- Tiny Rounded Chibi Pant Puff -->
      <path d="M${hipX - 10} ${hipY - 3} C${hipX - 13} ${hipY + 8} ${hipX - 12} ${hipY + 17} ${hipX - 7} ${hipY + 20} L${hipX + 7} ${hipY + 20} C${hipX + 12} ${hipY + 17} ${hipX + 13} ${hipY + 8} ${hipX + 10} ${hipY - 3} Z" fill="url(#jersey-cream-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <!-- Tiny Striped Stirrup Ankle -->
      <rect x="${hipX - 6.5}" y="${hipY + 17}" width="13" height="9" rx="3" fill="${team.primary}" stroke="${INK}" stroke-width="3.4" />
      <line x1="${hipX - 5}" y1="${hipY + 21.5}" x2="${hipX + 5}" y2="${hipY + 21.5}" stroke="${team.accent}" stroke-width="2.4" />
      <!-- Cute Bulbous 3D Nendoroid-Style Cleat! -->
      <path d="M${hipX - 15} ${hipY + 28} C${hipX - 16} ${hipY + 20} ${hipX - 4} ${hipY + 19} ${hipX + 8} ${hipY + 22} C${hipX + 14} ${hipY + 24} ${hipX + 14} ${hipY + 34} ${hipX + 5} ${hipY + 35} L${hipX - 10} ${hipY + 35} C${hipX - 15} ${hipY + 35} ${hipX - 16} ${hipY + 32} ${hipX - 15} ${hipY + 28} Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <!-- 3D Toe Gloss & White Cleat Sole -->
      <ellipse cx="${hipX - 6}" cy="${hipY + 25}" rx="5" ry="2.6" fill="#FFFFFF" opacity="0.32" />
      <path d="M${hipX - 12} ${hipY + 33} L${hipX + 9} ${hipY + 33}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
      ${shadeOverlay}
    </g>`;
}

function renderOversizedPlushMitt(
  cx: number,
  cy: number,
  uid: string,
  facing: MiniPlayerFacing,
): string {
  // Orient glove upright in athletic catching posture with thumb toward torso
  const flipX = facing === 'front' ? -1 : 1;
  return `
    <g transform="translate(${cx} ${cy}) scale(${flipX} 1)">
      <!-- Drop shadow behind mitt -->
      <ellipse cx="2" cy="4" rx="17" ry="15" fill="${INK}" opacity="0.18" />
      <!-- Wrist cuff anchoring cleanly onto forearm -->
      <rect x="-11" y="7" width="18" height="9" rx="4" fill="#9E5216" stroke="${INK}" stroke-width="3.5" />
      <!-- Plush Bulbous 3D Chibi Mitt pointing naturally UP-AND-OUT -->
      <path d="M-17 4 C-22 -14 -4 -26 10 -20 C19 -16 21 -3 15 8 C11 15 -8 16 -17 4 Z" fill="url(#mitt-${uid})" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
      <!-- Deep Leather Catching Pocket & Golden Webbing Laces -->
      <ellipse cx="-1" cy="-2" rx="9" ry="7.5" fill="#7D3E0D" stroke="${INK}" stroke-width="2.6" />
      <path d="M-9 -17 L-5 -7 M0 -19 L1 -8 M8 -15 L6 -6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />
      <path d="M-12 -10 L-4 -12" stroke="#FFE8B3" stroke-width="2.6" stroke-linecap="round" />
    </g>`;
}

function renderLathed3DBatWithTwoHandGrip(
  gripX: number,
  gripY: number,
  uid: string,
  team: PortraitTeamColors,
  batRotDeg: number,
  energizedColor: string | null,
): string {
  const fillAttr = energizedColor ? energizedColor : `url(#bat-${uid})`;
  return `
    <g transform="translate(${gripX} ${gripY}) rotate(${batRotDeg})">
      <!-- Fat Chunky Chibi Bat Barrel angled cleanly away from the helmet -->
      <path d="M-4.5 14 L-12 -64 C-12 -74 12 -74 12 -64 L4.5 14 Z" fill="${fillAttr}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
      <ellipse cx="0" cy="-67" rx="8.8" ry="3.6" fill="#FFF2CC" opacity="0.65" />
      <!-- Taped Grip & Rounded Knob -->
      <rect x="-5" y="-10" width="10" height="24" rx="2.5" fill="#222538" stroke="${INK}" stroke-width="3.2" />
      <ellipse cx="0" cy="15" rx="8" ry="4.5" fill="#E5A557" stroke="${INK}" stroke-width="3.6" />
      <!-- BOTH Chibi Hands Locked Together on the Bat Handle! -->
      <circle cx="0" cy="-4" r="9.5" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />
      <circle cx="0" cy="7" r="9.5" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />
      <!-- Team Batting Glove Wristbands -->
      <rect x="-8" y="-1" width="16" height="4" rx="2" fill="${team.primary}" stroke="${INK}" stroke-width="2" />
    </g>`;
}

function renderTinyBeanTorso(
  uid: string,
  team: PortraitTeamColors,
  jerseyNumber: number,
  role: MiniPlayerRole,
  facing: MiniPlayerFacing,
): string {
  if (facing === 'back') {
    return `
      <g>
        <!-- Tiny Tapered 2.5D Bean Torso (Back View, 3/4 Perspective) -->
        <path d="M100 150 C92 164 91 186 96 199 L144 199 C150 186 149 164 140 150 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
        <!-- Cast Ambient Occlusion Shadow under Giant Chibi Head! -->
        <path d="M97 151 Q120 165 143 151 L145 161 Q120 172 95 161 Z" fill="${INK}" opacity="0.32" />
        <!-- Curved 3D Waist Belt -->
        <path d="M95 192 Q120 198 145 192 L144 199 Q120 205 96 199 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3.5" />
        <!-- Bold Stitched Back Number (#) shifted slightly for 3/4 depth! -->
        <text x="118" y="186" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="25" font-weight="900" fill="#FFFDF7" stroke="${INK}" stroke-width="5.5" paint-order="stroke">${jerseyNumber}</text>
      </g>`;
  }

  const chestDetail =
    role === 'catcher'
      ? `<path d="M99 154 L139 154 L137 193 L98 193 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
         <line x1="101" y1="166" x2="137" y2="166" stroke="${team.accent}" stroke-width="2.8" />
         <line x1="100" y1="178" x2="137" y2="178" stroke="${team.accent}" stroke-width="2.8" />`
      : `<path d="M114 154 L113 194" stroke="${team.accent}" stroke-width="3.2" />
         <text x="115" y="183" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="18" font-weight="900" fill="${team.primary}" stroke="${INK}" stroke-width="4.5" paint-order="stroke">${team.monogram.slice(0, 2)}</text>`;

  return `
    <g>
      <!-- Tiny Tapered 2.5D Bean Torso (3/4 Front View!) -->
      <path d="M100 150 C91 164 90 186 96 199 L144 199 C150 186 149 164 140 150 Z" fill="url(#jersey-cream-${uid})" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
      <polygon points="106,150 115,163 126,150" fill="${team.secondary}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" />
      ${chestDetail}
      <!-- Deep Cast Chin Shadow under Giant Chibi Head (sells 3D overhang!) -->
      <path d="M98 150 Q118 164 142 150 L144 159 Q118 170 96 159 Z" fill="${INK}" opacity="0.24" />
      <!-- Curved 3D Waist Belt & Shiny Gold Buckle -->
      <path d="M95 192 Q118 198 145 192 L144 199 Q118 205 96 199 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3.5" />
      <rect x="107" y="191" width="14" height="10" rx="3" fill="#FFC300" stroke="${INK}" stroke-width="2.8" />
    </g>`;
}

function renderChibiHairTufts(style: HairStyle, color: string, highlight: string): {
  backLayer: string;
  bangsLayer: string;
} {
  let backLayer = '';
  if (style === 'pigtails') {
    backLayer = `
      <path d="M62 110 C38 106 32 134 46 148 C55 142 60 132 64 122 Z" fill="${color}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
      <path d="M178 112 C202 108 206 136 192 150 C183 144 179 134 175 124 Z" fill="${color}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
      <circle cx="62" cy="112" r="7" fill="#FF4D6D" stroke="${INK}" stroke-width="3.2" />
      <circle cx="178" cy="114" r="7" fill="#FF4D6D" stroke="${INK}" stroke-width="3.2" />`;
  } else if (style === 'mullet' || style === 'bob') {
    backLayer = `
      <path d="M60 112 C50 134 52 152 64 160 L174 160 C186 152 188 134 178 112 Z" fill="${color}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />`;
  } else if (style === 'afro') {
    backLayer = `
      <circle cx="122" cy="92" r="68" fill="${color}" stroke="${INK}" stroke-width="4.6" />`;
  }

  const bangsLayer =
    style === 'spiky90s' || style === 'mohawk'
      ? `<path d="M60 94 L68 109 L82 95 L98 110 L114 94 L132 109 L148 94 L164 107 L174 92 L170 80 L64 80 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
         <path d="M80 96 L96 104 L112 94 L130 104" fill="none" stroke="${highlight}" stroke-width="2.6" stroke-linecap="round" />`
      : `<path d="M60 94 C76 108 96 101 112 93 C130 106 154 105 174 93 L170 80 L64 80 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
         <path d="M76 96 Q94 101 108 93 M132 96 Q150 101 164 93" fill="none" stroke="${highlight}" stroke-width="2.8" stroke-linecap="round" />`;

  return { backLayer, bangsLayer };
}

function renderChibiEyesAndFace(
  uid: string,
  traits: PortraitTraits,
  team: PortraitTeamColors,
  mood: PortraitMood,
  blink: boolean,
): string {
  const angry =
    mood === 'rival_glare' || mood === 'fired_up' || mood === 'determined' || traits.eyeStyle === 'determined';

  // Expressive chibi brows above giant low-set eyes
  const brows = angry
    ? `<path d="M69 98 L98 106" stroke="${INK}" stroke-width="5.2" stroke-linecap="round" />
       <path d="M153 98 L120 106" stroke="${INK}" stroke-width="5.2" stroke-linecap="round" />`
    : `<path d="M71 101 Q84 94 96 100" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />
       <path d="M122 100 Q136 94 151 101" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" />`;

  const renderGiantChibiEye = (cx: number, cy: number, rx: number, ry: number, isNear: boolean): string => {
    if (blink || (traits.eyeStyle === 'wink' && isNear && mood === 'happy')) {
      return `<path d="M${cx - rx} ${cy + 2} Q${cx} ${cy - 10} ${cx + rx} ${cy + 2}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" />`;
    }
    if (mood === 'shocked') {
      return `
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="${INK}" stroke-width="4" />
        <circle cx="${cx}" cy="${cy}" r="5.5" fill="${INK}" />
        <circle cx="${cx + 2}" cy="${cy - 2}" r="2.2" fill="#FFFFFF" />`;
    }

    const star =
      traits.eyeStyle === 'starry' || mood === 'fired_up'
        ? `<polygon points="${cx},${cy - 7} ${cx + 2.5},${cy - 1.5} ${cx + 8},${cy - 1.5} ${cx + 3.5},${cy + 2} ${cx + 5},${cy + 8} ${cx},${cy + 4.5} ${cx - 5},${cy + 8} ${cx - 3.5},${cy + 2} ${cx - 8},${cy - 1.5} ${cx - 2.5},${cy - 1.5}" fill="#FFC300" />`
        : `<ellipse cx="${cx - 3.8}" cy="${cy - 5.2}" rx="4.6" ry="5.6" fill="#FFFFFF" />
           <circle cx="${cx + 4.2}" cy="${cy + 5.2}" r="2.3" fill="#FFFFFF" opacity="0.92" />`;

    return `
      <g>
        <!-- Crisp Sclera -->
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="${INK}" stroke-width="3.8" />
        <!-- Giant Luminous Kawaii Iris -->
        <ellipse cx="${cx - 0.8}" cy="${cy + 1}" rx="${(rx * 0.76).toFixed(1)}" ry="${(ry * 0.8).toFixed(1)}" fill="url(#iris-${uid})" />
        <!-- Deep Soft Pupil -->
        <ellipse cx="${cx - 0.8}" cy="${cy + 1.5}" rx="${(rx * 0.44).toFixed(1)}" ry="${(ry * 0.48).toFixed(1)}" fill="${INK}" />
        <!-- Big Glossy Chibi Catchlights -->
        ${star}
        <!-- Thick Curved Chibi Upper Eyelash -->
        <path d="M${cx - rx - 1.5} ${cy - 3} Q${cx} ${cy - ry - 3.5} ${cx + rx + 1.5} ${cy - 2}" fill="none" stroke="${INK}" stroke-width="5.2" stroke-linecap="round" />
      </g>`;
  };

  // Petite Chibi Mouth tucked close under the eyes!
  const renderPetiteChibiMouth = (m: MouthStyle): string => {
    if (mood === 'shocked') {
      return `<ellipse cx="108" cy="142" rx="7.5" ry="9.5" fill="#591124" stroke="${INK}" stroke-width="3.6" />`;
    }
    if (mood === 'rival_glare') {
      return `<path d="M96 140 L122 138 L120 146 L98 146 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round" />`;
    }
    if (m === 'bubblegum') {
      return `
        <path d="M99 139 Q108 145 117 139" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" />
        <circle cx="121" cy="142" r="11.5" fill="url(#gum-${uid})" stroke="${INK}" stroke-width="3.6" />
        <ellipse cx="117" cy="137" rx="3.8" ry="2.4" fill="#FFFFFF" opacity="0.85" />`;
    }
    if (m === 'smirk' || m === 'focused') {
      return `<path d="M98 141 Q110 146 121 136" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />`;
    }
    return `
      <path d="M96 137 C99 151 119 151 122 137 Z" fill="#6B1329" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round" />
      <path d="M101 145 Q109 140 117 145 Q109 150 101 145 Z" fill="#FF6B95" />`;
  };

  const renderChibiAccessory = (acc: AccessoryStyle): string => {
    if (acc === 'shades90s') {
      return `
        <g>
          <path d="M62 110 L158 110 L152 130 L116 131 L108 121 L100 131 L67 129 Z" fill="#141829" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
          <path d="M61 110 L159 110" stroke="${team.accent}" stroke-width="4.4" stroke-linecap="round" />
          <polygon points="71,114 86,114 78,127 67,127" fill="#00E5FF" opacity="0.88" />
          <polygon points="122,114 138,114 130,127 118,127" fill="#FF4D6D" opacity="0.85" />
        </g>`;
    }
    if (acc === 'eyeBlack') {
      return `
        <rect x="70" y="135" width="16" height="4.5" rx="2" fill="${INK}" />
        <rect x="128" y="135" width="18" height="4.5" rx="2" fill="${INK}" />`;
    }
    if (acc === 'cheekBandage') {
      return `<rect x="136" y="132" width="19" height="9" rx="3" transform="rotate(-12 145 136)" fill="#FBF4E4" stroke="${INK}" stroke-width="2.5" />`;
    }
    if (acc === 'starEarrings') {
      return `<circle cx="179" cy="131" r="5" fill="#FFC300" stroke="${INK}" stroke-width="2.5" />`;
    }
    return '';
  };

  return `
    <!-- Soft Glowing Radial Chibi Cheek Blushes -->
    <ellipse cx="68" cy="133" rx="15" ry="10" fill="url(#blush-${uid})" />
    <ellipse cx="152" cy="134" rx="16" ry="11" fill="url(#blush-${uid})" />
    ${brows}
    <!-- Far Eye (slightly foreshortened in 3/4 2.5D!) & Near Eye -->
    ${renderGiantChibiEye(84, 120, 13.2, 16.5, false)}
    ${renderGiantChibiEye(134, 120, 14.8, 17.8, true)}
    <!-- Tiny Cute Chibi Button Nose right between the eyes! -->
    <ellipse cx="107" cy="129" rx="3.2" ry="2.2" fill="${traits.skinShadow}" />
    <circle cx="106" cy="128" r="1.2" fill="${traits.skinHighlight}" />
    ${renderPetiteChibiMouth(traits.mouthStyle)}
    ${renderChibiAccessory(traits.accessory)}
  `;
}

function renderGiant3DChibiHead(
  uid: string,
  traits: PortraitTraits,
  team: PortraitTeamColors,
  facing: MiniPlayerFacing,
  role: MiniPlayerRole,
  mood: PortraitMood,
  blink: boolean,
  sweatVisible: boolean,
): string {
  const hair = renderChibiHairTufts(traits.hairStyle, traits.hairColor, traits.hairHighlight);

  if (facing === 'back') {
    // 3/4-Back Volumetric 2.5D Chibi Head! (Shows plush far mochi cheek,visor tip peek, & snapback!)
    return `
      <g>
        <!-- Peek of 3D Curved Visor Tip extending forward-left in 3/4-back perspective! -->
        <path d="M42 84 Q62 72 86 80 Q66 95 42 84 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
        <!-- Giant Plump 3D Mochi Head Sphere (with cute far cheek bulge on left!) -->
        <path d="M56 102 C52 56 184 56 182 104 C182 138 158 156 120 156 C78 156 50 136 56 102 Z" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        <!-- Prominent Cute Near Chibi Ear -->
        <circle cx="182" cy="118" r="13" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.4" />
        <path d="M184 113 Q177 118 183 123" fill="none" stroke="${traits.skinShadow}" stroke-width="3" stroke-linecap="round" />
        <!-- Sculpted 90s Spiky Nape Hairline + Shine -->
        <path d="M62 88 C62 112 68 128 78 134 L90 125 L104 136 L120 126 L136 136 L150 125 L162 133 C172 126 176 112 175 88 Z" fill="${traits.hairColor}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
        <path d="M82 114 Q102 122 120 113 Q138 122 156 114" fill="none" stroke="${traits.hairHighlight}" stroke-width="3.8" stroke-linecap="round" opacity="0.8" />
        ${hair.backLayer}
        <!-- Giant 3D Domed Pro Baseball Cap (3/4 Back) -->
        <path d="M54 94 C54 24 184 24 182 94 Q118 105 54 94 Z" fill="url(#capbase-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        <ellipse cx="132" cy="54" rx="28" ry="13" transform="rotate(-12 132 54)" fill="#FFFFFF" opacity="0.22" />
        <path d="M118 34 L118 70 M86 40 Q80 66 78 92 M150 40 Q156 66 158 92" fill="none" stroke="${INK}" stroke-width="2.2" opacity="0.28" />
        <!-- Semicircular 90s Snapback Cutout & Gold Strap -->
        <path d="M94 96 C94 70 142 70 142 96 Z" fill="${traits.hairColor}" stroke="${INK}" stroke-width="4.2" />
        <path d="M104 82 L113 91 L122 80 L131 91" fill="none" stroke="${traits.hairHighlight}" stroke-width="3" stroke-linecap="round" />
        <rect x="94" y="89" width="48" height="7.5" rx="3.5" fill="${team.accent}" stroke="${INK}" stroke-width="3.2" />
        <circle cx="118" cy="33" r="6.5" fill="${team.accent}" stroke="${INK}" stroke-width="3.5" />
      </g>`;
  }

  // 3/4-Front Volumetric 2.5D Chibi Head!
  const batterEarFlap =
    role === 'batter'
      ? `<path d="M166 86 C184 98 186 128 166 134 C156 134 156 112 162 92 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
         <circle cx="170" cy="116" r="4.5" fill="${INK}" />`
      : '';

  const sweatSvg = sweatVisible
    ? `<path d="M174 78 C183 92 183 103 174 106 C165 103 165 92 174 78 Z" fill="#4CC3FF" stroke="${INK}" stroke-width="3.2" />
       <circle cx="172" cy="98" r="2.2" fill="#FFFFFF" />`
    : '';

  return `
    <g>
      ${hair.backLayer}
      <!-- Near Chibi Ear (tucked on right in 3/4 perspective!) -->
      <circle cx="179" cy="120" r="13" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.4" />
      <path d="M181 115 Q174 120 180 125" fill="none" stroke="${traits.skinShadow}" stroke-width="3" stroke-linecap="round" />

      <!-- Giant Plump 3/4 "Mochi Cheek" Chibi Head with 3D Radial Shading! -->
      <path d="M58 104 C58 56 178 56 178 106 C178 140 154 156 114 156 C72 156 46 136 58 104 Z" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />

      <!-- Forehead Cast Shadow from 3D Cap Brim -->
      <path d="M58 96 Q114 82 176 96 L176 84 L58 84 Z" fill="${traits.skinShadow}" opacity="0.45" />

      ${ renderChibiEyesAndFace(uid, traits, team, mood, blink) }
      ${hair.bangsLayer}

      <!-- Giant 3D Domed Chibi Baseball Cap + Sweeping 3/4 Green-Underbrim Visor! -->
      <path d="M56 89 C58 22 180 22 178 89 Z" fill="url(#capbase-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
      <!-- Glossy 3D Vinyl Toy Specular Dome Highlight -->
      <ellipse cx="132" cy="48" rx="28" ry="12" transform="rotate(-14 132 48)" fill="#FFFFFF" opacity="0.26" />
      <path d="M88 36 Q82 60 80 84 M148 36 Q154 60 156 84" fill="none" stroke="${INK}" stroke-width="2.2" opacity="0.28" />
      <circle cx="118" cy="30" r="6.5" fill="${team.accent}" stroke="${INK}" stroke-width="3.4" />

      <!-- Raised 3D Embroidered Cap Emblem -->
      <rect x="94" y="42" width="36" height="24" rx="7" fill="${team.accent}" stroke="${INK}" stroke-width="3.6" />
      <text x="112" y="59" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="13.5" font-weight="900" fill="${INK}">${team.monogram.slice(0, 2)}</text>

      <!-- Sweeping 3/4 Perspective Curved Visor (extends toward left/front!) -->
      <path d="M36 86 Q98 62 172 84 Q112 103 36 86 Z" fill="#1E7A44" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
      <path d="M36 83 Q98 59 172 82 Q108 94 36 83 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />

      ${batterEarFlap}
      ${sweatSvg}
    </g>`;
}

export function renderMiniPlayerSvgString(
  options: MiniPlayerSvgOptions,
  pose: MiniPlayerRigPose,
): string {
  const {
    traits,
    team,
    jerseyNumber,
    role,
    facing,
    moodOverride,
    transparentBg = true,
    includeGroundShadow = true,
  } = options;
  const uid = `chibi-${Math.abs(traits.seed)}-${role}-${facing}`;
  const activeMood = moodOverride ?? pose.expression;

  const auraSvg =
    pose.auraIntensity > 0.04
      ? `<g opacity="${(pose.auraIntensity * 0.85).toFixed(2)}">
           <ellipse cx="120" cy="232" rx="${(48 + pose.auraIntensity * 14).toFixed(1)}" ry="13" fill="none" stroke="${pose.auraColor}" stroke-width="5.5" />
           <path d="M52 216 Q38 148 62 92 Q74 128 88 64 Q120 30 152 64 Q166 128 178 92 Q202 148 188 216 Z" fill="${pose.auraColor}" opacity="0.28" />
         </g>`
      : '';

  const swingSmearSvg =
    role === 'batter' && pose.swingSmearOpacity > 0.08
      ? `<path d="M32 134 C68 68 178 72 212 152 C172 112 88 110 32 134 Z" fill="${pose.auraIntensity > 0.3 ? '#FFC300' : '#FFFFFF'}" opacity="${(pose.swingSmearOpacity * 0.82).toFixed(2)}" stroke="${INK}" stroke-width="2.8" />`
      : '';

  // Anatomically consistent right-handed baseball arms & equipment!
  // - Right-Handed Pitcher / Fielder / Catcher:
  //   * FRONT view: Right Hand (Baseball) is viewer's LEFT (x≈78); Left Hand (Mitt) is viewer's RIGHT (x≈162)!
  //   * BACK view:  Left Hand (Mitt) is viewer's LEFT (x≈76); Right Hand (Baseball) is viewer's RIGHT (x≈164)!
  // - Right-Handed Batter:
  //   * Unified two-handed bat grip positioned cleanly outside the right/back shoulder (x≈166, y≈156) so both
  //     chibi hands stay locked together on the handle and the bat barrel angles cleanly clear of the helmet!
  const leftSideShoulderX = 96;
  const leftSideShoulderY = 162;
  const rightSideShoulderX = 144;
  const rightSideShoulderY = 162;

  const baseballInHandSvg = (bx: number, by: number) => `
    <g>
      <circle cx="${bx}" cy="${by}" r="10.5" fill="url(#ball-${uid})" stroke="${INK}" stroke-width="3.6" />
      <path d="M${bx - 5.5} ${by - 5.5} Q${bx} ${by} ${bx - 5.5} ${by + 5.5} M${bx + 5.5} ${by - 5.5} Q${bx} ${by} ${bx + 5.5} ${by + 5.5}" fill="none" stroke="#E63946" stroke-width="2.3" />
    </g>`;

  let leftSideArmSvg = '';
  let rightSideArmSvg = '';

  if (role === 'batter') {
    if (facing === 'front') {
      // RIGHT-HANDED BATTER (FRONT VIEW):
      // Player's RIGHT shoulder (bat side) is Viewer's LEFT (x≈71), opposite the left-ear helmet flap!
      const mirroredArm = {
        ...pose.frontArm,
        tx: -pose.frontArm.tx,
        rotDeg: -pose.frontArm.rotDeg,
      };
      // Right-side (player's lead left arm) reaches across chest to grip the bat handle on viewer's left
      rightSideArmSvg = `
        <g transform="${groupTransform(rightSideShoulderX, rightSideShoulderY, mirroredArm)}">
          <path d="M142 158 C122 164 100 164 82 158 L84 170 C102 175 126 174 144 168 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        </g>`;
      // Left-side (player's back right arm) grips the bat cleanly on viewer's left, angled up-and-left!
      leftSideArmSvg = `
        <g transform="${groupTransform(leftSideShoulderX, leftSideShoulderY, mirroredArm)}">
          <path d="M100 156 C86 154 76 154 71 162 L81 172 C88 167 94 165 102 166 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
          ${renderLathed3DBatWithTwoHandGrip(
            71,
            156,
            uid,
            team,
            -pose.batRotDeg,
            pose.auraIntensity > 0.5 ? pose.auraColor : null,
          )}
        </g>`;
    } else {
      // RIGHT-HANDED BATTER (BACK VIEW — Batter OTS 3D):
      // Player's RIGHT shoulder (bat side) is Viewer's RIGHT (x≈169)!
      leftSideArmSvg = `
        <g transform="${groupTransform(leftSideShoulderX, leftSideShoulderY, pose.frontArm)}">
          <path d="M98 158 C118 164 140 164 158 158 L156 170 C138 175 114 174 96 168 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        </g>`;
      rightSideArmSvg = `
        <g transform="${groupTransform(rightSideShoulderX, rightSideShoulderY, pose.frontArm)}">
          <path d="M140 156 C154 154 164 154 169 162 L159 172 C152 167 146 165 138 166 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
          ${renderLathed3DBatWithTwoHandGrip(
            169,
            156,
            uid,
            team,
            pose.batRotDeg,
            pose.auraIntensity > 0.5 ? pose.auraColor : null,
          )}
        </g>`;
    }
  } else if (facing === 'front') {
    // FRONT VIEW: Viewer's LEFT = Player's Right Throwing Arm (palm facing forward gripping ball!);
    // Viewer's RIGHT = Player's Left Glove Arm!
    leftSideArmSvg = `
      <g transform="${groupTransform(leftSideShoulderX, leftSideShoulderY, pose.frontArm)}">
        <path d="M98 158 C84 162 76 170 76 180 L89 180 C91 172 95 167 101 164 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        <circle cx="80" cy="180" r="10" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />
        ${
          role === 'pitcher'
            ? `${baseballInHandSvg(83, 177)}
               <!-- Chibi thumb & fingers wrapping cleanly over the inner rim of the baseball -->
               <ellipse cx="89" cy="179" rx="4.5" ry="3.2" transform="rotate(-24 89 179)" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="2.6" />`
            : ''
        }
      </g>`;
    rightSideArmSvg = `
      <g transform="${groupTransform(rightSideShoulderX, rightSideShoulderY, pose.backArm)}">
        <path d="M142 158 C156 158 164 164 165 174 L152 176 C150 169 146 166 140 165 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        ${renderOversizedPlushMitt(164, 169, uid, 'front')}
      </g>`;
  } else {
    // BACK VIEW: Viewer's LEFT = Player's Left Glove Arm;
    // Viewer's RIGHT = Player's Right Throwing Arm (ball sits INSIDE palm BEHIND the back of the hand!)
    leftSideArmSvg = `
      <g transform="${groupTransform(leftSideShoulderX, leftSideShoulderY, pose.backArm)}">
        <path d="M98 158 C84 158 76 164 75 174 L88 176 C90 169 94 166 100 165 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        ${renderOversizedPlushMitt(76, 169, uid, 'back')}
      </g>`;
    rightSideArmSvg = `
      <g transform="${groupTransform(rightSideShoulderX, rightSideShoulderY, pose.frontArm)}">
        <path d="M142 158 C156 162 164 170 164 180 L151 180 C149 172 145 167 139 164 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        <!-- Baseball sits on the PALM (front/inside) side, drawn UNDER the back of the chibi hand! -->
        ${role === 'pitcher' ? baseballInHandSvg(156, 174) : ''}
        <circle cx="160" cy="180" r="10.2" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />
      </g>`;
  }

  const bgRect = transparentBg
    ? ''
    : '<rect width="240" height="260" rx="20" fill="#85E4FF" />';

  // Stepped 2.5D depth layering: far leg -> torso -> giant chibi head -> crisp foreground arms/mitt/bat!
  const bodyStack =
    facing === 'back'
      ? `
        ${leftSideArmSvg}
        ${renderChibiStubbyLeg(104, 192, uid, team, pose.backLeg, true)}
        ${renderChibiStubbyLeg(132, 197, uid, team, pose.frontLeg, false)}
        <g transform="${groupTransform(120, 175, pose.torso)}">
          ${renderTinyBeanTorso(uid, team, jerseyNumber, role, 'back')}
        </g>
        <g transform="${groupTransform(120, 144, pose.head)}">
          ${renderGiant3DChibiHead(uid, traits, team, 'back', role, activeMood, pose.blink, pose.sweatVisible)}
        </g>
        ${rightSideArmSvg}`
      : `
        ${renderChibiStubbyLeg(132, 192, uid, team, pose.backLeg, true)}
        ${renderChibiStubbyLeg(104, 197, uid, team, pose.frontLeg, false)}
        <g transform="${groupTransform(120, 175, pose.torso)}">
          ${renderTinyBeanTorso(uid, team, jerseyNumber, role, 'front')}
        </g>
        ${role === 'batter' ? rightSideArmSvg : leftSideArmSvg}
        <g transform="${groupTransform(120, 144, pose.head)}">
          ${renderGiant3DChibiHead(uid, traits, team, 'front', role, activeMood, pose.blink, pose.sweatVisible)}
        </g>
        ${role === 'batter' ? leftSideArmSvg : rightSideArmSvg}`;

  const groundShadowSvg = includeGroundShadow
    ? `<ellipse cx="${(118 + pose.root.tx * 0.45).toFixed(1)}" cy="235" rx="${(46 * pose.shadowScale).toFixed(1)}" ry="${(12 * pose.shadowScale).toFixed(1)}" fill="#0E2417" opacity="0.36" />
       <ellipse cx="${(118 + pose.root.tx * 0.45).toFixed(1)}" cy="235" rx="${(28 * pose.shadowScale).toFixed(1)}" ry="${(6.5 * pose.shadowScale).toFixed(1)}" fill="#08170E" opacity="0.32" />`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260" role="img" aria-label="Animated 2.5D chibi baseball player (${facing})">
  ${renderDefs(uid, traits, team)}
  ${bgRect}
  <!-- Volumetric 2.5D Ground Contact Shadow -->
  ${groundShadowSvg}
  ${auraSvg}
  <!-- True 1.8-Head 2.5D Chibi Character Root -->
  <g transform="${groupTransform(120, 232, pose.root)}">
    ${bodyStack}
    ${swingSmearSvg}
  </g>
</svg>`;
}
