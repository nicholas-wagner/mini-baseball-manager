import {
  renderAccessorySvg,
  renderBackHairSvg,
  renderCapSvg,
  renderDetailedEyesSvg,
  renderDetailedMouthSvg,
  renderFrontHairSvg,
  renderSculptedHeadParts,
} from '../portraits/generatePortrait';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../portraits/types';
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
}

const INK = '#181B2C';

function groupTransform(pivotX: number, pivotY: number, j: JointTransform2D): string {
  const sx = j.sx ?? 1;
  const sy = j.sy ?? 1;
  return `translate(${(pivotX + j.tx).toFixed(1)} ${(pivotY + j.ty).toFixed(1)}) rotate(${j.rotDeg.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-pivotX} ${-pivotY})`;
}

function renderLegSvg(
  hipX: number,
  hipY: number,
  team: PortraitTeamColors,
  joint: JointTransform2D,
): string {
  return `
    <g transform="${groupTransform(hipX, hipY, joint)}">
      <!-- Baggy 90s Baseball Knicker -->
      <path d="M${hipX - 13} ${hipY - 4} C${hipX - 16} ${hipY + 12} ${hipX - 15} ${hipY + 24} ${hipX - 10} ${hipY + 28} L${hipX + 10} ${hipY + 28} C${hipX + 15} ${hipY + 24} ${hipX + 16} ${hipY + 12} ${hipX + 13} ${hipY - 4} Z" fill="#FBF4E4" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
      <path d="M${hipX - 11} ${hipY + 4} L${hipX - 9} ${hipY + 25}" stroke="${team.primary}" stroke-width="3" stroke-linecap="round" />
      <!-- Striped 90s Stirrup Sock -->
      <rect x="${hipX - 8}" y="${hipY + 26}" width="16" height="17" rx="4" fill="${team.primary}" stroke="${INK}" stroke-width="3.8" />
      <line x1="${hipX - 6}" y1="${hipY + 32}" x2="${hipX + 6}" y2="${hipY + 32}" stroke="${team.accent}" stroke-width="3" />
      <line x1="${hipX - 6}" y1="${hipY + 37}" x2="${hipX + 6}" y2="${hipY + 37}" stroke="#FFFFFF" stroke-width="2.5" />
      <!-- Chunky Retro Cartoon Cleat -->
      <path d="M${hipX - 12} ${hipY + 41} C${hipX - 14} ${hipY + 51} ${hipX + 15} ${hipY + 51} ${hipX + 16} ${hipY + 44} C${hipX + 16} ${hipY + 39} ${hipX + 6} ${hipY + 38} ${hipX - 12} ${hipY + 41} Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <path d="M${hipX - 11} ${hipY + 48} L${hipX + 14} ${hipY + 48}" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" />
      <line x1="${hipX - 2}" y1="${hipY + 41}" x2="${hipX + 5}" y2="${hipY + 42}" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" />
    </g>`;
}

function renderStitchedMittSvg(cx: number, cy: number): string {
  return `
    <g>
      <!-- Honey-leather 90s Baseball Mitt with Webbing -->
      <path d="M${cx - 18} ${cy - 6} C${cx - 22} ${cy - 24} ${cx + 8} ${cy - 28} ${cx + 16} ${cy - 12} C${cx + 22} ${cy - 6} ${cx + 20} ${cy + 14} ${cx + 4} ${cy + 16} C${cx - 12} ${cy + 18} ${cx - 20} ${cy + 8} ${cx - 18} ${cy - 6} Z" fill="#C97328" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <ellipse cx="${cx - 1}" cy="${cy + 2}" rx="9.5" ry="8" fill="#9E5216" stroke="${INK}" stroke-width="2.6" />
      <!-- Finger stalls & lacing -->
      <path d="M${cx - 10} ${cy - 18} L${cx - 6} ${cy - 7} M${cx - 1} ${cy - 20} L${cx} ${cy - 8} M${cx + 8} ${cy - 16} L${cx + 6} ${cy - 6}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />
      <path d="M${cx - 14} ${cy - 9} L${cx - 7} ${cy - 11}" stroke="#FBF4E4" stroke-width="2.4" stroke-linecap="round" />
    </g>`;
}

function renderWoodGrainBatSvg(
  handX: number,
  handY: number,
  batRotDeg: number,
  energizedColor: string | null,
): string {
  const barrelFill = energizedColor ?? '#E8AC5E';
  const barrelShade = energizedColor ? '#FFFFFF' : '#C58336';
  return `
    <g transform="translate(${handX} ${handY}) rotate(${batRotDeg})">
      <!-- Tapered Pro Maple Bat -->
      <path d="M-4 6 L-9 -76 C-9 -84 9 -84 9 -76 L4 6 Z" fill="${barrelFill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <path d="M-2 -74 L-1 -20" stroke="${barrelShade}" stroke-width="3" stroke-linecap="round" opacity="0.65" />
      <!-- Black Pine-Tar Grip Tape & Knob -->
      <rect x="-4.5" y="-14" width="9" height="18" rx="2" fill="#222538" stroke="${INK}" stroke-width="3" />
      <ellipse cx="0" cy="7" rx="7.5" ry="4" fill="#E8AC5E" stroke="${INK}" stroke-width="3.5" />
    </g>`;
}

function renderTorsoSvg(
  team: PortraitTeamColors,
  jerseyNumber: number,
  role: MiniPlayerRole,
  facing: MiniPlayerFacing,
): string {
  if (facing === 'back') {
    return `
      <g>
        <!-- Back of Piped 90s Baseball Jersey -->
        <path d="M84 146 C78 164 80 192 86 204 L154 204 C160 192 162 164 156 146 Q120 138 84 146 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
        <!-- Cream Side Panels & Belt -->
        <path d="M90 148 L94 202 M150 148 L146 202" stroke="#FBF4E4" stroke-width="3.5" stroke-linecap="round" />
        <rect x="86" y="196" width="68" height="9" rx="4" fill="${team.secondary}" stroke="${INK}" stroke-width="3.5" />
        <!-- Bold Stitched Back Jersey Number! -->
        <text x="120" y="185" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="31" font-weight="900" fill="#FBF4E4" stroke="${INK}" stroke-width="6" paint-order="stroke">${jerseyNumber}</text>
      </g>`;
  }

  // Front Torso (+ Catcher Chest Protector when role === 'catcher')
  const catcherGear =
    role === 'catcher'
      ? `<path d="M88 148 L152 148 L148 198 L92 198 Z" fill="${team.secondary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
         <line x1="92" y1="162" x2="148" y2="162" stroke="${team.accent}" stroke-width="3" />
         <line x1="93" y1="175" x2="147" y2="175" stroke="${team.accent}" stroke-width="3" />
         <line x1="94" y1="188" x2="146" y2="188" stroke="${team.accent}" stroke-width="3" />`
      : `<path d="M120 148 L120 198" stroke="${team.accent}" stroke-width="3.5" />
         <text x="120" y="182" text-anchor="middle" font-family="Bungee, Fredoka, sans-serif" font-size="22" font-weight="900" fill="${team.primary}" stroke="${INK}" stroke-width="5" paint-order="stroke">${team.monogram.slice(0, 2)}</text>`;

  return `
    <g>
      <!-- Home Cream Piped Baseball Jersey -->
      <path d="M84 146 C78 164 80 192 86 204 L154 204 C160 192 162 164 156 146 Q120 138 84 146 Z" fill="#FBF4E4" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" />
      <polygon points="104,144 120,162 136,144" fill="${team.secondary}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" />
      ${catcherGear}
      <!-- Leather Belt & Gold Buckle -->
      <rect x="86" y="196" width="68" height="9" rx="4" fill="${team.secondary}" stroke="${INK}" stroke-width="3.5" />
      <rect x="112" y="194" width="16" height="12" rx="3" fill="#FFC300" stroke="${INK}" stroke-width="3" />
    </g>`;
}

function renderHeadGroupSvg(
  traits: PortraitTraits,
  team: PortraitTeamColors,
  facing: MiniPlayerFacing,
  role: MiniPlayerRole,
  mood: PortraitMood,
  blink: boolean,
  sweatVisible: boolean,
): string {
  const head = renderSculptedHeadParts(traits.headShape);

  if (facing === 'back') {
    // 3/4-Back Illustrated Chibi Head (Snapback Cap Cutout + Tapered Nape Hairline + Neck/Ears!)
    return `
      <g transform="translate(20 -8)">
        <!-- Neck -->
        <rect x="86" y="136" width="28" height="22" rx="9" fill="${traits.skinShadow}" stroke="${INK}" stroke-width="4.2" />
        <!-- Ears -->
        <circle cx="49" cy="108" r="11.5" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.4" />
        <circle cx="151" cy="108" r="11.5" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.4" />
        <!-- Lower Head Skin -->
        <path d="${head.silhouette}" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        <path d="${head.celShadow}" fill="${traits.skinShadow}" opacity="0.45" />
        <!-- Sculpted Nape Hairline with 90s Spiky Locks & Shine -->
        <path d="M51 84 C50 106 56 122 66 128 L76 121 L86 130 L100 122 L114 130 L124 121 L134 128 C144 122 150 106 149 84 Z" fill="${traits.hairColor}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round" />
        <path d="M68 108 Q84 115 100 108 Q116 115 132 108" fill="none" stroke="${traits.hairHighlight}" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
        ${renderBackHairSvg(traits.hairStyle, traits.hairColor, traits.hairHighlight)}
        <!-- Back of 90s Pro Baseball Cap with Snapback Cutout! -->
        <path d="M46 88 C48 24 152 24 154 88 Q100 96 46 88 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
        <path d="M100 32 L100 66 M72 38 Q68 62 66 86 M128 38 Q132 62 134 86" fill="none" stroke="${INK}" stroke-width="2.2" opacity="0.32" />
        <path d="M62 54 C68 36 84 30 96 30" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.26" />
        <!-- Semicircular Snapback Cutout showing Hair Tuft & Adjustable Strap! -->
        <path d="M78 89 C78 66 122 66 122 89 Z" fill="${traits.hairColor}" stroke="${INK}" stroke-width="4" />
        <path d="M88 76 L96 85 L104 74 L112 85" fill="none" stroke="${traits.hairHighlight}" stroke-width="3" stroke-linecap="round" />
        <rect x="78" y="83" width="44" height="7" rx="3" fill="${team.accent}" stroke="${INK}" stroke-width="3.2" />
        <circle cx="96" cy="86.5" r="1.5" fill="${INK}" />
        <circle cx="104" cy="86.5" r="1.5" fill="${INK}" />
        <circle cx="100" cy="31" r="6" fill="${team.accent}" stroke="${INK}" stroke-width="3.4" />
      </g>`;
  }

  // Front / 3/4-Front Expressive Chibi Head!
  const effectiveCap = role === 'batter' ? 'forward' : traits.capStyle;
  const batterEarFlap =
    role === 'batter'
      ? `<path d="M46 76 C40 96 46 118 64 120 C68 112 64 98 58 80 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round" />
         <circle cx="55" cy="104" r="4" fill="${INK}" />`
      : '';

  const sweatSvg = sweatVisible
    ? `<path d="M150 72 C158 86 158 96 150 99 C142 96 142 86 150 72 Z" fill="#4CC3FF" stroke="${INK}" stroke-width="3.2" />`
    : '';

  return `
    <g transform="translate(20 -8)">
      ${renderBackHairSvg(traits.hairStyle, traits.hairColor, traits.hairHighlight)}
      <circle cx="49" cy="108" r="11.5" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.4" />
      <circle cx="151" cy="108" r="11.5" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.4" />
      <path d="${head.silhouette}" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4.8" stroke-linejoin="round" />
      <path d="${head.celShadow}" fill="${traits.skinShadow}" opacity="0.52" />
      <path d="${head.rimHighlight}" fill="none" stroke="${traits.skinHighlight}" stroke-width="4" stroke-linecap="round" opacity="0.8" />
      <ellipse cx="66" cy="119" rx="9.5" ry="5" fill="#FF6B95" opacity="0.44" />
      <ellipse cx="134" cy="119" rx="9.5" ry="5" fill="#FF6B95" opacity="0.44" />
      <path d="M97 110 C105 114 105 120 96 121" fill="${traits.skinShadow}" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" />
      ${renderDetailedEyesSvg(traits.eyeStyle, traits.irisColor, mood, blink)}
      ${renderDetailedMouthSvg(traits.mouthStyle, mood)}
      ${renderFrontHairSvg(traits.hairStyle, traits.hairColor, traits.hairHighlight, effectiveCap)}
      ${renderCapSvg(effectiveCap, team)}
      ${batterEarFlap}
      ${renderAccessorySvg(traits.accessory, team)}
      ${sweatSvg}
    </g>`;
}

export function renderMiniPlayerSvgString(
  options: MiniPlayerSvgOptions,
  pose: MiniPlayerRigPose,
): string {
  const { traits, team, jerseyNumber, role, facing, moodOverride, transparentBg = true } = options;
  const activeMood = moodOverride ?? pose.expression;

  const auraSvg =
    pose.auraIntensity > 0.04
      ? `<g opacity="${(pose.auraIntensity * 0.82).toFixed(2)}">
           <ellipse cx="120" cy="248" rx="${(52 + pose.auraIntensity * 14).toFixed(1)}" ry="14" fill="none" stroke="${pose.auraColor}" stroke-width="6" />
           <path d="M54 228 Q42 156 64 102 Q74 138 88 74 Q120 42 152 74 Q166 138 176 102 Q198 156 186 228 Z" fill="${pose.auraColor}" opacity="0.28" />
         </g>`
      : '';

  const swingSmearSvg =
    role === 'batter' && pose.swingSmearOpacity > 0.08
      ? `<path d="M44 128 C78 68 178 72 208 148 C172 110 92 108 44 128 Z" fill="${pose.auraIntensity > 0.3 ? '#FFC300' : '#FFFFFF'}" opacity="${(pose.swingSmearOpacity * 0.78).toFixed(2)}" stroke="${INK}" stroke-width="2.5" />`
      : '';

  // Left Arm (Glove arm for pitcher/fielder/catcher; Lead bat arm for batter)
  const leftShoulderX = 84;
  const leftShoulderY = 156;
  const rightShoulderX = 156;
  const rightShoulderY = 156;

  const leftArmContent =
    role === 'batter'
      ? `<circle cx="72" cy="182" r="11" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4" />`
      : renderStitchedMittSvg(68, 184);

  const rightArmTool =
    role === 'batter'
      ? renderWoodGrainBatSvg(
          168,
          182,
          pose.batRotDeg,
          pose.auraIntensity > 0.5 ? pose.auraColor : null,
        )
      : role === 'pitcher'
        ? `<g>
             <circle cx="172" cy="184" r="10.5" fill="#FBF4E4" stroke="${INK}" stroke-width="3.6" />
             <path d="M166 178 Q172 184 166 190 M178 178 Q172 184 178 190" fill="none" stroke="#E63946" stroke-width="2.2" />
           </g>`
        : '';

  const leftArmSvg = `
    <g transform="${groupTransform(leftShoulderX, leftShoulderY, pose.leftArm)}">
      <path d="M88 152 C74 156 66 168 68 182 L82 182 C84 172 88 164 94 160 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      ${leftArmContent}
    </g>`;

  const rightArmSvg = `
    <g transform="${groupTransform(rightShoulderX, rightShoulderY, pose.rightArm)}">
      <path d="M152 152 C166 156 174 168 172 182 L158 182 C156 172 152 164 146 160 Z" fill="${team.primary}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" />
      <circle cx="168" cy="182" r="11" fill="${traits.skinTone}" stroke="${INK}" stroke-width="4" />
      ${rightArmTool}
    </g>`;

  const bgRect = transparentBg
    ? ''
    : '<rect width="240" height="280" rx="20" fill="#85E4FF" />';

  // Layer ordering flips subtly between front and back so arms/bats wrap naturally!
  const bodyLayers =
    facing === 'back'
      ? `
        ${leftArmSvg}
        ${rightArmSvg}
        ${renderLegSvg(104, 200, team, pose.leftLeg)}
        ${renderLegSvg(136, 200, team, pose.rightLeg)}
        <g transform="${groupTransform(120, 175, pose.torso)}">
          ${renderTorsoSvg(team, jerseyNumber, role, 'back')}
        </g>
        <g transform="${groupTransform(120, 132, pose.head)}">
          ${renderHeadGroupSvg(traits, team, 'back', role, activeMood, pose.blink, pose.sweatVisible)}
        </g>`
      : `
        ${renderLegSvg(104, 200, team, pose.leftLeg)}
        ${renderLegSvg(136, 200, team, pose.rightLeg)}
        <g transform="${groupTransform(120, 175, pose.torso)}">
          ${renderTorsoSvg(team, jerseyNumber, role, 'front')}
        </g>
        ${leftArmSvg}
        <g transform="${groupTransform(120, 132, pose.head)}">
          ${renderHeadGroupSvg(traits, team, 'front', role, activeMood, pose.blink, pose.sweatVisible)}
        </g>
        ${rightArmSvg}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" role="img" aria-label="Animated mini baseball player (${facing})">
  ${bgRect}
  <!-- Reactive Ground Shadow -->
  <ellipse cx="${(120 + pose.root.tx * 0.5).toFixed(1)}" cy="254" rx="${(44 * pose.shadowScale).toFixed(1)}" ry="${(11 * pose.shadowScale).toFixed(1)}" fill="#102518" opacity="0.32" />
  ${auraSvg}
  <!-- Articulated Chibi Character Root -->
  <g transform="${groupTransform(120, 245, pose.root)}">
    ${bodyLayers}
    ${swingSmearSvg}
  </g>
</svg>`;
}
