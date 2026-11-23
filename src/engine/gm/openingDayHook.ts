import type { Club } from '../models/club';
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
