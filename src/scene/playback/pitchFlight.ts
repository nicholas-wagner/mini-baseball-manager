import type { PitchType } from '../../engine/models/player';
import type { ThrowsHand } from '../../engine/handedness/types';
import type { Vec3 } from '../camera/cameraRig';

export interface PitchFlight {
  pitchType: PitchType;
  mph: number;
}

export interface PitchTrailVisual {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly trailStrength: number;
  readonly trailLengthScale: number;
  /** Multiplier on the baseball's normal seam rotation. */
  readonly spinRate: number;
}

const gold = ['#FFF6D6', '#FFD166'] as const;
const cyan = ['#38BDF8', '#BAE6FD'] as const;
const violet = ['#A855F7', '#E9D5FF'] as const;
const teal = ['#2DD4BF', '#99F6E4'] as const;
const lavender = ['#E0AAFF', '#F5D0FE'] as const;

function trail(colors: readonly [string, string], trailLengthScale: number, spinRate: number) {
  const [primaryColor, secondaryColor] = colors;
  const normal = { primaryColor, secondaryColor, trailLengthScale, spinRate, trailStrength: 1 };
  const calm = { ...normal, primaryColor: gold[0], trailStrength: .45, trailLengthScale: 1, spinRate: spinRate * .45 };
  return { normal, calm };
}

const pitchTrails = {
  four_seam: trail(gold, 1, 1.5),
  two_seam: trail(gold, 1.25, 1.1),
  cutter: trail(cyan, 1.35, 1.3),
  slider: trail(cyan, 1.65, 1.25),
  curveball: trail(violet, 1.8, 1.4),
  changeup: trail(teal, 1.3, .7),
  splitter: trail(teal, 1.5, .55),
  knuckleball: trail(lavender, 1.4, .08),
} satisfies Record<PitchType, { normal: PitchTrailVisual; calm: PitchTrailVisual }>;

export function getPitchTrailVisual(pitchType: PitchType, reducedMotion = false): PitchTrailVisual {
  return pitchTrails[pitchType][reducedMotion ? 'calm' : 'normal'];
}

export function pitchSeconds(mph: number) {
  return (0.56 * 92) / Math.max(50, Math.min(110, mph));
}

// Offset the straight release-to-pocket line. A positive X offset approaches the
// pocket moving toward third (-X). A higher exponent delays the turn toward the mitt.
function bend(t: number, exponent: number) {
  return t * (1 - t ** exponent);
}

export function shapePitch(pos: Vec3, pitch: PitchFlight, t: number, hand: ThrowsHand) {
  const mirror = hand === 'R' ? 1 : -1;
  switch (pitch.pitchType) {
    case 'four_seam':
    case 'changeup': {
      const carry = bend(t, 4);
      // The change shares the heater's release tangent, then fades and tumbles.
      const fade = pitch.pitchType === 'changeup' ? t * t * carry : 0;
      pos.x -= mirror * (.09 * carry + 1.8 * fade);
      pos.y += 2.25 * fade - .16 * carry;
      break;
    }
    case 'two_seam': {
      const sink = bend(t, 4);
      pos.x -= mirror * 1.45 * sink;
      pos.y += 1.22 * sink;
      break;
    }
    case 'cutter': {
      const dart = bend(t, 6);
      pos.x += mirror * .88 * dart;
      pos.y += .23 * dart;
      break;
    }
    case 'slider':
      pos.x += mirror * 2.65 * bend(t, 2);
      pos.y += 1.35 * bend(t, 4);
      break;
    case 'curveball': {
      const arch = bend(t, 1);
      pos.x += mirror * .64 * arch;
      pos.y += 6.4 * arch;
      break;
    }
    case 'splitter': {
      const drop = bend(t, 8);
      pos.x -= mirror * .15 * drop;
      pos.y += 1.16 * drop;
      break;
    }
    case 'knuckleball': {
      const envelope = 4 * bend(t, 1);
      const phase = Math.PI * t;
      pos.x += mirror * envelope * (.34 * Math.sin(6 * phase) + .09 * Math.sin(11 * phase));
      pos.y += envelope * (.25 * Math.sin(5 * phase) + .10 * Math.cos(9 * phase));
      break;
    }
  }
}
