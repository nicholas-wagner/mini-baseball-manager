import { FORCE_HOLD_SECONDS } from './firstAtBatPresentation';
import type { AtBatOutcome, PlayEvent } from '../../engine/models/playEvent';
import { isBuntEvent } from './diamondPlay';
import type { ChoreographedStep } from './eventChoreographer';

const labels: Record<AtBatOutcome, string> = {
  called_strike: 'Strike',
  swinging_strike: 'Strike',
  ball: 'Ball',
  foul: 'Foul ball',
  walk: 'Ball four',
  strikeout: 'Strikeout',
  single: 'Single',
  double: 'Double',
  triple: 'Triple',
  home_run: 'Home run',
  ground_out: 'Ground out',
  fly_out: 'Fly out',
  line_out: 'Line out',
  double_play: 'Double play',
  sac_fly: 'Sacrifice fly',
  fielding_error: 'Fielding error',
  bunt_single: 'Bunt single',
  bunt_out: 'Bunt out',
};

export function playReadout(event?: PlayEvent | null) {
  if (!event) return null;
  const { outcome, outsAfter, outsBefore, basesAfter, batterId } = event;
  const steal = event.type === 'stolen_base_attempt';
  if (!outcome && !steal) return null;
  const strike = outcome === 'called_strike' || outcome === 'swinging_strike';
  const count = strike ? event.strikes : event.balls;
  const words = ['', ' one', ' two', ' three', ' four'];
  const baseLabel =
    outcome === 'fly_out' && outsAfter - outsBefore >= 2
      ? 'Thrown out tagging'
      : outcome === 'fly_out' && event.battedBallType === 'pop_up'
        ? isBuntEvent(event)
          ? 'Bunt pop-up'
          : 'Pop-up out'
        : labels[outcome!];
  const label = steal
    ? outsAfter > outsBefore
      ? 'Caught stealing'
      : 'Stolen base'
    : baseLabel + (strike || outcome === 'ball' ? (words[count] ?? '') : '');
  const lamp = strike
    ? 'strikes'
    : outcome === 'ball'
      ? 'balls'
      : outsAfter > outsBefore || outcome?.endsWith('_out') || outcome === 'strikeout'
        ? 'outs'
        : null;
  const base = batterId ? basesAfter.indexOf(batterId) + 1 : 0;
  return { label, lamp, base };
}

export function decisionDelayMs(step: ChoreographedStep) {
  const play = step.play ?? step.close ?? step.outfield;
  return play ? (step.durationMs * play.finish) / (play.duration + (play.holdForceCall ? FORCE_HOLD_SECONDS : 0)) : 0;
}

/** Score the assist only when the official event and the visible throw agree. */
export function scoringDetail(event: PlayEvent, play?: ChoreographedStep['play']) {
  const fielder = event.fieldingHighlight;
  if (!fielder?.fielderId || !event.batterId || event.outcome !== 'ground_out' ||
      event.outsAfter <= event.outsBefore || event.basesAfter.includes(event.batterId) ||
      play?.kind !== 'ground_out') return;
  const pos = fielder.fielderPos;
  if (!play.legs.some(leg => leg.kind === 'throw' && leg.from === pos && leg.to === '1B')) return;
  if (pos === 'SS') return 'Shortstop to first · 6–3';
  if (pos === '2B') return 'Second to first · 4–3';
  if (pos === '3B') return 'Third to first · 5–3';
}
