import { uniformBottoms } from '../portraits/uniformBottoms';
import { hairband, isLongCut, longHair, templeLocks } from '../portraits/ponytail';
import { BUILD_WIDTH, JERSEY_EASE, resolveAthleteAppearance, STATURE_SCALE, type AthleteAppearance } from '../portraits/athleteAppearance';
import { pinkSportsShades, renderFacialHair, renderGlasses } from '../portraits/faceDetails';
import { renderGlove, catcherMask, chestProtector, legGuard } from './equipment';
import { fieldingReach } from './fieldingReach';
import { pitchingArm } from './pitchingArm';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
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
  throwsHand?: ThrowsHand;
  batSide?: EffectiveBatSide;
  moodOverride?: PortraitMood;
  transparentBg?: boolean;
  includeGroundShadow?: boolean;
  caughtBall?: boolean;
  instanceId?: string;
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
  width: number,
  bareKnee: boolean,
  guardFacing?: MiniPlayerFacing,
): string {
  const shadeOverlay = isBackDepth
    ? `<ellipse cx="${hipX}" cy="${hipY + 26}" rx="15" ry="12" fill="${INK}" opacity="0.16" />`
    : '';
  return `
    <g transform="${groupTransform(hipX, hipY, joint)} translate(${hipX} 0) scale(${width} 1) translate(${-hipX} 0)">
      ${bareKnee ? `<g transform="translate(${hipX} ${hipY})">
        <path d="M-9 -3 Q-13 8 -8 18 Q-5 23 7 19 Q11 9 9 -3Z" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3"/>
        <path d="M-9 14 Q0 18 9 14 L7 27 Q1 30 -6 26Z" fill="${team.secondary}" stroke="${INK}" stroke-width="2.8"/>
        <path d="M-7 18 Q0 21 7 18" fill="none" stroke="${team.accent}" stroke-width="2.4"/>
      </g>` : `      <!-- Tiny Rounded Chibi Pant Puff -->
      <path d="M${hipX - 10} ${hipY - 3} C${hipX - 13} ${hipY + 8} ${hipX - 12} ${hipY + 17} ${hipX - 7} ${hipY + 20} L${hipX + 7} ${hipY + 20} C${hipX + 12} ${hipY + 17} ${hipX + 13} ${hipY + 8} ${hipX + 10} ${hipY - 3} Z" fill="url(#jersey-cream-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <!-- Tiny Striped Stirrup Ankle -->
      <rect x="${hipX - 6.5}" y="${hipY + 17}" width="13" height="9" rx="3" fill="${team.primary}" stroke="${INK}" stroke-width="3.4" />
      <line x1="${hipX - 5}" y1="${hipY + 21.5}" x2="${hipX + 5}" y2="${hipY + 21.5}" stroke="${team.accent}" stroke-width="2.4" />
      `}
      <!-- Cute Bulbous 3D Nendoroid-Style Cleat! -->
      <path d="M${hipX - 15} ${hipY + 28} C${hipX - 16} ${hipY + 20} ${hipX - 4} ${hipY + 19} ${hipX + 8} ${hipY + 22} C${hipX + 14} ${hipY + 24} ${hipX + 14} ${hipY + 34} ${hipX + 5} ${hipY + 35} L${hipX - 10} ${hipY + 35} C${hipX - 15} ${hipY + 35} ${hipX - 16} ${hipY + 32} ${hipX - 15} ${hipY + 28} Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <!-- 3D Toe Gloss & White Cleat Sole -->
      <ellipse cx="${hipX - 6}" cy="${hipY + 25}" rx="5" ry="2.6" fill="#FFFFFF" opacity="0.32" />
      <path d="M${hipX - 12} ${hipY + 33} L${hipX + 9} ${hipY + 33}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
      ${guardFacing ? legGuard(hipX, hipY, team, guardFacing) : ''}
      ${shadeOverlay}
    </g>`;
}

function renderFieldArm(uid: string, team: PortraitTeamColors, build: AthleteAppearance['build'], left: boolean) {
  const thickness = BUILD_WIDTH[build];
  return `<g transform="translate(${left ? 96 : 144} 162) scale(${left ? -1 : 1} 1)" stroke-linejoin="round">
    <path d="M3 2 C10 -2 ${16 * thickness} 0 ${20 * thickness} 8 Q25 12 21 18 L13 20 Q8 16 6 11 L0 10Z"
      fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.3"/>
    <path d="M-4 -7 Q5 ${-10 * thickness} 12 -5 L17 1 Q13 8 4 10 L-5 4Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="3.5"/>
    <path d="M4 6 Q11 5 14 0" fill="none" stroke="${team.accent}" stroke-width="2.4"/>
    ${build === 'power' ? `<path d="M13 10 Q19 13 21 8" fill="none" stroke="#7F4D3E" opacity=".6" stroke-width="2" stroke-linecap="round"/>` : ''}
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
  athlete: AthleteAppearance,
  hemSway: number,
): string {
  const feminine = athlete.playerLook === 'female';
  const width = BUILD_WIDTH[athlete.build];
  const fitted = `translate(120 0) scale(${width} 1) translate(-120 0)`;
  const ease = facing === 'front' ? JERSEY_EASE[athlete.jerseyFit] : 0;
  const outline = feminine
    ? `M103 149 Q91 153 89 166 Q88 173 94 177 Q100 180 99 187 L97 193 Q119 200 143 192 L141 185 Q140 181 144 175 Q149 170 147 161 L138 150Z`
    : 'M98 149 Q85 152 84 165 L90 175 Q96 184 96 198 Q120 205 144 198 Q144 184 150 175 L157 165 Q156 152 140 149Z';
  const sidePanels = feminine
    ? 'M96 156 Q87 174 98 179 Q105 182 106 185 L101 195 L94 198 Q102 184 94 179 Q86 172 96 156Z M141 159 Q149 172 139 178 L133 182 Q135 187 140 190 L137 182 Q152 177 141 159Z'
    : 'M95 154 Q87 159 87 166 L96 173 L99 187 L103 190 L100 168Z M143 154 L138 171 L137 188 L143 180 L147 168 L153 164Z';
  const belt = feminine ? 'M98 186 Q119 192 142 186 L143 193 Q119 199 97 193Z' :
    'M95 192 Q120 198 145 192 L144 199 Q120 205 96 199Z';
  const hips = feminine
    ? `<g transform="translate(120 187) scale(1 .8)">${uniformBottoms(athlete.bottoms, team, athlete.skirtLiner, facing === 'back', hemSway)}</g>`
    : '';
  const waist = athlete.croppedJersey && feminine ? `<g data-jersey="cropped">
    <path d="M98 178 Q118 184 141 178 L140 185 L142 190 Q118 196 98 190 L100 185Z" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="2.6"/>
    <path d="M98 178 Q119 185 141 178" fill="none" stroke="${team.accent}" stroke-width="2.2"/>
  </g>` : '';
  if (facing === 'back') {
    return `
      <g transform="${fitted}">
        <!-- Tiny Tapered 2.5D Bean Torso (Back View, 3/4 Perspective) -->
        <path data-part="jersey-shell" d="${outline}" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
        <path d="${sidePanels}" fill="${INK}" opacity=".23"/>
        <!-- Cast Ambient Occlusion Shadow under Giant Chibi Head! -->
        <path d="M97 151 Q120 165 143 151 L145 161 Q120 172 95 161 Z" fill="${INK}" opacity="0.32" />
        ${waist}${hips}
        <!-- Curved 3D Waist Belt -->
        <path d="${belt}" fill="${team.secondary}" stroke="${INK}" stroke-width="3.5" />
        <!-- Bold Stitched Back Number (#) shifted slightly for 3/4 depth! -->
        <text x="118" y="${waist ? 178 : 186}" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="${waist ? 20 : 25}" font-weight="900" fill="#FFFDF7" stroke="${INK}" stroke-width="5.5" paint-order="stroke">${jerseyNumber}</text>
        ${role === 'catcher' ? `<g data-gear="back-harness" fill="none" stroke-linejoin="round">
          <path d="M99 151 L108 168 L96 185 M140 151 L131 168 L144 184 M96 185 Q119 194 144 184" stroke="${INK}" stroke-width="5"/>
          <path d="M98 184 l6 1 M136 185 l5 -1" stroke="#B8CFD6" stroke-width="2.5"/>
        </g>` : ''}
      </g>`;
  }

  const chestDetail =
    role === 'catcher'
      ? chestProtector(team)
      : `<path d="M114 ${athlete.openCollar ? 171 : 163} L113 ${waist ? 178 : 194}" stroke="${team.accent}" stroke-width="3.2" />
         <text x="115" y="${waist ? 177 : 183}" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="${feminine ? 14 : 18}" font-weight="900" fill="${team.primary}" stroke="${INK}" stroke-width="4.5" paint-order="stroke">${team.monogram.slice(0, 2)}</text>`;

  return `
    <g transform="${fitted}">
      <!-- Tiny Tapered 2.5D Bean Torso (3/4 Front View!) -->
      <path data-part="jersey-shell" d="${outline}" fill="url(#jersey-cream-${uid})" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
      <path d="${sidePanels}" fill="#BCA98D"/>
      ${feminine ? `<path d="M92 171 Q95 ${178 + ease} 107 176 M122 177 Q134 ${181 + ease} 143 172" fill="none" stroke="#B59A83" stroke-width="2.5" stroke-linecap="round"/>` :
        `<path d="M92 160 Q100 155 107 156 M133 156 Q145 155 150 161" fill="none" stroke="#C9B89E" stroke-width="3" stroke-linecap="round"/>`}
      ${feminine ? `<path data-collar="${athlete.openCollar ? 'open' : 'standard'}" d="M104 150 Q108 162 115 ${athlete.openCollar ? 172 : 165} Q126 160 131 150Z" fill="${athlete.skinTone}" stroke="${team.secondary}" stroke-width="2.5"/>`
        : `<polygon points="106,150 115,163 126,150" fill="${team.secondary}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`}
      ${role === 'catcher' ? '' : chestDetail}
      ${waist}
      <!-- Deep Cast Chin Shadow under Giant Chibi Head (sells 3D overhang!) -->
      <path d="M98 150 Q118 164 142 150 L144 159 Q118 170 96 159 Z" fill="${INK}" opacity="0.24" />
      ${hips}
      <!-- Curved 3D Waist Belt & Shiny Gold Buckle -->
      <path d="${belt}" fill="${team.secondary}" stroke="${INK}" stroke-width="3.5" />
      <rect x="107" y="${feminine ? 187 : 191}" width="14" height="9" rx="3" fill="#FFC300" stroke="${INK}" stroke-width="2.8" />
      ${role === 'catcher' ? chestDetail : ''}
    </g>`;
}

function renderChibiHairTufts(style: HairStyle, color: string, highlight: string, band: string, trim: AthleteAppearance['hairAccessory']): {
  backLayer: string;
  bangsLayer: string;
} {
  let backLayer = '';
  if (isLongCut(style)) {
    backLayer = `<g transform="translate(5 0) scale(1.14 1.05)">${longHair(style, color, highlight, band, trim)}</g>`;
  } else if (style === 'mullet' || style === 'bob') {
    const tips = style === 'mullet'
      ? 'M60 101 C55 122 50 149 44 160 L58 156 L52 168 Q80 167 86 144 Q112 153 138 142 Q149 161 166 168 L165 159 L180 164 Q175 152 176 140 Q187 128 177 101Z'
      : 'M58 98 Q46 147 64 158 Q83 162 91 145 Q116 152 142 143 Q151 155 173 157 Q186 133 176 98Z';
    backLayer = `<path d="${tips}" fill="${color}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round"/>
      <path d="M64 119 Q63 142 58 151 M168 114 Q164 132 171 147" fill="none" stroke="${highlight}" stroke-width="3.4" stroke-linecap="round"/>`;
  } else if (style === 'afro') {
    backLayer = `
      <circle cx="122" cy="92" r="68" fill="${color}" stroke="${INK}" stroke-width="4.6" />`;
  }

  let bangsLayer =
    style === 'spiky90s' || style === 'mohawk'
      ? `<path d="M60 94 L68 109 L82 95 L98 110 L114 94 L132 109 L148 94 L164 107 L174 92 L170 80 L64 80 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
         <path d="M80 96 L96 104 L112 94 L130 104" fill="none" stroke="${highlight}" stroke-width="2.6" stroke-linecap="round" />`
      : `<path d="M60 94 C76 108 96 101 112 93 C130 106 154 105 174 93 L170 80 L64 80 Z" fill="${color}" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round" />
         <path d="M76 96 Q94 101 108 93 M132 96 Q150 101 164 93" fill="none" stroke="${highlight}" stroke-width="2.8" stroke-linecap="round" />`;

  if (isLongCut(style) || style === 'sideSweep' || style === 'bob') {
    bangsLayer = `<path d="M59 82 Q104 74 172 82 L176 95 Q171 109 161 117 L160 98 Q144 108 137 104 L141 94 Q124 100 110 99 L118 91 Q93 106 65 112 L70 100 L57 104Z" fill="${color}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M73 99 Q87 96 100 88 M148 95 l13 -6" fill="none" stroke="${highlight}" stroke-width="2.7" stroke-linecap="round"/>`;
  }
  if (style === 'curlyTop' || style === 'afro') {
    bangsLayer = `<path d="M59 82 Q113 70 175 82 L175 97 Q171 109 162 98 Q155 111 146 100 Q136 109 130 99 Q120 108 111 99 Q98 110 90 100 Q80 111 73 100 Q61 111 57 100Z" fill="${color}" stroke="${INK}" stroke-width="3.6"/>
      <path d="M66 97 q5 -5 11 -2 M87 95 q5 -6 12 -3 M146 95 q6 -4 12 -1" fill="none" stroke="${highlight}" stroke-width="2.5"/>`;
  } else if (style === 'flattop' || style === 'pompadour') {
    bangsLayer = `<path d="M58 83 Q118 73 176 85 L176 111 L167 113 L165 92 Q116 87 70 92 L67 111 L59 109Z" fill="${color}" stroke="${INK}" stroke-width="3.4"/>
      <path d="M60 102 l9 -5 M167 97 l8 4" fill="none" stroke="${highlight}" stroke-width="3"/>`;
  }
  return { backLayer, bangsLayer };
}

function renderChibiEyesAndFace(
  uid: string,
  traits: AthleteAppearance,
  team: PortraitTeamColors,
  mood: PortraitMood,
  blink: boolean,
): string {
  const feminine = traits.playerLook === 'female';
  const angry =
    mood === 'rival_glare' || mood === 'fired_up' || mood === 'determined' || traits.eyeStyle === 'determined';

  // Expressive chibi brows above giant low-set eyes
  const browPath = angry
    ? 'M68 98 Q83 101 97 106 M121 106 Q136 101 153 97'
    : feminine ? 'M70 102 Q83 93 96 100 M122 100 Q136 92 151 100'
      : 'M70 103 L80 98 L95 100 M122 100 L138 97 L151 102';
  const brows = `<path d="${browPath}" fill="none" stroke="${INK}" stroke-width="${feminine ? 3.4 : 5.5}" stroke-linecap="round" stroke-linejoin="round"/>`;

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
        <ellipse cx="${cx - 0.8}" cy="${cy + 1}" rx="${(rx * (feminine ? .82 : .72)).toFixed(1)}" ry="${(ry * .8).toFixed(1)}" fill="url(#iris-${uid})" />
        <!-- Deep Soft Pupil -->
        <ellipse cx="${cx - 0.8}" cy="${cy + 1.5}" rx="${(rx * 0.44).toFixed(1)}" ry="${(ry * 0.48).toFixed(1)}" fill="${INK}" />
        <!-- Big Glossy Chibi Catchlights -->
        <path d="M${cx - rx * .48} ${cy + ry * .51} Q${cx} ${cy + ry * .78} ${cx + rx * .4} ${cy + ry * .55}" fill="none" stroke="#C9FAFF" opacity=".68" stroke-width="2.4"/>
        ${star}
        ${traits.playerLook === 'female' ? `<path d="M${cx + (isNear ? rx : -rx)} ${cy - 3} l${isNear ? 6 : -6} -8 l${isNear ? -1 : 1} 9Z" fill="${INK}"/>` : ''}
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
      <path d="M100 138 Q109 141 118 138 L116 141 Q108 144 102 141Z" fill="#FFF3D9"/>
      <path d="M101 145 Q109 140 117 145 Q109 150 101 145 Z" fill="#FF6B95" />`;
  };

  const renderChibiAccessory = (acc: AccessoryStyle): string => {
    if (acc === 'pinkShades') return `<g transform="translate(10 13)">${pinkSportsShades}</g>`;
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
    if (acc === 'freckles') {
      return `<path d="M65 131 h1 m5 4 h1 m5 -4 h1 M145 132 h1 m5 4 h1 m5 -5 h1" stroke="${traits.skinShadow}" stroke-width="3.3" stroke-linecap="round"/>`;
    }
    if (acc === 'starEarrings') {
      return `<path d="M179 126 l2 3 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1Z" fill="#FFC300" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/>`;
    }
    return '';
  };

  const beard = renderFacialHair(traits);
  return `
    <!-- Soft Glowing Radial Chibi Cheek Blushes -->
    <ellipse cx="68" cy="133" rx="15" ry="10" fill="url(#blush-${uid})" />
    <ellipse cx="152" cy="134" rx="16" ry="11" fill="url(#blush-${uid})" />
    ${beard ? `<g transform="translate(109 141) scale(1.16 .72) translate(-100 -133)">${beard}</g>` : ''}
    ${feminine ? `<path d="M61 134 l3 -4 m2 6 3 -5 M150 135 l3 -5 m2 5 3 -5" stroke="#DE8087" stroke-width="2" stroke-linecap="round"/>` : ''}
    ${brows}
    <!-- Far Eye (slightly foreshortened in 3/4 2.5D!) & Near Eye -->
    ${renderGiantChibiEye(84, 120, feminine ? 14.4 : 13.2, feminine ? 17.7 : 15.2, false)}
    ${renderGiantChibiEye(134, 120, feminine ? 16.1 : 14.8, feminine ? 18.8 : 16.2, true)}
    <!-- Tiny Cute Chibi Button Nose right between the eyes! -->
    <ellipse cx="107" cy="129" rx="3.2" ry="2.2" fill="${traits.skinShadow}" />
    <circle cx="106" cy="128" r="1.2" fill="${traits.skinHighlight}" />
    ${renderPetiteChibiMouth(traits.mouthStyle)}
    ${renderGlasses(traits.glasses, true)}
    ${traits.glasses !== 'none' && (traits.accessory === 'shades90s' || traits.accessory === 'pinkShades') ? '' : renderChibiAccessory(traits.accessory)}
  `;
}

function renderGiant3DChibiHead(
  uid: string,
  traits: AthleteAppearance,
  team: PortraitTeamColors,
  facing: MiniPlayerFacing,
  role: MiniPlayerRole,
  batSide: EffectiveBatSide,
  mood: PortraitMood,
  blink: boolean,
  sweatVisible: boolean,
): string {
  const hair = renderChibiHairTufts(traits.hairStyle, traits.hairColor, traits.hairHighlight, team.accent, traits.hairAccessory);

  const neck = `<path data-part="neck" d="M107 143 L132 143 L131 158 Q122 167 116 166 L107 160Z" fill="${traits.skinTone}" stroke="${INK}" stroke-width="3.4"/>
    <path d="M109 148 Q122 156 130 148 L130 156 Q121 162 109 157Z" fill="${traits.skinShadow}"/>`;
  const helmet = role === 'batter' || role === 'catcher';
  const guardRight = (facing === 'front') === (batSide === 'R');
  const earGuard = role === 'batter' ? `
    <g data-gear="helmet-guard" transform="translate(${guardRight ? 170 : 58} 0)">
      <path d="M-8 84 Q4 81 12 97 L12 116 Q9 135 -4 132 Q-14 129 -12 116 Z"
        fill="url(#capbase-${uid})" stroke="${INK}" stroke-width="4" />
      <circle cy="114" r="4" fill="${INK}" />
    </g>` : '';
  const domeGleam = `<path d="M122 45 Q143 45 153 60 Q139 54 126 55 Z"
    fill="#fff" opacity="${helmet ? 0.5 : 0.18}" />`;
  const vents = `<path d="M84 59 l7 -5 M96 56 l7 -5" fill="none" stroke="${INK}"
    stroke-width="4" stroke-linecap="round" opacity="0.68" />`;
  const nape = {
    flattop: 'M61 88 L176 88 L174 111 L162 117 Q121 133 78 116 L66 110Z',
    curlyTop: 'M60 88 L177 88 Q182 115 171 122 Q164 136 153 128 Q142 142 128 133 Q113 144 100 134 Q85 142 78 129 Q62 129 60 113Z',
    sideSweep: 'M60 88 L177 88 Q177 125 161 132 L161 122 L144 132 L147 122 Q121 138 96 139 L102 130 L74 134 Q62 125 60 112Z',
    pompadour: 'M60 88 L177 88 Q178 116 168 127 L162 116 Q135 138 95 134 L99 128 Q84 133 75 130 Q63 122 60 112Z',
  };
  const rearCut = traits.hairStyle in nape ? nape[traits.hairStyle as keyof typeof nape]
    : 'M62 88 C62 112 68 128 78 134 L90 125 L104 136 L120 126 L136 136 L150 125 L162 133 C172 126 176 112 175 88Z';
  if (facing === 'back') {
    // 3/4-Back Volumetric 2.5D Chibi Head! (Shows plush far mochi cheek,visor tip peek, & snapback!)
    return `
      <g>
        ${neck}
        <!-- Peek of 3D Curved Visor Tip extending forward-left in 3/4-back perspective! -->
        <path d="M42 84 Q62 72 86 80 Q66 95 42 84 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
        <!-- Giant Plump 3D Mochi Head Sphere (with cute far cheek bulge on left!) -->
        <path d="M56 102 C52 56 184 56 182 104 C182 138 158 156 120 156 C78 156 50 136 56 102 Z" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        <!-- Prominent Cute Near Chibi Ear -->
        <circle cx="182" cy="118" r="13" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.4" />
        <path d="M184 113 Q177 118 183 123" fill="none" stroke="${traits.skinShadow}" stroke-width="3" stroke-linecap="round" />
        <!-- Sculpted 90s Spiky Nape Hairline + Shine -->
        <path d="${rearCut}" fill="${traits.hairColor}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
        <path d="M82 114 Q102 122 120 113 Q138 122 156 114" fill="none" stroke="${traits.hairHighlight}" stroke-width="3.8" stroke-linecap="round" opacity="0.8" />
        ${hair.backLayer}
        ${traits.hairStyle === 'waves' || traits.hairStyle === 'bob' ? `<path d="M72 111 Q100 120 127 111 L119 116 Q145 117 161 109 Q147 125 119 124 L124 119 Q98 127 78 120Z" fill="${traits.hairHighlight}" opacity=".85"/>` : ''}
        ${traits.hairAccessory === 'headband' ? `<path d="M56 95 Q117 110 181 94 L180 104 Q113 119 57 103Z" fill="${team.accent}" stroke="${INK}" stroke-width="2.8"/>` : ''}
        ${traits.glasses !== 'none' ? `<path d="M55 109 l8 11 M175 120 l9 -12" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
        <!-- Giant 3D Domed Pro Baseball Cap (3/4 Back) -->
        <path d="M54 94 C54 24 184 24 182 94 Q118 105 54 94 Z" fill="url(#capbase-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        ${domeGleam}
        ${helmet ? `
          <path d="M55 87 Q114 97 181 86 L180 106 Q119 122 57 101 Z"
            fill="url(#capbase-${uid})" stroke="${INK}" stroke-width="4" />
          ${vents}${earGuard}${role === 'catcher' ? catcherMask(uid, team, facing) : ''}` : `
          <path d="M118 42 Q111 65 115 79 M117 42 Q88 50 77 91 M121 42 Q147 50 159 92"
            fill="none" stroke="${INK}" stroke-width="1.8" opacity="0.36" />
          <path d="M94 96 C94 70 142 70 142 96 Z" fill="${traits.hairColor}" stroke="${INK}" stroke-width="4.2" />
          <rect x="94" y="89" width="48" height="7.5" rx="3.5" fill="${team.accent}" stroke="${INK}" stroke-width="3.2" />
          <path d="M101 93 h24" stroke="${INK}" stroke-width="2.4" stroke-dasharray="2 4" />
          <ellipse cx="118" cy="41" rx="7" ry="4" fill="${team.primary}" stroke="${INK}" stroke-width="3" />`}
      </g>`;
  }

  const jaw = {
    heart: 'C178 131 151 149 117 157 C96 154 62 144 56 125',
    square: traits.playerLook === 'female' ? 'Q180 135 155 147 Q127 162 110 157 Q66 153 56 127' : 'L177 126 Q177 151 148 154 L91 154 Q57 153 56 129',
    oval: 'C178 139 151 158 116 158 C84 158 57 138 57 116',
    chubby: 'C189 122 176 148 148 153 Q103 167 70 149 Q44 138 53 113',
    round: 'C178 140 154 156 114 156 C72 156 46 136 58 104',
  }[traits.headShape];
  const sweatSvg = sweatVisible
    ? `<path d="M174 78 C183 92 183 103 174 106 C165 103 165 92 174 78 Z" fill="#4CC3FF" stroke="${INK}" stroke-width="3.2" />
       <circle cx="172" cy="98" r="2.2" fill="#FFFFFF" />`
    : '';

  return `
    <g>
      ${hair.backLayer}
      ${neck}
      <!-- Near Chibi Ear (tucked on right in 3/4 perspective!) -->
      <circle cx="179" cy="120" r="13" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.4" />
      <path d="M181 115 Q174 120 180 125" fill="none" stroke="${traits.skinShadow}" stroke-width="3" stroke-linecap="round" />

      <!-- Giant Plump 3/4 "Mochi Cheek" Chibi Head with 3D Radial Shading! -->
      <path d="M58 104 C58 56 178 56 178 106 ${jaw}Z" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />

      <!-- Forehead Cast Shadow from 3D Cap Brim -->
      <path d="M58 96 Q114 82 176 96 L176 84 L58 84 Z" fill="${traits.skinShadow}" opacity="0.45" />

      ${ renderChibiEyesAndFace(uid, traits, team, mood, blink) }
      ${hair.bangsLayer}
      <g transform="translate(0 12) scale(1.17 1)">${templeLocks(traits.hairStyle, traits.hairColor, traits.hairHighlight)}</g>
      ${traits.hairAccessory === 'headband' ? `<g transform="translate(0 7) scale(1.17 1)">${hairband(team.accent)}</g>` : ''}

      <!-- Giant 3D Domed Chibi Baseball Cap + Sweeping 3/4 Green-Underbrim Visor! -->
      <path d="M56 89 C58 22 180 22 178 89 Z" fill="url(#capbase-${uid})" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
      ${domeGleam}
      ${helmet ? vents : `
        <path d="M113 39 Q89 49 80 79 M121 39 Q149 49 158 80" fill="none" stroke="${INK}" stroke-width="2" opacity="0.35" />
        <ellipse cx="118" cy="38" rx="7" ry="4" fill="${team.primary}" stroke="${INK}" stroke-width="3" />`}

      <!-- Raised 3D Embroidered Cap Emblem -->
      <path d="M97 48 Q110 42 127 46 L127 58 Q121 67 111 69 Q103 67 96 61Z" fill="${team.secondary}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M100 50 Q111 46 123 48" fill="none" stroke="${team.accent}" stroke-width="1.8"/>
      <text x="112" y="61" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="900" fill="#FFEFCD">${team.monogram.slice(0, 2)}</text>
      ${role === 'catcher' ? `<path d="M57 80 Q114 64 178 80 L178 91 Q113 76 55 94Z" fill="${team.secondary}" stroke="${INK}" stroke-width="3.8"/>` : `
        <path d="M36 86 Q98 62 172 84 Q112 103 36 86Z" fill="#1E7A44" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/>
        <path d="M36 83 Q98 59 172 82 Q108 94 36 83Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`}

      ${earGuard}
      ${role === 'catcher' ? catcherMask(uid, team, facing) : ''}
      ${sweatSvg}
    </g>`;
}

export function renderMiniPlayerSvgString(
  options: MiniPlayerSvgOptions,
  pose: MiniPlayerRigPose,
): string {
  const {
    team,
    jerseyNumber,
    role,
    facing,
    throwsHand = 'R',
    batSide = 'R',
    moodOverride,
    transparentBg = true,
    includeGroundShadow = true,
  } = options;
  const traits = resolveAthleteAppearance(options.traits);
  const stature = STATURE_SCALE[traits.stature];
  const legWidth = BUILD_WIDTH[traits.build] * (traits.playerLook === 'female' ? 1.12 : 1);
  const uid = `chibi-${traits.seed}-${role}-${facing}-${throwsHand}-${batSide}-${options.instanceId ?? ''}`;
  const activeMood = moodOverride ?? pose.expression;

  const auraSvg =
    pose.auraIntensity > 0.04
      ? `<g opacity="${(pose.auraIntensity * 0.85).toFixed(2)}">
           ${includeGroundShadow ? `<ellipse cx="120" cy="232" rx="${(48 + pose.auraIntensity * 14).toFixed(1)}" ry="13" fill="none" stroke="${pose.auraColor}" stroke-width="5.5"/>` : ''}
           ${role === 'fielder' && pose.reach ? `<path d="M63 183 l4 -11 3 10 7 3 -7 2 -3 8 -2 -8 -7 -2Z M170 198 l3 -7 2 6 5 2 -5 2 -2 6 -2 -6 -5 -2Z" fill="#FFEDAF"/>`
             : `<path d="M52 216 Q38 148 62 92 Q74 128 88 64 Q120 30 152 64 Q166 128 178 92 Q202 148 188 216Z" fill="${pose.auraColor}" opacity="0.28"/>`}
         </g>`
      : '';

  const batOnViewerLeft = (facing === 'front') === (batSide === 'R');
  const swingSmearSvg =
    role === 'batter' && pose.swingSmearOpacity > 0.08
      ? `<g transform="${batOnViewerLeft ? 'translate(240 0) scale(-1 1)' : ''}" opacity="${(pose.swingSmearOpacity * 0.76).toFixed(2)}">
          <path d="M180 84 Q229 105 235 154 Q223 117 182 98 Z" fill="${pose.auraIntensity > 0.3 ? '#FFD166' : '#fff9de'}" />
          <path d="M195 82 Q224 99 232 121" fill="none" stroke="#fff9de" stroke-width="2.5" stroke-linecap="round" />
        </g>`
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

  const mirroredFrontArm = {
    ...pose.frontArm,
    tx: -pose.frontArm.tx,
    rotDeg: -pose.frontArm.rotDeg,
  };
  const mirroredBackArm = {
    ...pose.backArm,
    tx: -pose.backArm.tx,
    rotDeg: -pose.backArm.rotDeg,
  };

  const mittOnViewerLeft = (facing === 'back') === (throwsHand === 'R');

  if (role === 'batter') {
    if (batOnViewerLeft) {
      // Bat held cleanly on Viewer's LEFT (RHB Front OR LHB Back)
      rightSideArmSvg = `
        <g transform="${groupTransform(rightSideShoulderX, rightSideShoulderY, mirroredFrontArm)}">
          <path d="M142 158 C122 164 100 164 82 158 L84 170 C102 175 126 174 144 168 Z" fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
        </g>`;
      leftSideArmSvg = `
        <g transform="${groupTransform(leftSideShoulderX, leftSideShoulderY, mirroredFrontArm)}">
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
      // Bat held cleanly on Viewer's RIGHT (LHB Front OR RHB Back)
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
  } else if (mittOnViewerLeft) {
    // Mitt on Viewer's LEFT (RHP Back OR LHP Front); Throwing hand on Viewer's RIGHT!
    const glovePose = facing === 'back' ? pose.backArm : mirroredBackArm;
    const throwPose = facing === 'back' ? pose.frontArm : mirroredFrontArm;
    leftSideArmSvg = `
      <g transform="${groupTransform(leftSideShoulderX, leftSideShoulderY, glovePose)}">
        ${renderFieldArm(uid, team, traits.build, true)}
        ${renderGlove(76, 169, uid, true, facing, role === 'catcher', !!options.caughtBall)}
      </g>`;
    rightSideArmSvg = `
      <g transform="${groupTransform(rightSideShoulderX, rightSideShoulderY, throwPose)}">
        ${renderFieldArm(uid, team, traits.build, false)}
        ${
          facing === 'back'
            ? `${pose.holdingBall ? baseballInHandSvg(156, 174) : ''}
               <circle cx="160" cy="180" r="10.2" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />`
            : `<circle cx="160" cy="180" r="10" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />
               ${
                 pose.holdingBall
                   ? `${baseballInHandSvg(157, 177)}
                      <ellipse cx="151" cy="179" rx="4.5" ry="3.2" transform="rotate(24 151 179)" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="2.6" />`
                   : ''
               }`
        }
      </g>`;
  } else {
    // Mitt on Viewer's RIGHT (RHP Front OR LHP Back); Throwing hand on Viewer's LEFT!
    const glovePose = facing === 'front' ? pose.backArm : mirroredBackArm;
    const throwPose = facing === 'front' ? pose.frontArm : mirroredFrontArm;
    leftSideArmSvg = `
      <g transform="${groupTransform(leftSideShoulderX, leftSideShoulderY, throwPose)}">
        ${renderFieldArm(uid, team, traits.build, true)}
        ${
          facing === 'back'
            ? `${pose.holdingBall ? baseballInHandSvg(84, 174) : ''}
               <circle cx="80" cy="180" r="10.2" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />`
            : `<circle cx="80" cy="180" r="10" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.8" />
               ${
                 pose.holdingBall
                   ? `${baseballInHandSvg(83, 177)}
                      <ellipse cx="89" cy="179" rx="4.5" ry="3.2" transform="rotate(-24 89 179)" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="2.6" />`
                   : ''
               }`
        }
      </g>`;
    rightSideArmSvg = `
      <g transform="${groupTransform(rightSideShoulderX, rightSideShoulderY, glovePose)}">
        ${renderFieldArm(uid, team, traits.build, false)}
        ${renderGlove(164, 169, uid, false, facing, role === 'catcher', !!options.caughtBall)}
      </g>`;
  }

  const motion = traits.pitchingMotion;
  const pitchPhase = pose.pitchPhase;
  const signaturePitch = role === 'pitcher' && motion !== 'overhand' && pitchPhase !== undefined;
  if (signaturePitch) {
    const throwingLeft = !mittOnViewerLeft;
    const { shoulder, elbow, wrist, ball } = pitchingArm(motion, pitchPhase, throwingLeft);
    const armPath = `M${shoulder.x} ${shoulder.y} L${elbow.x} ${elbow.y} L${wrist.x} ${wrist.y}`;
    const midX = (shoulder.x + elbow.x) / 2;
    const midY = (shoulder.y + elbow.y) / 2;
    const sleeve = `M${shoulder.x} ${shoulder.y} L${midX} ${midY}`;
    const muscle = 12 * BUILD_WIDTH[traits.build];
    const leatherBall = pose.holdingBall ? baseballInHandSvg(ball.x, ball.y) : '';
    const arm = `<g data-throw="${traits.pitchingMotion}" stroke-linecap="round" stroke-linejoin="round">
      <g fill="none">
        <path d="${armPath}" stroke="${INK}" stroke-width="${muscle + 6}"/>
        <path d="${armPath}" stroke="${traits.skinTone}" stroke-width="${muscle}"/>
        <path d="${sleeve}" stroke="${INK}" stroke-width="${muscle + 10}"/>
        <path d="${sleeve}" stroke="${team.primary}" stroke-width="${muscle + 4}"/>
        <path d="M${midX} ${midY - muscle * .32} l${throwingLeft ? -2 : 2} 4" stroke="${team.accent}" stroke-width="2.8"/>
      </g>
      ${facing === 'back' ? leatherBall : ''}
      <circle cx="${wrist.x}" cy="${wrist.y}" r="9.3" fill="url(#skin-${uid})" stroke="${INK}" stroke-width="3.3"/>
      ${facing === 'front' ? leatherBall : ''}
      ${facing === 'front' && leatherBall ? `<ellipse cx="${wrist.x + (throwingLeft ? 6 : -6)}" cy="${wrist.y + 1}" rx="4" ry="3" fill="${traits.skinTone}" stroke="${INK}" stroke-width="2"/>` : ''}
    </g>`;
    if (throwingLeft) leftSideArmSvg = arm;
    else rightSideArmSvg = arm;
  }
  const reach = role === 'fielder' && pose.reach ? fieldingReach(pose, mittOnViewerLeft) : undefined;
  if (reach) {
    const { x, y } = reach.wrist;
    const sx = mittOnViewerLeft ? 96 : 144;
    const dx = mittOnViewerLeft ? -1 : 1;
    const elbow = (sx + x) / 2;
    const sleeve = `<path d="M${sx} 156 Q${elbow} 161 ${x} ${y - 4} L${x} ${y + 7} Q${elbow} 178 ${sx - dx * 4} 170Z"
      fill="url(#jersey-team-${uid})" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    const arm = sleeve + renderGlove(x, y, uid, mittOnViewerLeft, facing, false, !!options.caughtBall);
    if (mittOnViewerLeft) leftSideArmSvg = arm;
    else rightSideArmSvg = arm;
  }

  const bgRect = transparentBg
    ? ''
    : '<rect width="240" height="260" rx="20" fill="#85E4FF" />';

  const leadLeft = role === 'batter' ? batOnViewerLeft : signaturePitch ? !mittOnViewerLeft : (role === 'catcher' || !!reach) && mittOnViewerLeft;
  const frontHighlightArm = leadLeft ? leftSideArmSvg : rightSideArmSvg;
  const frontUnderArm = leadLeft ? rightSideArmSvg : leftSideArmSvg;
  const headJoint = reach && mittOnViewerLeft
    ? { ...pose.head, tx: -pose.head.tx, rotDeg: -pose.head.rotDeg }
    : pose.head;

  const stance = (BUILD_WIDTH[traits.build] - 1) * 17 + (traits.playerLook === 'female' ? 2 : 0);
  const guardFacing = role === 'catcher' ? facing : undefined;
  const hemSway = Math.max(-8, Math.min(8, (pose.frontLeg.rotDeg - pose.backLeg.rotDeg) * 0.12));
  const bareKnee = traits.bottoms !== 'pants';
  const bodyStack =
    facing === 'back'
      ? `
        ${leftSideArmSvg}
        ${renderChibiStubbyLeg(104 - stance, 192, uid, team, guardFacing ? pose.frontLeg : pose.backLeg, true, legWidth, bareKnee, guardFacing)}
        ${renderChibiStubbyLeg(132 + stance, 197, uid, team, guardFacing ? pose.backLeg : pose.frontLeg, false, legWidth, bareKnee, guardFacing)}
        <g transform="${groupTransform(120, 175, pose.torso)}">
          ${renderTinyBeanTorso(uid, team, jerseyNumber, role, 'back', traits, hemSway)}
        </g>
        <g transform="${groupTransform(120, 144, headJoint)} translate(120 153) scale(1 ${1 / Math.sqrt(stature)}) translate(-120 -153)">
          ${renderGiant3DChibiHead(uid, traits, team, 'back', role, batSide, activeMood, pose.blink, pose.sweatVisible)}
        </g>
        ${rightSideArmSvg}`
      : `
        ${renderChibiStubbyLeg(132 + stance, 192, uid, team, pose.backLeg, true, legWidth, bareKnee, guardFacing)}
        ${renderChibiStubbyLeg(104 - stance, 197, uid, team, pose.frontLeg, false, legWidth, bareKnee, guardFacing)}
        <g transform="${groupTransform(120, 175, pose.torso)}">
          ${renderTinyBeanTorso(uid, team, jerseyNumber, role, 'front', traits, hemSway)}
        </g>
        ${frontUnderArm}
        <g transform="${groupTransform(120, 144, headJoint)} translate(120 153) scale(1 ${1 / Math.sqrt(stature)}) translate(-120 -153)">
          ${renderGiant3DChibiHead(uid, traits, team, 'front', role, batSide, activeMood, pose.blink, pose.sweatVisible)}
        </g>
        ${frontHighlightArm}`;

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
  <g transform="${groupTransform(120, 232, reach?.root ?? pose.root)}">
    <g transform="translate(0 232) scale(1 ${stature}) translate(0 -232)">
      ${swingSmearSvg}
      <g ${bareKnee ? '' : 'data-uniform="pants"'}>${bodyStack}</g>
    </g>
  </g>
</svg>`;
}
