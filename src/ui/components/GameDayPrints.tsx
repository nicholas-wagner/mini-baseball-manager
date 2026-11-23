import type { ScorebookMoment } from '../../engine/gm/scorebookMoments';
import { useState } from 'react';
import { EnlargePrint } from './EnlargePrint';
import { ArrowRight } from 'lucide-react';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import pending from '../../art/portraits/illustrations/portrait-pending.svg';
import type { Player } from '../../engine/models/player';
import type { GameSessionState } from '../../engine/simulation/gameState';
import { getCurrentBatter, getCurrentPitcher } from '../../engine/simulation/gameState';
import './gameDayPrints.css';

function Print({ player }: { player: Player }) {
  const src = playerIllustration(player.id);
  const [failed, setFailed] = useState<string>();
  return (
    <img
      alt={player.name + ' baseball card'}
      src={src && src !== failed ? src : pending}
      width={256}
      height={320}
      onError={() => setFailed(src)}
    />
  );
}

function describeSituation(s: GameSessionState) {
  const human = s.home.isHuman ? s.home : s.away;
  const rival = s.home.isHuman ? s.away : s.home;
  const score = human.score === rival.score ? 'Tied' : human.score > rival.score ? 'Ahead' : 'Behind';
  const bases = ['first', 'second', 'third'].filter((_, i) => s.bases[i]);
  const runners =
    bases.length === 3 ? 'Bases loaded' : bases.length ? 'On ' + bases.join(' and ') : 'Bases empty';
  return (
    score +
    ' ' +
    human.score +
    '–' +
    rival.score +
    '. ' +
    runners +
    ', ' +
    ['no outs', 'one out', 'two outs'][s.outs] +
    '.'
  );
}

export function OpeningDayPrint({
  session,
  onStart,
  onInspect,
}: {
  session: GameSessionState;
  onStart: () => void;
  onInspect: (player: Player) => void;
}) {
  const batting = (session.half === 'BOT') === session.home.isHuman;
  const player = batting ? getCurrentBatter(session) : getCurrentPitcher(session);
  return (
    <section className="opening-print" aria-label="Opening Day feature">
      <button
        className="opening-art"
        aria-label={'Inspect ' + player.name + ' card'}
        onClick={() => onInspect(player)}
      >
        <Print player={player} />
        <span>
          {player.position} <b>#{player.jerseyNumber}</b>
        </span>
      </button>
      <div className="opening-copy">
        <p className="print-kicker">Opening Day</p>
        <h2>{player.name}</h2>
        <p className="opening-inning">
          {session.half === 'TOP' ? 'Top' : 'Bottom'} of inning {session.inning}
        </p>
        <p>{describeSituation(session)}</p>
        <button className="opening-start" onClick={onStart}>
          {batting ? 'Bat' : 'Pitch'} with {player.name.split(' ')[0]}{' '}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function RosterPrintGallery({ players, club }: { players: Player[]; club: string }) {
  return (
    <section className="roster-gallery" aria-label="Roster print gallery">
      <h3>
        {club} <span>Print gallery</span>
      </h3>
      <div>
        {players.map((player) => {
          const src = playerIllustration(player.id);
          const caption = (
            <>
              <Print player={player} />
              <span>
                <b>{player.name}</b>
                <small>
                  {player.position} · #{player.jerseyNumber}
                </small>
              </span>
            </>
          );
          return src ? (
            <EnlargePrint key={player.id} name={player.name} src={src}>
              {caption}
            </EnlargePrint>
          ) : (
            <div className="gallery-tile" key={player.id}>
              {caption}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BatterEntrance({ player }: { player: Player }) {
  return (
    <div className="batter-entrance" aria-hidden="true">
      <Print player={player} />
      <span>
        At bat
        <br />
        <b>{player.name}</b>
      </span>
    </div>
  );
}

export function MatchupPrints({
  batter,
  pitcher,
  memories = [],
  onInspect,
}: {
  batter: Player;
  pitcher: Player;
  memories?: readonly ScorebookMoment[];
  onInspect: (id: string) => void;
}) {
  return (
    <div className="matchup-prints" role="group" aria-label="Matchup cards">
      {[
        { player: batter, role: 'At bat' },
        { player: pitcher, role: 'On the mound' },
      ].map(({ player, role }) => {
        const memory = memories.find(m => m.playerId === player.id);
        return (
        <button
          key={role}
          onClick={() => onInspect(player.id)}
          aria-label={'Inspect ' + player.name + ' card'}
        >
          <Print player={player} />
          <span>
            <small>{role}</small>
            <strong>{player.name}</strong>
            {memory && <em className="matchup-memory-line">{memory.caption} · last kept play</em>}
          </span>
        </button>
      );})}
    </div>
  );
}
