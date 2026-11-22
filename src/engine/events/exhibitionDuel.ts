import { createClub } from '../gm/rosterFactory';
import type { Club, LeagueTierId } from '../models/club';
import type { PlayEvent } from '../models/playEvent';
import type { GameLengthInnings } from '../models/player';
import type { NationalityId } from '../nationalities/types';
import { createSeededRng } from '../rng/seededRng';
import { simFullGame } from '../simulation/baseballEngine';
import type { BatterBoxLine } from '../simulation/gameState';

export type GuestBossPresetId =
  | 'cyber_sluggers_94'
  | 'osaka_kitsune'
  | 'huracan_allstars';

export interface GuestBossPreset {
  id: GuestBossPresetId;
  city: string;
  name: string;
  mascot: string;
  monogram: string;
  primary: string;
  secondary: string;
  accent: string;
  tagline: string;
  lockedNationalityId?: NationalityId;
}

export interface ExhibitionDuelOptions {
  innings?: GameLengthInnings;
  seed: number;
}

export interface ExhibitionDuelResult {
  homeClubName: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  humanWon: boolean;
  winnerName: string;
  inningsPlayed: number;
  highlights: string[];
  mvpName: string;
  mvpLine: string;
  rewardCash: number;
  hypeDelta: number;
  shareableSummary: string;
}

export const GUEST_BOSS_PRESETS: readonly GuestBossPreset[] = [
  {
    id: 'cyber_sluggers_94',
    city: 'Neon City',
    name: '1994 Cyber Sluggers',
    mascot: 'Arcade Bot',
    monogram: 'CS',
    primary: '#7209B7',
    secondary: '#181B2C',
    accent: '#00E5FF',
    tagline: 'Retro 16-bit mashers rocking neon batting gloves.',
  },
  {
    id: 'osaka_kitsune',
    city: 'Osaka',
    name: 'Kitsune Stars',
    mascot: 'Nine-Tail Fox',
    monogram: 'OK',
    primary: '#E63946',
    secondary: '#1D3557',
    accent: '#FFD166',
    tagline: 'Precision spin wizards & lightning contact bats from Japan.',
    lockedNationalityId: 'JPN',
  },
  {
    id: 'huracan_allstars',
    city: 'Santo Domingo',
    name: 'Huracán All-Stars',
    mascot: 'Storm Hawk',
    monogram: 'HA',
    primary: '#002D62',
    secondary: '#CE1126',
    accent: '#FFC300',
    tagline: 'Electric bat-flip thunder & blazing basepath speed.',
    lockedNationalityId: 'DOM',
  },
];

/** Builds a deterministic retro Guest Boss opponent club for solo or pass-and-play Exhibition Duels. */
export function buildGuestBossClub(
  presetId: GuestBossPresetId,
  tier: LeagueTierId,
  seed: number,
): Club {
  const preset = GUEST_BOSS_PRESETS.find((p) => p.id === presetId) ?? GUEST_BOSS_PRESETS[0];
  const base = createClub(createSeededRng(seed), {
    id: `boss-${preset.id}-${seed}`,
    isHuman: false,
    city: preset.city,
    name: preset.name,
    mascot: preset.mascot,
    colors: {
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent,
      monogram: preset.monogram,
    },
    leagueTier: tier,
  });

  if (!preset.lockedNationalityId) return base;
  const locked = preset.lockedNationalityId;
  return {
    ...base,
    roster: base.roster.map((p) => ({ ...p, nationalityId: locked })),
  };
}

function isHighlightEvent(ev: PlayEvent): boolean {
  return (
    ev.outcome === 'home_run' ||
    ev.outcome === 'triple' ||
    ev.outcome === 'double' ||
    ev.outcome === 'strikeout' ||
    ev.type === 'stolen_base_attempt' ||
    Boolean(ev.specialPowerTriggered)
  );
}

function extractDuelHighlights(events: readonly PlayEvent[]): string[] {
  const curated = events
    .filter(isHighlightEvent)
    .slice(0, 6)
    .map((ev) => `Inn ${ev.inning} (${ev.half}): ${ev.commentary}`);
  if (curated.length > 0) return curated;
  return events.slice(-3).map((ev) => `Inn ${ev.inning}: ${ev.commentary}`);
}

function pickDuelMvp(
  lines: readonly BatterBoxLine[],
  nameById: ReadonlyMap<string, string>,
): { name: string; line: string } {
  let best: BatterBoxLine | null = null;
  let bestScore = -1;
  for (const row of lines) {
    const score = row.hits * 2 + row.homeRuns * 5 + row.rbis * 2 + row.stolenBases * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  if (!best) {
    return { name: 'Bullpen Ace', line: 'Lockdown pitching performance' };
  }
  return {
    name: nameById.get(best.playerId) ?? 'Club Slugger',
    line: `${best.hits}-${best.atBats}, ${best.homeRuns} HR, ${best.rbis} RBI, ${best.stolenBases} SB`,
  };
}

/** Runs an offline Pass-and-Play or Boss Exhibition Duel between the human club and an imported challenger. */
export function runFriendExhibitionDuel(
  humanClub: Club,
  challengerClub: Club,
  options: ExhibitionDuelOptions,
): ExhibitionDuelResult {
  const innings: GameLengthInnings = options.innings ?? 5;
  const result = simFullGame(challengerClub, humanClub, options.seed, innings);
  const humanWon = result.winnerClubId === humanClub.id;
  const homeClubName = `${humanClub.city} ${humanClub.name}`;
  const awayClubName = `${challengerClub.city} ${challengerClub.name}`;
  const winnerName = humanWon ? homeClubName : awayClubName;

  const nameById = new Map<string, string>();
  for (const p of [...humanClub.roster, ...challengerClub.roster]) {
    nameById.set(p.id, p.name);
  }
  const allBatters = [
    ...Object.values(result.boxScore.homeBatters),
    ...Object.values(result.boxScore.awayBatters),
  ];
  const mvp = pickDuelMvp(allBatters, nameById);
  const rewardCash = humanWon ? 1_500 : 500;
  const hypeDelta = humanWon ? 7 : 2;
  const inningsPlayed = Math.max(innings, result.finalState.inning);

  const shareableSummary = [
    `MINI BASEBALL MANAGER — PASS-AND-PLAY EXHIBITION DUEL (${inningsPlayed} Inn)`,
    `${awayClubName} ${result.awayScore} @ ${homeClubName} ${result.homeScore}`,
    `Winner: ${winnerName} | MVP: ${mvp.name} (${mvp.line})`,
  ].join('\n');

  return {
    homeClubName,
    awayClubName,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    humanWon,
    winnerName,
    inningsPlayed,
    highlights: extractDuelHighlights(result.events),
    mvpName: mvp.name,
    mvpLine: mvp.line,
    rewardCash,
    hypeDelta,
    shareableSummary,
  };
}

/** Applies Exhibition Duel prize cash & fan hype immutably to the human club. */
export function applyExhibitionDuelRewards(club: Club, duel: ExhibitionDuelResult): Club {
  return {
    ...club,
    economy: {
      ...club.economy,
      cash: club.economy.cash + duel.rewardCash,
      teamHype: Math.min(100, club.economy.teamHype + duel.hypeDelta),
    },
  };
}
