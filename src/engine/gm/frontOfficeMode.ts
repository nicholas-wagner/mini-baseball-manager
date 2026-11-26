import { FAIR_TICKET_PRICE_BY_TIER } from '../economy/attendance';
import type { ThrowsHand } from '../handedness/types';
import type { Club, LineupSlot } from '../models/club';
import { computePlayerOverall, isPitcherPosition, type Player } from '../models/player';
import { evaluatePositionAssignment } from '../rpg/specialistsAndPositions';
import { buildOptimalLineup, validateLineup } from './rosterFactory';
import { autoTuneLineupForStarter, summarizeLineupChange } from './seriesRecap';

export type FrontOfficeMode = 'auto' | 'semi_auto' | 'manual';

export interface FrontOfficeModeOption {
  id: FrontOfficeMode;
  shortLabel: string;
  label: string;
  description: string;
}

export const FRONT_OFFICE_MODE_OPTIONS: readonly FrontOfficeModeOption[] = [
  {
    id: 'auto',
    shortLabel: 'Auto',
    label: 'Auto (Assistant GM)',
    description: 'Assistant GM automatically replaces IL starters and keeps ticket prices fan-friendly.',
  },
  {
    id: 'semi_auto',
    shortLabel: 'Ask Me',
    label: 'Ask Me (Checklist)',
    description: 'Assistant GM flags routine IL, lineup & ticket tips with a 1-tap apply button.',
  },
  {
    id: 'manual',
    shortLabel: 'Manual',
    label: 'Manual (Full GM)',
    description: '100% hands-on control over every roster move, lineup card, and ticket price.',
  },
];

export interface FrontOfficeTaskItem {
  kind: 'il_lineup_fix' | 'fair_tickets' | 'platoon_lineup';
  label: string;
  detail: string;
}

export interface RoutineFrontOfficePlan {
  needsAction: boolean;
  items: readonly FrontOfficeTaskItem[];
  recommendedTicketPrice: number;
  hasMandatoryIlStarter: boolean;
}

export interface RoutineFrontOfficeResult {
  club: Club;
  actionsApplied: readonly string[];
}

function isMandatoryIlPlayer(player: Player | undefined): boolean {
  const status = player?.activeHealthStatus;
  return Boolean(status && status.gamesRemaining > 0 && (!status.canPlayThrough || !status.playingThrough));
}

function findMandatoryIlStarterIds(club: Club): string[] {
  const byId = new Map(club.roster.map((p) => [p.id, p]));
  return club.lineup
    .map((slot) => slot.playerId)
    .filter((id) => isMandatoryIlPlayer(byId.get(id)));
}

function countOutOfPositionStarters(club: Club): number {
  const byId = new Map(club.roster.map((p) => [p.id, p]));
  return club.lineup.filter((slot) => {
    const p = byId.get(slot.playerId);
    return p ? evaluatePositionAssignment(p, slot.defensivePosition).isOutOfPosition : false;
  }).length;
}

function pickBestHealthyBenchReplacement(
  club: Club,
  usedIds: ReadonlySet<string>,
  pos: LineupSlot['defensivePosition'],
): Player | null {
  const healthyBench = club.roster.filter(
    (p) => !isPitcherPosition(p.position) && !usedIds.has(p.id) && !isMandatoryIlPlayer(p),
  );
  if (healthyBench.length === 0) return null;
  return [...healthyBench].sort((a, b) => {
    const aOop = evaluatePositionAssignment(a, pos).isOutOfPosition ? -18 : 0;
    const bOop = evaluatePositionAssignment(b, pos).isOutOfPosition ? -18 : 0;
    return computePlayerOverall(b) + bOop - (computePlayerOverall(a) + aOop);
  })[0];
}

function replaceIlStartersInLineup(club: Club): { lineup: LineupSlot[]; replacedNames: string[] } {
  const byId = new Map(club.roster.map((p) => [p.id, p]));
  const usedIds = new Set(club.lineup.map((s) => s.playerId));
  const replacedNames: string[] = [];

  const nextLineup = club.lineup.map((slot) => {
    const starter = byId.get(slot.playerId);
    if (!isMandatoryIlPlayer(starter)) return slot;
    const sub = pickBestHealthyBenchReplacement(club, usedIds, slot.defensivePosition);
    if (!sub) return slot;
    usedIds.delete(slot.playerId);
    usedIds.add(sub.id);
    replacedNames.push(`${sub.name} for IL ${starter?.name ?? 'Starter'}`);
    return { ...slot, playerId: sub.id };
  });

  if (validateLineup({ ...club, lineup: nextLineup }).valid) {
    return { lineup: nextLineup, replacedNames };
  }
  const healthyRoster = club.roster.filter((p) => !isMandatoryIlPlayer(p));
  const fallback = buildOptimalLineup(healthyRoster.length >= 9 ? healthyRoster : club.roster);
  return { lineup: fallback, replacedNames };
}

function isTicketPriceOffBand(club: Club): boolean {
  const fairPrice = FAIR_TICKET_PRICE_BY_TIER[club.leagueTier];
  return Math.abs(club.economy.ticketPrice - fairPrice) >= 3;
}

/** Audits routine Front Office housekeeping (IL starters, fan-friendly ticket band, OOP tune-up). */
export function evaluateRoutineFrontOfficePlan(
  club: Club,
  opponentStarterThrows?: ThrowsHand,
): RoutineFrontOfficePlan {
  const items: FrontOfficeTaskItem[] = [];
  const ilStarterIds = findMandatoryIlStarterIds(club);
  const recommendedTicketPrice = FAIR_TICKET_PRICE_BY_TIER[club.leagueTier];

  if (ilStarterIds.length > 0) {
    items.push({
      kind: 'il_lineup_fix',
      label: `Swap ${ilStarterIds.length} IL starter${ilStarterIds.length === 1 ? '' : 's'}`,
      detail: 'Start healthy bench bats until injured players recover.',
    });
  }

  if (isTicketPriceOffBand(club)) {
    items.push({
      kind: 'fair_tickets',
      label: `Set fair $${recommendedTicketPrice} tickets`,
      detail: `Current $${club.economy.ticketPrice} tickets hurt fan draw or revenue.`,
    });
  }

  if (opponentStarterThrows && countOutOfPositionStarters(club) > 0) {
    items.push({
      kind: 'platoon_lineup',
      label: `Fix defense vs ${opponentStarterThrows}HP`,
      detail: 'Slide fielders into natural spots with platoon edges.',
    });
  }

  return {
    needsAction: items.length > 0,
    items,
    recommendedTicketPrice,
    hasMandatoryIlStarter: ilStarterIds.length > 0,
  };
}

function applyHealthyPlatoonTune(
  club: Club,
  opponentStarterThrows: ThrowsHand,
): { lineup: LineupSlot[]; summary: string | null } {
  const healthyRoster = club.roster.filter((p) => !isMandatoryIlPlayer(p));
  const healthyClub: Club =
    healthyRoster.filter((p) => !isPitcherPosition(p.position)).length >= 9
      ? { ...club, roster: healthyRoster }
      : club;
  const tuned = autoTuneLineupForStarter(healthyClub, opponentStarterThrows);
  const diff = summarizeLineupChange(club.lineup, tuned.lineup, `vs ${opponentStarterThrows}HP`);
  if (diff.changedCount === 0 || !validateLineup({ ...club, lineup: tuned.lineup }).valid) {
    return { lineup: club.lineup, summary: null };
  }
  return { lineup: tuned.lineup, summary: diff.message };
}

/** Pure deterministic routine Front Office pass safe for Auto mode and Ask-Me 1-tap apply. */
export function applyRoutineFrontOfficeAutomation(
  club: Club,
  opponentStarterThrows?: ThrowsHand,
): RoutineFrontOfficeResult {
  let working: Club = club;
  const actionsApplied: string[] = [];

  if (findMandatoryIlStarterIds(working).length > 0) {
    const fixed = replaceIlStartersInLineup(working);
    if (fixed.replacedNames.length > 0) {
      working = { ...working, lineup: fixed.lineup };
      actionsApplied.push(`IL lineup fix: started ${fixed.replacedNames.join(', ')}.`);
    }
  }

  if (isTicketPriceOffBand(working)) {
    const fair = FAIR_TICKET_PRICE_BY_TIER[working.leagueTier];
    working = { ...working, economy: { ...working.economy, ticketPrice: fair } };
    actionsApplied.push(`Tickets balanced to $${fair} for packed stands.`);
  }

  if (opponentStarterThrows && countOutOfPositionStarters(working) > 0) {
    const tuned = applyHealthyPlatoonTune(working, opponentStarterThrows);
    if (tuned.summary) {
      working = { ...working, lineup: tuned.lineup };
      actionsApplied.push(tuned.summary);
    }
  }

  return { club: working, actionsApplied };
}
