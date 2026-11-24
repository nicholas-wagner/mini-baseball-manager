import type { AtBatOutcome, PlayEvent } from '../models/playEvent';
import {
  getBattingSide,
  getCurrentBatter,
  getCurrentPitcher,
  getFieldingSide,
  type GameSessionState,
} from '../simulation/gameState';
import { sacrificeAdvances } from '../simulation/sacrificeAdvances';

export type CelebrationStickerId =
  | 'first_home_run'
  | 'first_strikeout'
  | 'first_signature_power'
  | 'first_stolen_base'
  | 'first_bunt_magic'
  | 'first_base_hit';

export interface CelebrationStickerDef {
  id: CelebrationStickerId;
  emoji: string;
  title: string;
  detail: string;
  accentBg: string;
}

export interface CelebrationStickerUnlock {
  sticker: CelebrationStickerDef;
  actorName: string;
  headline: string;
  mascotQuip: string;
}

export interface StickerAlbumEntry extends CelebrationStickerDef {
  unlocked: boolean;
}

export interface StickerAlbumShelf {
  stickers: readonly StickerAlbumEntry[];
  unlockedCount: number;
  totalCount: number;
}

export const CELEBRATION_STICKER_CATALOG: readonly CelebrationStickerDef[] = [
  {
    id: 'first_home_run',
    emoji: '💥',
    title: 'Sandlot Moonshot!',
    detail: 'Crush your first over-the-fence home run',
    accentBg: '#FFE5EC',
  },
  {
    id: 'first_strikeout',
    emoji: '🔥',
    title: 'Filthy K!',
    detail: 'Fan your first rival batter on the diamond',
    accentBg: '#FFF3BF',
  },
  {
    id: 'first_signature_power',
    emoji: '⚡',
    title: 'Power Unleashed!',
    detail: 'Trigger a 90s Signature Special Power',
    accentBg: '#F5EEFF',
  },
  {
    id: 'first_stolen_base',
    emoji: '💨',
    title: 'Blazing Cleats!',
    detail: 'Swipe a base cleanly on the run',
    accentBg: '#E0FBFC',
  },
  {
    id: 'first_bunt_magic',
    emoji: '🏏',
    title: 'Smallball Spark!',
    detail: 'Pull off a bunt hit or sacrifice bunt',
    accentBg: '#D8F3DC',
  },
  {
    id: 'first_base_hit',
    emoji: '⭐',
    title: 'First Knock!',
    detail: 'Lace your first live base hit',
    accentBg: '#FFF8E7',
  },
];

const STICKER_BY_ID: Readonly<Record<CelebrationStickerId, CelebrationStickerDef>> =
  Object.fromEntries(CELEBRATION_STICKER_CATALOG.map((s) => [s.id, s])) as Record<
    CelebrationStickerId,
    CelebrationStickerDef
  >;

const BASE_HIT_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set(['single', 'double', 'triple']);

function buildMascotStickerQuip(mascotName: string, stickerId: CelebrationStickerId): string {
  const shortName = mascotName.split(' ')[0] || 'Buddy';
  switch (stickerId) {
    case 'first_home_run':
      return `${shortName}: "MOONSHOT!!"`;
    case 'first_strikeout':
      return `${shortName}: "FILTHY K!!"`;
    case 'first_signature_power':
      return `${shortName}: "90s POWER!!"`;
    case 'first_stolen_base':
      return `${shortName}: "SAFE!! ZOOM!"`;
    case 'first_bunt_magic':
      return `${shortName}: "SLICK BUNT!!"`;
    case 'first_base_hit':
      return `${shortName}: "BASE KNOCK!!"`;
  }
}

function buildUnlockHeadline(actorName: string, stickerId: CelebrationStickerId): string {
  switch (stickerId) {
    case 'first_home_run':
      return `${actorName} launched a towering homer!`;
    case 'first_strikeout':
      return `${actorName} rung up a nasty strikeout!`;
    case 'first_signature_power':
      return `${actorName} lit up the ballpark!`;
    case 'first_stolen_base':
      return `${actorName} swiped the bag cleanly!`;
    case 'first_bunt_magic':
      return `${actorName} executed smallball perfection!`;
    case 'first_base_hit':
      return `${actorName} ripped a crisp base hit!`;
  }
}

function isHumanPowerTrigger(
  event: PlayEvent,
  humanBatting: boolean,
  humanFielding: boolean,
): boolean {
  const actor = event.specialPowerTriggered?.actor;
  if (!actor) return false;
  return (actor === 'batter' && humanBatting) || (actor === 'pitcher' && humanFielding);
}

function isBuntHighlight(event: PlayEvent, before: GameSessionState): boolean {
  if (event.outcome === 'bunt_single') return true;
  const runs = event.homeScore + event.awayScore - before.home.score - before.away.score;
  return Boolean(sacrificeAdvances(event, before.bases, runs));
}

function collectBattingStickers(
  event: PlayEvent,
  before: GameSessionState,
): CelebrationStickerId[] {
  const hits: CelebrationStickerId[] = [];
  if (event.outcome === 'home_run') hits.push('first_home_run');
  if (event.type === 'stolen_base_attempt' && event.outsAfter === event.outsBefore) {
    hits.push('first_stolen_base');
  }
  if (isBuntHighlight(event, before)) hits.push('first_bunt_magic');
  if (event.outcome && BASE_HIT_OUTCOMES.has(event.outcome)) hits.push('first_base_hit');
  return hits;
}

function collectCandidateStickers(
  event: PlayEvent,
  before: GameSessionState,
): CelebrationStickerId[] {
  const humanBatting = getBattingSide(before).isHuman;
  const humanFielding = getFieldingSide(before).isHuman;
  const candidates: CelebrationStickerId[] = [];

  if (humanBatting && event.outcome === 'home_run') candidates.push('first_home_run');
  if (humanFielding && event.outcome === 'strikeout') candidates.push('first_strikeout');
  if (isHumanPowerTrigger(event, humanBatting, humanFielding)) {
    candidates.push('first_signature_power');
  }
  if (humanBatting) {
    for (const id of collectBattingStickers(event, before)) {
      if (!candidates.includes(id)) candidates.push(id);
    }
  }
  return candidates;
}

function isPitcherSticker(event: PlayEvent, stickerId: CelebrationStickerId): boolean {
  if (stickerId === 'first_strikeout') return true;
  return stickerId === 'first_signature_power' && event.specialPowerTriggered?.actor === 'pitcher';
}

function resolveHighlightActorName(
  event: PlayEvent,
  before: GameSessionState,
  stickerId: CelebrationStickerId,
): string {
  if (isPitcherSticker(event, stickerId)) {
    const defense = getFieldingSide(before);
    const id = event.pitcherId;
    return (id ? defense.playersById[id]?.name : undefined) ?? getCurrentPitcher(before).name;
  }
  const offense = getBattingSide(before);
  const id = event.batterId;
  return (id ? offense.playersById[id]?.name : undefined) ?? getCurrentBatter(before).name;
}

/** Detects the first unearned live-moment Celebration Sticker triggered by a human highlight play. */
export function detectLiveCelebrationSticker(input: {
  event: PlayEvent;
  before: GameSessionState;
  earnedStickerIds: readonly string[];
  mascotName: string;
}): CelebrationStickerUnlock | null {
  const earned = new Set(input.earnedStickerIds);
  const candidates = collectCandidateStickers(input.event, input.before);
  const matchedId = candidates.find((id) => !earned.has(id));
  if (!matchedId) return null;

  const sticker = STICKER_BY_ID[matchedId];
  const actorName = resolveHighlightActorName(input.event, input.before, matchedId);
  return {
    sticker,
    actorName,
    headline: buildUnlockHeadline(actorName, matchedId),
    mascotQuip: buildMascotStickerQuip(input.mascotName, matchedId),
  };
}

/** Unlocks the Sandlot Moonshot sticker when crushing a Home Run in the 30s HR Derby. */
export function detectDerbyCelebrationSticker(input: {
  homeRuns: number;
  sluggerName: string;
  earnedStickerIds: readonly string[];
  mascotName: string;
}): CelebrationStickerUnlock | null {
  if (input.homeRuns < 1 || input.earnedStickerIds.includes('first_home_run')) {
    return null;
  }
  const sticker = STICKER_BY_ID.first_home_run;
  return {
    sticker,
    actorName: input.sluggerName,
    headline: `${input.sluggerName} mashed a 30s Derby moonshot!`,
    mascotQuip: buildMascotStickerQuip(input.mascotName, 'first_home_run'),
  };
}

/** Projects the 6-sticker Live Moment shelf for the Trophy & Sticker Album modal. */
export function buildStickerAlbumShelf(earnedStickerIds: readonly string[]): StickerAlbumShelf {
  const earned = new Set(earnedStickerIds);
  const stickers = CELEBRATION_STICKER_CATALOG.map((sticker) => ({
    ...sticker,
    unlocked: earned.has(sticker.id),
  }));
  return {
    stickers,
    unlockedCount: stickers.filter((s) => s.unlocked).length,
    totalCount: stickers.length,
  };
}
