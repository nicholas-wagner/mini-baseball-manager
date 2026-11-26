import { useEffect, useState, type ReactNode } from 'react';
import type { BallparkPreset } from '../../engine/ballparks/stadiumCatalog';
import type { Club, LeagueWireFinal } from '../../engine/models/club';
import {
  contactSector,
  type ContactPoint,
} from '../../engine/simulation/dugoutCalls';
import './dugoutScouting.css';

const tips: Record<BallparkPreset['id'], string> = {
  sandlot_commons:
    'Even fences down both lines. Set your order for the starting pitcher.',
  brickyard_classic:
    'The high left-field wall turns deep drives into doubles. Put speed ahead of your gap hitter.',
  cornfield_twilight:
    'The ball carries here. Give a power bat another trip to the plate.',
  harbor_shipyard: 'A short right-field porch rewards left-handed pull power.',
  bayfront_cove:
    'Deep alleys reward extra-base speed. Put your runners ahead of a gap hitter.',
  sunbelt_cactus:
    'Grounders scoot across the hardpan. Give your contact hitters an early turn.',
  sakura_garden: 'Deep center and a quick infield favor hitters who can run.',
  high_altitude_mesa:
    'Thin air rewards a drive in the air. Bat your power threat early.',
  neon_metro_dome:
    'Fast turf lets grounders reach the gaps. Bat speed ahead of contact.',
  grand_cathedral:
    'Right field is the shorter line. A lefty can turn on an inside pitch.',
};

export function ParkLineupCard({
  club,
  park,
  onSwap,
}: {
  club: Club;
  park: BallparkPreset;
  onSwap: (a: number, b: number) => void;
}) {
  const [picked, setPicked] = useState('');
  const id = picked || club.lineup[1]?.playerId;
  const index = club.lineup.findIndex((slot) => slot.playerId === id);
  const f = park.factors;
  return (
    <details className="park-scout">
      <summary>Park scouting · {park.name}</summary>
      <div className="park-report">
        <svg
          viewBox="0 0 162 94"
          role="img"
          aria-label={'Fence distances at ' + park.name}
        >
          <path
            d={`M81 86 L10 ${58 - (f.leftWallFt - 310) * 0.48} Q80 ${-42 - (f.centerWallFt - 390) * 0.65} 152 ${58 - (f.rightWallFt - 310) * 0.48} Z`}
            fill="#247650"
            stroke="#f1c057"
            strokeWidth="3"
          />
          <path d="m81 86 -13 -13 13 -13 13 13Z" fill="#d5a76d" />
          <g fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
            <text x="81" y="26">
              {f.centerWallFt} ft
            </text>
            <text x="41" y="49">
              {f.leftWallFt} ft
            </text>
            <text x="122" y="49">
              {f.rightWallFt} ft
            </text>
          </g>
        </svg>
        <p>{tips[park.id]}</p>
      </div>
      <div className="park-order">
        <select
          aria-label="Hitter to move up"
          value={id}
          onChange={(e) => setPicked(e.target.value)}
        >
          {club.lineup.map((slot, i) => {
            const p = club.roster.find((p) => p.id === slot.playerId);
            return (
              <option key={slot.playerId} value={slot.playerId}>
                {i + 1}. {p?.name} ({p?.bats})
              </option>
            );
          })}
        </select>
        <button
          disabled={index < 1}
          onClick={() => {
            setPicked(id);
            onSwap(index, index - 1);
          }}
        >
          Move up ↑
        </button>
      </div>
    </details>
  );
}

export function SprayChart({ points }: { points: readonly ContactPoint[] }) {
  if (!points.length)
    return <p className="spray-empty">No fair contact recorded yet.</p>;
  const sectors = ['left', 'center', 'right'] as const;
  const locations = new Map<string, { point: ContactPoint; count: number }>();
  for (const point of points) {
    const key = point.x + ',' + point.z;
    locations.set(key, { point, count: (locations.get(key)?.count ?? 0) + 1 });
  }
  return (
    <figure className="spray-chart">
      <svg
        viewBox="-28 -1 56 51"
        role="img"
        aria-label={points.length + ' balls in play'}
      >
        <path d="M0 47 -26 21 Q0 -16 26 21Z" fill="#316c48" stroke="#e8c26e" />
        <path d="m0 47 -8 -8 8 -8 8 8Z" fill="#cdad78" />
        {Array.from(locations, ([key, { point, count }]) => {
          const x = Math.max(-25, Math.min(25, point.x));
          const y = Math.max(3, 47 + point.z);
          return (
            <g key={key}>
              <circle
                cx={x}
                cy={y}
                r={count > 1 ? 3.4 : 1.8}
                fill="#ffcf4b"
                stroke="#29271f"
                strokeWidth=".6"
              />
              {count > 1 && (
                <text
                  x={x}
                  y={y + 1.6}
                  textAnchor="middle"
                  fontSize="4.7"
                  fontWeight="900"
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption>
        <b>Last {points.length} in play</b>
        <br />
        {sectors
          .map(
            (s) =>
              points.filter((p) => contactSector(p.x) === s).length + ' ' + s,
          )
          .join(' · ')}
      </figcaption>
    </figure>
  );
}

export function WatchSettings({
  side,
  value,
  onChange,
  open = false,
}: {
  side: Club;
  value: string;
  onChange: (value: string) => void;
  open?: boolean;
}) {
  return (
    <details className="watch-settings-drawer" open={open || undefined}>
      <summary>Smart Watch rules ▾</summary>
      <label className="watch-settings">
        Pause Smart Watch
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="highlights">Game highlights</option>
          <option value="tying">When the tying run reaches base</option>
          <option value="starter">When my starter tires</option>
          <optgroup label="When this hitter bats">
            {side.lineup.map((slot) => (
              <option key={slot.playerId} value={slot.playerId}>
                {side.roster.find((p) => p.id === slot.playerId)?.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
    </details>
  );
}

export function LeagueWire({
  game,
  club,
  venueTier,
}: {
  game: LeagueWireFinal;
  club: Club;
  venueTier: Club['leagueTier'];
}) {
  const delta = game.winnerWins - club.wins;
  const stakes =
    delta === 1
      ? 'A win matches their win total.'
      : delta === 0
        ? 'A win puts you one win ahead of them.'
        : game.winnerWins + ' wins on the season.';
  return (
    <aside
      className={'out-of-town ' + (venueTier === 'majors' ? 'ribbon' : '')}
      aria-label="Out-of-town scoreboard"
    >
      <strong>OUT OF TOWN · FINAL</strong>
      {game.awayName} {game.awayScore} · {game.homeName} {game.homeScore}
      <div>
        {game.winnerName} win. {stakes}
      </div>
    </aside>
  );
}

export function ThirdBaseDecision({
  runner,
  arm,
  position,
  arrivalMs,
  portrait,
  children,
  onResolve,
}: {
  runner: string;
  arm: number;
  position: string;
  arrivalMs: number;
  portrait?: ReactNode;
  children: ReactNode;
  onResolve: (send: boolean) => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), arrivalMs);
    return () => window.clearTimeout(timer);
  }, [arrivalMs]);
  return (
    <section
      className="max-w-3xl mx-auto space-y-2"
      aria-label="Third-base coach"
    >
      {children}
      <div className="third-call" aria-live="polite">
        <div className="runner-report">
          {portrait}
          <p>
            <b>{runner} rounds third.</b>{' '}
            {arm >= 70 ? 'Strong arm' : arm < 45 ? 'Light arm' : 'Steady arm'}{' '}
            in {{ LF: 'left', CF: 'center', RF: 'right' }[position]}.
          </p>
        </div>
        <button disabled={!ready} onClick={() => onResolve(true)}>
          Send home
        </button>
        <button disabled={!ready} onClick={() => onResolve(false)}>
          Hold at third
        </button>
      </div>
    </section>
  );
}

export function GazetteCall({
  caption,
  onCrowd,
}: {
  caption: string;
  onCrowd: () => void;
}) {
  useEffect(() => {
    onCrowd();
  }, [caption, onCrowd]);
  return (
    <aside className="gazette-wire">
      <b>Sandlot Gazette</b> · {caption}
    </aside>
  );
}
