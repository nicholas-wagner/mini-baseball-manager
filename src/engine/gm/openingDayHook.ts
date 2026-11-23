import type { Club } from '../models/club';
import type { AtBatOutcome, PlayEvent } from '../models/playEvent';
import { computePlayerOverall, isPitcherPosition, type Player } from '../models/player';

export interface SpotlightStarCard {
  roleId: 'captain' | 'ace' | 'speedster';
  roleBadge: string;
  player: Player;
  tagline: string;
}

export interface FirstPitchTipInput {
  isOpeningDay: boolean;
  isBatting: boolean;
  hasThrownPitch: boolean;
}

function pickScheduledAce(club: Club): Player | null {
  const starterId = club.rotationIds[club.rotationCursor % Math.max(1, club.rotationIds.length)];
  const scheduled = starterId ? club.roster.find((p) => p.id === starterId) : undefined;
  if (scheduled) return scheduled;
  const pitchers = club.roster.filter((p) => isPitcherPosition(p.position));
  if (pitchers.length === 0) return null;
  return [...pitchers].sort((a, b) => computePlayerOverall(b) - computePlayerOverall(a))[0];
}

function pickCaptainHitter(club: Club, excludeIds: ReadonlySet<string>): Player | null {
  const hitters = club.roster.filter((p) => !isPitcherPosition(p.position) && !excludeIds.has(p.id));
  const pool = hitters.length > 0 ? hitters : club.roster.filter((p) => !excludeIds.has(p.id));
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => computePlayerOverall(b) - computePlayerOverall(a))[0];
}

function pickSpeedster(club: Club, excludeIds: ReadonlySet<string>): Player | null {
  const hitters = club.roster.filter((p) => !isPitcherPosition(p.position) && !excludeIds.has(p.id));
  const pool = hitters.length > 0 ? hitters : club.roster.filter((p) => !excludeIds.has(p.id));
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => b.ratings.speed - a.ratings.speed)[0];
}

/** Picks up to 3 memorable stars (Captain, Staff Ace, Speedster) for an instant Opening Day intro. */
export function selectClubSpotlightTrio(club: Club): SpotlightStarCard[] {
  if (club.roster.length === 0) return [];
  const cards: SpotlightStarCard[] = [];
  const usedIds = new Set<string>();

  const captain = pickCaptainHitter(club, usedIds);
  if (captain) {
    usedIds.add(captain.id);
    cards.push({
      roleId: 'captain',
      roleBadge: '⭐ CAPTAIN',
      player: captain,
      tagline: `“${captain.nickname}” — Top bat (${computePlayerOverall(captain)} OVR)`,
    });
  }

  const ace = pickScheduledAce(club);
  if (ace && !usedIds.has(ace.id)) {
    usedIds.add(ace.id);
    cards.push({
      roleId: 'ace',
      roleBadge: '🔥 STAFF ACE',
      player: ace,
      tagline: `“${ace.nickname}” — ${ace.throws}HP fireballer (${computePlayerOverall(ace)} OVR)`,
    });
  }

  const speedster = pickSpeedster(club, usedIds);
  if (speedster) {
    cards.push({
      roleId: 'speedster',
      roleBadge: '⚡ SPEEDSTER',
      player: speedster,
      tagline: `“${speedster.nickname}” — ${speedster.ratings.speed} Speed base stealer`,
    });
  }

  return cards;
}

/** Friendly 1-line Coach Pops guidance shown before Pitch #1 of a club's Opening Day game. */
export function buildFirstPitchCoachTip(input: FirstPitchTipInput): string | null {
  if (!input.isOpeningDay || input.hasThrownPitch) return null;
  if (input.isBatting) {
    return 'Welcome to Opening Day! Pick Contact, Normal, or 💥 Swing Big below — or tap ✨ Smart Watch to cruise & jump in on big moments!';
  }
  return 'Welcome to Opening Day! Pick 🔥 Heat, 🌀 Trick, or 🎯 Corner below & tap Throw Pitch — or tap ✨ Smart Watch to watch the highlights!';
}

/** Grants +1 Opening Day Spark SP to the Captain & Staff Ace so Skill Tree is fun on Minute 1! */
export function applyOpeningDaySparkSp(club: Club): Club {
  const trio = selectClubSpotlightTrio(club);
  const sparkIds = new Set(
    trio.filter((s) => s.roleId === 'captain' || s.roleId === 'ace').map((s) => s.player.id),
  );
  if (sparkIds.size === 0) return club;
  return {
    ...club,
    roster: club.roster.map((p) =>
      sparkIds.has(p.id) ? { ...p, skillPoints: Math.max(1, p.skillPoints + 1) } : p,
    ),
  };
}

export interface WelcomeChecklistInput {
  packsOpenedCount: number;
  gamesPlayed: number;
  skillsUnlockedCount: number;
  rewardClaimed: boolean;
}

export interface WelcomeChecklistStep {
  id: 'pack' | 'game' | 'skill';
  label: string;
  done: boolean;
}

export interface WelcomeChecklistStatus {
  steps: readonly WelcomeChecklistStep[];
  completedCount: number;
  allDone: boolean;
  canClaimReward: boolean;
  showStrip: boolean;
}

export const WELCOME_CHECKLIST_CASH_BONUS = 1_000;

/** Evaluates the friendly 3-step Sandlot Starter Goals so first-timers feel instant progression. */
export function evaluateWelcomeChecklist(input: WelcomeChecklistInput): WelcomeChecklistStatus {
  const steps: WelcomeChecklistStep[] = [
    { id: 'pack', label: '🎁 Rip Welcome Foil Pack', done: input.packsOpenedCount >= 1 },
    { id: 'game', label: '⚾ Play/Sim Your 1st Game', done: input.gamesPlayed >= 1 },
    { id: 'skill', label: '⚡ Unlock Your 1st Skill', done: input.skillsUnlockedCount >= 1 },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  return {
    steps,
    completedCount,
    allDone,
    canClaimReward: allDone && !input.rewardClaimed,
    showStrip: !input.rewardClaimed,
  };
}

export interface MvpQuoteInput {
  playerName: string;
  nickname: string;
  won: boolean;
  isPitcher: boolean;
  homeRuns: number;
  strikeouts: number;
}

/** Builds a cute 1-sentence Saturday-morning cartoon dugout quote from the Player of the Game. */
export function buildMvpDugoutQuote(input: MvpQuoteInput): string {
  const first = input.playerName.split(' ')[0];
  const nick = input.nickname ? ` "${input.nickname}"` : '';
  if (!input.won) {
    return `${first}${nick}: "Shake it off, squad! Next game is ours — rally caps ON!"`;
  }
  if (input.homeRuns >= 1) {
    return `${first}${nick}: "Did you see that moonshot?! Milkshakes on me after the game!"`;
  }
  if (input.isPitcher && input.strikeouts >= 3) {
    return `${first}${nick}: "My curveball was dancing today! High-fives all around the dugout!"`;
  }
  return `${first}${nick}: "What a team win!! This Sandlot clubhouse is unstoppable!"`;
}

export interface TrophyStickerBadge {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  unlocked: boolean;
}

export interface TrophyCaseProgress {
  badges: readonly TrophyStickerBadge[];
  unlockedCount: number;
  relicsOwnedCount: number;
  favoriteCount: number;
  packsOpenedCount: number;
  pennantsCount: number;
}

export interface TrophyCaseInput {
  club: Club;
  packsOpenedCount: number;
  derbyWins: number;
  sweepsCount: number;
  favoriteCount: number;
}

/** Computes a joyful Clubhouse Sticker-Book & Trophy Album progress snapshot. */
export function evaluateTrophyCaseProgress(input: TrophyCaseInput): TrophyCaseProgress {
  const { club, packsOpenedCount, derbyWins, sweepsCount, favoriteCount } = input;
  const totalHrs = club.roster.reduce((sum, p) => sum + p.seasonStats.homeRuns, 0);
  const skillsUnlocked = club.roster.reduce(
    (sum, p) => sum + p.unlockedSkillIds.length + p.heritageTierUnlocked,
    0,
  );
  const relicsOwnedCount = club.roster.reduce(
    (sum, p) => sum + (p.equippedRelicIds?.length ?? 0),
    0,
  );
  const pennantsCount = club.stadium.championshipPennants.length;

  const badges: TrophyStickerBadge[] = [
    { id: 'first_win', emoji: '⚾', title: 'First Victory', detail: 'Win 1 game on the diamond', unlocked: club.wins >= 1 },
    { id: 'pack_ripper', emoji: '🎁', title: '1994 Foil Collector', detail: 'Rip your first Foil Pack', unlocked: packsOpenedCount >= 1 },
    { id: 'skill_spark', emoji: '⚡', title: 'Power Awakened', detail: 'Unlock any Skill or Heritage', unlocked: skillsUnlocked >= 1 },
    { id: 'relic_hunter', emoji: '🏺', title: '90s Relic Hunter', detail: 'Equip a vintage 90s Relic', unlocked: relicsOwnedCount >= 1 },
    { id: 'slugger_club', emoji: '💥', title: 'Slugger Squad', detail: 'Launch 3+ team Home Runs', unlocked: totalHrs >= 3 },
    { id: 'sweep_artist', emoji: '🧹', title: 'Sweep Artist', detail: 'Sweep a 3-game series 3-0', unlocked: sweepsCount >= 1 },
    { id: 'derby_champ', emoji: '🏆', title: 'Derby Champ', detail: 'Win an Arcade Home Run Derby', unlocked: derbyWins >= 1 },
    { id: 'fav_bond', emoji: '⭐', title: 'Clubhouse Heart', detail: 'Star a Favorite player', unlocked: favoriteCount >= 1 },
    { id: 'champ_pennant', emoji: '👑', title: 'Dynasty Pennant', detail: 'Win a League Championship', unlocked: pennantsCount >= 1 },
  ];

  return {
    badges,
    unlockedCount: badges.filter((b) => b.unlocked).length,
    relicsOwnedCount,
    favoriteCount,
    packsOpenedCount,
    pennantsCount,
  };
}

export interface PostGameHeadlineStats {
  homeRuns?: number;
  pitchingStrikeouts?: number;
  rbis?: number;
  hits?: number;
}

function buildPitchingMvpHeadline(who: string, strikeouts: number): string {
  if (strikeouts >= 5) return `🔥 ${who} fanned ${strikeouts} batters!`;
  if (strikeouts >= 2) return `🔥 ${who} mowed down ${strikeouts} batters!`;
  return `⚾ ${who} locked down the mound with a key K!`;
}

function buildHrHeadline(who: string, homeRuns: number): string {
  return homeRuns >= 2
    ? `💥 ${who} launched ${homeRuns} home runs!`
    : `💥 ${who} crushed a home run!`;
}

function buildRbiHeadline(who: string, rbis: number): string {
  return rbis >= 2 ? `⚡ ${who} drove in ${rbis} huge runs!` : `⚡ ${who} knocked in the big run!`;
}

function buildHitsHeadline(who: string, hits: number): string {
  if (hits >= 3) return `🔥 ${who} racked up ${hits} big hits!`;
  return `⭐ ${who} came through with ${hits === 1 ? 'a clutch hit' : `${hits} hits`}!`;
}

function buildHittingMvpHeadline(who: string, stats: PostGameHeadlineStats): string | null {
  if (stats.homeRuns && stats.homeRuns >= 1) return buildHrHeadline(who, stats.homeRuns);
  if (stats.rbis && stats.rbis >= 1) return buildRbiHeadline(who, stats.rbis);
  if (stats.hits && stats.hits >= 1) return buildHitsHeadline(who, stats.hits);
  return null;
}

/** Builds warm, punchy 90s sports-headline copy for the Post-Game MVP modal. */
export function buildPostGameMvpHeadline(
  playerName: string,
  stats?: PostGameHeadlineStats,
): string {
  if (!stats) return `🏆 ${playerName} stole the spotlight as Player of the Game!`;
  if (stats.homeRuns && stats.homeRuns >= 1) {
    return buildHittingMvpHeadline(playerName, stats)!;
  }
  if (stats.pitchingStrikeouts && stats.pitchingStrikeouts >= 1) {
    return buildPitchingMvpHeadline(playerName, stats.pitchingStrikeouts);
  }
  return (
    buildHittingMvpHeadline(playerName, stats) ??
    `🏆 ${playerName} stole the spotlight as Player of the Game!`
  );
}

export type MatchupSparkleTone = 'none' | 'favorite' | 'hot' | 'power' | 'celebrate';

export interface MatchupSparkleInput {
  player: Pick<Player, 'id' | 'formState'>;
  role: 'batter' | 'pitcher';
  isFavorite: boolean;
  powerReady: boolean;
  powerArmed: boolean;
  latestEvent: PlayEvent | null;
}

export interface MatchupCardSparkle {
  ringTone: MatchupSparkleTone;
  badges: readonly string[];
  reactionBubble: string | null;
}

const BATTER_ON_BASE_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'single',
  'bunt_single',
  'walk',
  'fielding_error',
]);

const PITCHER_OUT_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'ground_out',
  'fly_out',
  'line_out',
  'double_play',
  'bunt_out',
]);

function resolveBatterReaction(outcome: AtBatOutcome | undefined): string | null {
  if (!outcome) return null;
  if (outcome === 'home_run') return '💥 BOOM!';
  if (outcome === 'double' || outcome === 'triple') return '⚡ RIPPED!';
  if (BATTER_ON_BASE_OUTCOMES.has(outcome)) return '✨ ON BASE!';
  return null;
}

function resolvePitcherReaction(outcome: AtBatOutcome | undefined): string | null {
  if (!outcome) return null;
  if (outcome === 'strikeout') return '🔥 FILTHY K!';
  if (PITCHER_OUT_OUTCOMES.has(outcome)) return "🧤 GOT 'EM!";
  return null;
}

function resolveCardReaction(input: MatchupSparkleInput): string | null {
  const ev = input.latestEvent;
  if (!ev) return null;
  const actorMatches =
    input.role === 'batter' ? ev.batterId === input.player.id : ev.pitcherId === input.player.id;
  if (!actorMatches) return null;
  if (ev.specialPowerTriggered?.actor === input.role) return '⚡ SURGE!';
  return input.role === 'batter'
    ? resolveBatterReaction(ev.outcome)
    : resolvePitcherReaction(ev.outcome);
}

function resolveSparkleBadges(input: MatchupSparkleInput): string[] {
  const badges: string[] = [];
  if (input.powerArmed) badges.push('🔥 Armed!');
  else if (input.powerReady) badges.push('⚡ Power');
  if (input.isFavorite) badges.push('⭐ Fav');
  if (input.player.formState === 'hot' || input.player.formState === 'blazing') {
    badges.push('🔥 Hot');
  } else if (input.player.formState === 'cold' || input.player.formState === 'frozen') {
    badges.push('🧊 Cold');
  }
  return badges.slice(0, 2);
}

function resolveSparkleTone(
  input: MatchupSparkleInput,
  reactionBubble: string | null,
): MatchupSparkleTone {
  if (reactionBubble) return 'celebrate';
  if (input.powerArmed || input.powerReady) return 'power';
  if (input.player.formState === 'hot' || input.player.formState === 'blazing') return 'hot';
  if (input.isFavorite) return 'favorite';
  return 'none';
}

/** Computes live reactive glow rings, badges, and mini mood reactions for MatchupPrints cards. */
export function evaluateMatchupCardSparkle(input: MatchupSparkleInput): MatchupCardSparkle {
  const reactionBubble = resolveCardReaction(input);
  return {
    ringTone: resolveSparkleTone(input, reactionBubble),
    badges: resolveSparkleBadges(input),
    reactionBubble,
  };
}

/** Sorts Skill Tree players so unspent SP > 0 appear first, followed by Favorites, then the rest. */
export function sortPlayersForSkillTree(
  roster: readonly Player[],
  favoriteIds: readonly string[],
): Player[] {
  const favSet = new Set(favoriteIds);
  return roster
    .map((player, index) => ({ player, index }))
    .sort((a, b) => {
      if (b.player.skillPoints !== a.player.skillPoints) {
        return b.player.skillPoints - a.player.skillPoints;
      }
      const favDiff = Number(favSet.has(b.player.id)) - Number(favSet.has(a.player.id));
      if (favDiff !== 0) return favDiff;
      return a.index - b.index;
    })
    .map((entry) => entry.player);
}
