import type { DiamondPlay } from './diamondPlay';

/** Pause at the collision, then catch up by the next ball arrival so the UI verdict stays in sync. */
export function barrelReplayTime(play: DiamondPlay, time: number, rate: number) {
  const [pitch, flight] = play.legs;
  if (pitch.to !== 'BAT' || !flight || time <= pitch.end || time >= flight.end) return time;
  const span = flight.end - pitch.end;
  const hold = Math.min(.060 * rate, span * .8);
  return pitch.end + Math.max(0, time - pitch.end - hold) * span / (span - hold);
}

export function crowdReaction(play: DiamondPlay) {
  if (play.outfield?.robbedHomeRun) return { at: play.pickupAt, level: 1, stand: true };
  const stand = ['single', 'double', 'triple', 'bunt_single', 'home_run'].includes(play.kind);
  if (play.ending?.kind === 'walkoff') return { at: play.ending.start, level: 1, stand };
  if (stand) return { at: play.outfield ? play.legs[1].end : play.finish, level: play.kind === 'home_run' ? .94 : .72, stand };
  if (['called_third', 'swinging_third', 'steal_safe'].includes(play.kind)) return { at: play.finish, level: .66, stand };
}

export function decayExcitement(level: number, elapsed: number) {
  return .2 + (level - .2) * Math.exp(-elapsed * .74);
}
