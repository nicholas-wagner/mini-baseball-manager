interface ScoreboardStripProps {
  awayAbbr: string;
  awayScore: number;
  awayColor: string;
  homeAbbr: string;
  homeScore: number;
  homeColor: string;
  inning: number;
  half: 'TOP' | 'BOT';
  balls: number;
  strikes: number;
  outs: number;
  rivalryLabel?: string;
}

function LedDots({ count, max, activeColor }: { count: number; max: number; activeColor: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: max }, (_, idx) => (
        <span
          key={idx}
          className="w-2.5 h-2.5 rounded-full border border-[#0B1E16]"
          style={{
            backgroundColor: idx < count ? activeColor : '#0E291E',
            boxShadow: idx < count ? `0 0 6px ${activeColor}` : 'none',
          }}
        />
      ))}
    </span>
  );
}

export function ScoreboardStrip({
  awayAbbr,
  awayScore,
  awayColor,
  homeAbbr,
  homeScore,
  homeColor,
  inning,
  half,
  balls,
  strikes,
  outs,
  rivalryLabel,
}: ScoreboardStripProps) {
  return (
    <div
      role="region"
      aria-label="Live Baseball Scoreboard"
      className="bg-[#1B4332] text-[#FBF4E4] border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 bg-[#122D21] px-2.5 py-1 rounded-xl border-2 border-[#0B1E16]">
          <span
            className="w-3 h-3 rounded-full border border-white/80 shrink-0"
            style={{ backgroundColor: awayColor }}
          />
          <span className="font-display text-xs sm:text-sm tracking-wider">{awayAbbr}</span>
          <span className="font-mono-tabular text-base sm:text-lg font-bold text-[#FFD166] ml-1">
            {awayScore}
          </span>
        </div>

        <span className="font-heading text-[11px] font-bold text-[#89C2A5]">VS</span>

        <div className="flex items-center gap-1.5 bg-[#122D21] px-2.5 py-1 rounded-xl border-2 border-[#0B1E16]">
          <span
            className="w-3 h-3 rounded-full border border-white/80 shrink-0"
            style={{ backgroundColor: homeColor }}
          />
          <span className="font-display text-xs sm:text-sm tracking-wider">{homeAbbr}</span>
          <span className="font-mono-tabular text-base sm:text-lg font-bold text-[#FFD166] ml-1">
            {homeScore}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="px-2.5 py-1 rounded-xl bg-[#122D21] border-2 border-[#0B1E16] font-mono-tabular text-xs font-bold text-[#FFD166]">
          {half === 'TOP' ? '▲' : '▼'} {inning}
        </div>

        <div className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-wider text-[#B8DEC9]">
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
