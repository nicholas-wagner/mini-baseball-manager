import { JERSEY_EASE, type AthleteAppearance } from './athleteAppearance';
import type { PortraitTeamColors } from './types';
import fieldGlove from './illustrations/field-glove.png';
import catchersMitt from './illustrations/catchers-mitt.png';
import { uniformBottoms } from './uniformBottoms';

export type CardPose = 'bat' | 'glove' | 'rally' | 'ready' | 'windup';
const ink = '#252134';
const cloth = '#FFF8E9';
const cool = '#C7C5D0';

function pitchingArm(t: AthleteAppearance) {
  // All poses meet the inside edge of the raised sleeve. The wrist stays
  // attached when the whole figure mirrors for a southpaw.
  const delivery = {
    overhand: {
      arm: 'M69 78 Q62 75 54 79 L43 85 Q47 69 47 54 L39 50 Q32 66 31 85 Q29 95 36 98 Q43 102 55 95 L70 90Z',
      shadow: 'M32 82 Q32 95 40 94 Q48 93 58 85 L64 88 Q49 100 39 98 Q30 98 31 87Z',
      wrist: 'translate(43 52) rotate(-14)',
    },
    sidearm: {
      arm: 'M69 78 Q60 75 52 78 L42 82 Q33 82 24 78 L18 84 Q32 94 44 94 Q55 94 69 89Z',
      shadow: 'M22 83 Q34 89 46 88 Q55 86 63 83 L66 88 Q54 94 43 93 Q31 92 22 86Z',
      wrist: 'translate(23 81) rotate(-81)',
    },
    underhand: {
      arm: 'M57 85 Q49 94 47 108 L44 123 Q40 135 43 149 L51 151 Q55 135 56 126 L60 115 Q66 107 70 91Z',
      shadow: 'M45 124 Q50 118 54 109 L58 104 Q59 111 54 122 Q53 132 49 147 L44 147Z',
      wrist: 'translate(47 151) rotate(171)',
    },
  }[t.pitchingMotion];
  return `<g data-delivery="${t.pitchingMotion}" stroke-linejoin="round" stroke-linecap="round">
    <path d="${delivery.arm}" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.65"/>
    <path d="${delivery.shadow}" fill="${t.skinShadow}"/>
    <g transform="${delivery.wrist}">
      <path d="M-4 6 Q-8 3 -9 -3 L-10 -10 Q-10 -13 -8 -13 Q-6 -13 -5 -9 L-2 -6 L4 -7 Q8 -7 8 -1 Q7 4 4 7Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.15"/>
      <circle cx="-.6" cy="-8.7" r="7" fill="#FFF9E8" stroke="#604A44" stroke-width="1.05"/>
      <path d="M-5 -14 Q-1 -10 -4 -5 M4 -14 Q1 -10 5 -6" fill="none" stroke="#BD5660" stroke-width=".8"/>
      <path d="M-5 -12 l1.8 -.8 m-.8 3 1.6 -.4 m4.6 -.4 2 -.3" stroke="#BD5660" stroke-width=".7"/>
      <path d="M-5 4 Q-8 1 -8 -4 L-7 -11 Q-7 -14 -5.2 -14 Q-3.8 -14 -4 -11 L-4 -6 L-2 -5 L-1 -12 Q-.7 -14 1 -13.5 Q2 -13 1.8 -11 L1.4 -5.3 L2 -3 Q4 -5 5 -7 L6 -9 Q7.4 -10 8 -8.5 Q8.6 -7 7.8 -4 L6 1 Q4.5 4 1 5" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.1"/>
      <path d="M-7 -3 l2 1 M-2 -2 l2 1 M1 2 l3 -2" fill="none" stroke="${t.skinShadow}" stroke-width=".9"/>
    </g></g>`;
}

// Bat, knob, finger joints and thumbs share one axis, including when the entire
// stance is mirrored. The nearer end flares towards the reader in perspective.
function contactSwing(t: AthleteAppearance, team: PortraitTeamColors) {
  const battingGlove = (y: number, left: boolean) => `<g transform="translate(0 ${y}) scale(${left ? -1 : 1} 1)">
    <path d="M-8 -5 Q-4 -8 1 -6 L5 -4 Q9 -4 9 0 L8 5 Q5 9 0 8 L-7 5 L-11 4 L-12 -2Z" fill="#EDEAE3" stroke="${ink}" stroke-width="1.1"/>
    <path d="M-11 -2 L-7 -4 L-6 4 L-11 4Z" fill="${team.primary}"/>
    <path d="M-4 -5 Q0 -6 5 -4 M-3 -2 Q2 -3 7 -1 M-3 1 Q1 0 7 2 M-2 4 Q2 4 6 5" stroke="#736C77" stroke-width=".8" fill="none"/>
    <path d="M-7 4 Q-5 -2 0 -2 L3 -1 Q5 1 2 2 L-2 3 L-4 6Z" stroke="${ink}" stroke-width=".85" fill="#FFFAEA"/>
  </g>`;
  return `<g data-gear="batting-grip" stroke-linecap="round" stroke-linejoin="round">
    <path d="M61 91 Q64 94 70 97 Q67 105 59 112 Q53 118 48 119 C42 120 39 116 40 112 Q41 103 51 94Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.65"/>
    <path d="M42 110 Q48 116 58 108 L69 98 Q65 108 55 116 Q45 122 42 116Z" fill="${t.skinShadow}"/>
    <path d="M47 110 Q53 106 61 103 L77 98 L83 103 L78 108 Q72 110 67 112 L56 117 Q47 121 44 117" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.6"/>
    <path d="M134 99 Q141 100 146 95 C154 100 154 109 153 117 Q152 126 146 130 Q141 134 135 132 L123 125 L93 105 L96 97 Q111 101 126 109 L138 116 Q139 107 134 99Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.7"/>
    <path d="M96 102 L118 114 Q132 125 142 125 Q148 126 151 119 Q151 131 142 131 Q137 133 128 126Z M140 103 Q147 110 143 117 L138 115Z" fill="${t.skinShadow}"/>
    <path d="M104 104 Q121 110 131 118 M139 120 l5 2" fill="none" stroke="${t.skinHighlight}" stroke-width="1.6"/>
    <g transform="translate(85 102) rotate(54)">
      <path d="M-3 -23 Q0 -26 3 -23 L2 -20 L2 -10 Q3 16 6.5 44 L9 78 Q9.5 85 0 87 Q-10 86 -10 78 L-8 51 Q-3 16 -2 -10 L-2 -20Z" fill="#BC8654" stroke="${ink}" stroke-width="1.45"/>
      <path d="M-6 51 Q-3 32 -1 14 Q-2 48 -4 75 L-7 79Z" fill="#F0C791"/>
      <path d="M1 19 Q2 44 6 66 M1 48 Q4 67 3 76" fill="none" stroke="#99663F" stroke-width=".75"/>
      <ellipse cy="79" rx="9.1" ry="6.1" fill="#E4B481" stroke="${ink}" stroke-width="1.2"/>
      <path d="M-6 79 Q-3 75 3 76 M-4 81 Q0 78 5 79" stroke="#AD7852" fill="none" stroke-width=".9"/>
      <path d="M-3 -21 H3 L3 11 H-3Z" fill="${team.secondary}"/>
      ${battingGlove(-10,true)}${battingGlove(3,false)}
    </g>
  </g>`;
}

export function mangaUniform(t: AthleteAppearance, team: PortraitTeamColors, pose: CardPose, catcher: boolean, uid: string, flipped: boolean, number?: number) {
  const female = t.playerLook === 'female';
  const muscle = { lean: -1.7, balanced: 0, power: 3 }[t.build];
  const width = { lean: .91, balanced: 1, power: 1.12 }[t.build] * (female ? .98 : 1.04);
  const ease = female ? JERSEY_EASE[t.jerseyFit] * .85 : muscle * .7;
  const hem = t.croppedJersey ? 136 : 148;
  const winding = pose === 'windup';
  const glove = pose === 'glove' || pose === 'ready' || winding;
  const high = pose === 'glove';
  const presented = winding || catcher;
  const handY = presented ? 111 : high ? 87 : 138;
  const handX = presented ? 125 : high ? 151 : 154;
  const rally = pose === 'rally';
  const bat = pose === 'bat';
  const scale = `translate(100 0) scale(${width} 1) translate(-100 0)`;
  const farArm = rally
    ? `M68 87 Q63 103 48 114 Q42 121 34 116 Q26 112 29 101 L44 57 L54 62 L45 98 Q54 92 58 83Z`
    : 'M66 88 Q52 91 43 117 Q37 129 39 135 Q42 141 62 149 L68 139 L51 129 Q61 117 69 103Z';
  const farHand = rally ? `<g transform="translate(49 59) rotate(20)">
    <path d="M-7 3 L-11 -5 L-9 -13 Q-8 -17 -4 -14 Q-2 -19 1 -15 Q5 -18 7 -13 Q12 -14 12 -9 L10 -2 L5 5Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.8"/>
    <path d="M-6 -11 l4 4 8 -1 M-2 -13 l3 3 m2 -4 3 3" fill="none" stroke="${t.skinShadow}" stroke-width="1.4"/>
    </g>` : `<g transform="translate(65 143) rotate(-22)">
      <path d="M-9 -4 L-4 -6 Q0 -9 6 -6 L9 -1 L6 6 L0 7 L-8 3Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.7"/>
      ${catcher ? '' : `<circle cx="5" cy="-2" r="6.8" fill="#FFFBED" stroke="${ink}" stroke-width="1.45"/>
      <path d="M1 -7 Q4 -2 1 3 M9 -6 Q6 -2 9 1" fill="none" stroke="#CA4E58" stroke-width="1.05"/>`}
      <path d="M-3 1 Q-1 -2 2 -3 L6 -4 Q8 -3 6 -1 L2 1 L5 0 Q8 0 6 2 L2 5 L-2 5Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.15"/>
    </g>`;
  const pants = `<g data-uniform="pants">
    <path d="M79 148 Q103 154 126 147 Q137 155 139 173 L145 203 L143 226 L119 226 Q118 209 115 198 L100 173 L91 196 L78 223 L51 220 L63 185 Q66 164 79 148Z" fill="${cloth}" stroke="${ink}" stroke-width="2"/>
    <path d="M78 153 Q68 172 67 187 L55 218 M126 152 Q135 164 137 185 L142 208" fill="none" stroke="${team.primary}" stroke-width="2.8"/>
    <path d="M85 156 Q81 166 75 168 M119 154 Q123 164 130 164 M100 156 L98 169" fill="none" stroke="#A49CA7" stroke-width="1.3"/>
    <path d="M99 171 Q92 185 81 191 L85 190 L76 212 L68 220 L79 220Z M104 171 Q112 178 122 185 L119 185 L134 199 L125 195 L132 206 Q122 202 115 190Z" fill="${cool}"/>
  </g>`;
  const far = `<g transform="${scale}" stroke-linejoin="round" stroke-linecap="round">
    ${bat ? '' : winding ? pitchingArm(t) : `<path d="${farArm}" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.9"/>
    <path d="${rally ? 'M33 104 Q32 114 41 113 Q50 111 60 97 Q47 121 38 116 Q30 115 33 104Z' : 'M41 125 Q43 132 50 131 L65 140 L62 146 Q42 138 41 132Z'}" fill="${t.skinShadow}"/>
    ${farHand}`}
    ${t.bottoms === 'pants' ? pants : `<path d="M77 142 Q91 141 101 151 L96 175 Q92 191 70 226 L46 223 Q58 192 65 165Z M108 147 Q127 143 136 156 Q147 181 145 225 L119 224 Q119 191 108 175Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="2"/>
    <path d="M78 170 Q85 174 95 169 L89 185 L73 204 Q79 186 78 170Z M111 172 L128 177 L131 200 Q124 186 120 185Z" fill="${t.skinShadow}"/>
    <g transform="translate(102 148) scale(1.13 1.28)">${uniformBottoms(t.bottoms, team, t.skirtLiner)}</g>`}
  </g>`;
  const top = female
    ? `M80 80 Q88 77 92 76 L111 73 Q128 74 141 86 L132 99 C132 110 130 119 125 126 Q122 130 121 134 L${t.croppedJersey ? 122 : 128} ${hem} Q109 ${hem + 7} ${t.croppedJersey ? 80 : 77} ${hem + 2} Q81 135 77 128 C73 121 66 116 67 108 L68 99 L58 94 Q68 84 80 80Z`
    : `M76 78 L91 75 L110 73 Q128 73 142 83 L146 92 L137 109 Q134 122 126 133 L128 148 Q108 156 78 150 L79 140 Q74 128 66 119 Q60 110 60 99 L56 93 Q62 82 76 78Z`;
  const shield = `<g data-gear="chest-protector">
    <path d="M70 83 L86 78 Q96 90 110 76 L129 78 L141 86 L134 99 L128 98 L125 132 Q107 146 81 136 L75 103 L67 103 L59 94Z" fill="${team.secondary}" stroke="${ink}" stroke-width="2"/>
    <path d="M63 92 L73 84 L81 81 L76 95 L69 99Z M120 80 L131 83 L138 88 L132 96 L123 91Z" fill="${team.primary}" stroke="${ink}" stroke-width="1.4"/>
    <path d="M79 97 Q99 108 124 95 M80 105 Q101 117 125 103 M81 114 Q102 125 124 112 M83 123 Q102 134 122 122" fill="none" stroke="#819CAA" stroke-width="2.4"/>
    <path d="M86 84 Q97 94 111 81" fill="none" stroke="${team.accent}" stroke-width="2.5"/></g>`;
  const body = `<g transform="${scale}" stroke-linejoin="round" stroke-linecap="round">
    ${t.croppedJersey ? `<path data-jersey="cropped" d="M78 128 L126 126 Q119 138 123 144 L129 152 Q104 160 76 153 Q83 139 78 128Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.9"/><path d="M79 135 Q99 141 122 132 L122 138 Q98 146 81 140Z" fill="${t.skinShadow}"/>` : ''}
    <path data-part="jersey-shell" d="${top}" fill="${cloth}" stroke="${ink}" stroke-width="2.1"/>
    <defs><clipPath id="fabric-${uid}"><path d="${top}"/></clipPath></defs>
    <g clip-path="url(#fabric-${uid})" fill="none" stroke="#A5A3B3" stroke-width=".65" opacity=".5">
      <path d="M72 77 Q57 105 76 127 L81 146 M83 77 Q68 106 80 121 L87 149 M105 78 Q110 96 104 117 L102 148 M117 77 Q124 98 118 118 L112 152 M129 78 Q137 102 131 117 L122 150"/>
    </g>
    <g clip-path="url(#fabric-${uid})">
    <path d="M68 101 L76 109 Q73 118 82 123 L90 125 L84 127 L93 135 L82 131 Q73 124 69 117Z M130 99 Q133 113 123 120 L112 124 L122 123 Q116 128 110 132 L120 130 L118 135 L121 134 Q123 123 131 117Z" fill="${cool}"/>
    <path d="M79 ${hem - 5} l8 2 -5 -7 13 9 Q107 ${hem + 1} 124 ${hem - 6} L127 ${hem - 1} Q103 ${hem + 7} 80 ${hem + 1}Z" fill="${cool}"/>
    ${female ? `<path d="M70 109 Q81 ${114 + ease} 88 114 Q78 ${119 + ease} 73 115Z M99 ${123 + ease} Q118 ${119 + ease} 127 111 Q120 ${122 + ease} 108 ${124 + ease}Z" fill="#CEC5C6" opacity=".68"/>
      <path d="M77 109 Q84 ${105 - ease / 2} 91 107 M105 109 Q114 ${104 - ease / 2} 120 105" fill="none" stroke="#FFFDF8" stroke-width="2.8"/>`
      : `<path d="M67 108 Q76 115 89 112 M102 115 Q118 117 133 107 M77 128 l11 9 -4 -8Z" fill="none" stroke="#B8ADB6" stroke-width="1"/>`}
    </g>
    <path d="${winding ? 'M86 80 Q76 76 61 75 Q62 84 55 91 Q61 99 72 98 L83 93Z' : 'M80 81 Q69 78 60 85 L51 98 Q56 104 68 106 L77 98Z'} M117 76 Q132 73 141 83 L148 97 Q142 104 131 103 L122 94Z" fill="${team.primary}" stroke="${ink}" stroke-width="1.9"/>
    <path d="${winding ? 'M64 78 Q65 85 59 92' : 'M54 96 Q62 102 69 101'} M130 99 Q139 101 145 95" fill="none" stroke="${team.accent}" stroke-width="2.3"/>
    <path d="M60 89 L69 83 L64 95Z M127 79 Q139 80 142 89 L132 84Z" fill="#FFF" opacity=".3"/>
    <g data-part="neck">
      ${female ? `<path data-collar="${t.openCollar ? 'open' : 'standard'}" d="M88 61 Q99 62 110 54 L110 70 Q109 75 115 77 Q106 91 94 ${t.openCollar ? 106 : 97} Q88 87 84 78 Q91 75 88 61Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.4"/>`
        : `<path d="M84 78 L91 73 Q101 75 111 72 L115 77 Q106 92 94 97Z" fill="${team.secondary}" stroke="${ink}" stroke-width="1.6"/>
          <path d="M88 61 Q100 63 110 54 L110 73 Q105 80 94 87 L87 79 Q91 74 88 61Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.5"/>`}
      <path d="M89 65 Q99 66 110 58 L109 71 L94 80 L88 78 Q91 73 89 65Z" fill="${t.skinShadow}"/>
    </g>
    ${t.openCollar ? `<path d="M88 82 Q93 83 96 88 L92 86Z M102 87 Q107 83 111 81 L107 86Z M96 101 Q98 96 101 95 L99 99 L96 103Z" fill="${t.skinShadow}"/>` : ''}
    <path d="M84 78 Q88 89 94 ${t.openCollar ? 106 : 97} Q107 88 115 76 M94 ${t.openCollar ? 106 : 97} Q${89 - ease * .4} 109 92 120 Q96 130 95 ${hem + 1}" fill="none" stroke="${team.primary}" stroke-width="1.8"/>
    <g fill="${ink}"><circle cx="93.8" cy="115" r=".95"/><circle cx="96" cy="127" r=".95"/></g>
    <g transform="translate(112 103) rotate(-10) scale(${flipped ? -1 : 1} 1)">
      <text text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-size="13" font-style="italic" font-weight="bold" fill="${team.secondary}">${team.monogram.slice(0, 2)}</text>
      <path d="M-9 7 Q1 5 10 4 L4 7Z" fill="${team.primary}"/></g>
    ${number === undefined || catcher ? '' : `<g transform="translate(114 ${t.croppedJersey ? 130 : 139}) rotate(-6) scale(${flipped ? -1 : 1} 1)"><text text-anchor="middle" font-weight="900" font-family="sans-serif" font-style="italic" font-size="9" fill="${team.primary}" stroke="${team.secondary}" stroke-width=".7" paint-order="stroke">${number}</text></g>`}
    <path d="M76 148 Q102 155 128 148 L129 154 Q103 161 75 154Z" fill="${team.secondary}" stroke="${ink}" stroke-width="1.7"/>
    <path d="M91 151 L99 152 L99 157 L90 156Z" fill="${team.accent}" stroke="${ink}" stroke-width="1.2"/>
    ${catcher ? shield : ''}
  </g>`;
  const near = `<g transform="${scale}" stroke-linejoin="round" stroke-linecap="round">
    ${bat ? contactSwing(t,team) : `<path d="${presented ? `M133 101 L145 97 Q${157 + muscle} 109 160 122 Q163 130 154 132 Q143 132 124 117 L129 108 L149 117 Q139 112 133 101Z`
      : glove ? (high ? `M133 101 Q132 ${110 + muscle} 143 120 Q151 133 158 126 Q165 122 163 111 L158 85 L148 88 L151 111 Q148 106 146 97Z`
      : `M133 101 Q${131 - muscle} 109 141 117 Q146 122 146 129 L147 139 L159 140 L160 129 Q${163 + muscle} 119 155 109 Q152 102 147 97Z`)
      : `M133 103 Q141 103 147 97 Q${155 + muscle} 104 159 119 Q164 127 157 135 L136 147 L129 141 L148 124 Q${139 - muscle} 116 133 103Z`}" fill="${t.skinTone}" stroke="${ink}" stroke-width="2"/>
    <path d="${glove ? 'M139 104 Q145 114 150 113 L147 118 Q141 116 139 104Z' : 'M137 104 Q145 113 148 112 L151 122 L147 120 Q140 115 137 104Z M155 130 L151 136 L136 144 L132 142Z'}" fill="${t.skinShadow}"/>
    ${muscle > 0 ? `<path d="M139 106 Q146 111 148 106 M148 115 l3 4" fill="none" stroke="${t.skinShadow}" stroke-width="1.3"/>` : ''}
    ${glove ? `<g transform="translate(${handX} ${handY}) rotate(${presented ? -22 : high ? -15 : 14}) scale(${catcher ? .98 : winding ? .83 : .70})"><image data-gear="${catcher ? 'catchers-mitt' : 'field-glove'}" href="${catcher ? catchersMitt : fieldGlove}" x="-29" y="-32" width="59" height="58"/></g>`
      : `<path d="M132 138 Q127 136 124 139 L119 143 Q118 146 123 145 L120 150 Q124 153 129 151 L139 144Z" fill="${t.skinTone}" stroke="${ink}" stroke-width="1.5"/><path d="M124 146 l5 -4 m-3 7 5 -4" fill="none" stroke="${t.skinShadow}" stroke-width="1.2"/>`}`}
  </g>`;
  return { far, body, near };
}
