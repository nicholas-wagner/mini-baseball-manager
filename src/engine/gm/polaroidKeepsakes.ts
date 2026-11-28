import type { Club } from '../models/club';
import type { Player } from '../models/player';

export type HrCelebrationId =
  | 'helmet_high_five'
  | 'dugout_dance_line'
  | 'mascot_confetti'
  | 'curtain_call';

export type ClubSnackId =
  | 'rally_nachos'
  | 'strawberry_milkshakes'
  | 'sunflower_seeds'
  | 'bubblegum_bucket'
  | 'soft_pretzels';

export interface ClubRitualProfile {
  hrCelebration: HrCelebrationId;
  luckySnack: ClubSnackId;
}

export interface HrCelebrationMeta {
  id: HrCelebrationId;
  emoji: string;
  label: string;
  shortLabel: string;
  banterPhrase: string;
}

export interface ClubSnackMeta {
  id: ClubSnackId;
  emoji: string;
  label: string;
  shortLabel: string;
  snackNameLower: string;
  banterPhrase: string;
}

export const DEFAULT_CLUB_RITUALS: ClubRitualProfile = {
  hrCelebration: 'helmet_high_five',
  luckySnack: 'strawberry_milkshakes',
};

export const HR_CELEBRATION_CATALOG: readonly HrCelebrationMeta[] = [
  {
    id: 'helmet_high_five',
    emoji: '🙌',
    label: 'Helmet High-Five',
    shortLabel: 'High-Five',
    banterPhrase: 'Helmet high-fives down the dugout rail!',
  },
  {
    id: 'dugout_dance_line',
    emoji: '🕺',
    label: 'Dugout Dance Line',
    shortLabel: 'Dance Line',
    banterPhrase: 'Cue the dugout conga dance line!',
  },
  {
    id: 'mascot_confetti',
    emoji: '🎉',
    label: 'Mascot Confetti',
    shortLabel: 'Confetti',
    banterPhrase: 'Fire the mascot confetti cannon!',
  },
  {
    id: 'curtain_call',
    emoji: '🧢',
    label: 'Curtain Call',
    shortLabel: 'Curtain Call',
    banterPhrase: 'Step out and tip your cap!',
  },
];

export const CLUB_SNACK_CATALOG: readonly ClubSnackMeta[] = [
  {
    id: 'rally_nachos',
    emoji: '🧀',
    label: 'Rally Nachos',
    shortLabel: 'Nachos',
    snackNameLower: 'rally nachos',
    banterPhrase: 'Rally nachos on the skipper!',
  },
  {
    id: 'strawberry_milkshakes',
    emoji: '🍓',
    label: 'Strawberry Milkshakes',
    shortLabel: 'Milkshakes',
    snackNameLower: 'strawberry milkshakes',
    banterPhrase: 'Strawberry milkshakes on the skipper!',
  },
  {
    id: 'sunflower_seeds',
    emoji: '🌻',
    label: 'Sunflower Seeds',
    shortLabel: 'Seeds',
    snackNameLower: 'sunflower seeds',
    banterPhrase: 'Shower of lucky sunflower seeds!',
  },
  {
    id: 'bubblegum_bucket',
    emoji: '🫧',
    label: 'Bubblegum Bucket',
    shortLabel: 'Bubblegum',
    snackNameLower: 'bubblegum bucket',
    banterPhrase: 'Double-bubble bucket rally time!',
  },
  {
    id: 'soft_pretzels',
    emoji: '🥨',
    label: 'Soft Pretzels',
    shortLabel: 'Pretzels',
    snackNameLower: 'soft pretzels',
    banterPhrase: 'Warm soft pretzels for the bench!',
  },
];

const VALID_HR_IDS: ReadonlySet<string> = new Set(HR_CELEBRATION_CATALOG.map((item) => item.id));
const VALID_SNACK_IDS: ReadonlySet<string> = new Set(CLUB_SNACK_CATALOG.map((item) => item.id));

export function getHrCelebrationMeta(id?: HrCelebrationId): HrCelebrationMeta {
  return HR_CELEBRATION_CATALOG.find((item) => item.id === id) ?? HR_CELEBRATION_CATALOG[0];
}

export function getClubSnackMeta(id?: ClubSnackId): ClubSnackMeta {
  return CLUB_SNACK_CATALOG.find((item) => item.id === id) ?? CLUB_SNACK_CATALOG[1];
}

/** Validates club rituals against the strict allow-list, falling back to safe defaults. */
export function sanitizeClubRituals(
  raw?: Partial<ClubRitualProfile> | null,
): ClubRitualProfile {
  const hrCelebration =
    raw?.hrCelebration && VALID_HR_IDS.has(raw.hrCelebration)
      ? raw.hrCelebration
      : DEFAULT_CLUB_RITUALS.hrCelebration;
  const luckySnack =
    raw?.luckySnack && VALID_SNACK_IDS.has(raw.luckySnack)
      ? raw.luckySnack
      : DEFAULT_CLUB_RITUALS.luckySnack;
  return { hrCelebration, luckySnack };
}

export type PolaroidOccasion =
  | 'walk_off'
  | 'boss_victory'
  | 'playoff_clinch'
  | 'championship'
  | 'shutout_gem'
  | 'opening_win';

export interface PolaroidKeepsake {
  id: string;
  season: number;
  occasion: PolaroidOccasion;
  badgeLabel: string;
  headline: string;
  caption: string;
  scoreLine: string;
  stadiumName: string;
  playerIds: string[];
  playerNames: string[];
  createdAtGameNumber: number;
}

export interface CreateVictoryPolaroidParams {
  club: Club;
  opponentName: string;
  humanScore: number;
  opponentScore: number;
  isWalkOff: boolean;
  isBossVictory: boolean;
  isPlayoffClinch?: boolean;
  isChampionship?: boolean;
  isOpeningWin?: boolean;
  mvpId: string;
  starPlayerIds: string[];
  season: number;
  gameNumber: number;
}

function resolvePolaroidOccasion(params: CreateVictoryPolaroidParams): PolaroidOccasion | null {
  if (params.humanScore <= params.opponentScore) return null;
  if (params.isChampionship) return 'championship';
  if (params.isPlayoffClinch) return 'playoff_clinch';
  if (params.isWalkOff) return 'walk_off';
  if (params.isBossVictory) return 'boss_victory';
  if (params.opponentScore === 0) return 'shutout_gem';
  if (params.isOpeningWin || params.gameNumber === 1) return 'opening_win';
  return null;
}

function pickPolaroidPlayers(
  roster: readonly Player[],
  mvpId: string,
  starPlayerIds: readonly string[],
): Player[] {
  const byId = new Map(roster.map((p) => [p.id, p]));
  const picked: Player[] = [];
  const seen = new Set<string>();
  const addById = (id: string) => {
    if (picked.length >= 3 || seen.has(id)) return;
    const found = byId.get(id);
    if (!found) return;
    seen.add(id);
    picked.push(found);
  };

  addById(mvpId);
  for (const id of starPlayerIds) addById(id);
  for (const player of roster) {
    if (picked.length >= 3) break;
    addById(player.id);
  }
  return picked;
}

function buildPolaroidCopy(
  occasion: PolaroidOccasion,
  club: Club,
  opponentName: string,
  humanScore: number,
  opponentScore: number,
): { badgeLabel: string; headline: string; caption: string } {
  const rituals = sanitizeClubRituals(club.clubRituals);
  const snack = getClubSnackMeta(rituals.luckySnack);
  const mascot = club.mascot;
  const score = `${humanScore}-${opponentScore}`;

  switch (occasion) {
    case 'championship':
      return {
        badgeLabel: 'CHAMPIONS!',
        headline: `${club.name} Crowned Champions!`,
        caption: `Dynasty photo! ${mascot} celebrates with ${snack.snackNameLower} after a ${score} title win!`,
      };
    case 'playoff_clinch':
      return {
        badgeLabel: 'PLAYOFFS CLINCHED!',
        headline: `${club.name} Are Postseason Bound!`,
        caption: `${snack.label} & ${mascot} dance party in the dugout after clinching ${score}!`,
      };
    case 'walk_off':
      return {
        badgeLabel: 'WALK-OFF WIN!',
        headline: `Walk-Off Magic vs ${opponentName}!`,
        caption: `${snack.label} on the skipper with ${mascot} after a ${score} walk-off!`,
      };
    case 'boss_victory':
      return {
        badgeLabel: 'BOSS DEFEATED!',
        headline: `Toppled ${opponentName}!`,
        caption: `${mascot} celebrates with ${snack.snackNameLower} after taking down ${opponentName} ${score}!`,
      };
    case 'shutout_gem':
      return {
        badgeLabel: 'SHUTOUT GEM!',
        headline: `Zeroes on the Board vs ${opponentName}!`,
        caption: `Blanked 'em ${score}! ${snack.label} and high-fives with ${mascot}!`,
      };
    case 'opening_win':
      return {
        badgeLabel: 'OPENING WIN!',
        headline: `First Win at ${club.stadium.name}!`,
        caption: `First victory in the books! ${snack.label} with ${mascot} after beating ${opponentName}!`,
      };
  }
}

/**
 * Snaps a charming Victory Polaroid keepsake on marquee wins, weaving the club's
 * lucky snack & mascot into the handwritten caption.
 */
export function maybeCreateVictoryPolaroid(
  params: CreateVictoryPolaroidParams,
): PolaroidKeepsake | null {
  const occasion = resolvePolaroidOccasion(params);
  if (!occasion) return null;

  const stars = pickPolaroidPlayers(params.club.roster, params.mvpId, params.starPlayerIds);
  const copy = buildPolaroidCopy(
    occasion,
    params.club,
    params.opponentName,
    params.humanScore,
    params.opponentScore,
  );

  return {
    id: `polaroid-s${params.season}-g${params.gameNumber}-${occasion}`,
    season: params.season,
    occasion,
    badgeLabel: copy.badgeLabel,
    headline: copy.headline,
    caption: copy.caption,
    scoreLine: `${params.humanScore}-${params.opponentScore} vs ${params.opponentName}`,
    stadiumName: params.club.stadium.name,
    playerIds: stars.map((p) => p.id),
    playerNames: stars.map((p) => p.name),
    createdAtGameNumber: params.gameNumber,
  };
}

/** Prepends a new Polaroid keepsake, deduplicates by id, and caps the album cleanly. */
export function appendPolaroidKeepsake(
  existing: readonly PolaroidKeepsake[],
  next: PolaroidKeepsake,
  maxKeep = 24,
): PolaroidKeepsake[] {
  const filtered = existing.filter((item) => item.id !== next.id);
  return [next, ...filtered].slice(0, Math.max(1, maxKeep));
}
