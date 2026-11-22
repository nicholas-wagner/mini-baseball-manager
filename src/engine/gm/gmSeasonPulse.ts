import { getStadiumTierProfile } from '../ballparks/stadiumProgression';
import {
  LEAGUE_TIER_ORDER,
  type Club,
  type LeagueTierId,
} from '../models/club';
import type { ManagerProfile } from '../models/manager';
import {
  computePlayerOverall,
  isPitcherPosition,
  type Player,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { xpRequiredForNextLevel } from '../rpg/careerExperience';
import { deriveFormState } from '../rpg/formTracker';
import { fatigueToEndurance } from '../rpg/pitcherEndurance';
import { buildOptimalLineup } from './rosterFactory';

// ============================================================================
// 1. LIVE PROMOTION CHASE & SEASON OWNER GOAL
// ============================================================================

export type StandingsZone = 'first_place' | 'playoff_spot' | 'bubble' | 'relegation_danger';

export interface PromotionChaseStatus {
  rank: number;
  totalClubs: number;
  wins: number;
  losses: number;
  gamesBehindFirst: number;
  gamesBackOfPlayoffs: number;
  zone: StandingsZone;
  headline: string;
  nextTierRewardText: string;
  ownerGoalTitle: string;
  ownerGoalProgressPct: number;
  ownerGoalCompleted: boolean;
}

const TIER_LABELS: Readonly<Record<LeagueTierId, string>> = {
  rookie: 'ROOKIE',
  low_a: 'LOW-A',
  high_a: 'HIGH-A',
  aa: 'AA',
  aaa: 'AAA',
  majors: 'MINI MAJORS',
};

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function buildNextTierReward(tier: LeagueTierId): string {
  const idx = LEAGUE_TIER_ORDER.indexOf(tier);
  const nextTier = idx >= 0 && idx < LEAGUE_TIER_ORDER.length - 1 ? LEAGUE_TIER_ORDER[idx + 1] : null;
  if (!nextTier) return 'Win Mini Major League Crown → World Champions!';
  const nextProfile = getStadiumTierProfile(nextTier);
  return `Win Title → Promote to ${TIER_LABELS[nextTier]} (${nextProfile.maxCapacity.toLocaleString()}-seat park!)`;
}

function buildZoneHeadline(
  rank: number,
  tierLabel: string,
  gbFirst: number,
  gbPlayoffs: number,
  zone: StandingsZone,
): string {
  if (zone === 'first_place') return `1st in ${tierLabel} • Leading the Pack!`;
  if (zone === 'playoff_spot') {
    const gbText = gbFirst > 0 ? `${gbFirst.toFixed(1)} GB of 1st` : 'Tied for 1st';
    return `${ordinal(rank)} in ${tierLabel} • Playoff Spot (${gbText})`;
  }
  if (zone === 'relegation_danger') {
    return `${ordinal(rank)} in ${tierLabel} • Relegation Danger — rally now!`;
  }
  return `${ordinal(rank)} in ${tierLabel} • ${gbPlayoffs.toFixed(1)} GB of Top-4 Playoffs`;
}

/** Computes live promotion-race rank, games back, zone, and Season Owner Goal status. */
export function evaluatePromotionChase(
  tierClubs: readonly Club[],
  humanClubId: string,
  currentSeriesIndex: number,
): PromotionChaseStatus {
  const sorted = [...tierClubs].sort((a, b) => {
    const aPct = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0.5;
    const bPct = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0.5;
    if (bPct !== aPct) return bPct - aPct;
    return b.wins - a.wins;
  });

  const idx = Math.max(
    0,
    sorted.findIndex((c) => c.id === humanClubId),
  );
  const human = sorted[idx] ?? tierClubs[0];
  const rank = idx + 1;
  const leader = sorted[0] ?? human;
  const fourth = sorted[Math.min(3, sorted.length - 1)] ?? human;

  const gbFirst = Math.max(0, (leader.wins - human.wins + (human.losses - leader.losses)) / 2);
  const gbPlayoffs =
    rank <= 4 ? 0 : Math.max(0, (fourth.wins - human.wins + (human.losses - fourth.losses)) / 2);

  const zone: StandingsZone =
    rank === 1
      ? 'first_place'
      : rank <= 4
        ? 'playoff_spot'
        : rank >= sorted.length
          ? 'relegation_danger'
          : 'bubble';

  const targetWins = 10;
  const progressPct = Math.min(100, Math.round((human.wins / targetWins) * 100));
  const ownerGoalCompleted = human.wins >= targetWins && rank <= 4;
  const ownerGoalTitle = ownerGoalCompleted
    ? 'Owner Goal Complete! (+$6,000 Bonus & Rivalry Chrome Pack!)'
    : `Season Goal: Reach ${targetWins} Wins & Top-4 Playoffs (${human.wins}/${targetWins} W • Series ${Math.min(currentSeriesIndex, 7)}/7)`;

  return {
    rank,
    totalClubs: sorted.length,
    wins: human.wins,
    losses: human.losses,
    gamesBehindFirst: gbFirst,
    gamesBackOfPlayoffs: gbPlayoffs,
    zone,
    headline: buildZoneHeadline(rank, TIER_LABELS[human.leagueTier], gbFirst, gbPlayoffs, zone),
    nextTierRewardText: buildNextTierReward(human.leagueTier),
    ownerGoalTitle,
    ownerGoalProgressPct: progressPct,
    ownerGoalCompleted,
  };
}

// ============================================================================
// 2. PRE-SERIES GAMEPLAN STRATEGY & TIRED STARTER CHECK
// ============================================================================

export type SeriesGameplanId = 'balanced' | 'swing_fences' | 'small_ball' | 'bullpen_lockdown';

export interface SeriesGameplanOption {
  id: SeriesGameplanId;
  icon: string;
  label: string;
  gainBadge: string;
  tradeoffBadge: string;
}

export interface GameplanModifierEffects {
  batterContactDelta: number;
  batterPowerDelta: number;
  pitcherStuffDelta: number;
  pitcherControlDelta: number;
  whiffBonus: number;
  hrCarryMultiplier: number;
  label: string;
}

export const SERIES_GAMEPLAN_OPTIONS: readonly SeriesGameplanOption[] = [
  {
    id: 'balanced',
    icon: '⚖️',
    label: 'Balanced Baseball',
    gainBadge: 'Steady hitting & pitching',
    tradeoffBadge: 'No specialist spike',
  },
  {
    id: 'swing_fences',
    icon: '💣',
    label: 'Swing for the Fences',
    gainBadge: '+6 Power & +18% HR Carry',
    tradeoffBadge: '-5 Contact & +5% Whiffs',
  },
  {
    id: 'small_ball',
    icon: '🏃',
    label: 'Small-Ball Chaos',
    gainBadge: '+6 Contact & +Hit Pressure',
    tradeoffBadge: '-6 Power & -16% HR Carry',
  },
  {
    id: 'bullpen_lockdown',
    icon: '🔒',
    label: 'Bullpen Lockdown',
    gainBadge: '+5 Pitch Control & +4 Stuff',
    tradeoffBadge: '-3 Team Contact (defense focus)',
  },
];

const GAMEPLAN_EFFECTS_MAP: Readonly<Record<SeriesGameplanId, GameplanModifierEffects>> = {
  balanced: {
    batterContactDelta: 0,
    batterPowerDelta: 0,
    pitcherStuffDelta: 0,
    pitcherControlDelta: 0,
    whiffBonus: 0,
    hrCarryMultiplier: 1,
    label: '',
  },
  swing_fences: {
    batterContactDelta: -5,
    batterPowerDelta: 6,
    pitcherStuffDelta: 0,
    pitcherControlDelta: 0,
    whiffBonus: 0.05,
    hrCarryMultiplier: 1.18,
    label: '💣 Gameplan: Swing for the Fences (+6 PWR / -5 CON)',
  },
  small_ball: {
    batterContactDelta: 6,
    batterPowerDelta: -6,
    pitcherStuffDelta: 0,
    pitcherControlDelta: 0,
    whiffBonus: -0.04,
    hrCarryMultiplier: 0.84,
    label: '🏃 Gameplan: Small-Ball Chaos (+6 CON / -6 PWR)',
  },
  bullpen_lockdown: {
    batterContactDelta: -3,
    batterPowerDelta: 0,
    pitcherStuffDelta: 4,
    pitcherControlDelta: 5,
    whiffBonus: 0.03,
    hrCarryMultiplier: 1,
    label: '🔒 Gameplan: Bullpen Lockdown (+5 CTL, +4 STU / -3 CON)',
  },
};

export function evaluateGameplanEffects(
  gameplan: SeriesGameplanId | undefined,
): GameplanModifierEffects {
  return GAMEPLAN_EFFECTS_MAP[gameplan ?? 'balanced'];
}

export interface TiredStarterAlert {
  tiredStarter: Player;
  fresherStarter: Player;
  tiredEndurance: number;
  fresherEndurance: number;
}

/** Alerts the GM when the scheduled rotation starter is tired and a noticeably fresher arm is ready. */
export function detectTiredScheduledStarter(club: Club): TiredStarterAlert | null {
  if (club.rotationIds.length < 2) return null;
  const scheduledId = club.rotationIds[club.rotationCursor % club.rotationIds.length];
  const scheduled = club.roster.find((p) => p.id === scheduledId);
  if (!scheduled || scheduled.fatigue < 45) return null;

  const candidates = club.rotationIds
    .filter((id) => id !== scheduledId)
    .map((id) => club.roster.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p && !p.activeHealthStatus));

  const freshest = candidates.sort((a, b) => a.fatigue - b.fatigue)[0];
  if (!freshest || freshest.fatigue >= scheduled.fatigue - 12) return null;

  return {
    tiredStarter: scheduled,
    fresherStarter: freshest,
    tiredEndurance: fatigueToEndurance(scheduled.fatigue),
    fresherEndurance: fatigueToEndurance(freshest.fatigue),
  };
}

// ============================================================================
// 3. INCOMING GM INBOX EVENTS (AI TRADE OFFERS & CLUBHOUSE DILEMMAS)
// ============================================================================

export type GmInboxEventKind = 'ai_trade_offer' | 'clubhouse_dilemma';

export interface GmInboxChoice {
  label: string;
  effectHint: string;
}

export interface GmTradeOfferPayload {
  rivalClubId: string;
  rivalClubName: string;
  humanGivesPlayerId: string;
  humanGivesLabel: string;
  rivalGivesPlayerId: string;
  rivalGivesLabel: string;
  cashToHuman: number;
}

export type ClubhouseDilemmaId = 'tv_spotlight' | 'sore_star_rest' | 'retro_promo_night';

export interface GmInboxEvent {
  id: string;
  kind: GmInboxEventKind;
  badge: string;
  title: string;
  description: string;
  choices: [GmInboxChoice, GmInboxChoice];
  tradePayload?: GmTradeOfferPayload;
  dilemmaId?: ClubhouseDilemmaId;
  featuredPlayerId?: string;
}

function buildAiTradeInboxEvent(
  rng: SeededRng,
  clubs: readonly Club[],
  human: Club,
  seriesIndex: number,
): GmInboxEvent | null {
  const rivals = clubs.filter((c) => c.id !== human.id && c.roster.length >= 16);
  if (rivals.length === 0 || human.roster.length < 16) return null;
  const rival = rng.pick(rivals);

  const humanHitters = human.roster.filter((p) => !isPitcherPosition(p.position));
  const rivalHitters = rival.roster.filter((p) => !isPitcherPosition(p.position));
  if (humanHitters.length < 3 || rivalHitters.length < 3) return null;

  const give = rng.pick(humanHitters);
  const giveOvr = computePlayerOverall(give);
  const sortedRival = [...rivalHitters].sort(
    (a, b) => Math.abs(computePlayerOverall(a) - giveOvr) - Math.abs(computePlayerOverall(b) - giveOvr),
  );
  const receive = sortedRival[0];
  const recOvr = computePlayerOverall(receive);
  const cashToHuman = giveOvr > recOvr ? (giveOvr - recOvr) * 350 : 0;
  const cashNote = cashToHuman > 0 ? ` + $${cashToHuman.toLocaleString()} cash` : '';

  return {
    id: `trade-${seriesIndex}-${give.id}`,
    kind: 'ai_trade_offer',
    badge: '📞 TRADE OFFER',
    title: `${rival.city} ${rival.name} call the GM hotline!`,
    description: `They offer ${receive.position} ${receive.name} (OVR ${recOvr}, Age ${receive.age})${cashNote} for your ${give.position} ${give.name} (OVR ${giveOvr}, Age ${give.age}).`,
    choices: [
      {
        label: `Accept Trade (${receive.name})`,
        effectHint: `Add ${receive.position} OVR ${recOvr}${cashNote}`,
      },
      {
        label: 'Decline & Back Our Squad',
        effectHint: 'Keep roster • +3 Team Morale',
      },
    ],
    tradePayload: {
      rivalClubId: rival.id,
      rivalClubName: `${rival.city} ${rival.name}`,
      humanGivesPlayerId: give.id,
      humanGivesLabel: `${give.position} ${give.name} (OVR ${giveOvr})`,
      rivalGivesPlayerId: receive.id,
      rivalGivesLabel: `${receive.position} ${receive.name} (OVR ${recOvr})`,
      cashToHuman,
    },
  };
}

function buildDilemmaInboxEvent(
  rng: SeededRng,
  human: Club,
  seriesIndex: number,
): GmInboxEvent {
  const star = human.roster[0];
  const pick = rng.pick<ClubhouseDilemmaId>(['tv_spotlight', 'sore_star_rest', 'retro_promo_night']);

  if (pick === 'tv_spotlight') {
    return {
      id: `dilemma-tv-${seriesIndex}`,
      kind: 'clubhouse_dilemma',
      badge: '📺 TV DEAL',
      title: '90s Cable Network wants a Sunday Night Spotlight!',
      description: 'Primetime cameras pack the stands and pay a hefty bonus, but late travel tires the roster.',
      choices: [
        { label: 'Accept Primetime Game', effectHint: '+$3,500 Cash • +18 Hype • +6 Fatigue' },
        { label: 'Keep Normal Schedule', effectHint: '-8 Roster Fatigue • +4 Morale' },
      ],
      dilemmaId: 'tv_spotlight',
    };
  }

  if (pick === 'sore_star_rest') {
    return {
      id: `dilemma-rest-${seriesIndex}`,
      kind: 'clubhouse_dilemma',
      badge: '🩺 CLUBHOUSE CALL',
      title: `${star.name} reports a tight shoulder after warmups`,
      description: 'Rest your star to get them 100% fresh & happy, or let them gut it out for extra XP & hot form.',
      choices: [
        { label: `Rest ${star.name}`, effectHint: '-30 Fatigue • +12 Morale (0 XP)' },
        { label: 'Play Through It', effectHint: '+85 XP • +10 Form • +14 Fatigue' },
      ],
      dilemmaId: 'sore_star_rest',
      featuredPlayerId: star.id,
    };
  }

  return {
    id: `dilemma-promo-${seriesIndex}`,
    kind: 'clubhouse_dilemma',
    badge: '🎆 PROMO NIGHT',
    title: 'Bleacher Committee pitches Fireworks & Dollar Dogs!',
    description: 'Spend a little promo cash to ignite fan mania, or keep ticket margins high and pocket the profit.',
    choices: [
      { label: 'Host Fireworks Night', effectHint: '-$900 Cash • +22 Hype • +180 Fans' },
      { label: 'Pocket the Gate Cash', effectHint: '+$1,800 Cash • -4 Hype' },
    ],
    dilemmaId: 'retro_promo_night',
  };
}

/** Deterministically rolls 1 bite-sized GM Inbox event (AI Trade Offer or Clubhouse Dilemma). */
export function rollGmInboxEvent(
  rng: SeededRng,
  clubs: readonly Club[],
  humanClubId: string,
  seriesIndex: number,
): GmInboxEvent {
  const human = clubs.find((c) => c.id === humanClubId) ?? clubs[0];
  if (rng.chance(0.48)) {
    const trade = buildAiTradeInboxEvent(rng, clubs, human, seriesIndex);
    if (trade) return trade;
  }
  return buildDilemmaInboxEvent(rng, human, seriesIndex);
}

function resolveTradeInboxEvent(
  clubs: readonly Club[],
  humanClubId: string,
  event: GmInboxEvent,
  choiceIndex: 0 | 1,
): { clubs: Club[]; summary: string } {
  const payload = event.tradePayload!;
  if (choiceIndex === 1) {
    return {
      clubs: clubs.map((c) =>
        c.id === humanClubId
          ? {
              ...c,
              roster: c.roster.map((p) => ({ ...p, morale: Math.min(100, p.morale + 3) })),
            }
          : c,
      ),
      summary: `Declined ${payload.rivalClubName}’s trade offer — clubhouse rallied (+3 Morale)!`,
    };
  }

  const human = clubs.find((c) => c.id === humanClubId)!;
  const rival = clubs.find((c) => c.id === payload.rivalClubId)!;
  const outgoing = human.roster.find((p) => p.id === payload.humanGivesPlayerId);
  const incoming = rival.roster.find((p) => p.id === payload.rivalGivesPlayerId);
  if (!outgoing || !incoming) {
    return { clubs: [...clubs], summary: 'Trade expired — player already moved.' };
  }

  const nextHumanRoster = [...human.roster.filter((p) => p.id !== outgoing.id), incoming];
  const nextRivalRoster = [...rival.roster.filter((p) => p.id !== incoming.id), outgoing];

  return {
    clubs: clubs.map((c) => {
      if (c.id === human.id) {
        return {
          ...c,
          roster: nextHumanRoster,
          lineup: buildOptimalLineup(nextHumanRoster),
          economy: { ...c.economy, cash: c.economy.cash + payload.cashToHuman },
        };
      }
      if (c.id === rival.id) {
        return {
          ...c,
          roster: nextRivalRoster,
          lineup: buildOptimalLineup(nextRivalRoster),
        };
      }
      return c;
    }),
    summary: `Trade complete! Acquired ${payload.rivalGivesLabel} from ${payload.rivalClubName}!`,
  };
}

function resolveDilemmaClubUpdate(
  club: Club,
  event: GmInboxEvent,
  choiceIndex: 0 | 1,
): { club: Club; summary: string } {
  if (event.dilemmaId === 'tv_spotlight') {
    if (choiceIndex === 0) {
      return {
        club: {
          ...club,
          roster: club.roster.map((p) => ({ ...p, fatigue: Math.min(100, p.fatigue + 6) })),
          economy: {
            ...club.economy,
            cash: club.economy.cash + 3_500,
            teamHype: Math.min(100, club.economy.teamHype + 18),
          },
        },
        summary: 'Primetime Spotlight booked! Banked +$3,500 Cash & +18 Hype (+6 Fatigue).',
      };
    }
    return {
      club: {
        ...club,
        roster: club.roster.map((p) => ({
          ...p,
          fatigue: Math.max(0, p.fatigue - 8),
          morale: Math.min(100, p.morale + 4),
        })),
      },
      summary: 'Kept a calm schedule — roster recovered -8 Fatigue & +4 Morale.',
    };
  }

  if (event.dilemmaId === 'sore_star_rest') {
    const targetId = event.featuredPlayerId ?? club.roster[0]?.id;
    const rested = choiceIndex === 0;
    return {
      club: {
        ...club,
        roster: club.roster.map((p) => {
          if (p.id !== targetId) return p;
          if (rested) {
            return {
              ...p,
              fatigue: Math.max(0, p.fatigue - 30),
              morale: Math.min(100, p.morale + 12),
            };
          }
          const nextForm = Math.min(100, p.formScore + 10);
          return {
            ...p,
            xp: p.xp + 85,
            formScore: nextForm,
            formState: deriveFormState(nextForm),
            fatigue: Math.min(100, p.fatigue + 14),
          };
        }),
      },
      summary: rested
        ? 'Smart rest call! Star recovered -30 Fatigue & +12 Morale.'
        : 'Gritty guts! Star pushed through for +85 XP & +10 Form (+14 Fatigue).',
    };
  }

  if (choiceIndex === 0) {
    return {
      club: {
        ...club,
        economy: {
          ...club.economy,
          cash: Math.max(0, club.economy.cash - 900),
          teamHype: Math.min(100, club.economy.teamHype + 22),
          fanBase: club.economy.fanBase + 180,
        },
      },
      summary: 'Fireworks & Dollar Dogs packed the bleachers (+22 Hype, +180 Fans)!',
    };
  }
  return {
    club: {
      ...club,
      economy: {
        ...club.economy,
        cash: club.economy.cash + 1_800,
        teamHype: Math.max(0, club.economy.teamHype - 4),
      },
    },
    summary: 'Pocketed +$1,800 gate profit (-4 Team Hype).',
  };
}

/** Applies the GM's chosen Inbox decision purely onto tier clubs & manager profile. */
export function resolveGmInboxDecision(
  clubs: readonly Club[],
  humanClubId: string,
  manager: ManagerProfile,
  event: GmInboxEvent,
  choiceIndex: 0 | 1,
): { clubs: Club[]; manager: ManagerProfile; summary: string } {
  if (event.kind === 'ai_trade_offer' && event.tradePayload) {
    const res = resolveTradeInboxEvent(clubs, humanClubId, event, choiceIndex);
    return { clubs: res.clubs, manager, summary: res.summary };
  }

  const human = clubs.find((c) => c.id === humanClubId);
  if (!human) return { clubs: [...clubs], manager, summary: 'No club found.' };
  const updated = resolveDilemmaClubUpdate(human, event, choiceIndex);
  return {
    clubs: clubs.map((c) => (c.id === human.id ? updated.club : c)),
    manager,
    summary: updated.summary,
  };
}

// ============================================================================
// 4. HOT-HAND / BREAKOUT WATCH & 1-TAP LINEUP SPOTLIGHT
// ============================================================================

export interface BreakoutCandidate {
  player: Player;
  xpToNextLevel: number;
  badgeText: string;
  canSpotlightInLineup: boolean;
}

export interface RosterSpotlightReport {
  breakout: BreakoutCandidate | null;
  coldStarter: Player | null;
}

function scoreBreakoutCandidate(p: Player): { score: number; xpRemaining: number } {
  const needed = xpRequiredForNextLevel(p.level);
  const xpRemaining = Math.max(0, needed - p.xp);
  let score = 0;
  if (xpRemaining <= 80) score += 45 + (80 - xpRemaining) * 0.5;
  if (p.formScore >= 12) score += 30 + p.formScore;
  if (p.age <= 24) score += 15;
  return { score, xpRemaining };
}

function buildBreakoutCandidate(
  club: Club,
  best: { player: Player; xpRemaining: number },
): BreakoutCandidate {
  const lineupIds = new Set(club.lineup.map((s) => s.playerId));
  const topSlotId = club.lineup[0]?.playerId;
  return {
    player: best.player,
    xpToNextLevel: best.xpRemaining,
    badgeText:
      best.xpRemaining <= 80
        ? `⚡ ${best.xpRemaining} XP to LV.${best.player.level + 1} (+SP!)`
        : `🔥 ON FIRE (+${best.player.formScore} Form)`,
    canSpotlightInLineup:
      !isPitcherPosition(best.player.position) &&
      lineupIds.has(best.player.id) &&
      best.player.id !== topSlotId,
  };
}

/** Identifies the club's #1 Breakout / Hot-Hand watch player and any cold lineup starter. */
export function evaluateRosterSpotlight(club: Club): RosterSpotlightReport {
  let best: { player: Player; score: number; xpRemaining: number } | null = null;
  for (const p of club.roster) {
    if (p.activeHealthStatus) continue;
    const { score, xpRemaining } = scoreBreakoutCandidate(p);
    if (score >= 30 && (!best || score > best.score)) {
      best = { player: p, score, xpRemaining };
    }
  }

  const breakout = best ? buildBreakoutCandidate(club, best) : null;
  const coldStarter =
    club.lineup
      .map((s) => club.roster.find((p) => p.id === s.playerId))
      .find((p): p is Player => Boolean(p && p.formScore <= -12)) ?? null;

  return { breakout, coldStarter };
}

/** Promotes a hot/breakout lineup hitter into the leadoff (#1) spot for extra at-bats & motivation. */
export function applySpotlightLineupMove(
  club: Club,
  playerId: string,
): { applied: boolean; club: Club; summary: string } {
  const idx = club.lineup.findIndex((s) => s.playerId === playerId);
  if (idx <= 0) {
    return { applied: false, club, summary: 'Player is already leading off or not in lineup.' };
  }
  const slotA = club.lineup[0];
  const slotB = club.lineup[idx];
  const nextLineup = club.lineup.map((slot, i) => {
    if (i === 0) return { ...slotB, orderIndex: 0 };
    if (i === idx) return { ...slotA, orderIndex: idx };
    return slot;
  });
  const target = club.roster.find((p) => p.id === playerId);
  const nextRoster = club.roster.map((p) =>
    p.id === playerId ? { ...p, xp: p.xp + 20, morale: Math.min(100, p.morale + 5) } : p,
  );

  return {
    applied: true,
    club: { ...club, lineup: nextLineup, roster: nextRoster },
    summary: `Spotlight! ${target?.name ?? 'Hitter'} moved to #1 Leadoff (+20 XP & +5 Morale)!`,
  };
}
