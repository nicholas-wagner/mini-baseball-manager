import type { OccupiedBase } from '../../engine/simulation/sacrificeAdvances';
import { getBattingSide, getFieldingSide, type GameSessionState } from '../../engine/simulation/gameState';

const bags = [
  { name: 'first', x: 32, y: 20 },
  { name: 'second', x: 20, y: 8 },
  { name: 'third', x: 8, y: 20 },
] as const;

/** Show the runner who would tie the game, or the lead runner when the tying run isn't aboard. */
export function RunnerCue({ session, advancedFrom }: { session: GameSessionState; advancedFrom?: OccupiedBase }) {
  const offense = getBattingSide(session);
  const deficit = getFieldingSide(session).score - offense.score;
  const occupied = bags.map((bag, i) => ({ ...bag, id: session.bases[i] })).filter(bag => bag.id).reverse();
  const tying = occupied[deficit - 1];
  const goal = tying ?? occupied[0];
  const focus = advancedFrom === 3 ? { name:'home', x:20, y:32 } : advancedFrom ? bags[advancedFrom] : goal;
  const id = advancedFrom ? session.bases[advancedFrom - 1] : goal?.id;
  const runner = id && offense.playersById[id];
  if (!runner) return null;
  const label = advancedFrom ? (advancedFrom === 3 ? 'Run scored' : 'Safe') : tying ? 'Tying run' : 'Lead runner';
  const position = focus.name === 'home' ? 'scores' : 'on ' + focus.name;
  return <div className="runner-cue" role="img" aria-label={label + ' · ' + runner.name + ' ' + position}>
    <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
      <path d="M20 32 8 20 20 8 32 20Z" fill="none" stroke="#bcd3c4" strokeWidth="2"/>
      {bags.map((bag, i) => <rect key={bag.name} x={bag.x-2.5} y={bag.y-2.5} width="5" height="5"
        fill={!advancedFrom && session.bases[i] ? '#fff' : '#698e82'} transform={`rotate(45 ${bag.x} ${bag.y})`}/>)}
      <circle cx={focus.x} cy={focus.y} r="6" fill="none" stroke="#ffcf50" strokeWidth="3"/>
    </svg>
    <span><small>{label}</small>{runner.name.split(' ')[0]} {position}</span>
  </div>;
}
