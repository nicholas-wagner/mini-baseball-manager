import { useState } from 'react';
interface ScoreboardStripProps {
  clubs?: {away: string; home: string; humanHome: boolean};
  /** When true alongside `clubs`, shows the compact 1-line expandable bar on mobile (<640px) and the full R/H/E strip on desktop (>=640px). */
  desktopFull?: boolean;
  awayAbbr: string;
  awayScore: number;
  awayHits?: number;
  awayErrors?: number;
  awayColor: string;
  homeAbbr: string;
  homeScore: number;
  homeHits?: number;
  homeErrors?: number;
  homeColor: string;
  inning: number;
  half: 'TOP' | 'BOT';
  balls: number;
  strikes: number;
  outs: number;
  bases?: readonly [boolean, boolean, boolean];
  rivalryLabel?: string;
  flash?: { seq: number; lamp: string | null; base: number } | null;
}

function LedDots({ count, max, activeColor }: { count: number; max: number; activeColor: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 sm:gap-1">
      {Array.from({ length: max }, (_, idx) => (
        <span
          key={idx}
          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-[#0B1E16]"
          style={{
            backgroundColor: idx < count ? activeColor : '#0E291E',
            boxShadow: idx < count ? `0 0 6px ${activeColor}` : 'none',
          }}
        />
      ))}
    </span>
  );
}

function MiniBasesDiamond({ bases, highlight }: { bases: readonly [boolean, boolean, boolean]; highlight?: number }) {
  return (
    <svg
      data-testid="scoreboard-bases-diamond"
      viewBox="0 0 36 26"
      className="w-8 h-6 shrink-0"
      aria-label={`Bases occupied: ${bases.map((b, i) => (b ? `${i + 1}B` : '')).filter(Boolean).join(', ') || 'empty'}`}
    >
      {/* 2B (top) */}
      <rect
        className={highlight === 2 ? 'count-flash' : undefined}
        x="14"
        y="3"
        width="8"
        height="8"
        transform="rotate(45 18 7)"
        fill={bases[1] ? '#FFC300' : '#0E291E'}
        stroke="#B8DEC9"
        strokeWidth="1.3"
      />
      {/* 3B (left) */}
      <rect
        className={highlight === 3 ? 'count-flash' : undefined}
        x="5"
        y="12"
        width="8"
        height="8"
        transform="rotate(45 9 16)"
        fill={bases[2] ? '#FFC300' : '#0E291E'}
        stroke="#B8DEC9"
        strokeWidth="1.3"
      />
      {/* 1B (right) */}
      <rect
        className={highlight === 1 ? 'count-flash' : undefined}
        x="23"
        y="12"
        width="8"
        height="8"
        transform="rotate(45 27 16)"
        fill={bases[0] ? '#FFC300' : '#0E291E'}
        stroke="#B8DEC9"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function ScoreboardStrip({
  clubs,
  desktopFull = false,
  awayAbbr,
  awayScore,
  awayHits = 0,
  awayErrors = 0,
  awayColor,
  homeAbbr,
  homeScore,
  homeHits = 0,
  homeErrors = 0,
  homeColor,
  inning,
  half,
  balls,
  strikes,
  outs,
  bases = [false, false, false],
  rivalryLabel,
  flash,
}: ScoreboardStripProps) {
  const [expanded, setExpanded] = useState(false);
  const guidedCollapsible = Boolean(clubs && !desktopFull);
  const showFullBlock = !guidedCollapsible || expanded;
  return (
    <div
      role="region"
      aria-label="Live Baseball Scoreboard"
      className="bg-[#1B4332] text-[#FBF4E4] border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] rounded-2xl px-2 sm:px-3 py-1 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2"
    >
      {guidedCollapsible && clubs && <button className="guided-line" type="button"
        aria-expanded={expanded} onClick={() => setExpanded(open => !open)}>
        <span className="sr-only">Toggle line score</span>
        <span className="guided-teams">
          {([true,false] as const).map(ours => {
            const home = ours === clubs.humanHome;
            return <span key={String(ours)} className="guided-team">
              <i style={{background:home ? homeColor : awayColor}} />
              <span>{home ? clubs.home : clubs.away}</span>
              <b>{home ? homeScore : awayScore}</b>
            </span>;
          })}
        </span>
        <span className="guided-count">
          <MiniBasesDiamond key={flash?.seq} bases={bases} highlight={flash?.base} />
          <span>{half === 'TOP' ? 'Top' : 'Bot'} {inning} · {outs} out{outs === 1 ? '' : 's'}
            <small data-testid="scoreboard-count-text">{balls}–{strikes} count</small></span>
          <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
        </span>
      </button>}
      {showFullBlock && <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 w-full">
      <div className="bg-[#122D21] border-2 border-[#0B1E16] rounded-xl px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-[136px] sm:min-w-[170px]">
        <div className="hidden sm:grid grid-cols-[1fr_24px_24px_24px] gap-x-1 text-[9px] font-extrabold uppercase tracking-wider text-[#89C2A5] border-b border-[#245842] pb-0.5">
          <span>TEAM</span>
          <span className="text-center text-[#FFC300]">R</span>
          <span className="text-center">H</span>
          <span className="text-center">E</span>
        </div>

        <div
          data-testid="scoreboard-away-rhe"
          className="grid grid-cols-[1fr_20px_20px_20px] sm:grid-cols-[1fr_24px_24px_24px] gap-x-0.5 sm:gap-x-1 items-center text-[11px] sm:text-sm font-mono-tabular sm:pt-0.5"
        >
          <span className="flex items-center gap-1 sm:gap-1.5 font-display text-[10.5px] sm:text-xs tracking-wider">
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-white/80 shrink-0"
              style={{ backgroundColor: awayColor }}
            />
            <span className={half === 'TOP' ? 'text-[#FFD166]' : 'text-[#FBF4E4]'}>{awayAbbr}</span>
          </span>
          <span className="text-center font-extrabold text-[#FFD166]">{awayScore}</span>
          <span className="text-center font-bold text-[#E0FBFC]">{awayHits}</span>
          <span className="text-center font-bold text-[#B8DEC9]">{awayErrors}</span>
        </div>

        <div
          data-testid="scoreboard-home-rhe"
          className="grid grid-cols-[1fr_20px_20px_20px] sm:grid-cols-[1fr_24px_24px_24px] gap-x-0.5 sm:gap-x-1 items-center text-[11px] sm:text-sm font-mono-tabular"
        >
          <span className="flex items-center gap-1 sm:gap-1.5 font-display text-[10.5px] sm:text-xs tracking-wider">
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-white/80 shrink-0"
              style={{ backgroundColor: homeColor }}
            />
            <span className={half === 'BOT' ? 'text-[#FFD166]' : 'text-[#FBF4E4]'}>{homeAbbr}</span>
          </span>
          <span className="text-center font-extrabold text-[#FFD166]">{homeScore}</span>
          <span className="text-center font-bold text-[#E0FBFC]">{homeHits}</span>
          <span className="text-center font-bold text-[#B8DEC9]">{homeErrors}</span>
        </div>
      </div>

      {/* Inning + Base Diamond + B/S/O Count Lamps + Numeric Count */}
      {!guidedCollapsible && <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
        <div className="px-1.5 sm:px-2.5 py-1 rounded-xl bg-[#122D21] border-2 border-[#0B1E16] font-mono-tabular text-[11px] sm:text-sm font-extrabold text-[#FFD166] whitespace-nowrap">
          {half === 'TOP' ? '▲' : '▼'} {inning}
        </div>

        <div className="px-1.5 py-0.5 rounded-xl bg-[#122D21] border-2 border-[#0B1E16] flex items-center gap-1 sm:gap-1.5">
          <MiniBasesDiamond key={flash?.seq} bases={bases} highlight={flash?.base} />
          <div className="flex flex-col leading-tight">
            <span
              data-testid="scoreboard-count-text"
              className="font-mono-tabular text-[11px] sm:text-xs font-extrabold text-[#FFD166]"
            >
              {balls}-{strikes}
            </span>
            <span className="font-mono-tabular text-[8.5px] sm:text-[9px] font-extrabold text-[#FF8FA3] whitespace-nowrap">
              {outs} OUT{outs === 1 ? '' : 'S'}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 text-[10px] font-extrabold tracking-wider text-[#B8DEC9] bg-[#122D21] px-2 py-1 rounded-xl border-2 border-[#0B1E16]">
          <span key={'Balls' + flash?.seq} className={'flex items-center gap-1 rounded ' + (flash?.lamp === 'balls' ? 'count-flash' : '')} aria-label={`Balls ${balls}`}>
            B <LedDots count={balls} max={3} activeColor="#2FB356" />
          </span>
          <span key={'Strikes' + flash?.seq} className={'flex items-center gap-1 rounded ' + (flash?.lamp === 'strikes' ? 'count-flash' : '')} aria-label={`Strikes ${strikes}`}>
            S <LedDots count={strikes} max={2} activeColor="#FFC300" />
          </span>
          <span key={'Outs' + flash?.seq} className={'flex items-center gap-1 rounded ' + (flash?.lamp === 'outs' ? 'count-flash' : '')} aria-label={`Outs ${outs}`}>
            O <LedDots count={outs} max={2} activeColor="#FF4D6D" />
          </span>
        </div>

        {rivalryLabel ? (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-[#FF4D6D] text-white border-2 border-[#181B2C] font-display text-[10px] tracking-wide">
            ⚡ {rivalryLabel}
          </span>
        ) : null}
      </div>}
      </div>}
    </div>
  );
}
