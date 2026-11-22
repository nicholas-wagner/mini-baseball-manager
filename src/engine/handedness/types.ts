export type ThrowsHand = 'R' | 'L';
export type BatsHand = 'R' | 'L' | 'S';
export type EffectiveBatSide = 'R' | 'L';

export type FieldPosition = 'SP' | 'RP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

export interface PlatoonMatchupEffect {
  effectiveBatSide: EffectiveBatSide;
  advantage: 'batter' | 'pitcher';
  isSwitchHitterEdge: boolean;
  batterContactDelta: number;
  batterPowerDelta: number;
  pitcherBreakDelta: number;
  firstBaseStepBonus: number;
  label: string;
}
