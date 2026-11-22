import type { AthleteAppearance } from './athleteAppearance';

const ink = '#181B2C';

// Drawn around the card's jaw. The three-quarter rig fits the same groom
// to its shorter chin before drawing the animated mouth and any catcher's cage.
export function beardColor(hairColor: string) {
  // Use the root shade for beard mass so vivid dyed hair still reads as hair.
  const rootColor = [1, 3, 5].map((i) => {
    const channel = parseInt(hairColor.slice(i, i + 2), 16);
    return Math.round(channel * 0.70 + 12).toString(16).padStart(2, '0');
  }).join('');
  return /^[0-9a-f]{6}$/i.test(rootColor) ? `#${rootColor}` : hairColor;
}

export const pinkSportsShades = `<g stroke-linejoin="round" stroke-linecap="round">
  <path d="M54 98 Q75 94 93 99 Q100 103 107 99 Q124 94 146 98 L141 110 Q136 116 121 116 Q111 116 106 107 Q100 101 94 107 Q89 117 79 116 Q60 116 58 108Z"
    fill="#CE407C" fill-opacity=".49" stroke="#70203E" stroke-width="2.6"/>
  <path d="M53 97 Q75 93 93 98 Q100 102 107 98 Q128 93 147 97" fill="none" stroke="#FF74A5" stroke-width="4"/>
  <path d="m65 100 10-1-8 9-4-1z m60-1 9-1-9 10-4 1z" fill="#FFCBDD" opacity=".7"/>
</g>`;

export function renderFacialHair({ facialHair: style, hairColor, hairHighlight }: AthleteAppearance) {
  if (style === 'none') return '';
  const whiskers = beardColor(hairColor);
  const chevron = '<path d="M78 128 Q87 118 99 123 Q108 118 120 126 L116 131 Q108 130 100 127 Q90 131 78 128Z"/>';
  let beard: string;
  switch (style) {
    case 'stubble':
      beard = `<path d="M58 126 l2 3 m5 2 1 3 m4 1 2 3 m0 4 2 2 m6 -2 2 3 m4 2 1 2 m7 -4 1 3 m5 1 1 2 m7 -7 0 3 m6 -2 -1 3 m6 -8 -1 3 m6 -8 -1 3 m6 -8 -2 3 m6 -10 -1 3" fill="none" stroke="${whiskers}" stroke-width="2.7"/>`;
      break;
    case 'chevron': beard = chevron; break;
    case 'handlebar':
      beard = '<path d="M68 118 Q69 128 82 123 Q93 117 100 124 Q109 117 119 123 Q131 128 134 118 Q138 134 122 134 Q111 135 100 128 Q88 135 78 133 Q65 132 68 118Z"/>';
      break;
    case 'goatee':
      beard = chevron + `<path d="M88 143 Q98 148 111 142 L108 156 L100 166 L92 159Z"/>
        <path d="M94 150 l4 7 1 -7Z" fill="${hairHighlight}" stroke="none"/>`;
      break;
    case 'shortBeard':
    case 'longBeard': {
      const long = style === 'longBeard';
      const tip = long ? 'L132 150 Q124 167 114 171 L114 165 L102 180 L98 174 L90 178 L80 165 L79 171 Q59 154 54 135'
        : 'Q141 146 123 155 L119 154 Q108 162 99 161 L95 158 L91 160 Q65 153 54 134';
      beard = `<path d="M53 110 Q61 120 67 132 Q79 141 86 136 Q90 144 101 145 Q114 145 118 135 Q129 141 137 127 L145 111 L146 128 ${tip}Z"/>
        <path d="M63 134 Q70 146 83 149 L77 150 Q67 147 63 134Z M121 148 l10 -8 -6 9Z" fill="${hairHighlight}" stroke="none"/>
        ${long ? `<path d="M89 152 Q97 162 101 163 L101 171 Q91 163 89 152Z" fill="${hairHighlight}" stroke="none"/>` : ''}
        <path d="M76 145 l4 4 m4 -2 3 4 m19 3 2 -4 m7 1 2 -3" fill="none" stroke="${hairHighlight}" opacity=".68" stroke-width="1.7"/>
        ${chevron}`;
      break;
    }
  }
  return `<g data-facial-hair="${style}" fill="${whiskers}" stroke="${ink}" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round">${beard}</g>`;
}

export function renderGlasses(shape: AthleteAppearance['glasses'], rig = false) {
  if (shape === 'none') return '';
  const lenses = shape === 'round'
    ? 'M58 103 C58 83 91 83 94 101 C97 124 61 130 58 103Z M106 101 C108 82 141 82 143 102 C146 125 108 126 106 101Z'
    : 'M58 92 Q75 88 92 92 L94 104 Q94 117 82 119 L71 119 Q61 118 59 108Z M106 92 Q126 87 143 91 L141 108 Q138 118 129 118 L118 118 Q108 119 106 107Z';
  const mount = rig ? 'translate(-6 4) scale(1.15 1.12)' : '';
  return `<g data-glasses="${shape}" transform="${mount}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M48 99 L59 96 M94 100 Q100 94 106 99 M142 96 L152 99" fill="none" stroke="${ink}" stroke-width="4"/>
    <path d="${lenses}" fill="#A8EFFF" fill-opacity=".09" stroke="${ink}" stroke-width="3.6"/>
    <path d="M62 94 Q73 90 81 92 M112 93 Q124 89 133 91" fill="none" stroke="#B5DAE0" stroke-width="1.6"/>
    <path d="M65 101 l6 -6 M133 113 l4 -5" stroke="#FFF" opacity=".8" stroke-width="2"/>
  </g>`;
}
