import { useState } from 'react';
import type { AtBatOutcome, PlayEvent } from '../../engine/models/playEvent';

export type StrikeZonePitchCategory = 'strike' | 'ball' | 'in_play';

export interface StrikeZonePitchPoint {
  /** 1-based pitch number in the current at-bat (auto-numbered 1..N when omitted). */
  number?: number;
  /** Pitch type key (e.g. 'four_seam', 'slider') or display label. */
  pitchType: string;
  /** Velocity in MPH. */
  mph: number;
  /** Color-code category: strike/out = coral, ball = sky/green, in_play = gold. */
  category: StrikeZonePitchCategory;
  /** Optional short call text (e.g. 'Called Strike', 'Ball', 'Single'). */
  outcomeLabel?: string;
  /** Normalized horizontal plate location (-1.5..1.5; -1..1 is inside the 3x3 strike zone). */
  plateX?: number;
  /** Normalized vertical plate location (-1.5..1.5; -1..1 is inside the 3x3 strike zone; +1 is high). */
  plateY?: number;
}

export interface StrikeZoneOverlayProps {
  /** Pre-mapped pitches for the current at-bat (oldest -> newest). */
  pitches?: readonly StrikeZonePitchPoint[];
  /** Optional raw PlayEvent stream; extracts the current at-bat's pitches automatically when `pitches` is omitted. */
  events?: readonly PlayEvent[];
  /** Initial view density when uncontrolled (defaults to 'compact'). */
  initialMode?: 'compact' | 'expanded';
  /** Controlled view density override. */
  mode?: 'compact' | 'expanded';
  /** Fired when the user toggles compact <-> expanded view. */
  onModeChange?: (nextMode: 'compact' | 'expanded') => void;
  /** Optional batter handedness cue ('L' | 'R' | 'S'). */
  batterHand?: 'L' | 'R' | 'S';
  /** Optional count readout (e.g. '2-1'). */
  countLabel?: string;
  /** Optional wrapper className for mounting inside GameDayScreen / LiveBottomSheet. */
  className?: string;
}

const PITCH_SHORT_NAMES: Readonly<Record<string, string>> = {
  four_seam: '4-Seam',
  two_seam: '2-Seam',
  cutter: 'Cutter',
  slider: 'Slider',
  curveball: 'Curve',
  changeup: 'Change',
  splitter: 'Splitter',
  knuckleball: 'Knuckle',
};

const OUTCOME_LABELS: Readonly<Partial<Record<AtBatOutcome, string>>> = {
  ball: 'Ball',
  called_strike: 'Called Strike',
  swinging_strike: 'Swinging Strike',
  foul: 'Foul',
  walk: 'Ball Four',
  strikeout: 'Strikeout',
  single: 'Single',
  double: 'Double',
  triple: 'Triple',
  home_run: 'Home Run',
  ground_out: 'Ground Out',
  fly_out: 'Fly Out',
  line_out: 'Line Out',
  double_play: 'Double Play',
  sac_fly: 'Sac Fly',
  fielding_error: 'Error',
  bunt_single: 'Bunt Hit',
  bunt_out: 'Sac Bunt',
};

const CATEGORY_COLORS: Readonly<
  Record<StrikeZonePitchCategory, { fill: string; stroke: string; text: string; pillBg: string; label: string }>
> = {
  strike: {
    fill: '#FF4D6D',
    stroke: '#FFFDF7',
    text: '#FFFFFF',
    pillBg: 'bg-[#FF4D6D] text-white',
    label: 'Strike',
  },
  ball: {
    fill: '#38BDF8',
    stroke: '#2FB356',
    text: '#181B2C',
    pillBg: 'bg-[#38BDF8] text-[#181B2C]',
    label: 'Ball',
  },
  in_play: {
    fill: '#FFC300',
    stroke: '#181B2C',
    text: '#181B2C',
    pillBg: 'bg-[#FFC300] text-[#181B2C]',
    label: 'In Play',
  },
};

function formatPitchShortName(pitchType: string): string {
  return PITCH_SHORT_NAMES[pitchType] ?? pitchType;
}

function classifyOutcomeCategory(outcome?: AtBatOutcome): StrikeZonePitchCategory {
  if (outcome === 'ball' || outcome === 'walk') return 'ball';
  if (
    outcome === 'called_strike' ||
    outcome === 'swinging_strike' ||
    outcome === 'foul' ||
    outcome === 'strikeout'
  ) {
    return 'strike';
  }
  return 'in_play';
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deriveDeterministicPlateCoords(
  pitch: Pick<StrikeZonePitchPoint, 'pitchType' | 'mph' | 'category'>,
  index: number,
  salt: number,
): { plateX: number; plateY: number } {
  const h1 = hashSeed(`${pitch.pitchType}:${pitch.mph}:${pitch.category}:${index}:${salt}`);
  const h2 = hashSeed(`y:${pitch.pitchType}:${salt}:${index}:${pitch.mph}`);
  const u = (h1 % 1000) / 1000;
  const v = (h2 % 1000) / 1000;

  if (pitch.category === 'ball') {
    const isLowBall =
      pitch.pitchType === 'curveball' ||
      pitch.pitchType === 'splitter' ||
      pitch.pitchType === 'changeup' ||
      u < 0.45;
    if (isLowBall) {
      return {
        plateX: -0.95 + u * 1.9,
        plateY: -1.12 - v * 0.28,
      };
    }
    const side = h1 % 2 === 0 ? 1 : -1;
    return {
      plateX: side * (1.12 + u * 0.26),
      plateY: -0.75 + v * 1.5,
    };
  }

  if (pitch.category === 'in_play') {
    return {
      plateX: -0.72 + u * 1.44,
      plateY: -0.68 + v * 1.36,
    };
  }

  const biasHigh = pitch.pitchType === 'four_seam' || pitch.pitchType === 'cutter';
  return {
    plateX: -0.84 + u * 1.68,
    plateY: biasHigh ? -0.35 + v * 1.18 : -0.84 + v * 1.48,
  };
}

/**
 * Pure helper that extracts recent pitches from the current at-bat out of a `PlayEvent[]` log
 * with deterministic strike-zone coordinates ready for `<StrikeZoneOverlay />`.
 */
export function extractAtBatStrikeZonePitches(
  events: readonly PlayEvent[],
): StrikeZonePitchPoint[] {
  if (events.length === 0) return [];
  const collected: PlayEvent[] = [];
  let activeBatterId: string | undefined;

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (
      ev.type === 'at_bat_start' ||
      ev.type === 'inning_start' ||
      ev.type === 'inning_end' ||
      ev.type === 'game_start'
    ) {
      if (collected.length > 0) break;
      continue;
    }
    if (!ev.pitchThrown) continue;
    if (activeBatterId && ev.batterId && ev.batterId !== activeBatterId) {
      break;
    }
    activeBatterId = activeBatterId ?? ev.batterId;
    collected.push(ev);
  }

  return collected.reverse().map((ev, idx) => {
    const category = classifyOutcomeCategory(ev.outcome);
    const pitchType = ev.pitchThrown!.pitchType;
    const mph = Math.round(ev.pitchThrown!.mph);
    const coords = deriveDeterministicPlateCoords({ pitchType, mph, category }, idx, ev.seq);
    return {
      number: idx + 1,
      pitchType,
      mph,
      category,
      outcomeLabel: ev.outcome ? (OUTCOME_LABELS[ev.outcome] ?? ev.outcome) : undefined,
      plateX: coords.plateX,
      plateY: coords.plateY,
    };
  });
}

function clampCoord(val: number): number {
  return Math.max(-1.45, Math.min(1.45, val));
}

function toSvgPoint(plateX: number, plateY: number): { cx: number; cy: number } {
  // Strike zone inner box occupies x: [24, 96] (width 72), y: [20, 104] (height 84) inside 120x138 viewBox
  const cx = 60 + clampCoord(plateX) * 36;
  const cy = 62 - clampCoord(plateY) * 42;
  return { cx, cy };
}

/**
 * Self-contained, zero-dependency TV-style 3x3 K-Zone pitch plot widget.
 * Plots numbered 1..N dots (Strike coral, Ball sky/green, In-Play gold) with latest mph/type
 * and a >=44px compact <-> expanded toggle.
 */
export function StrikeZoneOverlay({
  pitches,
  events,
  initialMode = 'compact',
  mode,
  onModeChange,
  batterHand,
  countLabel,
  className = '',
}: StrikeZoneOverlayProps) {
  const [internalMode, setInternalMode] = useState<'compact' | 'expanded'>(initialMode);
  const resolvedMode = mode ?? internalMode;
  const isExpanded = resolvedMode === 'expanded';

  const resolvedPitches: StrikeZonePitchPoint[] = (
    pitches ?? (events ? extractAtBatStrikeZonePitches(events) : [])
  ).map((pt, idx) => {
    const fallback =
      pt.plateX === undefined || pt.plateY === undefined
        ? deriveDeterministicPlateCoords(pt, idx, idx + 1)
        : null;
    return {
      ...pt,
      number: pt.number ?? idx + 1,
      plateX: pt.plateX ?? fallback!.plateX,
      plateY: pt.plateY ?? fallback!.plateY,
    };
  });

  const latest = resolvedPitches.length > 0 ? resolvedPitches[resolvedPitches.length - 1] : null;
  const latestStyle = latest ? CATEGORY_COLORS[latest.category] : null;

  const handleToggle = () => {
    const next: 'compact' | 'expanded' = isExpanded ? 'compact' : 'expanded';
    if (mode === undefined) {
      setInternalMode(next);
    }
    onModeChange?.(next);
  };

  return (
    <section
      data-testid="strike-zone-overlay"
      data-kzone-mode={resolvedMode}
      aria-label="TV Strike Zone Pitch Plot"
      className={`rounded-2xl border-2 border-[#181B2C] bg-[#141A2C] text-[#FBF4E4] shadow-[3px_3px_0_#181B2C] overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#1D2742] border-b border-white/15">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-[#FFC300] text-[#181B2C] font-display text-[10px] tracking-wide shrink-0">
            K-ZONE
          </span>
          {countLabel ? (
            <span className="font-mono-tabular text-[11px] font-extrabold text-[#FFD166] shrink-0">
              {countLabel}
            </span>
          ) : null}
          {batterHand ? (
            <span className="text-[10px] font-bold text-[#94A3B8] shrink-0">
              {batterHand}HB
            </span>
          ) : null}
        </div>

        <button
          type="button"
          data-testid="kzone-toggle-btn"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse strike zone details' : 'Expand strike zone details'}
          onClick={handleToggle}
          className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl border border-white/25 bg-[#273454] hover:bg-[#33446B] text-[#FFFDF7] font-display text-[10px] tracking-wide cursor-pointer shrink-0"
        >
          {isExpanded ? 'Compact ▲' : `Details (${resolvedPitches.length}) ▼`}
        </button>
      </div>

      <div className={`p-2.5 ${isExpanded ? 'space-y-2.5' : 'flex items-center gap-2.5'}`}>
        {/* 3x3 TV Broadcast K-Zone SVG */}
        <div className={`shrink-0 ${isExpanded ? 'mx-auto w-[132px]' : 'w-[74px]'}`}>
          <svg
            viewBox="0 0 120 138"
            className="w-full h-auto block"
            role="img"
            aria-label={`Strike zone plot with ${resolvedPitches.length} pitch${resolvedPitches.length === 1 ? '' : 'es'}`}
          >
            {/* Outer shadow plate backdrop */}
            <rect x="4" y="4" width="112" height="130" rx="10" fill="#0F1526" stroke="#334155" strokeWidth="1.5" />

            {/* 3x3 Strike Zone Grid (9 cells) */}
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  data-testid="kzone-cell"
                  x={24 + col * 24}
                  y={20 + row * 28}
                  width="24"
                  height="28"
                  fill={(row + col) % 2 === 0 ? '#1E293B' : '#182235'}
                  stroke="#94A3B8"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
              )),
            )}

            {/* Crisp outer K-Zone frame */}
            <rect
              x="24"
              y="20"
              width="72"
              height="84"
              fill="none"
              stroke="#FFFDF7"
              strokeWidth="2.2"
            />

            {/* Home Plate Pentagon */}
            <polygon
              points="38,113 82,113 82,121 60,129 38,121"
              fill="#FFFDF7"
              fillOpacity="0.88"
              stroke="#475569"
              strokeWidth="1.2"
            />

            {/* Numbered 1..N Pitch Dots */}
            {resolvedPitches.map((pt, idx) => {
              const { cx, cy } = toSvgPoint(pt.plateX!, pt.plateY!);
              const colors = CATEGORY_COLORS[pt.category];
              const isLatest = idx === resolvedPitches.length - 1;
              return (
                <g
                  key={`${pt.number}-${idx}`}
                  data-testid="kzone-pitch-dot"
                  data-category={pt.category}
                >
                  {isLatest ? (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="11.5"
                      fill="none"
                      stroke="#FFFDF7"
                      strokeWidth="1.6"
                      strokeDasharray="3 2"
                    />
                  ) : null}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isLatest ? '8.8' : '7.6'}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="1.8"
                  />
                  <text
                    x={cx}
                    y={cy + 3.2}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="900"
                    fill={colors.text}
                  >
                    {pt.number}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Latest Pitch Telemetry + Optional Expanded Legend & Pitch Log */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {latest && latestStyle ? (
            <div data-testid="kzone-latest-pitch" className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded font-display text-[10px] ${latestStyle.pillBg}`}>
                  #{latest.number} {latest.outcomeLabel ?? latestStyle.label}
                </span>
                <span className="font-mono-tabular font-extrabold text-xs text-[#FFD166]">
                  {latest.mph} MPH
                </span>
              </div>
              <div className="text-xs font-bold text-[#FBF4E4] truncate">
                {formatPitchShortName(latest.pitchType)}
              </div>
            </div>
          ) : (
            <div data-testid="kzone-latest-pitch" className="text-xs font-bold text-[#94A3B8]">
              Awaiting 1st pitch…
            </div>
          )}

          {/* Compact Color Legend */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold text-[#CBD5E1]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D] inline-block border border-white/80" />
              Strike
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] inline-block border border-[#2FB356]" />
              Ball
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC300] inline-block border border-[#181B2C]" />
              In Play
            </span>
          </div>

          {isExpanded ? (
            <div
              data-testid="kzone-pitch-log"
              className="pt-1.5 border-t border-white/15 space-y-1 max-h-32 overflow-y-auto"
            >
              {resolvedPitches.length > 0 ? (
                resolvedPitches.map((pt, idx) => {
                  const style = CATEGORY_COLORS[pt.category];
                  return (
                    <div
                      key={`${pt.number}-${idx}`}
                      className="flex items-center justify-between gap-2 text-[11px] font-bold"
                    >
                      <span className="flex items-center gap-1.5 min-w-0 truncate">
                        <span
                          className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-extrabold shrink-0 ${style.pillBg}`}
                        >
                          {pt.number}
                        </span>
                        <span className="truncate text-[#FFFDF7]">
                          {formatPitchShortName(pt.pitchType)}
                        </span>
                      </span>
                      <span className="font-mono-tabular text-[#FFD166] shrink-0">
                        {pt.mph} MPH{pt.outcomeLabel ? ` · ${pt.outcomeLabel}` : ''}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-[11px] text-[#94A3B8]">No pitches thrown in this at-bat yet.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
