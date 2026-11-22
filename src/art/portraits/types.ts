export type PortraitMood =
  | 'happy'
  | 'determined'
  | 'fired_up'
  | 'sweating'
  | 'shocked'
  | 'rival_glare';

export type CardRarity = 'rookie' | 'allstar' | 'mvp';

export type * from '../../engine/catalog/appearance';

export interface PortraitTeamColors {
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
}
