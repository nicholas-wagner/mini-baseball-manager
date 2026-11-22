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
  | 'IRL'
  | 'ITA'
  | 'NED'
  | 'TPE'
  | 'CUB'
  | 'VEN'
  | 'CHN'
  | 'PAN'
  | 'COL'
  | 'ISR'
  | 'CZE'
  | 'GBR'
  | 'NCA'
  | 'RSA'
  | 'ESP';

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
