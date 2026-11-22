export type HeadShape = 'round' | 'oval' | 'square' | 'chubby' | 'heart';

export type HairStyle =
  | 'spiky90s'
  | 'flattop'
  | 'mullet'
  | 'braid'
  | 'waves'
  | 'ponytail'
  | 'pigtails'
  | 'afro'
  | 'pompadour'
  | 'sideSweep'
  | 'curlyTop'
  | 'bob'
  | 'mohawk';

export type CapStyle = 'forward' | 'backwards' | 'visor' | 'none';

export type EyeStyle = 'bright' | 'determined' | 'starry' | 'chill' | 'wide' | 'wink';

export type MouthStyle = 'bigGrin' | 'smirk' | 'bubblegum' | 'tongueOut' | 'openLaugh' | 'focused';

export type AccessoryStyle =
  | 'none'
  | 'shades90s'
  | 'pinkShades'
  | 'eyeBlack'
  | 'cheekBandage'
  | 'freckles'
  | 'handlebarStache'
  | 'headband'
  | 'starEarrings';

export type BackdropStyle = 'starburst' | 'stripes' | 'halftone' | 'lightning' | 'stadium';

export type PlayerLook = 'male' | 'female';

export type FacialHair = 'none' | 'stubble' | 'chevron' | 'handlebar' | 'goatee' | 'shortBeard' | 'longBeard';
export type HairAccessory = 'none' | 'tie' | 'headband' | 'scrunchie' | 'ribbon';
export type Glasses = 'none' | 'round' | 'square';
export type UniformBottoms = 'pants' | 'shorts' | 'skirt';
export type SkirtLiner = 'shorts' | 'briefs';
export type Stature = 'short' | 'medium' | 'tall';
export type AthleticBuild = 'lean' | 'balanced' | 'power';
export type JerseyFit = 'standard' | 'AA' | 'A' | 'B' | 'C' | 'D' | 'DD';
export type PitchingMotion = 'overhand' | 'sidearm' | 'underhand';

export interface PortraitTraits {
  pitchingMotion?: PitchingMotion;
  skirtLiner?: SkirtLiner;
  croppedJersey?: boolean;
  openCollar?: boolean;
  jerseyFit?: JerseyFit;
  bottoms?: UniformBottoms;
  stature?: Stature;
  build?: AthleticBuild;
  facialHair?: FacialHair;
  hairAccessory?: HairAccessory;
  glasses?: Glasses;
  playerLook?: PlayerLook;
  seed: number;
  headShape: HeadShape;
  skinTone: string;
  skinShadow: string;
  skinHighlight: string;
  irisColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  hairHighlight: string;
  capStyle: CapStyle;
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;
  accessory: AccessoryStyle;
  backdropStyle: BackdropStyle;
}
