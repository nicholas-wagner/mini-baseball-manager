import type { Club } from '../models/club';
import type { AtBatOutcome, PlayEvent, TacticalCall } from '../models/playEvent';
import {
  computePlayerOverall,
  isPitcherPosition,
  PITCH_TYPE_SHORT_LABELS,
  type Player,
} from '../models/player';
import { fatigueToEndurance } from '../rpg/pitcherEndurance';
import type { GameSessionState } from '../simulation/gameState';
import type { PitchTargetIntent } from '../simulation/pitchMindGames';

export interface SpotlightStarCard {
  roleId: 'captain' | 'ace' | 'speedster';
  roleBadge: string;
  player: Player;
  tagline: string;
}

export interface PitchCallGuideOption {
  id: PitchTargetIntent;
  label: string;
  shortLabel: string;
  actionLabel: string;
  tradeoff: string;
}

export interface SwingCallGuideOption {
  id: TacticalCall;
  label: string;
  shortLabel: string;
  actionLabel: string;
  tradeoff: string;
}

export const PITCH_CALL_GUIDE: readonly PitchCallGuideOption[] = [
  {
    id: 'attack_zone',
    label: 'Over the plate',
    shortLabel: '🎯 Over Plate',
    actionLabel: 'Pitch over the plate',
    tradeoff: 'Safe strike. Easier to hit.',
  },
  {
    id: 'paint_corners',
    label: 'Corner',
    shortLabel: '🎨 Corner',
    actionLabel: 'Pitch to the corner',
    tradeoff: 'More strikeouts. Risk a walk.',
  },
  {
    id: 'bury_offspeed',
    label: 'Low and away',
    shortLabel: '🌀 Low Chase',
    actionLabel: 'Pitch low',
    tradeoff: 'Chase pitch. Great with 2 strikes.',
  },
  {
    id: 'high_heat',
    label: 'High heat',
    shortLabel: '🔥 Heat',
    actionLabel: 'Throw high heat',
    tradeoff: 'Extra velocity. Risky if squared.',
  },
];

export const SWING_CALL_GUIDE: readonly SwingCallGuideOption[] = [
  {
    id: 'contact',
    label: 'Make contact',
    shortLabel: '🎯 Contact',
    actionLabel: 'Swing for contact',
    tradeoff: 'Easier to connect. Less power.',
  },
  {
    id: 'normal',
    label: 'Balanced',
    shortLabel: '⚾ Balanced',
    actionLabel: 'Swing balanced',
    tradeoff: 'Steady mix of hits and pop.',
  },
  {
    id: 'power',
    label: 'Swing big',
    shortLabel: '💥 Swing Big',
    actionLabel: 'Swing for power',
    tradeoff: 'More power. Easier to miss.',
  },
];

export interface MatchupScoutLine {
  batterLine: string;
  pitcherLine: string;
}

export interface BetweenGameSpotlightInput {
  canClaimStarterReward: boolean;
  unopenedPackCount: number;
  hasUnreadStoryBeat: boolean;
  storyBeatTitle?: string;
  hasGmDilemma: boolean;
  gmDilemmaHeadline?: string;
  totalUnspentSp: number;
  hasSeriesRecap: boolean;
  seriesRecapHeadline?: string;
}

export type BetweenGameSpotlightKind =
  | 'starter_reward'
  | 'foil_pack'
  | 'story_chapter'
  | 'gm_dilemma'
  | 'skill_points'
  | 'series_recap'
  | 'derby_invite';

export interface BetweenGameSpotlightCard {
  id: BetweenGameSpotlightKind;
  eyebrow: string;
  title: string;
  detail: string;
  ctaLabel: string;
  tone: 'gold' | 'violet' | 'turf' | 'coral' | 'sky';
}

export interface BetweenGameSpotlightSelection {
  primary: BetweenGameSpotlightCard | null;
  secondaryCount: number;
  all: readonly BetweenGameSpotlightCard[];
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

function pickThirdSpotlightPlayer(
  club: Club,
  excludeIds: ReadonlySet<string>,
  needFemaleRepresentation: boolean,
): Player | null {
  const remaining = club.roster.filter((p) => !excludeIds.has(p.id));
  if (remaining.length === 0) return null;
  if (needFemaleRepresentation) {
    const femaleHitters = remaining.filter(
      (p) => p.traits.playerLook === 'female' && !isPitcherPosition(p.position),
    );
    const femalePool =
      femaleHitters.length > 0
        ? femaleHitters
        : remaining.filter((p) => p.traits.playerLook === 'female');
    if (femalePool.length > 0) {
      return [...femalePool].sort(
        (a, b) => b.ratings.speed + computePlayerOverall(b) - (a.ratings.speed + computePlayerOverall(a)),
      )[0];
    }
  }
  const hitters = remaining.filter((p) => !isPitcherPosition(p.position));
  const pool = hitters.length > 0 ? hitters : remaining;
  return [...pool].sort((a, b) => b.ratings.speed - a.ratings.speed)[0];
}

function buildThirdStarTagline(player: Player): string {
  const ovr = computePlayerOverall(player);
  if (player.ratings.speed >= 65) {
    return `“${player.nickname}” — ${player.ratings.speed} Speed base stealer`;
  }
  if (player.ratings.fielding >= 62) {
    return `“${player.nickname}” — ${player.ratings.fielding} Glove sparkplug`;
  }
  return `“${player.nickname}” — Rising club spark (${ovr} OVR)`;
}

/** Picks up to 3 memorable stars (Captain, Staff Ace, Speedster/Spark) with co-ed representation. */
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

  const alreadyHasFemale = cards.some((c) => c.player.traits.playerLook === 'female');
  const thirdStar = pickThirdSpotlightPlayer(club, usedIds, !alreadyHasFemale);
  if (thirdStar) {
    cards.push({
      roleId: 'speedster',
      roleBadge: thirdStar.ratings.speed >= 65 ? '⚡ SPEEDSTER' : '✨ CLUB SPARK',
      player: thirdStar,
      tagline: buildThirdStarTagline(thirdStar),
    });
  }

  return cards;
}

function formatBatterScoutStat(batter: Player): string {
  const { power, speed, contact } = batter.ratings;
  if (power >= speed && power >= contact) return `PWR ${power}`;
  if (speed >= contact) return `SPD ${speed}`;
  return `CON ${contact}`;
}

function formatScoutFormTag(formState: Player['formState']): string {
  if (formState === 'blazing' || formState === 'hot') return ' • Hot 🔥';
  if (formState === 'cold' || formState === 'frozen') return ' • Cold 🧊';
  return '';
}

/** Concise 2-second scouting line for live matchup cards without spreadsheet clutter. */
export function buildMatchupScoutLine(
  batter: Player,
  pitcher: Player,
  session: GameSessionState,
): MatchupScoutLine {
  const batSide = batter.bats === 'S' ? 'SHB' : `${batter.bats}HB`;
  const pitchingSide = session.half === 'TOP' ? session.home : session.away;
  const pitBox =
    session.half === 'TOP'
      ? session.boxScore.homePitchers[pitcher.id]
      : session.boxScore.awayPitchers[pitcher.id];
  const pitches = pitBox?.pitchesThrown ?? 0;
  const endPct = fatigueToEndurance(pitchingSide.pitcherFatigue);
  const favPitch = pitcher.pitchArsenal
    ? ` • ★ ${PITCH_TYPE_SHORT_LABELS[pitcher.pitchArsenal.favoritePitch]}`
    : '';

  return {
    batterLine: `${batSide} • ${formatBatterScoutStat(batter)}${formatScoutFormTag(batter.formState)}`,
    pitcherLine: `${pitcher.throws}HP • ${pitches} P • ${endPct}%${favPitch}`,
  };
}

const MASCOT_QUIPS: Readonly<Record<'happy' | 'cheering' | 'rally' | 'determined', readonly string[]>> = {
  happy: [
    'Ready for some sandlot magic!',
    'Sun’s out, gloves on — let’s play!',
    'High-fives in the dugout!',
  ],
  cheering: [
    'WHOA!! That’s how we do it!!',
    'Cue the fireworks and peanuts!',
    'Best club in the whole league!',
  ],
  rally: [
    'Rally caps ON — time to shine!',
    'Clap it up! Big inning coming!',
    'Noise meter to the MAX!!',
  ],
  determined: [
    'Shake it off — next one’s ours!',
    'Deep breath. Paint the corner!',
    'Comeback story starts right here!',
  ],
};

/** Returns a playful Saturday-morning cartoon mascot speech line. */
export function buildMascotCheerQuip(
  mascot: string,
  mood: 'happy' | 'cheering' | 'rally' | 'determined',
  seedIndex = 0,
): string {
  const pool = MASCOT_QUIPS[mood];
  const picked = pool[Math.abs(seedIndex) % pool.length];
  return `${mascot.split(' ')[0]}: "${picked}"`;
}

const DERBY_INVITE_CARD: BetweenGameSpotlightCard = {
  id: 'derby_invite',
  eyebrow: '💥 QUICK ARCADE BREAK',
  title: 'Try a 30-Second Home Run Derby!',
  detail: 'Test your sweet-spot timing for +$1,200 Cash & a Foil Pack.',
  ctaLabel: 'Play 30s HR Derby',
  tone: 'coral',
};

function collectPrimarySpotlightCards(
  input: BetweenGameSpotlightInput,
): BetweenGameSpotlightCard[] {
  const cards: BetweenGameSpotlightCard[] = [];
  if (input.canClaimStarterReward) {
    cards.push({
      id: 'starter_reward',
      eyebrow: '🌟 STARTER GOALS COMPLETE',
      title: 'Claim +$1,000 Cash & Bonus Foil Pack!',
      detail: 'You finished all 3 Sandlot Starter Goals.',
      ctaLabel: '🎁 Claim Starter Reward!',
      tone: 'gold',
    });
  }
  if (input.unopenedPackCount > 0) {
    const plural = input.unopenedPackCount === 1 ? '' : 's';
    cards.push({
      id: 'foil_pack',
      eyebrow: '🎁 1994 CARD SHOP',
      title: `${input.unopenedPackCount} Unopened Foil Pack${plural} Ready!`,
      detail: 'Peel 3 shiny foil cards for vintage relics, XP & cash.',
      ctaLabel: 'Rip Foil Pack!',
      tone: 'coral',
    });
  }
  if (input.hasUnreadStoryBeat) {
    cards.push({
      id: 'story_chapter',
      eyebrow: '📖 CLUBHOUSE STORY BEAT',
      title: input.storyBeatTitle ?? 'New Story Chapter Ready!',
      detail: 'Make a fun dugout choice to shape your club’s legend.',
      ctaLabel: 'Read Story Chapter',
      tone: 'violet',
    });
  }
  return cards;
}

function collectSecondarySpotlightCards(
  input: BetweenGameSpotlightInput,
): BetweenGameSpotlightCard[] {
  const cards: BetweenGameSpotlightCard[] = [];
  if (input.hasGmDilemma) {
    cards.push({
      id: 'gm_dilemma',
      eyebrow: '📬 FRONT OFFICE CALL',
      title: input.gmDilemmaHeadline ?? 'Incoming GM Dilemma',
      detail: 'Your front office needs a quick call before next pitch.',
      ctaLabel: 'Review Call',
      tone: 'sky',
    });
  }
  if (input.totalUnspentSp > 0) {
    const plural = input.totalUnspentSp === 1 ? '' : 's';
    cards.push({
      id: 'skill_points',
      eyebrow: '⚡ LEVEL-UP POWER',
      title: `${input.totalUnspentSp} Skill Point${plural} Ready to Spend`,
      detail: 'Unlock Cultural Heritage powers or Manager Skipper tricks.',
      ctaLabel: 'Spend Skill Points',
      tone: 'violet',
    });
  }
  if (input.hasSeriesRecap) {
    cards.push({
      id: 'series_recap',
      eyebrow: '📰 SANDLOT SPORTS EXTRA',
      title: input.seriesRecapHeadline ?? 'Series Final Recap Ready',
      detail: 'Check your 3-game scores, standings climb & Series MVP.',
      ctaLabel: 'Read Series Recap',
      tone: 'turf',
    });
  }
  return cards;
}

/** Selects 1 calm prioritized Between-Game Spotlight card to prevent post-game dashboard overload. */
export function selectBetweenGameSpotlight(
  input: BetweenGameSpotlightInput,
): BetweenGameSpotlightSelection {
  const combined = [
    ...collectPrimarySpotlightCards(input),
    ...collectSecondarySpotlightCards(input),
  ];
  const all = combined.length > 0 ? combined : [DERBY_INVITE_CARD];
  return {
    primary: all[0],
    secondaryCount: Math.max(0, all.length - 1),
    all,
  };
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
