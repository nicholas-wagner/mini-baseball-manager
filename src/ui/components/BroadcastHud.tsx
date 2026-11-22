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
            className="px-2.5 py-1 rounded-xl border border-[#181B2C] bg-[#181B2C] text-[#FFD166] text-[11px] font-mono-tabular font-bold"
          >
            LAST PITCH: {lastEvent.pitchThrown.mph} MPH{' '}
            {PITCH_TYPE_SHORT_LABELS[lastEvent.pitchThrown.pitchType]}
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
