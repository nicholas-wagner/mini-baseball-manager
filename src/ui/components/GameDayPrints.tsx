import type { ScorebookMoment } from '../../engine/gm/scorebookMoments';
import { useState } from 'react';
import { EnlargePrint } from './EnlargePrint';
import { ArrowRight } from 'lucide-react';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import pending from '../../art/portraits/illustrations/portrait-pending.svg';
import { evaluateMatchupCardSparkle } from '../../engine/gm/openingDayHook';
import type { PitcherEnduranceTier } from '../../engine/rpg/pitcherEndurance';
import type { PlayEvent } from '../../engine/models/playEvent';
import { PITCH_TYPE_LABELS, type Player } from '../../engine/models/player';
import type { GameSessionState } from '../../engine/simulation/gameState';
import { getCurrentBatter, getCurrentPitcher } from '../../engine/simulation/gameState';
import './gameDayPrints.css';

export function PlayerPrint({ player }: { player: Player }) {
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

function openingObjective(s: GameSessionState, batting: boolean) {
  const ours = s.home.isHuman ? s.home.score : s.away.score;
  const theirs = s.home.isHuman ? s.away.score : s.home.score;
  const aboard = s.bases.filter(Boolean).length;
  if (!batting) return s.outs === 2 ? 'Get the last out of the inning.' :
    aboard ? 'Get an out before the runners score.' : 'Get the batter out.';
  if (theirs > ours && theirs - ours <= aboard) return 'The tying run is on base. Bring it home.';
  if (s.bases[1] || s.bases[2]) return 'A hit could bring a runner home.';
  return aboard ? 'Move your runner around the bases.' : 'Get on base and start a rally.';
}

export function OpeningDayPrint({
  cover = false,
  session,
  opponentLabel,
  onStart,
  onInspect,
  onToggleSide,
  onOpenDerby,
}: {
  session: GameSessionState;
  cover?: boolean;
  opponentLabel?: string;
  onStart: () => void;
  onInspect: (player: Player) => void;
  onToggleSide?: () => void;
  onOpenDerby?: () => void;
}) {
  const batting = (session.half === 'BOT') === session.home.isHuman;
  const player = batting ? getCurrentBatter(session) : getCurrentPitcher(session);
  return (
    <section className={cover ? "opening-print opening-feature" : "opening-print"} aria-label="Opening Day feature">
      <button
        className="opening-art"
        aria-label={'Inspect ' + player.name + ' card'}
        onClick={() => onInspect(player)}
      >
        <PlayerPrint player={player} />
        <span>
          {player.position} <b>#{player.jerseyNumber}</b>
        </span>
      </button>
      <div className="opening-copy">
        <p className="print-kicker">
          {cover ? 'Your Opening Day' : 'Opening Day'}{opponentLabel ? ` · ${opponentLabel}` : ''}
        </p>
        <h2>{player.name}</h2>
        <p className="opening-inning">
          {session.half === 'TOP' ? 'Top' : 'Bottom'} of inning {session.inning}
        </p>
        <p>{describeSituation(session)}</p>
        {cover && <p className="opening-objective">{openingObjective(session, batting)}</p>}
        <div className="opening-actions">
          <button className="opening-start" onClick={onStart}>
            {batting ? 'Bat' : 'Pitch'} with {player.name.split(' ')[0]}{' '}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          {cover && (onToggleSide || onOpenDerby) ? (
            <div className="opening-quick-pills">
              {onToggleSide ? (
                <button
                  type="button"
                  data-testid="opening-side-toggle"
                  className="opening-quick-pill opening-side-pill"
                  aria-label={batting ? 'Switch Opening Day to pitching first' : 'Switch Opening Day to batting first'}
                  onClick={onToggleSide}
                >
                  {batting ? '🔥 Pitch First' : '⚾ Bat First'}
                </button>
              ) : null}
              {onOpenDerby ? (
                <button
                  type="button"
                  data-testid="opening-derby-btn"
                  className="opening-quick-pill opening-derby-pill"
                  aria-label="Play 30-Second Home Run Derby"
                  onClick={onOpenDerby}
                >
                  💥 30s HR Derby
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
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
              <PlayerPrint player={player} />
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

export function BatterEntrance({ player, pitching = false, guided = false }: { player: Player; pitching?: boolean; guided?: boolean }) {
  return (
    <div data-testid="player-entrance" className={guided ? "batter-entrance guided-entrance" : "batter-entrance"} aria-hidden="true">
      <PlayerPrint player={player} />
      <span>
        {pitching ? 'On the mound' : 'At bat'}
        <br />
        <b>{player.name}</b>
      </span>
    </div>
  );
}

export function MatchupPrints({
  guided = false,
  nextBatterName,
  batter,
  pitcher,
  memories = [],
  batterScoutLine,
  pitcherScoutLine,
  pitcherEndurance,
  pitcherEnduranceTier,
  pitcherFatigueDropTag,
  batterFavorite = false,
  pitcherFavorite = false,
  batterPowerReady = false,
  pitcherPowerReady = false,
  batterPowerArmed = false,
  pitcherPowerArmed = false,
  latestEvent = null,
  onInspect,
}: {
  guided?: boolean;
  nextBatterName?: string;
  batter: Player;
  pitcher: Player;
  memories?: readonly ScorebookMoment[];
  batterScoutLine?: string;
  pitcherScoutLine?: string;
  pitcherEndurance?: number;
  pitcherEnduranceTier?: PitcherEnduranceTier;
  pitcherFatigueDropTag?: string | null;
  batterFavorite?: boolean;
  pitcherFavorite?: boolean;
  batterPowerReady?: boolean;
  pitcherPowerReady?: boolean;
  batterPowerArmed?: boolean;
  pitcherPowerArmed?: boolean;
  latestEvent?: PlayEvent | null;
  onInspect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tired = pitcherEnduranceTier && ['tiring', 'fatigued', 'gassed'].includes(pitcherEnduranceTier);
  const clue = tired ? pitcher.name.split(' ')[0] + ' is tiring.' :
    batter.ratings.speed >= 75 ? batter.name.split(' ')[0] + ' runs fast.' :
    pitcher.name.split(' ')[0] + (pitcher.throws === 'L' ? ' throws left-handed.' : ' throws right-handed.');
  const entries = [
    {
      player: batter,
      role: nextBatterName ? 'Last at bat' : 'At bat',
      scoutLine: batterScoutLine,
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
      scoutLine: pitcherScoutLine,
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
    <div className={guided ? 'matchup-wrap guided-matchup' : 'matchup-wrap'}>
    <div className="matchup-prints" role="group" aria-label="Matchup cards">
      {entries.map(({ player, role, scoutLine, sparkle }) => {
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
              <PlayerPrint player={player} />
            </span>
            <span className="matchup-card-meta">
              <span className="matchup-card-toprow">
                <small>{role}</small>
                {sparkle.reactionBubble ? (
                  <em className="matchup-reaction-pill">{sparkle.reactionBubble}</em>
                ) : null}
              </span>
              <strong>{player.name}</strong>
              {scoutLine ? (
                <em className="matchup-scout-line" data-testid="matchup-scout-line">
                  {scoutLine}
                </em>
              ) : null}
              {role === 'On the mound' && typeof pitcherEndurance === 'number' ? (
                <span
                  className="matchup-endurance-wrap"
                  data-testid="pitcher-endurance-meter"
                  aria-label={`Pitcher endurance ${pitcherEndurance}%`}
                >
                  <span className="matchup-endurance-track">
                    <span
                      className={`matchup-endurance-fill tier-${pitcherEnduranceTier ?? 'fresh'}`}
                      style={{ width: `${Math.max(4, Math.min(100, pitcherEndurance))}%` }}
                    />
                  </span>
                  {pitcherFatigueDropTag ? (
                    <em className="matchup-fatigue-drop">{pitcherFatigueDropTag}</em>
                  ) : null}
                </span>
              ) : null}
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
    {guided && <>
      <div className="matchup-clue"><span>{nextBatterName ? 'Up next · ' + nextBatterName : clue}</span><button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>Matchup</button></div>
      {expanded && <section aria-label="Matchup scouting" className="matchup-scouting">
        <h3>{batter.name}</h3>
        <p>{batter.bats === 'S' ? 'Switch hitter' : batter.bats === 'L' ? 'Bats left' : 'Bats right'} · Contact {batter.ratings.contact} · Power {batter.ratings.power} · Speed {batter.ratings.speed}</p>
        <h3>{pitcher.name}</h3>
        <p>Throws {pitcher.throws === 'L' ? 'left' : 'right'}{pitcher.pitchArsenal && ' · Favorite pitch: ' + PITCH_TYPE_LABELS[pitcher.pitchArsenal.favoritePitch]}</p>
        <p>Endurance {pitcherEndurance}%{pitcherFatigueDropTag && ' · ' + pitcherFatigueDropTag}</p>
        {[batter, pitcher].map(player => {
          const memory = memories.find(moment => moment.playerId === player.id);
          return memory && <p key={player.id}>From your scorebook · {memory.caption}</p>;
        })}
      </section>}
    </>}
    </div>
  );
}
