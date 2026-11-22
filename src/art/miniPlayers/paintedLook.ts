import { resolveAthleteAppearance } from '../portraits/athleteAppearance';
import type { HairStyle, PortraitTraits, UniformBottoms } from '../portraits/types';

export type PaintedRole = 'pitcher' | 'batter' | 'catcher' | 'fielder' | 'runner';
export type BodySheet =
  | 'runners'
  | `delivery-${'front' | 'rear'}-${UniformBottoms}`
  | UniformBottoms
  | `rear-${UniformBottoms}`
  | `play-${'front' | 'rear'}-${UniformBottoms}`;

const cuts: Record<HairStyle, number> = {
  spiky90s: 0,
  mohawk: 0,
  flattop: 0,
  afro: 1,
  curlyTop: 1,
  sideSweep: 2,
  pompadour: 2,
  mullet: 3,
  ponytail: 0,
  bob: 1,
  braid: 2,
  pigtails: 3,
  waves: 1,
};

// Each sheet has four columns and three rows. Appearance selects reusable paint
// and a silhouette. The player ID never becomes an asset name or cache key.
export function paintedSheets(traits: PortraitTraits, role: PaintedRole, rear: boolean) {
  const a = resolveAthleteAppearance(traits);
  const sex = a.playerLook === 'female' ? 'f' : 'm';
  const cut = cuts[a.hairStyle];
  const cap = a.capStyle === 'none' ? 'bare' : a.capStyle === 'backwards' ? 'back' : 'cap';
  const body: BodySheet =
    role === 'runner'
      ? 'runners'
      : role === 'pitcher'
        ? `delivery-${rear ? 'rear' : 'front'}-${a.bottoms}`
        : `play-${rear ? 'rear' : 'front'}-${a.bottoms}`;
  const battingHelmet = role === 'batter' || role === 'runner';
  if (battingHelmet && rear)
    return { body, head: role === 'batter' ? 'helmet-quarter' : 'helmet-back', headCell: cut + (sex === 'f' ? 4 : 0), expressions: false };
  if (battingHelmet || role === 'catcher')
    return {
      body,
      head: `gear-head-${sex}`,
      headCell: cut + (battingHelmet ? 0 : rear ? 8 : 4),
      expressions: false,
    };
  if (rear)
    return {
      body,
      head: `rear-head-${sex}`,
      headCell: cut + (cap === 'bare' ? 8 : cap === 'back' ? 4 : 0),
      expressions: false,
    };
  return { body, head: `head-${sex}-${cap}`, headCell: cut, expressions: true };
}
