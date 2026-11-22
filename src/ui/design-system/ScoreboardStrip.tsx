interface ScoreboardStripProps {
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

function MiniBasesDiamond({ bases }: { bases: readonly [boolean, boolean, boolean] }) {
  return (
    <svg
      data-testid="scoreboard-bases-diamond"
      viewBox="0 0 36 26"
      className="w-8 h-6 shrink-0"
      aria-label={`Bases occupied: ${bases.map((b, i) => (b ? `${i + 1}B` : '')).filter(Boolean).join(', ') || 'empty'}`}
    >
      {/* 2B (top) */}
      <rect
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
}: ScoreboardStripProps) {
  return (
    <div
      role="region"
      aria-label="Live Baseball Scoreboard"
      className="bg-[#1B4332] text-[#FBF4E4] border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2"
    >
      {/* Compact R / H / E Line-Score Box */}
      <div className="bg-[#122D21] border-2 border-[#0B1E16] rounded-xl px-2 py-1 min-w-[175px] sm:min-w-[215px]">
        <div className="grid grid-cols-[1fr_24px_24px_24px] gap-x-1 text-[9px] font-extrabold uppercase tracking-wider text-[#89C2A5] border-b border-[#245842] pb-0.5">
          <span>TEAM</span>
          <span className="text-center text-[#FFC300]">R</span>
          <span className="text-center">H</span>
          <span className="text-center">E</span>
        </div>

        <div
          data-testid="scoreboard-away-rhe"
          className="grid grid-cols-[1fr_24px_24px_24px] gap-x-1 items-center text-xs sm:text-sm font-mono-tabular pt-0.5"
        >
          <span className="flex items-center gap-1.5 font-display text-[11px] sm:text-xs tracking-wider">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0"
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
          className="grid grid-cols-[1fr_24px_24px_24px] gap-x-1 items-center text-xs sm:text-sm font-mono-tabular"
        >
          <span className="flex items-center gap-1.5 font-display text-[11px] sm:text-xs tracking-wider">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0"
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
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
        <div className="px-2 sm:px-2.5 py-1 rounded-xl bg-[#122D21] border-2 border-[#0B1E16] font-mono-tabular text-xs sm:text-sm font-extrabold text-[#FFD166]">
          {half === 'TOP' ? '▲' : '▼'} {inning}
        </div>

        <div className="px-1.5 py-0.5 rounded-xl bg-[#122D21] border-2 border-[#0B1E16] flex items-center gap-1.5">
          <MiniBasesDiamond bases={bases} />
          <div className="flex flex-col leading-tight">
            <span
              data-testid="scoreboard-count-text"
              className="font-mono-tabular text-xs font-extrabold text-[#FFD166]"
            >
              {balls}-{strikes}
            </span>
            <span className="font-mono-tabular text-[9px] font-extrabold text-[#FF8FA3]">
              {outs} OUT{outs === 1 ? '' : 'S'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-extrabold tracking-wider text-[#B8DEC9] bg-[#122D21] px-2 py-1 rounded-xl border-2 border-[#0B1E16]">
          <span className="flex items-center gap-1" aria-label={`Balls ${balls}`}>
            B <LedDots count={balls} max={3} activeColor="#2FB356" />
          </span>
          <span className="flex items-center gap-1" aria-label={`Strikes ${strikes}`}>
            S <LedDots count={strikes} max={2} activeColor="#FFC300" />
          </span>
          <span className="flex items-center gap-1" aria-label={`Outs ${outs}`}>
            O <LedDots count={outs} max={2} activeColor="#FF4D6D" />
          </span>
        </div>

        {rivalryLabel ? (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-[#FF4D6D] text-white border-2 border-[#181B2C] font-display text-[10px] tracking-wide">
            ⚡ {rivalryLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
