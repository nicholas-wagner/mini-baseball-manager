import { LEAGUE_TIER_ORDER, type LeagueTierId } from '../models/club';

export type UnlockableCategory =
  | 'throwback_uniform'
  | 'bat_vfx_skin'
  | 'stadium_theme'
  | 'legendary_node';

export interface UnlockableItem {
  id: string;
  name: string;
  category: UnlockableCategory;
  requirementText: string;
  minTier?: LeagueTierId;
  minWins?: number;
  minChampionships?: number;
  minRetiredNumbers?: number;
  requiresDerbyWin?: boolean;
  requiresGlobalCupWin?: boolean;
  previewColor: string;
}

export interface CareerUnlockProgressInput {
  leagueTier: LeagueTierId;
  careerWins: number;
  championshipsWon: number;
  retiredNumbersCount: number;
  wonHomeRunDerby: boolean;
  wonGlobalCup: boolean;
}

export interface UnlockablesGalleryStatus {
  unlocked: UnlockableItem[];
  locked: UnlockableItem[];
  completionPct: number;
}

export const UNLOCKABLES_CATALOG: readonly UnlockableItem[] = [
  {
    id: 'uni_1954_flannel',
    name: '1954 Wool Flannel Throwback',
    category: 'throwback_uniform',
    requirementText: 'Win 10 career games',
    minWins: 10,
    previewColor: '#FBF4E4',
  },
  {
    id: 'uni_1994_neon',
    name: '1994 Electric Teal & Magenta Mesh',
    category: 'throwback_uniform',
    requirementText: 'Reach High-A league tier',
    minTier: 'high_a',
    previewColor: '#00E5FF',
  },
  {
    id: 'uni_golden_dynasty',
    name: 'Championship Gold-Trim Pinstripes',
    category: 'throwback_uniform',
    requirementText: 'Win 1 league championship',
    minChampionships: 1,
    previewColor: '#FFC300',
  },
  {
    id: 'vfx_lightning_bat',
    name: 'Lightning Bolt Bat Trail',
    category: 'bat_vfx_skin',
    requirementText: 'Win 5 career games',
    minWins: 5,
    previewColor: '#FFD166',
  },
  {
    id: 'vfx_pixel_bat',
    name: '16-Bit Pixel Arcade Bat Skin',
    category: 'bat_vfx_skin',
    requirementText: 'Reach Low-A league tier',
    minTier: 'low_a',
    previewColor: '#9B5DE5',
  },
  {
    id: 'vfx_gold_bat',
    name: 'Solid 24K Gold Slugger Trail',
    category: 'bat_vfx_skin',
    requirementText: 'Win an All-Star Home Run Derby',
    requiresDerbyWin: true,
    previewColor: '#F59E0B',
  },
  {
    id: 'vfx_sakura_bat',
    name: 'Sakura Blossom Petal Trail',
    category: 'bat_vfx_skin',
    requirementText: 'Win a Global Chibi Cup',
    requiresGlobalCupWin: true,
    previewColor: '#F472B6',
  },
  {
    id: 'theme_sandlot_sunset',
    name: 'Sandlot Golden-Hour Sunset Theme',
    category: 'stadium_theme',
    requirementText: 'Win 3 career games',
    minWins: 3,
    previewColor: '#FB923C',
  },
  {
    id: 'theme_neon_night',
    name: '90s Neon Floodlight Night Theme',
    category: 'stadium_theme',
    requirementText: 'Reach AA league tier',
    minTier: 'aa',
    previewColor: '#312E81',
  },
  {
    id: 'theme_classic_brick',
    name: 'Heritage Brick Jewel-Box Theme',
    category: 'stadium_theme',
    requirementText: 'Retire 1 legend jersey number',
    minRetiredNumbers: 1,
    previewColor: '#9A3412',
  },
  {
    id: 'theme_space_dome',
    name: 'Retro-Futuristic Space Dome Theme',
    category: 'stadium_theme',
    requirementText: 'Reach Mini Major League',
    minTier: 'majors',
    previewColor: '#0EA5E9',
  },
  {
    id: 'legend_node_mythic_clutch',
    name: 'Secret Node: Mythic Walk-Off Aura',
    category: 'legendary_node',
    requirementText: 'Win 2 league championships',
    minChampionships: 2,
    previewColor: '#EF4444',
  },
];

function meetsTierRequirement(current: LeagueTierId, required?: LeagueTierId): boolean {
  if (!required) return true;
  return LEAGUE_TIER_ORDER.indexOf(current) >= LEAGUE_TIER_ORDER.indexOf(required);
}

function meetsCountRequirement(actual: number, required?: number): boolean {
  return !required || actual >= required;
}

function isItemUnlocked(item: UnlockableItem, progress: CareerUnlockProgressInput): boolean {
  const checks = [
    meetsTierRequirement(progress.leagueTier, item.minTier),
    meetsCountRequirement(progress.careerWins, item.minWins),
    meetsCountRequirement(progress.championshipsWon, item.minChampionships),
    meetsCountRequirement(progress.retiredNumbersCount, item.minRetiredNumbers),
    !item.requiresDerbyWin || progress.wonHomeRunDerby,
    !item.requiresGlobalCupWin || progress.wonGlobalCup,
  ];
  return checks.every(Boolean);
}

/** Evaluates all earned & locked cosmetics, bat VFX skins, stadium themes & secret skill nodes. */
export function evaluateUnlockablesProgress(
  progress: CareerUnlockProgressInput,
): UnlockablesGalleryStatus {
  const unlocked: UnlockableItem[] = [];
  const locked: UnlockableItem[] = [];
  for (const item of UNLOCKABLES_CATALOG) {
    if (isItemUnlocked(item, progress)) unlocked.push(item);
    else locked.push(item);
  }
  const completionPct = Math.round((unlocked.length / UNLOCKABLES_CATALOG.length) * 100);
  return { unlocked, locked, completionPct };
}
