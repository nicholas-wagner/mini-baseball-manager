import type { ScorebookMoment } from '../../engine/gm/scorebookMoments';
import { useState } from 'react';
import { EnlargePrint } from './EnlargePrint';
import { ArrowRight } from 'lucide-react';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import pending from '../../art/portraits/illustrations/portrait-pending.svg';
import { evaluateMatchupCardSparkle } from '../../engine/gm/openingDayHook';
import type { PlayEvent } from '../../engine/models/playEvent';
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
  opponentLabel,
  onStart,
  onInspect,
}: {
  session: GameSessionState;
  opponentLabel?: string;
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
        <p className="print-kicker">
          Opening Day{opponentLabel ? ` · ${opponentLabel}` : ''}
        </p>
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
  batterFavorite = false,
  pitcherFavorite = false,
  batterPowerReady = false,
  pitcherPowerReady = false,
  batterPowerArmed = false,
  pitcherPowerArmed = false,
  latestEvent = null,
  onInspect,
}: {
  batter: Player;
  pitcher: Player;
  memories?: readonly ScorebookMoment[];
  batterFavorite?: boolean;
  pitcherFavorite?: boolean;
  batterPowerReady?: boolean;
  pitcherPowerReady?: boolean;
  batterPowerArmed?: boolean;
  pitcherPowerArmed?: boolean;
  latestEvent?: PlayEvent | null;
  onInspect: (id: string) => void;
}) {
  const entries = [
    {
      player: batter,
      role: 'At bat',
      sparkle: evaluateMatchupCardSparkle({
        player: batter,
        role: 'batter',
        isFavorite: batterFavorite,
        powerReady: batterPowerReady,
        powerArmed: batterPowerArmed,
        latestEvent,
      }),
    },
    {
      player: pitcher,
      role: 'On the mound',
      sparkle: evaluateMatchupCardSparkle({
        player: pitcher,
        role: 'pitcher',
        isFavorite: pitcherFavorite,
        powerReady: pitcherPowerReady,
        powerArmed: pitcherPowerArmed,
        latestEvent,
      }),
    },
  ];
  return (
    <div className="matchup-prints" role="group" aria-label="Matchup cards">
      {entries.map(({ player, role, sparkle }) => {
        const memory = memories.find((m) => m.playerId === player.id);
        return (
          <button
            key={role}
            type="button"
            data-sparkle-tone={sparkle.ringTone}
            className={`matchup-card-tile sparkle-${sparkle.ringTone}`}
            onClick={() => onInspect(player.id)}
            aria-label={'Inspect ' + player.name + ' card'}
          >
            <span className="matchup-thumb-wrap">
              <Print player={player} />
            </span>
            <span className="matchup-card-meta">
              <span className="matchup-card-toprow">
                <small>{role}</small>
                {sparkle.reactionBubble ? (
                  <em className="matchup-reaction-pill">{sparkle.reactionBubble}</em>
                ) : null}
              </span>
              <strong>{player.name}</strong>
              {sparkle.badges.length > 0 ? (
                <span className="matchup-sparkle-badges">
                  {sparkle.badges.map((badge) => (
                    <em key={badge}>{badge}</em>
                  ))}
                </span>
              ) : null}
              {memory ? (
                <em className="matchup-memory-line">{memory.caption} · last kept play</em>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
