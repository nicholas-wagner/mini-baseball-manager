import { FastForward, Play, SkipForward, Sliders, Sparkles, Zap } from 'lucide-react';
import type { LiveBroadcastLowerThird } from '../../engine/gm/gameDayMoments';
import type { PlayEvent, TacticalCall } from '../../engine/models/playEvent';
import type { LiveActionCue, SuggestedQuickAction } from '../../engine/simulation/liveActionAdvisor';
import type { GameDayControlMode } from '../../store/userPreferences';
import { ComicButton } from '../design-system/ComicButton';

interface LiveActionBarProps {
  cue: LiveActionCue;
  matchupLabel: string;
  basesLabel: string;
  batterName?: string;
  pitcherName?: string;
  lowerThird?: LiveBroadcastLowerThird;
  clutchRecap?: string | null;
  latestEvent: PlayEvent | null;
  controlMode: GameDayControlMode;
  watchMode: 'live' | 'clutch' | 'paused';
  tacticalCall: TacticalCall;
  isBatting: boolean;
  gameCompleted: boolean;
  onNextPitch: () => void;
  onToggleWatchMode: () => void;
  onSimAtBat: () => void;
  onSimHalfInning: () => void;
  onClutchSim: () => void;
  onSimToEnd: () => void;
  onSelectTacticalCall: (call: TacticalCall) => void;
  onSuggestedAction: (action: SuggestedQuickAction) => void;
  onToggleControlMode: () => void;
  onInspectBatter?: () => void;
  onInspectPitcher?: () => void;
  onInspectPlayers?: () => void;
}

const SIMPLE_BAT_APPROACHES: readonly { id: TacticalCall; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'contact', label: 'Contact' },
  { id: 'power', label: 'Power' },
];

export function LiveActionBar({
  cue,
  matchupLabel,
  basesLabel,
  batterName,
  pitcherName,
  lowerThird,
  clutchRecap,
  latestEvent,
  controlMode,
  watchMode,
  tacticalCall,
  isBatting,
  gameCompleted,
  onNextPitch,
  onToggleWatchMode,
  onSimAtBat,
  onSimHalfInning,
  onClutchSim,
  onSimToEnd,
  onSelectTacticalCall,
  onSuggestedAction,
  onToggleControlMode,
  onInspectBatter,
  onInspectPitcher,
  onInspectPlayers,
}: LiveActionBarProps) {
  const cuePalette =
    cue.urgency === 'high'
      ? 'bg-[#FFF3BF] border-[#E63946] text-[#181B2C]'
      : cue.urgency === 'medium'
        ? 'bg-[#D8F3DC] border-[#1B4332] text-[#181B2C]'
        : 'bg-[#FBF4E4] border-[#181B2C] text-[#181B2C]';

  const badgePalette =
    cue.urgency === 'high'
      ? 'bg-[#E63946] text-white'
      : cue.urgency === 'medium'
        ? 'bg-[#2FB356] text-white'
        : 'bg-[#1B4332] text-[#FFD166]';

  return (
    <div
      data-testid="live-action-bar"
      className="rounded-2xl border-[3px] border-[#181B2C] bg-[#FFFDF7] shadow-[4px_4px_0_#181B2C] p-2.5 sm:p-3 space-y-2.5"
    >
      {/* Row 1: Coach Pops' "Right Now" Contextual Turn & Action Cue */}
      <div
        data-testid="coach-action-cue"
        className={`rounded-xl border-2 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 ${cuePalette}`}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold">
            <span className={`px-2 py-0.5 rounded-md border border-[#181B2C] ${badgePalette}`}>
              {cue.badgeText}
            </span>
            <span className="px-2 py-0.5 rounded-md border border-[#181B2C] bg-[#1D3557] text-[#FFFDF7]">
              {cue.turnLabel}
            </span>
            <span className="text-[#4A5068] truncate">
              {matchupLabel} • {basesLabel}
            </span>
          </div>
          <p className="text-xs font-extrabold leading-snug text-[#181B2C]">{cue.headline}</p>
          {(onInspectBatter || onInspectPitcher || onInspectPlayers) ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {onInspectBatter ? (
                <button
                  type="button"
                  data-testid="inspect-batter-card-btn"
                  onClick={onInspectBatter}
                  className="px-2 py-1 min-h-[32px] rounded-lg border-2 border-[#181B2C] bg-[#FFFDF7] hover:bg-[#FFF3BF] text-[10px] sm:text-[11px] font-extrabold text-[#181B2C] cursor-pointer"
                >
                  🃏 Batter: {batterName ?? 'Card'}
                </button>
              ) : null}
              {onInspectPitcher ? (
                <button
                  type="button"
                  data-testid="inspect-pitcher-card-btn"
                  onClick={onInspectPitcher}
                  className="px-2 py-1 min-h-[32px] rounded-lg border-2 border-[#181B2C] bg-[#E0FBFC] hover:bg-[#FFF3BF] text-[10px] sm:text-[11px] font-extrabold text-[#1D3557] cursor-pointer"
                >
                  🃏 Pitcher: {pitcherName ?? 'Card'}
                </button>
              ) : null}
              {onInspectPlayers ? (
                <button
                  type="button"
                  data-testid="inspect-game-players-btn"
                  onClick={onInspectPlayers}
                  className="px-2 py-1 min-h-[32px] rounded-lg border-2 border-[#181B2C] bg-[#FBF4E4] hover:bg-[#FFF3BF] text-[10px] sm:text-[11px] font-extrabold text-[#181B2C] cursor-pointer"
                >
                  🃏 All Players
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {cue.suggestedAction ? (
          <ComicButton
            size="sm"
            variant={cue.urgency === 'high' ? 'gold' : 'turf'}
            icon={<Sparkles className="w-3.5 h-3.5" />}
            disabled={gameCompleted}
            onClick={() => onSuggestedAction(cue.suggestedAction!)}
          >
            {cue.suggestedAction.label}
          </ComicButton>
        ) : null}
      </div>

      {/* Row 2: One-Tap Primary Action Controls (always right below the 3D field!) */}
      <div className="flex flex-wrap items-center gap-2">
        <ComicButton
          size="md"
          variant={cue.kind === 'power_armed' ? 'coral' : 'turf'}
          disabled={gameCompleted}
          icon={<Play className="w-4 h-4" />}
          aria-label={cue.primaryButtonLabel}
          onClick={onNextPitch}
          className="flex-1 sm:flex-none min-w-[155px]"
        >
          {isBatting ? 'Next Pitch' : 'Throw Pitch'}
        </ComicButton>

        <ComicButton
          size="sm"
          variant={watchMode === 'live' ? 'gold' : 'sky'}
          disabled={gameCompleted}
          onClick={onToggleWatchMode}
        >
          {watchMode === 'live' ? 'Pause Auto' : 'Auto Play 3D'}
        </ComicButton>

        <ComicButton
          size="sm"
          variant="cream"
          disabled={gameCompleted}
          icon={<SkipForward className="w-3.5 h-3.5" />}
          onClick={onSimAtBat}
        >
          Sim At-Bat
        </ComicButton>

        <ComicButton
          size="sm"
          variant="cream"
          disabled={gameCompleted}
          icon={<FastForward className="w-3.5 h-3.5" />}
          onClick={onSimHalfInning}
        >
          Sim Half-Inn
        </ComicButton>

        {controlMode === 'advanced' ? (
          <ComicButton
            size="sm"
            variant="violet"
            disabled={gameCompleted}
            icon={<Zap className="w-3.5 h-3.5" />}
            onClick={onClutchSim}
          >
            Clutch Sim
          </ComicButton>
        ) : null}

        <ComicButton
          size="sm"
          variant="gold"
          disabled={gameCompleted}
          icon={<FastForward className="w-3.5 h-3.5" />}
          onClick={onSimToEnd}
        >
          Sim to End
        </ComicButton>

        <ComicButton
          size="sm"
          variant={controlMode === 'advanced' ? 'violet' : 'cream'}
          data-testid="control-mode-toggle"
          icon={<Sliders className="w-3.5 h-3.5" />}
          onClick={onToggleControlMode}
          className="ml-auto"
        >
          {controlMode === 'simple' ? 'Pro Manager' : 'Simple Arcade'}
        </ComicButton>
      </div>

      {/* Row 3: Compact TV Broadcast Lower-Third + Clutch Jump-In Banner + Optional Swing Pills + Live Readout */}
      {clutchRecap ? (
        <div
          data-testid="clutch-recap-banner"
          className="px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#FFE5EC] text-[#9D0208] text-[11px] font-extrabold"
        >
          🔥 {clutchRecap}
        </div>
      ) : null}

      {lowerThird ? (
        <div
          data-testid="broadcast-lower-third"
          className="px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#181B2C] text-[#FBF4E4] flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-bold"
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-[#FFD166] font-extrabold">
              🏏 {lowerThird.batterName} ({lowerThird.batterLineText})
            </span>
            <span className="text-[#89C2A5]">• On Deck: {lowerThird.onDeckName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 font-mono-tabular">
            <span className="text-[#E0FBFC]">⚾ {lowerThird.pitcherName}</span>
            <span
              className={`px-1.5 py-0.5 rounded font-extrabold border border-white/25 ${
                lowerThird.enduranceTone === 'gassed'
                  ? 'bg-[#FF4D6D] text-white'
                  : lowerThird.enduranceTone === 'tiring'
                    ? 'bg-[#FFC300] text-[#181B2C]'
                    : 'bg-[#2FB356] text-white'
              }`}
            >
              {lowerThird.pitchCount} P • {lowerThird.endurancePct}%
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-dashed border-[#181B2C]/20 text-[11px]">
        {controlMode === 'simple' && isBatting ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-extrabold uppercase text-[10px] text-[#4A5068] mr-1">
              Swing (Optional):
            </span>
            {SIMPLE_BAT_APPROACHES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectTacticalCall(opt.id)}
                className={`px-2.5 py-1 min-h-[44px] rounded-lg border-2 border-[#181B2C] font-heading font-bold text-[11px] cursor-pointer ${
                  tacticalCall === opt.id
                    ? 'bg-[#FF4D6D] text-white'
                    : 'bg-[#FBF4E4] text-[#181B2C]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}

        <div
          data-testid="live-last-pitch-readout"
          className="font-bold text-[#181B2C] truncate flex-1 min-w-[180px]"
        >
          {latestEvent ? (
            <>
              <span className="font-extrabold text-[#1B4332] mr-1">
                [{latestEvent.half} {latestEvent.inning}]
              </span>
              {latestEvent.commentary}
            </>
          ) : (
            <span className="text-[#4A5068]">
              Eyes on the 3D diamond — press {isBatting ? 'Next Pitch' : 'Throw Pitch'} to start!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
