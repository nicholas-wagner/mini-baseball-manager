import type { PlayEvent } from '../models/playEvent';
import {
  PITCH_TYPE_LABELS,
  type Player,
  type PitchType,
} from '../models/player';
import {
  classifyEnduranceTier,
  fatigueToEndurance,
} from '../rpg/pitcherEndurance';
import type { SeededRng } from '../rng/seededRng';
import {
  getBattingSide,
  getCurrentBatter,
  getCurrentPitcher,
  getDefenderAtPosition,
  getFieldingSide,
  type GameSessionState,
  type TeamGameSide,
} from './gameState';
import type { PitchTargetIntent } from './pitchMindGames';
import type { PitchResolution } from './pitchResolver';

function thirdBaseResult(
  odds: number,
  outs: number,
  rng: SeededRng,
  call?: 'hold' | 'send',
) {
  const send = call ? call === 'send' : odds >= (outs === 2 ? 48 : 65);
  if (!send) return 'held';
  return rng.next() * 100 < odds ? 'safe' : 'out';
}

export function readThirdBase(
  state: GameSessionState,
  hit: PitchResolution,
  rng: SeededRng,
  call?: 'send' | 'hold',
): PlayEvent['thirdBase'] {
  const id = state.bases[1];
  if (hit.outcome !== 'single' || !id || state.bases[2] || !hit.ballFlight)
    return;
  const runner = getBattingSide(state).playersById[id];
  const x = hit.ballFlight.landingX;
  const position = x < -6 ? 'LF' : x > 6 ? 'RF' : 'CF';
  const defender = getDefenderAtPosition(getFieldingSide(state), position);
  const odds = Math.min(
    94,
    Math.max(
      14,
      Math.round(61 + (runner.ratings.speed - defender.ratings.arm) * 0.8),
    ),
  );
  const close = odds >= 35 && odds <= 85;
  const result = thirdBaseResult(odds, state.outs, rng, call);
  return {
    runnerId: id,
    position,
    arm: defender.ratings.arm,
    odds,
    close,
    result,
  };
}

const fastballs: ReadonlySet<PitchType> = new Set([
  'four_seam',
  'two_seam',
  'cutter',
]);

function suggestPitch(session: GameSessionState, lastTwo: PitchType[]) {
  const arsenal = getCurrentPitcher(session).pitchArsenal;
  if (!arsenal) return;
  const last = lastTwo[lastTwo.length - 1];
  const alternatives = arsenal.repertoire.filter(
    (slot) => slot.pitchType !== last,
  );
  const sameSpeed = fastballs.has(lastTwo[0]) === fastballs.has(last);
  const changeSpeed = alternatives.filter(
    (slot) => fastballs.has(slot.pitchType) !== fastballs.has(last),
  );
  const candidates =
    sameSpeed && changeSpeed.length ? changeSpeed : alternatives;
  const weakness = getCurrentBatter(session).batterPitchProfile.weakPitch;
  return (
    candidates.find((slot) => slot.pitchType === weakness)?.pitchType ??
    candidates.sort((a, b) => b.mastery - a.mastery)[0]?.pitchType
  );
}

export function catcherSign(session: GameSessionState) {
  const history = session.atBatPitchHistory;
  if (history.length < 2) return null;
  const pair = history.slice(-2);
  const last = pair[1];
  const pitch = suggestPitch(session, pair);
  if (!pitch) return null;
  const target: PitchTargetIntent =
    !fastballs.has(pitch) && session.balls < 3
      ? 'bury_offspeed'
      : 'paint_corners';
  const seen =
    pair[0] === last
      ? '2 × ' + PITCH_TYPE_LABELS[last]
      : pair.map((type) => PITCH_TYPE_LABELS[type]).join(' → ');
  return {
    pitch,
    target,
    text:
      seen +
      ' → try ' +
      PITCH_TYPE_LABELS[pitch] +
      (target === 'bury_offspeed' ? ' low' : ' on the corner'),
  };
}

function starterTiring(side: TeamGameSide) {
  return (
    side.isHuman &&
    side.activePitcherId === side.usedPitcherIds[0] &&
    ['tiring', 'fatigued', 'gassed'].includes(
      classifyEnduranceTier(fatigueToEndurance(side.pitcherFatigue)),
    )
  );
}
export function personalWatchStop(
  session: GameSessionState,
  choice: string,
): string | null {
  const fielding = getFieldingSide(session),
    batting = getBattingSide(session);
  if (choice === 'starter') {
    return starterTiring(fielding)
      ? getCurrentPitcher(session).name + ' is tiring'
      : null;
  }
  if (choice === 'tying') {
    const deficit = fielding.score - batting.score;
    return deficit > 0 && session.bases.filter(Boolean).length >= deficit
      ? 'The tying run is on base'
      : null;
  }
  const batter = getCurrentBatter(session);
  return batting.isHuman &&
    batter.id === choice &&
    session.balls + session.strikes === 0
    ? batter.name + ' is up'
    : null;
}

export function gazetteCaption(
  player: Player,
  opponent: Pick<TeamGameSide, 'clubId' | 'name'>,
): string | null {
  if (player.formerClubIds.includes(opponent.clubId))
    return player.name + ' faces the ' + opponent.name + ', their former club.';
  if (player.careerService.seasonsPlayed >= 3)
    return (
      player.name +
      ' brings ' +
      player.careerService.seasonsPlayed +
      ' seasons of experience to this matchup.'
    );
  if (player.careerStats.plateAppearances === 0)
    return (
      player.name +
      ' came into today looking for a first career plate appearance.'
    );
  return null;
}

export type ContactPoint = { x: number; z: number };
export function recentContact(
  player: Pick<Player, 'id' | 'recentContact'>,
  events: readonly PlayEvent[],
): ContactPoint[] {
  const points = [...(player.recentContact ?? [])];
  for (const ev of events) {
    if (
      ev.type === 'ball_in_play' &&
      ev.batterId === player.id &&
      ev.ballFlight
    ) {
      points.push({ x: ev.ballFlight.landingX, z: ev.ballFlight.landingZ });
    }
  }
  return points.slice(-6);
}

export function contactSector(x: number) {
  return x < -6 ? 'left' : x > 6 ? 'right' : 'center';
}

export function stanceHabit(seed: number, pitcher: boolean, quiet = false) {
  if (pitcher) return quiet ? 'rub' : seed % 3 === 0 ? 'roll' : 'set';
  return (['nod', 'tap', 'rock'] as const)[Math.abs(seed % 3)];
}

export const HABIT_CAPTIONS = {
  nod: 'Dips the brim before the pitch.',
  tap: 'Taps the bat twice before settling in.',
  rock: 'Rocks back on the rear foot.',
  rub: 'Rubs the ball before bringing the hands together.',
  roll: 'Rolls the ball in the glove.',
  set: 'Holds a tall, still set on the mound.',
};
