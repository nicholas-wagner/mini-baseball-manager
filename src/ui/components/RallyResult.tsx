import { describeBuntAdvance, sacrificeAdvances } from '../../scene/playback/sacrificeBunt';
import type { PlayEvent } from '../../engine/models/playEvent';
import { getBattingSide, getFieldingSide, getCurrentBatter, getCurrentPitcher, type GameSessionState } from '../../engine/simulation/gameState';
import { playReadout } from '../../scene/playback/playReadout';
import { PlayerPrint } from './GameDayPrints';

function describeBatter(name: string, event: PlayEvent) {
  switch (event.outcome) {
    case 'ground_out': case 'bunt_out': return name + ' is out at first.';
    case 'strikeout': return name + ' strikes out.';
    case 'fly_out': return name + ' flies out.';
    case 'line_out': return name + ' lines out.';
    case 'double_play': return 'Two outs on the play.';
    case 'single': case 'bunt_single': return name + ' singles.';
    case 'double': return name + ' hits a double.';
    case 'triple': return name + ' hits a triple.';
    case 'home_run': return name + ' homers!';
    case 'walk': return name + ' draws a walk.';
    case 'fielding_error': return name + ' reaches on an error.';
    case 'sac_fly': return name + ' hits a sacrifice fly.';
    default: return (playReadout(event)?.label ?? 'Play complete') + '.';
  }
}

export function RallyResult({ event, before, gameOver, nextLabel, detail, onOpenPack, onReplay, onContinue }: {
  gameOver: boolean;
  event: PlayEvent;
  before: GameSessionState;
  nextLabel: string;
  detail?: string;
  onOpenPack?: () => void;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const offense = getBattingSide(before);
  const defense = getFieldingSide(before);
  const batter = (event.batterId && offense.playersById[event.batterId]) || getCurrentBatter(before);
  const pitcher = (event.pitcherId && defense.playersById[event.pitcherId]) || getCurrentPitcher(before);
  const madeOut = event.outsAfter > event.outsBefore;
  const defender = event.fieldingHighlight && defense.playersById[event.fieldingHighlight.fielderId];
  const steal = event.type === 'stolen_base_attempt';
  // On a double steal the lead runner makes the play at the far bag.
  const movedId = steal && before.bases.filter((id, i) => id && id !== event.basesAfter[i]).at(-1);
  const runner = (movedId && offense.playersById[movedId]) || batter;
  const subject = steal ? runner : batter;
  const winningDefender = event.outcome === 'strikeout' ? pitcher : defender;
  const player = (defense.isHuman && madeOut && winningDefender) || subject;
  const first = subject.name.split(' ')[0];
  let verdict = describeBatter(first, event);
  if (steal) verdict = first + (madeOut ? ' is caught stealing.' : ' steals a base.');
  if (player === pitcher && event.outcome === 'strikeout') verdict = pitcher.name.split(' ')[0] + ' strikes out ' + first + '.';
  const bases = ['first', 'second', 'third'].filter((_, i) => event.basesAfter[i]);
  const held = before.bases.every((id, i) => id === event.basesAfter[i]);
  let baseText = 'Bases empty.';
  if (gameOver) baseText = 'Final, ' + Math.max(event.homeScore, event.awayScore) + '–' + Math.min(event.homeScore, event.awayScore) + '.';
  else if (event.outsAfter === 3) baseText = 'Three outs. The sides change.';
  else if (bases.length === 3) baseText = held ? 'The bases stay loaded.' : 'Bases loaded.';
  else if (bases.length) {
    const who = bases.length === 1 ? 'Runner' : 'Runners';
    const verb = held ? (bases.length === 1 ? ' stays on ' : ' stay on ') : ' on ';
    baseText = held && bases.length === 2 ? 'Both runners hold.' : who + verb + bases.join(' and ') + '.';
  }
  const runs = event.homeScore + event.awayScore - before.home.score - before.away.score;
  const buntAdvances = sacrificeAdvances(event, before.bases, runs);
  if (buntAdvances) {
    verdict = `${first} lays down a sacrifice bunt and is out at first.`;
    if (!gameOver && runs === 0) baseText = describeBuntAdvance(buntAdvances) + '.';
  }
  return <section className="atbat-guide rally-result" aria-label="Play result">
    <PlayerPrint player={player} />
    <div aria-live="polite">
      <h3>{player.name}</h3>
      <p>{verdict} {runs > 0 && (runs === 1 ? 'One run scores. ' : runs + ' runs score. ')}{baseText}</p>
    </div>
    {detail && <details className="rally-detail"><summary>Scoring detail</summary><p>{detail}</p></details>}
    {onOpenPack && <aside className="rally-gift">
      <span>Opening Day foil pack</span><button onClick={onOpenPack}>Open foil pack</button>
    </aside>}
    <footer>
      <button className="atbat-tip" onClick={onReplay}>Watch again</button>
      <button className="atbat-go" onClick={onContinue}>{nextLabel}</button>
    </footer>
  </section>;
}
