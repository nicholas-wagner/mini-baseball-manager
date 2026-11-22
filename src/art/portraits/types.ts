export type PortraitMood =
  | 'happy'
  | 'determined'
  | 'fired_up'
  | 'sweating'
  | 'shocked'
  | 'rival_glare';

export type CardRarity = 'rookie' | 'allstar' | 'mvp';

export type HeadShape = 'round' | 'oval' | 'square' | 'chubby' | 'heart';

export type HairStyle =
  | 'spiky90s'
  | 'flattop'
  | 'mullet'
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
  | 'eyeBlack'
  | 'cheekBandage'
  | 'freckles'
  | 'handlebarStache'
  | 'headband'
  | 'starEarrings';

export type BackdropStyle = 'starburst' | 'stripes' | 'halftone' | 'lightning' | 'stadium';

export interface PortraitTraits {
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

export interface PortraitTeamColors {
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
}
