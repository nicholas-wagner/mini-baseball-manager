import type { HairAccessory, HairStyle } from './types';

const ink = '#181B2C';

function hairTie(x: number, y: number, trim: HairAccessory, band: string) {
  let cloth: string;
  if (trim === 'ribbon') {
    cloth = `<path d="M0 0 Q-14 -14 -16 -5 L-11 3 L-3 3 L-10 16 L-3 12 L2 4 L6 15 L10 11 L5 2 Q16 0 15 -10 Q6 -11 0 0Z"/>`;
  } else if (trim === 'scrunchie') {
    cloth = `<path d="M-8 4 Q-12 0 -8 -4 Q-9 -9 -3 -8 Q1 -12 5 -8 Q12 -7 9 -2 Q13 3 7 5 Q4 10 0 7 Q-6 10 -8 4Z"/>
      <path d="M-5 -3 l3 -2 M3 -5 l2 2" stroke="#FFF5D4" stroke-width="2.3"/>`;
  } else {
    cloth = '<path d="M-7 -4 Q0 -9 6 -5 L8 1 Q1 5 -4 6Z"/>';
  }
  return `<g data-hair-accessory="${trim}" transform="translate(${x} ${y})" fill="${band}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round">${cloth}</g>`;
}

export function isLongCut(style: HairStyle) {
  return style === 'ponytail' || style === 'braid' || style === 'waves' || style === 'pigtails';
}

export function longHair(style: HairStyle, color: string, light: string, accent: string, trim: HairAccessory) {
  let locks: string;
  if (style === 'waves') {
    locks = `<path d="M49 72 Q60 41 105 43 Q150 42 155 79 Q162 99 153 116 Q151 132 163 142 Q174 153 165 166 Q161 177 173 181 Q158 185 150 170 Q146 183 154 191 Q136 188 132 171 Q124 163 129 146 Q103 134 76 146 Q83 161 72 174 Q61 184 63 192 Q44 188 48 170 Q38 184 26 177 Q39 166 32 153 Q26 143 38 126 Q48 115 42 98Z"/>
      <path d="M46 120 Q48 132 40 144 Q37 149 40 155 Q45 146 51 140 Q55 130 51 118Z M144 118 Q143 135 155 146 Q163 153 160 158 Q159 151 149 145 Q138 134 144 118Z" fill="${light}" stroke="none"/>
      <path d="M52 151 Q60 160 52 174 M144 153 Q138 166 146 178" fill="none" stroke="${light}" stroke-width="2.5"/>`;
  } else if (style === 'braid') {
    locks = `<path d="M142 96 Q147 79 159 82 Q175 85 171 99 Q179 104 174 115 Q184 123 177 133 Q185 143 175 150 Q180 160 170 165 L167 169 Q170 178 181 181 Q165 184 159 177 Q155 172 159 165 Q150 159 155 149 Q146 142 152 133 Q144 125 151 115 Q142 108 147 100Z"/>
      <path d="M155 93 Q167 95 172 104 M150 104 Q155 112 173 118 M154 118 Q166 121 176 133 M154 134 Q163 137 175 149 M157 149 Q163 153 170 158" fill="none" stroke="${ink}" stroke-width="2.7"/>
      <path d="M158 99 q6 1 10 6 M158 116 q7 2 10 7 M158 132 q6 2 9 7 M160 148 l6 5" stroke="${light}" stroke-width="3.8" fill="none"/>
      ${hairTie(164,164,trim,accent)}`;
  } else {
    const tail = `<path d="M145 92 C151 75 174 73 179 91 C188 111 172 126 181 147 Q185 158 196 158 Q188 171 176 161 Q178 175 188 180 Q169 179 163 163 Q156 153 162 132 Q158 142 152 145 Q158 129 155 112 Q157 99 146 101Z"/>
      <path d="M158 88 Q173 77 176 95 Q178 105 173 116 Q176 93 165 95Z M170 137 Q166 154 178 164 Q164 160 165 145Z" fill="${light}" stroke="none"/>
      ${hairTie(158,91,trim,accent)}`;
    locks = style === 'pigtails'
      ? `<g transform="translate(205 19) scale(-1 .89)">${tail}</g><g transform="translate(-3 11) scale(1 .96)">${tail}</g>`
      : tail;
  }
  return `<g data-hair="${style}" fill="${color}" stroke="${ink}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${locks}</g>`;
}

export function hairband(color: string) {
  return `<g data-hair-accessory="headband"><path d="M49 83 Q98 67 151 81 L150 92 Q99 77 50 95Z" fill="${color}" stroke="${ink}" stroke-width="2.8"/>
    <path d="M60 82 Q91 70 123 75" fill="none" stroke="#FFF7D5" stroke-width="2.2"/></g>`;
}

// Temple locks stay outside the eyes as the cap, frames and expression change.
export function templeLocks(style: HairStyle, color: string, light: string) {
  if (style !== 'bob' && !isLongCut(style)) return '';
  const bob = style === 'bob';
  const sweep = style === 'waves' || style === 'ponytail';
  const lock = bob
    ? 'M49 76 Q45 98 49 116 Q50 128 61 137 Q57 119 61 106 Q64 93 62 80Z'
    : sweep
      ? 'M51 78 Q45 91 47 106 Q48 119 57 124 Q51 114 56 104 Q63 92 61 80Z'
      : 'M50 80 Q46 94 50 105 Q53 112 57 114 Q55 106 59 97 L62 81Z';
  const shine = bob ? 'M51 91 Q48 109 55 123 Q52 111 57 94Z'
    : 'M52 86 Q48 95 51 103 Q51 96 56 87Z';
  const strand = `<path d="${lock}" fill="${color}" stroke="${ink}" stroke-width="2.8"/>
    <path d="${shine}" fill="${light}"/>`;
  return `<g stroke-linejoin="round">${strand}<g transform="translate(200 5) scale(-1 .94)">${strand}</g></g>`;
}
