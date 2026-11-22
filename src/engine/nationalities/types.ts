import type { BallVfxStyle } from '../vfx/types';

export type NationalityId =
  | 'USA'
  | 'CAN'
  | 'JPN'
  | 'KOR'
  | 'MEX'
  | 'DOM'
  | 'PRI'
  | 'BRA'
  | 'ARG'
  | 'AUS'
  | 'IRL';

export interface HeritageAbilitySpec {
  id: string;
  name: string;
  mythOrAnimal: string;
  category: 'batting' | 'pitching' | 'fielding' | 'baserunning' | 'luck';
  shortEffect: string;
  calloutText: string;
  vfxColor: string;
  ballStyle: BallVfxStyle;
}

export interface NationalitySpec {
  id: NationalityId;
  name: string;
  shortCode: string;
  weight: number;
  hometowns: readonly string[];
  firstNames: readonly string[];
  lastNames: readonly string[];
  heritageAbility: HeritageAbilitySpec;
}
