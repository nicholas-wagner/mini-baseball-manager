import { createSeededRng } from '../../engine/rng/seededRng';
import type { FacialHair, HairAccessory, HairStyle, JerseyFit, PortraitTraits } from './types';

export type AthleteAppearance = Required<PortraitTraits>;
const femaleCuts: readonly HairStyle[] = ['bob', 'braid', 'ponytail', 'waves', 'pigtails'];
const maleCuts: readonly HairStyle[] = ['spiky90s', 'flattop', 'mullet', 'afro', 'pompadour', 'sideSweep', 'curlyTop', 'mohawk'];
const beardStyles: readonly FacialHair[] = ['none', 'none', 'none', 'none', 'stubble', 'stubble', 'chevron', 'handlebar', 'goatee', 'shortBeard', 'longBeard'];

export const STATURE_SCALE = { short: 0.84, medium: 1, tall: 1.16 };
export const BUILD_WIDTH = { lean: 0.85, balanced: 1, power: 1.22 };
export const JERSEY_EASE: Record<JerseyFit, number> = { standard: 0, AA: -5, A: -3.5, B: -1.5, C: 1, D: 3.5, DD: 6 };

const fitDistribution = [
  ['AA', 5], ['A', 10], ['B', 20], ['C', 50], ['D', 10], ['DD', 5],
] as const;

function seededJerseyFit(seed: number): JerseyFit {
  let ticket = createSeededRng(seed ^ 0x464954).int(1, 100);
  for (const [fit, weight] of fitDistribution) {
    if (ticket <= weight) return fit;
    ticket -= weight;
  }
  throw new Error('Jersey fit weights must cover all 100 values');
}

// Career saves and engine-generated players can contain only the original
// portrait fields. Resolve their art at the boundary without changing a save.
export function resolveAthleteAppearance(traits: PortraitTraits): AthleteAppearance {
  if (traits.playerLook && traits.stature && traits.build && traits.facialHair && traits.hairAccessory && traits.glasses && traits.bottoms &&
      traits.jerseyFit && traits.skirtLiner && traits.pitchingMotion && traits.croppedJersey !== undefined && traits.openCollar !== undefined) {
    return traits as AthleteAppearance;
  }
  const rng = createSeededRng(traits.seed ^ 0x6d2b79f5);
  const seededLook = rng.pick(['male', 'female'] as const);
  const playerLook = traits.playerLook ?? seededLook;
  const cuts = playerLook === 'female' ? femaleCuts : maleCuts;
  const alternate = rng.pick(cuts);
  const hairStyle = cuts.includes(traits.hairStyle) ? traits.hairStyle : alternate;
  const stature = rng.pick(['short', 'medium', 'medium', 'tall'] as const);
  const build = rng.pick(['lean', 'balanced', 'power'] as const);
  const beard = rng.pick(beardStyles);
  const tied = hairStyle === 'braid' || hairStyle === 'ponytail' || hairStyle === 'pigtails';
  const trim: HairAccessory = tied ? rng.pick(['tie', 'scrunchie', 'ribbon'] as const)
    : rng.pick(['none', 'none', 'headband'] as const);
  const optics = createSeededRng(traits.seed ^ 0x65796573);
  const glasses = optics.chance(0.10) ? optics.pick(['round', 'square'] as const) : 'none';
  const uniform = createSeededRng(traits.seed ^ 0x4a525359);
  const croppedJersey = uniform.chance(.10);
  const openCollar = uniform.chance(.10);
  const signature = createSeededRng(traits.seed ^ 0x534c4f54).chance(playerLook === 'female' ? .20 : .10);
  return {
    ...traits, playerLook, hairStyle, stature: traits.stature ?? stature, build: traits.build ?? build,
    bottoms: playerLook === 'male' ? 'pants' : (traits.bottoms === 'skirt' || traits.bottoms === 'shorts' ? traits.bottoms : rng.pick(['shorts', 'skirt'] as const)),
    glasses: traits.glasses ?? glasses,
    pitchingMotion: traits.pitchingMotion ?? (signature ? (playerLook === 'female' ? 'underhand' : 'sidearm') : 'overhand'),
    croppedJersey: playerLook === 'female' && (traits.croppedJersey ?? croppedJersey),
    openCollar: playerLook === 'female' && (traits.openCollar ?? openCollar),
    jerseyFit: playerLook === 'male' ? 'standard' : traits.jerseyFit ?? seededJerseyFit(traits.seed),
    skirtLiner: traits.skirtLiner ?? (createSeededRng(traits.seed ^ 0x4c494e52).chance(.2) ? 'briefs' : 'shorts'),
    facialHair: traits.facialHair ?? (playerLook === 'male' ? (traits.accessory === 'handlebarStache' ? 'handlebar' : beard) : 'none'),
    hairAccessory: traits.hairAccessory ?? (traits.accessory === 'headband' ? 'headband' : trim),
  };
}
