import { useState } from 'react';
import { FastForward, Play, RefreshCw, SkipForward, Sliders, Sparkles, Zap } from 'lucide-react';
import type { LiveBroadcastLowerThird } from '../../engine/gm/gameDayMoments';
import { PITCH_TYPE_SHORT_LABELS, type FormState } from '../../engine/models/player';
import type { PlayEvent, TacticalCall } from '../../engine/models/playEvent';
import type { LiveActionCue, SuggestedQuickAction } from '../../engine/simulation/liveActionAdvisor';
import type { PitchTargetIntent } from '../../engine/simulation/pitchMindGames';
import type { GameDayControlMode } from '../../store/userPreferences';
import { ComicButton } from '../design-system/ComicButton';
import { CoachPopsAvatar } from './CoachPopsAvatar';

export interface ArcadeBullpenOption {
  id: string;
  name: string;
  throws: string;
  roleLabel: string;
}

interface LiveActionBarProps {
  cue: LiveActionCue;
  matchupLabel: string;
  basesLabel: string;
  batterName?: string;
  pitcherName?: string;
  lowerThird?: LiveBroadcastLowerThird;
  clutchRecap?: string | null;
  firstPitchTip?: string | null;
  bullpenOptions?: readonly ArcadeBullpenOption[];
  latestEvent: PlayEvent | null;
  controlMode: GameDayControlMode;
  watchMode: 'live' | 'smart' | 'clutch' | 'paused';
  smartPauseReason?: string | null;
  tacticalCall: TacticalCall;
  pitchTarget?: PitchTargetIntent;
  isBatting: boolean;
  gameCompleted: boolean;
  humanHype?: number;
  hypeCost?: number;
  readyPowerLabel?: string | null;
  powerArmed?: boolean;
  onArmReadyPower?: () => void;
  speed?: 1 | 2 | 4;
  onCycleSpeed?: () => void;
  quickStealOption?: { label: string; runnerName: string; successPct: number; call: TacticalCall } | null;
  isBatterFavorite?: boolean;
  onNextPitch: () => void;
  onToggleWatchMode: () => void;
  onToggleSmartWatch?: () => void;
  onSimAtBat: () => void;
  onSimHalfInning: () => void;
  onClutchSim: () => void;
  onSimToEnd: () => void;
  onSelectTacticalCall: (call: TacticalCall) => void;
  onSelectPitchTarget?: (intent: PitchTargetIntent) => void;
  onSuggestedAction: (action: SuggestedQuickAction) => void;
  onToggleControlMode: () => void;
  onSelectBullpenReliever?: (relieverId: string) => void;
  onInspectBatter?: () => void;
  onInspectPitcher?: () => void;
  onInspectPlayers?: () => void;
}

const SIMPLE_BAT_APPROACHES: readonly { id: TacticalCall; label: string; hint: string }[] = [
  { id: 'contact', label: '🎯 Contact', hint: 'Put it in play' },
  { id: 'normal', label: '⚾ Normal', hint: 'Balanced swing' },
  { id: 'power', label: '💥 Swing Big!', hint: 'Hunt home runs' },
];

const SIMPLE_PITCH_CALLS: readonly { id: PitchTargetIntent; label: string; hint: string }[] = [
  { id: 'high_heat', label: '🔥 Heat', hint: 'Fastball power' },
  { id: 'bury_offspeed', label: '🌀 Trick', hint: 'Fool them' },
  { id: 'paint_corners', label: '🎯 Corner', hint: 'Pinpoint edge' },
];

function formEmoji(form: FormState): string {
  if (form === 'blazing' || form === 'hot') return ' 🔥';
  if (form === 'cold' || form === 'frozen') return ' 🧊';
  return '';
}

export function LiveActionBar({
  cue,
  matchupLabel,
  basesLabel,
  batterName,
  pitcherName,
  lowerThird,
  clutchRecap,
  firstPitchTip = null,
  bullpenOptions = [],
  latestEvent,
  controlMode,
  watchMode,
  smartPauseReason,
  tacticalCall,
  pitchTarget = 'attack_zone',
  isBatting,
  gameCompleted,
  humanHype = 25,
  hypeCost = 60,
  readyPowerLabel = null,
  powerArmed = false,
  onArmReadyPower,
  speed = 1,
  onCycleSpeed,
  quickStealOption = null,
  isBatterFavorite = false,
  onNextPitch,
  onToggleWatchMode,
  onToggleSmartWatch,
  onSimAtBat,
  onSimHalfInning,
  onClutchSim,
  onSimToEnd,
  onSelectTacticalCall,
  onSelectPitchTarget,
  onSuggestedAction,
  onToggleControlMode,
  onSelectBullpenReliever,
  onInspectBatter,
  onInspectPitcher,
  onInspectPlayers,
}: LiveActionBarProps) {
  const [bullpenOpen, setBullpenOpen] = useState(false);
  const [fastSimOpen, setFastSimOpen] = useState(false);
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

  const hypePct = Math.min(100, Math.round((humanHype / Math.max(1, hypeCost)) * 100));

  return (
    <div
      data-testid="live-action-bar"
      className="rounded-2xl border-[3px] border-[#181B2C] bg-[#FFFDF7] shadow-[4px_4px_0_#181B2C] p-2.5 sm:p-3 space-y-2"
    >
      {/* Row 1: Interactive 3-Call Arcade Choice (Batting & Pitching!) + Visible Glowing Hype Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        {controlMode === 'simple' ? (
          <div
            data-testid="arcade-call-bar"
            className="flex flex-wrap items-center gap-1"
          >
            <span className="font-display text-[10px] uppercase text-[#1D3557] mr-0.5">
              {isBatting ? 'Swing:' : 'Pitch:'}
            </span>
            {isBatting
              ? SIMPLE_BAT_APPROACHES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.hint}
                    disabled={gameCompleted}
                    onClick={() => onSelectTacticalCall(opt.id)}
                    className={`px-2 py-1 min-h-11 rounded-xl border-2 border-[#181B2C] font-heading font-extrabold text-[11px] cursor-pointer transition ${
                      tacticalCall === opt.id
                        ? 'bg-[#FF4D6D] text-white shadow-[2px_2px_0_#181B2C]'
                        : 'bg-[#FBF4E4] text-[#181B2C] hover:bg-[#FFF3BF]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))
              : SIMPLE_PITCH_CALLS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.hint}
                    disabled={gameCompleted}
                    onClick={() => onSelectPitchTarget?.(opt.id)}
                    className={`px-2 py-1 min-h-11 rounded-xl border-2 border-[#181B2C] font-heading font-extrabold text-[11px] cursor-pointer transition ${
                      pitchTarget === opt.id
                        ? 'bg-[#1D3557] text-[#FFD166] shadow-[2px_2px_0_#181B2C]'
                        : 'bg-[#E0FBFC] text-[#1D3557] hover:bg-[#FFF3BF]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
            {isBatting && quickStealOption ? (
              <button
                type="button"
                data-testid="arcade-steal-btn"
                disabled={gameCompleted}
                onClick={() =>
                  onSelectTacticalCall(
                    tacticalCall === quickStealOption.call ? 'normal' : quickStealOption.call,
                  )
                }
                className={`px-2 py-1 min-h-11 rounded-xl border-2 border-[#181B2C] font-heading font-extrabold text-[11px] cursor-pointer transition ${
                  tacticalCall === quickStealOption.call
                    ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]'
                    : 'bg-[#D8F3DC] text-[#1B4332] hover:bg-[#FFC300]'
                }`}
              >
                💨 {quickStealOption.label} ({quickStealOption.successPct}%)
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Visible Glowing ⚡ Special Power Hype Meter (Fun in BOTH Arcade & Pro Modes!) */}
        <div
          data-testid="arcade-hype-bar"
          className="flex items-center gap-2 ml-auto px-2 py-1 rounded-xl border-2 border-[#181B2C] bg-[#F5EEFF]"
        >
          <div className="space-y-0.5 min-w-[88px]">
            <div className="flex items-center justify-between text-[9px] font-extrabold uppercase text-[#4C1D95]">
              <span>⚡ Hype</span>
              <span className="font-mono-tabular">
                {humanHype}/{hypeCost}
              </span>
            </div>
            <div className="h-2 rounded-full border border-[#181B2C] bg-white overflow-hidden">
              <div
                className={`h-full transition-all ${
                  hypePct >= 100 ? 'bg-[#FF4D6D]' : 'bg-[#FFC300]'
                }`}
                style={{ width: `${hypePct}%` }}
              />
            </div>
          </div>
          {readyPowerLabel && onArmReadyPower ? (
            <button
              type="button"
              data-testid="arcade-unleash-power-btn"
              disabled={gameCompleted}
              onClick={onArmReadyPower}
              className={`px-2 py-1 min-h-[32px] rounded-lg border-2 border-[#181B2C] font-display text-[10px] cursor-pointer ${
                powerArmed
                  ? 'bg-[#FF4D6D] text-white'
                  : 'bg-[#FFC300] text-[#181B2C] animate-pulse'
              }`}
            >
              {powerArmed ? '🔥 ARMED!' : `⚡ ${readyPowerLabel}`}
            </button>
          ) : null}
        </div>
      </div>

      {/* Row 2: Streamlined Primary Controller (Right Under the 3D Ballpark — Always in Thumb Zone!) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <ComicButton
          size="md"
          variant={cue.kind === 'power_armed' || powerArmed ? 'coral' : 'turf'}
          disabled={gameCompleted}
          icon={<Play className="w-4 h-4" />}
          aria-label={cue.primaryButtonLabel}
          onClick={onNextPitch}
          className="flex-1 sm:flex-none min-w-[140px]"
        >
          {isBatting ? 'Next Pitch' : 'Throw Pitch'}
        </ComicButton>

        {onToggleSmartWatch ? (
          <ComicButton
            size="sm"
            variant={watchMode === 'smart' ? 'coral' : 'violet'}
            data-testid="smart-watch-toggle"
            disabled={gameCompleted}
            onClick={onToggleSmartWatch}
          >
            {watchMode === 'smart' ? '⏸️ Smart ON' : '✨ Smart Watch'}
          </ComicButton>
        ) : null}

        {onCycleSpeed ? (
          <ComicButton
            size="sm"
            variant={speed > 1 ? 'gold' : 'cream'}
            data-testid="arcade-speed-toggle"
            disabled={gameCompleted}
            onClick={onCycleSpeed}
          >
            ⏩ {speed}x
          </ComicButton>
        ) : null}

        <ComicButton
          size="sm"
          variant={fastSimOpen || watchMode === 'live' ? 'gold' : 'cream'}
          data-testid="fast-sim-toggle"
          disabled={gameCompleted}
          icon={<FastForward className="w-3.5 h-3.5" />}
          onClick={() => {
            setFastSimOpen((open) => !open);
            setBullpenOpen(false);
          }}
        >
          {watchMode === 'live' ? 'Auto ON ▾' : 'Fast Sim ▾'}
        </ComicButton>

        {bullpenOptions.length > 0 && onSelectBullpenReliever ? (
          <ComicButton
            size="sm"
            variant={bullpenOpen ? 'coral' : 'sky'}
            data-testid="arcade-bullpen-toggle"
            disabled={gameCompleted}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => {
              setBullpenOpen((open) => !open);
              setFastSimOpen(false);
            }}
          >
            📞 Bullpen ({bullpenOptions.length})
          </ComicButton>
        ) : null}

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

      {/* Compact Fast Sim Popover Drawer (Auto Play 3D, At-Bat, Half-Inn, Clutch, Sim to End) */}
      {fastSimOpen ? (
        <div
          data-testid="fast-sim-drawer"
          className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF8E7] flex flex-wrap items-center gap-1.5"
        >
          <ComicButton
            size="sm"
            variant={watchMode === 'live' ? 'coral' : 'sky'}
            disabled={gameCompleted}
            onClick={() => {
              onToggleWatchMode();
              setFastSimOpen(false);
            }}
          >
            {watchMode === 'live' ? 'Pause Auto' : 'Auto Play 3D'}
          </ComicButton>
          <ComicButton
            size="sm"
            variant="cream"
            disabled={gameCompleted}
            icon={<SkipForward className="w-3.5 h-3.5" />}
            onClick={() => {
              onSimAtBat();
              setFastSimOpen(false);
            }}
          >
            Sim At-Bat
          </ComicButton>
          <ComicButton
            size="sm"
            variant="cream"
            disabled={gameCompleted}
            icon={<FastForward className="w-3.5 h-3.5" />}
            onClick={() => {
              onSimHalfInning();
              setFastSimOpen(false);
            }}
          >
            Sim Half-Inn
          </ComicButton>
          <ComicButton
            size="sm"
            variant="violet"
            disabled={gameCompleted}
            icon={<Zap className="w-3.5 h-3.5" />}
            onClick={() => {
              onClutchSim();
              setFastSimOpen(false);
            }}
          >
            Clutch Sim
          </ComicButton>
          <ComicButton
            size="sm"
            variant="gold"
            disabled={gameCompleted}
            icon={<FastForward className="w-3.5 h-3.5" />}
            onClick={() => {
              onSimToEnd();
              setFastSimOpen(false);
            }}
          >
            Sim to End
          </ComicButton>
        </div>
      ) : null}

      {bullpenOpen && bullpenOptions.length > 0 && onSelectBullpenReliever ? (
        <div
          data-testid="arcade-bullpen-drawer"
          className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] space-y-1.5"
        >
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-[#1D3557]">
            <span>📞 Quick Bullpen Call — Tap a Fresh Arm to Enter</span>
            <button
              type="button"
              onClick={() => setBullpenOpen(false)}
              className="underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bullpenOptions.map((rel) => (
              <ComicButton
                key={rel.id}
                size="sm"
                variant="cream"
                data-testid="arcade-bullpen-bring-in"
                onClick={() => {
                  onSelectBullpenReliever(rel.id);
                  setBullpenOpen(false);
                }}
              >
                Bring In {rel.name} ({rel.throws}HP{rel.roleLabel ? ` • ${rel.roleLabel}` : ''})
              </ComicButton>
            ))}
          </div>
        </div>
      ) : null}

      {/* Row 3: Coach Pops' Contextual Turn & Action Cue + First-Pitch Welcome Tip + 1-Tap Card Inspection */}
      <div
        data-testid="coach-action-cue"
        className={`rounded-xl border-2 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 ${cuePalette}`}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <CoachPopsAvatar size="sm" testId="live-coach-pops-avatar" />
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
            <p className="text-xs font-extrabold leading-snug text-[#181B2C]">
              {smartPauseReason ? `⏸️ ${smartPauseReason} — ${cue.headline}` : cue.headline}
            </p>
            {firstPitchTip ? (
              <div
                data-testid="first-pitch-tip"
                className="mt-1 px-2 py-1 rounded-lg border border-[#7209B7]/40 bg-[#F5EEFF] text-[#4C1D95] text-[11px] font-extrabold"
              >
                🧢 {firstPitchTip}
              </div>
            ) : null}
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

      {/* Row 3: Compact TV Broadcast Lower-Third + Clutch Jump-In Banner + Live Readout */}
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
              🏏 {isBatterFavorite ? '⭐ ' : ''}
              {lowerThird.batterName} “{lowerThird.batterNickname}”{formEmoji(lowerThird.batterForm)} (
              {lowerThird.batterLineText})
            </span>
            <span className="text-[#89C2A5]">• On Deck: {lowerThird.onDeckName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 font-mono-tabular">
            <span className="text-[#E0FBFC]">
              ⚾ {lowerThird.pitcherName}
              {formEmoji(lowerThird.pitcherForm)}
            </span>
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

      <div className="pt-1.5 border-t border-dashed border-[#181B2C]/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div
          data-testid="live-last-pitch-readout"
          className="font-bold text-[#181B2C] truncate flex-1 min-w-[160px]"
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
        {latestEvent?.pitchThrown ? (
          <span
            data-testid="last-pitch-radar-pill"
            className="px-2 py-0.5 rounded-lg bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[10px] font-extrabold shrink-0"
          >
            {latestEvent.pitchThrown.mph} mph {PITCH_TYPE_SHORT_LABELS[latestEvent.pitchThrown.pitchType]}
            {latestEvent.pitchThrown.isFavoritePitch ? ' ★' : ''}
          </span>
        ) : null}
      </div>
    </div>
  );
}
