import type { PlayEvent } from '../../engine/models/playEvent';
import type { GameSessionState } from '../../engine/simulation/gameState';
import { playReadout } from '../../scene/playback/playReadout';
import type { Player } from '../../engine/models/player';
import { PlayerPrint } from './GameDayPrints';

export function RallyResult({ player, event, before, gameOver, nextLabel, detail, onOpenPack, onReplay, onContinue }: {
  player: Player;
  gameOver: boolean;
  event: PlayEvent;
  before: GameSessionState;
  nextLabel: string;
  detail?: string;
  onOpenPack?: () => void;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const bases = ['first', 'second', 'third'].filter((_, i) => event.basesAfter[i]);
  const held = before.bases.every((id, i) => id === event.basesAfter[i]);
  let baseText = 'Bases empty.';
  if (gameOver) baseText = 'Final, ' + Math.max(event.homeScore, event.awayScore) + '–' + Math.min(event.homeScore, event.awayScore) + '.';
  else if (event.outsAfter === 3) baseText = 'Three outs. The sides change.';
  else if (bases.length === 3) baseText = held ? 'The bases stay loaded.' : 'Bases loaded.';
  else if (bases.length) {
    const who = bases.length === 1 ? 'Runner' : 'Runners';
    const verb = held ? (bases.length === 1 ? ' stays on ' : ' stay on ') : ' on ';
    baseText = who + verb + bases.join(' and ') + '.';
  }
  const runs = event.homeScore + event.awayScore - before.home.score - before.away.score;
  return <section className="atbat-guide rally-result" aria-label="Play result">
    <PlayerPrint player={player} />
    <div aria-live="polite">
      <strong className="rally-call">{playReadout(event)?.label}</strong>
      <h3>{player.name}</h3>
      <p>{runs > 0 && (runs === 1 ? 'One run scores. ' : runs + ' runs score. ')}{baseText}</p>
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
