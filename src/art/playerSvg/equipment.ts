import type { PortraitTeamColors } from '../portraits/types';
import type { MiniPlayerFacing } from './miniPlayerPose';

const ink = '#181B2C';
const binding = '#F7C783';

export function renderGlove(
  x: number, y: number, uid: string, left: boolean, facing: MiniPlayerFacing, catcher: boolean, caught: boolean,
): string {
  const front = facing === 'front';
  // Thumb and web sit on the inboard edge. Leave real air between the web rails.
  const fieldGlove = `
    <path d="M-14 12 Q-22 6 -23 -7 L-24 -16 Q-23 -22 -19 -20 L-14 -10 L-18 -24 Q-18 -29 -13 -27 L-7 -13 L-11 -29 Q-9 -34 -5 -30 L1 -14 L-2 -29 Q1 -34 5 -29 L10 -9 Q15 -12 17 -18 Q22 -23 25 -17 Q26 -10 20 0 L12 13 Q0 22 -14 12Z" fill="url(#mitt-${uid})" stroke="${ink}" stroke-width="3.5"/>
    <path d="M5 -25 Q12 -23 22 -24 M8 -15 Q14 -12 21 -16 M12 -24 L15 -14" fill="none" stroke="#653419" stroke-width="4.1"/>
    <path d="M6 -25 Q13 -23 21 -24 M12 -22 l2 6 M-19 -16 l3 8 M-13 -22 l4 10 M-6 -26 l4 11" fill="none" stroke="${binding}" stroke-width="2.4"/>
    ${front ? `<path d="M-16 -5 Q-6 -13 6 -8 Q10 -4 13 -9 Q10 1 4 7 Q-8 11 -16 -5Z" fill="#824123"/>
      <path d="M-13 -5 Q-4 -10 3 -7 M-11 5 Q-5 12 3 11" fill="none" stroke="#D38A49" stroke-width="2.1"/>`
    : `<path d="M-16 -7 Q-13 0 -8 3 M-9 -12 Q-6 -1 -1 2 M-3 -13 Q0 -3 5 0" fill="none" stroke="#854323" stroke-width="2.5"/>
      <path d="M-10 6 Q2 0 11 3 L7 12 L-7 14Z" fill="#68351F" stroke="${ink}" stroke-width="2.6"/>
      <path d="M-7 8 L7 5" stroke="${binding}" stroke-width="2"/>`}`;
  const catchersMitt = `
    <path d="M-19 12 C-30 1 -28 -18 -16 -27 Q-4 -34 5 -29 Q10 -26 9 -17 L16 -13 Q19 -22 24 -21 Q32 -18 28 -6 C26 5 17 16 6 20 Q-9 23 -19 12Z" fill="url(#mitt-${uid})" stroke="${ink}" stroke-width="4"/>
    <path d="M13 -11 Q21 -17 25 -14 Q27 -7 19 1 Q23 -8 13 -7Z" fill="#F3AB61"/>
    <path d="M-20 4 C-26 -13 -16 -26 -2 -27 Q7 -27 11 -21" fill="none" stroke="${binding}" stroke-width="3.3"/>
    ${front ? `<path d="M-16 3 Q-21 -13 -8 -20 Q2 -24 11 -15 Q18 -10 20 -14 Q18 -1 8 8 Q-5 17 -16 3Z" fill="#793A22" stroke="#AC622F" stroke-width="2.8"/>
      <path d="M-11 -10 Q-3 -20 6 -14" fill="none" stroke="#C27D46" stroke-width="2.6"/>`
    : `<path d="M-19 -6 Q-19 -18 -9 -21 M-12 -2 Q-13 -15 -3 -20 M-5 0 Q-5 -13 3 -17" fill="none" stroke="#995228" stroke-width="3"/>
      <path d="M-11 7 Q1 -2 15 0 L13 8 Q2 16 -9 14Z" fill="#6B391F" stroke="${ink}" stroke-width="2.6"/>`}
    <path d="M9 -23 l11 5 M10 -18 l9 4 M15 -22 l-2 6 M-21 -9 l4 -2 m-5 8 l4 -2 m-3 8 l4 -3 M19 3 l4 2 m-8 3 l4 2" fill="none" stroke="#F2B475" stroke-width="2.8"/>`;

  return `<g data-gear="${catcher ? 'catchers-mitt' : 'field-glove'}" transform="translate(${x} ${y}) scale(${left ? 1 : -1} 1)" stroke-linejoin="round" stroke-linecap="round">
    ${catcher ? catchersMitt : fieldGlove}
    ${caught && front ? `<circle cy="-3" r="8.6" fill="url(#ball-${uid})" stroke="${ink}" stroke-width="2.3"/>
      <path d="M-5 -9 Q0 -4 -5 2 M4 -9 Q0 -4 4 3" fill="none" stroke="#DC4652" stroke-width="1.8"/>` : ''}
    <path d="M-13 8 Q-6 15 1 11 Q11 5 17 -5 Q20 -9 23 -9 Q22 -2 17 5 Q11 16 3 18 Q-7 20 -15 13Z" fill="#B66732" stroke="#603521" stroke-width="2.2"/>
    <path d="M-9 13 l-1 3 m5 -2 v3 m5 -4 l1 3 m4 -5 l2 3" fill="none" stroke="${binding}" stroke-width="2.2"/>
  </g>`;
}

export function legGuard(x: number, y: number, team: PortraitTeamColors, facing: MiniPlayerFacing) {
  return `<g data-gear="leg-guard" transform="translate(${x} ${y})" stroke-linejoin="round">
    ${facing === 'front' ? `<path d="M-10 7 Q0 1 10 7 L8 23 L12 27 Q4 33 -10 29 L-7 22Z" fill="${team.secondary}" stroke="${ink}" stroke-width="3"/>
      <path d="M-9 8 Q-12 -3 0 -4 Q12 -3 10 7 L3 13 Q-4 14 -9 8Z" fill="${team.primary}" stroke="${ink}" stroke-width="3"/>
      <path d="M-5 0 Q0 -2 5 1 M-3 16 L-3 23 L2 25" fill="none" stroke="#BDD5DA" stroke-width="2.4"/>`
    : `<path d="M-11 2 L-7 1 L-6 22 L-10 25Z M8 1 L12 3 L10 24 L6 21Z" fill="${team.primary}" stroke="${ink}" stroke-width="2.6"/>
      <path d="M-10 7 Q0 11 10 7 M-8 18 Q0 21 8 18" fill="none" stroke="${ink}" stroke-width="4"/>
      <path d="M4 7 h4 M3 18 h4" stroke="#BDD5DA" stroke-width="2.4"/>`}
  </g>`;
}

export function chestProtector(team: PortraitTeamColors) {
  return `<g data-gear="chest-protector" stroke-linejoin="round">
    <path d="M96 151 L107 148 Q119 160 131 149 L143 151 L154 162 L149 173 L140 171 L140 191 Q120 205 97 192 L96 172 L87 174 L84 165Z" fill="${team.secondary}" stroke="${ink}" stroke-width="4"/>
    <path d="M93 158 L103 154 L100 166 L90 168Z M136 154 L143 157 L149 166 L139 165Z" fill="${team.primary}" stroke="${ink}" stroke-width="2.5"/>
    <path d="M103 168 Q119 174 135 167 M102 176 Q119 183 136 175 M103 184 Q120 191 135 182" fill="none" stroke="#94ADB9" stroke-width="3.6"/>
    <path d="M107 159 Q118 166 129 159" fill="none" stroke="${team.accent}" stroke-width="2.8"/>
  </g>`;
}

export function catcherMask(uid: string, team: PortraitTeamColors, facing: MiniPlayerFacing) {
  if (facing === 'back') return `<g data-gear="mask-harness" fill="none" stroke-linejoin="round">
    <path d="M56 88 Q119 101 181 86 M89 48 Q90 72 110 96 L103 121 M150 47 Q145 76 127 97 L135 120" stroke="${ink}" stroke-width="7"/>
    <path d="M55 103 Q77 122 109 124 L129 125 Q157 123 180 106" stroke="${ink}" stroke-width="6"/>
    <path d="M104 88 Q119 92 133 88 L129 105 Q118 110 108 104Z" fill="${team.secondary}" stroke="#A8BDC4" stroke-width="2.6"/>
    <path d="M58 98 l-4 18 9 13 M178 97 l6 19 -7 12" stroke="#C6D5D6" stroke-width="4"/>
  </g>`;
  const bars = 'M53 89 Q110 74 174 88 L170 117 Q158 146 119 155 Q78 155 58 130Z M58 121 Q108 135 170 116 M66 134 Q108 149 162 130 M78 126 L88 146 M145 124 L137 148';
  return `<g data-gear="mask" stroke-linejoin="round">
    <path d="M49 88 Q106 70 174 84 L172 95 Q113 82 56 98Z M56 101 L66 108 L70 130 L60 126Z M167 102 L176 95 L174 124 L163 133Z" fill="url(#capbase-${uid})" stroke="${ink}" stroke-width="3.6"/>
    <path d="${bars}" fill="none" stroke="${ink}" stroke-width="6.5"/>
    <path d="${bars}" fill="none" stroke="#C3D5D8" stroke-width="2.6"/>
    <path d="M88 146 Q110 153 139 143 L134 153 Q111 165 93 156Z" fill="${team.secondary}" stroke="${ink}" stroke-width="3.5"/>
    <path d="M102 153 Q113 157 125 151" fill="none" stroke="${team.accent}" stroke-width="2.5"/>
  </g>`;
}
