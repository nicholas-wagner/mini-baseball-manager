import type { AthleteAppearance } from './athleteAppearance';
import { beardColor } from './faceDetails';
import type { PortraitMood } from './types';

const ink = '#252134';
export const CARD_EXPRESSIONS = ['delighted', 'playful', 'composed', 'confident', 'intense', 'dreamy'] as const;
type CardExpression = typeof CARD_EXPRESSIONS[number] | 'rival' | 'startled' | 'nervous';

export function cardExpression(mood: PortraitMood, natural: typeof CARD_EXPRESSIONS[number]): CardExpression {
  const override = { fired_up: 'intense', determined: 'confident', rival_glare: 'rival', shocked: 'startled', sweating: 'nervous' } as const;
  return mood === 'happy' ? natural : override[mood];
}

function mangaEye(x: number, y: number, far: boolean, traits: AthleteAppearance, emotion: CardExpression, uid: string) {
  const feminine = traits.playerLook === 'female';
  const sharp = emotion === 'intense' || emotion === 'rival' || emotion === 'confident';
  const easy = emotion === 'dreamy' || emotion === 'composed' || traits.eyeStyle === 'chill';
  const height = (feminine ? 1.06 : .88) * (sharp || easy ? .85 : 1);
  const brow = sharp ? 'M-13 -16 Q-5 -17 11 -10 L12 -8 Q-5 -12 -13 -13Z'
    : 'M-13 -13 Q-1 -23 12 -16 Q0 -19 -11 -11Z';
  const wink = !far && (emotion === 'playful' || traits.eyeStyle === 'wink' && emotion === 'delighted') && traits.glasses === 'none';
  const sclera = 'M-14 1 Q-9 -11 1 -11 Q11 -11 15 -6 Q12 7 2 9 Q-8 11 -14 1Z';
  const id = 'eye-' + (far ? 'far-' : 'near-') + uid;
  return `<g transform="translate(${x} ${y}) scale(${far ? .83 : 1.06} ${height}) rotate(${far ? 5 : -4})">
    <path d="${brow}" transform="${far ? '' : 'scale(-1 1)'}" fill="${ink}" stroke="${ink}" stroke-width="${feminine ? .65 : 2.4}"/>
    ${wink ? `<path d="M-14 3 Q-2 -11 15 -3 Q2 -5 -12 5Z" fill="${ink}"/>` : `
    <defs><clipPath id="${id}"><path d="${sclera}"/></clipPath></defs>
    <path d="${sclera}" fill="#FFFCF5"/>
    <g clip-path="url(#${id})">
      <ellipse cx="-1" cy="-1" rx="9.2" ry="12" fill="${traits.irisColor}" stroke="${ink}" stroke-width="1.5"/>
      <path d="M-11 -10 H9 L7 -3 Q-2 -7 -9 -1Z" fill="${ink}" opacity=".65"/>
      <ellipse cx="-1" cy="-.5" rx="3.7" ry="6.8" fill="${ink}"/>
      <path d="M-7 4 Q-3 9 5 4 L3 8 L-3 10Z" fill="#F7D797" opacity=".83"/>
      <ellipse cx="-4" cy="-5" rx="3.7" ry="3" fill="white"/>
      <circle cx="4.5" cy="4" r="1.6" fill="white"/>
    </g>
    <path d="M-14 2 Q-11 -10 0 -12 Q11 -14 16 -8 L19 -10 L16 -5 Q10 -10 3 -10 Q-7 -10 -14 2Z" fill="${ink}"/>
    ${feminine && !far ? `<path d="M12 -9 l6 -7 -2 7 6 -4 -4 7Z" fill="${ink}"/>` : ''}
    <path d="M-13 3 Q-8 9 -3 9 M7 8 L12 5" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`}
  </g>`;
}

function mangaMouth(emotion: CardExpression, traits: AthleteAppearance) {
  if (emotion === 'rival') return `<path d="M74 137 Q81 134 90 135 L98 134" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M86 140 l9 -2 M68 135 l2 -3" fill="none" stroke="${traits.skinShadow}" stroke-width="1.9"/>`;
  if (emotion === 'intense') return `<path d="M75 132 Q85 126 101 126 L105 130 Q103 139 92 145 Q84 146 79 142Z" fill="#713342" stroke="${ink}" stroke-width="2.3"/>
    <path d="M78 132 Q88 127 101 128 L100 132 Q87 132 80 135Z" fill="#FFFCF2"/>
    <path d="M85 142 Q93 137 99 137 Q92 144 87 144Z" fill="#ED8C92"/>`;
  if (emotion === 'composed' || emotion === 'dreamy' || emotion === 'nervous') {
    return `<path d="${emotion === 'nervous' ? 'M78 139 Q87 134 98 137' : 'M77 137 Q87 140 99 134'}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M85 143 q6 1 11 -2" fill="none" stroke="${traits.skinShadow}" stroke-width="2"/>`;
  }
  if (emotion === 'startled') return `<ellipse cx="88" cy="138" rx="7" ry="9" fill="#663044" stroke="${ink}" stroke-width="2.2"/>`;
  const broad = emotion === 'delighted' || emotion === 'playful';
  const mouth = broad ? 'M73 132 Q88 136 107 126 Q101 148 87 147 Q77 147 73 132Z'
    : 'M74 133 Q89 136 104 128 Q99 140 84 140 Q78 139 74 133Z';
  return `<path d="${mouth}" fill="#6C3040" stroke="${ink}" stroke-width="2.2"/>
    <path d="M76 133 Q90 135 103 129 L99 134 Q88 139 79 136Z" fill="#FFFCF3"/>
    ${broad ? '<path d="M82 144 Q90 139 97 140 Q91 147 84 146Z" fill="#F48A90"/>' : ''}
    ${emotion === 'playful' && traits.mouthStyle === 'bubblegum' ? '<circle cx="76" cy="138" r="10" fill="#F690B5" stroke="#743950" stroke-width="2"/><path d="M70 135 q2 -5 6 -4" fill="none" stroke="white" stroke-width="2"/>' : ''}`;
}

// All face furniture uses these same socket centers in three-quarter view.
const sockets = { far: {x: 68, y: 102}, near: {x: 112, y: 101} };

function mangaFrames(shape: AthleteAppearance['glasses']) {
  if (shape === 'none') return '';
  const lens = shape === 'round'
    ? 'M-18 -1 C-18 -21 17 -22 18 -3 C20 17 -15 22 -18 -1Z'
    : 'M-18 -11 Q0 -16 18 -11 L16 4 Q14 13 6 15 L-8 14 Q-16 13 -17 5Z';
  const glass = (socket: typeof sockets.near, width: number) => `<g transform="translate(${socket.x} ${socket.y}) scale(${width} .93)">
    <path d="${lens}" fill="#B6E8F0" fill-opacity=".09" stroke="${ink}" stroke-width="2.7"/>
    <path d="M-13 -9 Q-7 -13 1 -12 M9 9 l3 -4" fill="none" stroke="#D5E4E8" stroke-width="1.5"/>
  </g>`;
  return `<g data-glasses="${shape}" stroke-linecap="round">
    <path d="M51 101 l4 -3 M82 101 Q87 96 94 99 M130 99 L148 96" fill="none" stroke="${ink}" stroke-width="2.8"/>
    ${glass(sockets.far,.83)}${glass(sockets.near,1.04)}</g>`;
}

function mangaBeard(t: AthleteAppearance) {
  const style = t.facialHair;
  if (style === 'none') return '';
  const base = beardColor(t.hairColor);
  const moustache = style === 'handlebar'
    ? 'M62 125 Q65 133 74 129 Q81 124 87 128 Q92 124 101 127 Q111 132 116 122 Q116 135 105 136 Q96 136 87 131 Q80 135 72 136 Q62 137 62 125Z'
    : 'M70 132 Q75 126 82 126 L87 128 Q94 123 101 126 L109 130 Q99 132 88 130 Q79 134 70 132Z';
  const stubble = 'M55 123 l1 3 m3 2 1 3 m3 3 1 3 m4 2 1 3 m4 2 2 3 m6 0 2 3 m7 -2 1 3 m6 -4 0 3 m7 -6 -1 3 m7 -7 -1 3 m8 -9 -2 4 m8 -11 -2 4 m7 -10 -2 4 m6 -11 -1 4';
  const beard = style === 'shortBeard' || style === 'longBeard';
  return `<g data-facial-hair="${style}" fill="${base}" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round">
    ${beard ? `<path d="M50 113 Q55 128 66 137 Q74 143 77 137 Q82 149 92 147 Q101 145 104 137 Q113 142 126 130 L142 109 L141 126 Q133 145 118 153
      ${style === 'longBeard' ? 'L104 169 L104 165 L92 179 L89 173 L83 177 L78 166 Q62 157 56 139' : 'Q106 159 96 163 L90 165 L80 162 Q61 152 54 137'}Z"/>
      <path d="M59 135 q7 13 14 16 l-6 -3Z M119 143 l11 -11 -5 9Z M85 154 q7 6 12 2 l-6 6Z" fill="${t.hairHighlight}" stroke="none"/>` : ''}
    ${style === 'goatee' ? `<path d="M80 149 Q88 152 101 146 L98 160 L90 168 L84 161Z"/><path d="M86 154 l5 6 2 -7Z" fill="${t.hairHighlight}" stroke="none"/>` : ''}
    ${style === 'stubble' ? `<path d="${stubble}" fill="none" stroke="${base}" stroke-width="2.1" stroke-linecap="round"/>` : `<path d="${moustache}"/>`}
  </g>`;
}

export function mangaFace(traits: AthleteAppearance, emotion: CardExpression, uid: string) {
  const female = traits.playerLook === 'female';
  const broad = traits.headShape === 'square' || traits.headShape === 'chubby';
  const jaw = female
    ? `Q148 114 139 129 Q130 ${broad ? 146 : 142} 96 158 Q89 162 83 158 C66 149 53 138 50 121 Q48 113 48 108`
    : `Q149 112 143 126 L${broad ? 137 : 132} 140 Q126 148 105 158 Q96 164 85 160 L65 147 Q52 135 50 121 L48 109`;
  const cheek = `M51 88 Q50 48 103 45 Q147 43 151 90 ${jaw}Z`;
  return `<g stroke-linejoin="round" stroke-linecap="round">
    <defs>
      <radialGradient id="complexion-${uid}" cx=".37" cy=".50" r=".76">
        <stop stop-color="${traits.skinHighlight}"/><stop offset=".30" stop-color="${traits.skinTone}"/>
        <stop offset=".68" stop-color="${traits.skinTone}"/><stop offset="1" stop-color="${traits.skinShadow}"/>
      </radialGradient>
      <clipPath id="jaw-${uid}"><path d="${cheek}"/></clipPath>
    </defs>
    <path d="${cheek}" fill="url(#complexion-${uid})" stroke="${ink}" stroke-width="2.2"/>
    <g clip-path="url(#jaw-${uid})">
    <path d="M146 86 Q147 114 132 131 L121 135 Q129 129 133 116 Q137 101 135 92Z M47 104 Q53 116 58 117 Q55 125 62 134 L55 130Z" fill="${traits.skinShadow}" opacity=".55"/>
    <path d="M48 90 Q89 72 148 82 L143 101 Q140 97 138 93 Q122 94 115 90 L119 86 Q101 88 94 96 Q88 102 86 111 L82 116 Q83 107 83 98 Q76 92 68 96 L52 102Z" fill="${traits.skinShadow}" opacity=".65"/>
    <path d="M145 104 Q140 129 128 139 L97 157 Q90 162 84 157 L68 147 Q81 163 91 163 Q117 154 137 136 L145 119Z" fill="${traits.skinShadow}"/>
    <path d="M101 116 Q111 112 125 113 L117 117 L107 120Z M62 112 l6 1 -7 3Z" fill="${traits.skinHighlight}" opacity=".53"/>
    <path d="M82 149 Q90 152 98 147 L95 152 L88 155Z" fill="${traits.skinHighlight}" opacity=".52"/>
    </g>
    <path d="M140 101 Q151 88 157 97 Q163 108 149 119 L140 121Z" fill="${traits.skinTone}" stroke="${ink}" stroke-width="2.8"/>
    <path d="M148 103 Q157 98 151 110 L146 114" fill="none" stroke="${traits.skinShadow}" stroke-width="2.8"/>
    <path d="M56 114 Q63 116 68 112 M113 117 Q123 120 131 113" fill="none" stroke="#DE7B7F" stroke-width="${female ? 4 : 2.5}" opacity=".42"/>
    <path d="M57 116 l2 -3 m3 4 2 -3 M117 119 l2 -4 m3 4 2 -4 m3 3 2 -4" fill="none" stroke="#AC6569" stroke-width="1.2" opacity=".7"/>
    ${mangaBeard(traits)}
    ${mangaEye(sockets.far.x,sockets.far.y,true,traits,emotion,uid)}
    ${mangaEye(sockets.near.x,sockets.near.y,false,traits,emotion,uid)}
    <path d="M84 103 Q83 114 77 119 L83 123 L89 121 Q85 125 80 125 L74 121Z" fill="${traits.skinShadow}" opacity=".78"/>
    <path d="M82 112 Q81 117 ${female ? '77.5 119.5' : '75 120.5'} Q76 122 80 123" fill="none" stroke="${ink}" stroke-width="${female ? 1.2 : 1.55}"/>
    <path d="M85 123 l3 -1" stroke="${ink}" stroke-width="1.45"/>
    <path d="M81 118 l2 -5" stroke="${traits.skinHighlight}" stroke-width="2"/>
    <g transform="translate(87 136) scale(.82 .86) translate(-88 -136)">${mangaMouth(emotion,traits)}</g>
    ${mangaFrames(traits.glasses)}
    ${emotion === 'nervous' ? '<path d="M135 103 Q145 116 139 119 Q130 121 135 103Z" fill="#4CC3FF" stroke="#48576C" stroke-width="1.8"/>' : ''}
  </g>`;
}

// Ink taper and broken bands of sky-light across the bangs, above the lashes.
export function visorSpikes(t: AthleteAppearance) {
  return `<g stroke-linejoin="round">
    <path d="M48 91 Q43 80 46 67 L40 70 Q45 56 56 51 L51 50 Q63 39 78 40 Q74 35 77 30 Q82 37 91 37 Q101 36 104 26 L106 34 Q116 26 124 21 Q121 33 117 36 Q132 31 139 34 L134 39 Q146 41 150 49 L147 50 Q157 55 159 69 L155 67 Q156 83 148 98 L141 83 Q128 76 116 77 L99 83 L104 76 Q88 81 78 91 L81 80 Q63 85 53 98 L54 87Z" fill="${t.hairColor}" stroke="${ink}" stroke-width="2.1"/>
    <path d="M49 65 Q58 50 80 45 Q70 50 64 57 L69 55 L57 65Z M76 54 Q91 42 104 40 L95 49 L101 46 Q95 52 84 56Z M110 46 Q128 34 138 36 Q126 40 119 47Z M143 49 Q152 54 155 63 L149 57Z" fill="${t.hairHighlight}"/>
    <path d="M52 59 Q62 47 73 45 M83 46 Q89 41 97 40 M119 41 l8 -4" fill="none" stroke="#FFF2D3" stroke-width=".85" opacity=".8"/>
  </g>`;
}

export function mangaFringe(t: AthleteAppearance) {
  const cut = t.hairStyle;
  const parted = ['ponytail', 'braid', 'waves', 'sideSweep'].includes(cut);
  const blunt = cut === 'bob' || cut === 'pigtails';
  if (!parted && !blunt) return '';
  const edge = blunt
    ? 'M48 72 Q97 54 150 73 Q154 99 143 116 Q144 100 138 87 L132 93 L129 83 L123 92 L117 92 L116 82 L109 93 L99 96 L103 83 Q91 96 81 98 L86 86 L75 95 L71 87 L62 94 Q58 105 60 114 Q46 103 48 72Z'
    : 'M49 73 Q96 51 148 73 Q155 89 144 107 Q145 94 138 84 L130 95 L133 85 Q119 96 100 99 Q114 90 115 81 Q104 94 79 101 L87 92 Q75 98 62 99 Q55 102 56 110 Q51 102 51 92 L47 96Z';
  return `<g stroke-linejoin="round">
    <path d="${edge}" fill="${t.hairColor}" stroke="${ink}" stroke-width="2.6"/>
    <path d="${blunt ? 'M55 83 L66 78 L61 87 L54 91Z M70 77 L77 76 L72 85 L68 86Z M84 75 L95 73 L90 82 L82 86Z M120 74 L129 75 L125 82 L120 81Z' : 'M55 87 Q79 82 95 73 L86 81 L89 80 Q73 91 56 94Z M97 82 L110 75 L105 82 L97 86Z M123 79 L136 74 L131 81 L122 84Z'}" fill="${t.hairHighlight}"/>
    <path d="M63 89 l7 -3 m55 -7 6 -3" stroke="#FFF3DB" stroke-width="1.2" opacity=".8"/>
  </g>`;
}
