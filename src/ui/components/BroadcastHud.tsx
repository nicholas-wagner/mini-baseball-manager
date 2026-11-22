import { Shield, TrendingUp, Zap } from 'lucide-react';
import type { PlayEvent, TacticalCall } from '../../engine/models/playEvent';
import { PITCH_TYPE_SHORT_LABELS } from '../../engine/models/player';
import {
  getEligibleStealPlays,
  type StealPlayType,
} from '../../engine/simulation/baserunning';
import {
  getCurrentPitcher,
  getDefenderAtPosition,
  getFieldingSide,
  getBattingSide,
  type GameSessionState,
} from '../../engine/simulation/gameState';
import {
  DEFENSIVE_SHIFTS,
  estimateHomeWinProbability,
  type DefensiveShiftId,
} from '../../engine/simulation/winProbability';
import { ComicButton } from '../design-system/ComicButton';

interface BroadcastHudProps {
  session: GameSessionState;
  winProbHistory: readonly number[];
  defensiveShift: DefensiveShiftId;
  onSelectShift: (shift: DefensiveShiftId) => void;
  activeTacticalCall: TacticalCall;
  onSelectStealCall: (call: TacticalCall) => void;
  lastEvent: PlayEvent | null;
  atBatEvents?: readonly PlayEvent[];
}

interface PlottedPitchDot {
  num: number;
  cx: number;
  cy: number;
  fill: string;
  label: string;
}

function plotAtBatPitches(events: readonly PlayEvent[]): PlottedPitchDot[] {
  const pitchEvents = events.filter((e) => Boolean(e.pitchThrown)).slice(-8);
  return pitchEvents.map((ev, idx) => {
    const hash = Math.abs(Math.imul(ev.seq + 17, 2654435761)) % 1000;
    const normX = (hash % 100) / 100;
    const normY = Math.floor(hash / 100) / 10;
    const isBall = ev.outcome === 'ball' || ev.outcome === 'walk';
    const isFoul = ev.outcome === 'foul';
    const isStrike =
      ev.outcome === 'called_strike' ||
      ev.outcome === 'swinging_strike' ||
      ev.outcome === 'strikeout';
    const cx = isBall
      ? normX < 0.5
        ? 10 + normX * 14
        : 60 + (normX - 0.5) * 14
      : 22 + normX * 36;
    const cy = isBall ? 12 + normY * 54 : 18 + normY * 42;
    const fill = isBall ? '#2FB356' : isStrike ? '#FF4D6D' : isFoul ? '#FFC300' : '#00E5FF';
    return {
      num: idx + 1,
      cx: Math.round(cx),
      cy: Math.round(cy),
      fill,
      label: `${ev.pitchThrown!.mph} mph ${PITCH_TYPE_SHORT_LABELS[ev.pitchThrown!.pitchType]}`,
    };
  });
}

const STEAL_PLAY_TO_CALL: Readonly<Record<StealPlayType, TacticalCall>> = {
  steal_2b: 'steal',
  steal_3b: 'steal_3b',
  double_steal: 'double_steal',
  steal_home: 'steal_home',
};

function buildSparklinePoints(values: readonly number[]): string {
  const safe = values.length > 0 ? values : [0.5];
  if (safe.length === 1) {
    const y = Math.round((1 - safe[0]) * 26 + 2);
    return `0,${y} 120,${y}`;
  }
  return safe
    .map((v, idx) => {
      const x = Math.round((idx / (safe.length - 1)) * 120);
      const y = Math.round((1 - Math.max(0, Math.min(1, v))) * 26 + 2);
      return `${x},${y}`;
    })
    .join(' ');
}

export function BroadcastHud({
  session,
  winProbHistory,
  defensiveShift,
  onSelectShift,
  activeTacticalCall,
  onSelectStealCall,
  lastEvent,
  atBatEvents = [],
}: BroadcastHudProps) {
  const homeWp = estimateHomeWinProbability(session);
  const homePct = Math.round(homeWp * 100);
  const awayPct = 100 - homePct;

  const battingSide = getBattingSide(session);
  const fieldingSide = getFieldingSide(session);
  const pitcher = getCurrentPitcher(session);
  const catcher = getDefenderAtPosition(fieldingSide, 'C');
  const stealOptions = getEligibleStealPlays(
    session.bases,
    battingSide.playersById,
    pitcher,
    catcher,
    fieldingSide.pitcherFatigue,
    fieldingSide.catcherPopTimeBonus,
  );
  const humanBatting = session.half === 'BOT';
  const hasRunners = session.bases.some((b) => b !== null);
  const sparkPoints = buildSparklinePoints(winProbHistory.length > 0 ? winProbHistory : [homeWp]);
  const plottedPitches = plotAtBatPitches(
    atBatEvents.length > 0 ? atBatEvents : lastEvent ? [lastEvent] : [],
  );

  return (
    <div
      data-testid="broadcast-hud"
      className="p-2.5 rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5 shadow-[3px_3px_0_#181B2C]"
    >
      {/* Win Probability Bar + Sparkline + Last Pitch Radar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-[200px] flex-1">
          <TrendingUp className="w-4 h-4 text-[#1B4332] shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[10px] font-extrabold uppercase text-[#181B2C]">
              <span>
                {session.away.name} {awayPct}%
              </span>
              <span>WIN PROBABILITY</span>
              <span>
                {session.home.name} {homePct}%
              </span>
            </div>
            <div className="h-2.5 rounded-full border border-[#181B2C] bg-[#E63946] overflow-hidden flex">
              <div
                className="h-full bg-[#2FB356] transition-all"
                style={{ width: `${homePct}%` }}
                aria-label={`Home win probability ${homePct}%`}
              />
            </div>
          </div>
          <svg
            viewBox="0 0 120 30"
            className="w-24 h-7 rounded border border-[#181B2C]/30 bg-[#FBF4E4] shrink-0"
            aria-label="Win probability sparkline"
          >
            <line x1="0" y1="15" x2="120" y2="15" stroke="#181B2C" strokeOpacity="0.2" strokeDasharray="2 2" />
            <polyline fill="none" stroke="#1B4332" strokeWidth="2.2" points={sparkPoints} />
          </svg>
        </div>

        {lastEvent?.pitchThrown ? (
          <div
            data-testid="strike-zone-tracker"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#181B2C] text-[#FFD166]"
          >
            <svg
              data-testid="strike-zone-plot"
              viewBox="0 0 80 78"
              className="w-12 h-12 rounded bg-[#101425] border border-white/25 shrink-0"
              aria-label="Strike zone pitch location plot"
            >
              {/* 3x3 Strike Zone */}
              <rect x="20" y="14" width="40" height="48" fill="none" stroke="#FFD166" strokeWidth="1.5" />
              <line x1="33.3" y1="14" x2="33.3" y2="62" stroke="#FFD166" strokeOpacity="0.35" strokeWidth="0.8" />
              <line x1="46.6" y1="14" x2="46.6" y2="62" stroke="#FFD166" strokeOpacity="0.35" strokeWidth="0.8" />
              <line x1="20" y1="30" x2="60" y2="30" stroke="#FFD166" strokeOpacity="0.35" strokeWidth="0.8" />
              <line x1="20" y1="46" x2="60" y2="46" stroke="#FFD166" strokeOpacity="0.35" strokeWidth="0.8" />
              {/* Home plate pentagon */}
              <polygon points="28,68 52,68 52,72 40,76 28,72" fill="#FBF4E4" fillOpacity="0.8" />
              {plottedPitches.map((dot) => (
                <g key={dot.num}>
                  <circle cx={dot.cx} cy={dot.cy} r="5.5" fill={dot.fill} stroke="#181B2C" strokeWidth="1" />
                  <text
                    x={dot.cx}
                    y={dot.cy + 2.6}
                    textAnchor="middle"
                    fill="#181B2C"
                    fontSize="7"
                    fontWeight="900"
                  >
                    {dot.num}
                  </text>
                </g>
              ))}
            </svg>
            <div className="text-[10px] font-mono-tabular font-bold leading-tight">
              <div className="text-[#FFD166]">
                {lastEvent.pitchThrown.mph} MPH {PITCH_TYPE_SHORT_LABELS[lastEvent.pitchThrown.pitchType]}
              </div>
              <div className="text-[#E0FBFC] uppercase text-[9px]">
                {lastEvent.pitchThrown.isFavoritePitch
                  ? '★ Signature Pitch'
                  : lastEvent.pitchThrown.isWeakPitchForPitcher
                    ? '⚠️ Weak Pitch'
                    : 'Zone Tracker'}
              </div>
              <div className="text-[9px] text-white/75">
                {plottedPitches.length} pitch{plottedPitches.length === 1 ? '' : 'es'} in AB
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Live Speed-Driven Steal Controls (when batting) OR Defensive Shifts + Pitchout (when fielding) */}
      {humanBatting && stealOptions.length > 0 ? (
        <div data-testid="steal-hud-bar" className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-dashed border-[#181B2C]/20">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#181B2C]">
            <Zap className="w-3.5 h-3.5 text-[#E63946]" />
            Base Steal:
          </span>
          {stealOptions.map((opt) => {
            const call = STEAL_PLAY_TO_CALL[opt.playType];
            const active = activeTacticalCall === call;
            const variant =
              active ? 'coral' : opt.riskTier === 'green' ? 'turf' : opt.riskTier === 'amber' ? 'gold' : 'cream';
            return (
              <ComicButton
                key={opt.playType}
                size="sm"
                variant={variant}
                active={active}
                onClick={() => onSelectStealCall(call)}
              >
                {opt.label}: {opt.runnerName.split(' ')[0]} (SPD {opt.runnerSpeed} • {opt.successPct}%)
              </ComicButton>
            );
          })}
        </div>
      ) : null}

      {!humanBatting ? (
        <div data-testid="defensive-shift-bar" className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-dashed border-[#181B2C]/20">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#181B2C]">
            <Shield className="w-3.5 h-3.5 text-[#1D3557]" />
            Defense:
          </span>
          {DEFENSIVE_SHIFTS.map((shift) => (
            <ComicButton
              key={shift.id}
              size="sm"
              variant={defensiveShift === shift.id ? 'sky' : 'cream'}
              active={defensiveShift === shift.id}
              onClick={() => onSelectShift(shift.id)}
            >
              {shift.shortLabel}
            </ComicButton>
          ))}
          {hasRunners ? (
            <>
              <ComicButton
                size="sm"
                variant={activeTacticalCall === 'hold_runner' ? 'gold' : 'cream'}
                active={activeTacticalCall === 'hold_runner'}
                onClick={() => onSelectStealCall('hold_runner')}
              >
                Hold Runner
              </ComicButton>
              <ComicButton
                size="sm"
                variant={activeTacticalCall === 'pitchout' ? 'coral' : 'cream'}
                active={activeTacticalCall === 'pitchout'}
                onClick={() => onSelectStealCall('pitchout')}
              >
                Pitchout
              </ComicButton>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
