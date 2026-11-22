import type { PortraitTeamColors, SkirtLiner, UniformBottoms } from './types';

const ink = '#181B2C';

// Local origin is the middle of the belt. The card uses a longer fashion
// drawing and the rig uses the same cut at its articulated hips.
export function uniformBottoms(cut: UniformBottoms, team: PortraitTeamColors, liner: SkirtLiner, rear = false, sway = 0) {
  if (cut === 'skirt') {
    const shortLeg = liner === 'shorts';
    return `<g data-uniform="skirt" stroke-linejoin="round">
      <g data-underlayer="${liner}">
        <path d="${shortLeg ? 'M-23 7 Q0 10 23 7 L26 26 Q15 30 4 28 L0 17 L-4 28 Q-17 30 -26 26Z' : 'M-23 5 Q0 9 23 5 L25 15 Q15 17 7 26 Q0 29 -7 26 Q-15 17 -25 15Z'}" fill="${team.secondary}" stroke="${ink}" stroke-width="2.7"/>
        <path d="${shortLeg ? 'M-24 25 Q-17 28 -7 26 M7 26 Q17 28 24 25' : 'M-23 14 Q-14 16 -7 24 M7 24 Q14 16 23 14'}" fill="none" stroke="${team.accent}" stroke-width="2"/>
      </g>
      <g transform="skewX(${sway})">
        <path d="M-23 0 Q0 6 23 0 Q25 10 33 21 Q23 26 14 24 Q4 29 -6 25 Q-17 28 -24 24 L-33 22 Q-26 11 -23 0Z" fill="${team.primary}" stroke="${ink}" stroke-width="3.2"/>
        <path d="M-16 5 Q-17 16 -25 23 L-18 24Z M-3 7 L-8 25 L-3 25Z M13 5 L14 24 L21 23Z" fill="${team.secondary}"/>
        <path d="M-28 20 Q-11 26 -5 22 Q4 26 14 22 Q22 24 29 20" fill="none" stroke="#FFF1D4" stroke-width="1.6"/>
      </g>
    </g>`;
  }
  const shorts = cut === 'shorts';
  const hem = shorts ? 24 : 44;
  return `<g data-uniform="${cut}" stroke-linejoin="round">
    <path d="M-22 0 Q0 6 22 0 Q29 9 30 ${hem - 2} Q18 ${hem + 3} 3 ${hem} L0 14 L-4 ${hem} Q-17 ${hem + 4} -30 ${hem - 2} Q-28 9 -22 0Z" fill="#F9EFDC" stroke="${ink}" stroke-width="3"/>
    <path d="M-21 3 Q-24 14 -26 ${hem - 2} M22 3 Q26 13 26 ${hem - 2}" fill="none" stroke="${team.primary}" stroke-width="3.2"/>
    <path d="${rear ? 'M-18 7 l11 1 -1 7 -8 -1Z M7 8 l11 -1 -2 7 -8 1Z' : 'M-21 4 q1 6 -4 9 M20 4 q-1 6 5 9 M2 5 l-1 7'}" fill="none" stroke="#B7A68E" stroke-width="1.6"/>
    ${shorts ? `<path d="M-28 19 Q-16 24 -5 20 M5 20 Q16 23 28 19" fill="none" stroke="#CAAE92" stroke-width="1.5"/>` : ''}
  </g>`;
}
