import { useId, useState } from 'react';
import { ClipboardList, FastForward, Play, RefreshCw, Shield, SkipForward, Sliders, Sparkles, Zap } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import type { LiveBroadcastLowerThird } from '../../engine/gm/gameDayMoments';
import {
  buildMascotTapCheer,
  PITCH_CALL_GUIDE,
  SWING_CALL_GUIDE,
} from '../../engine/gm/openingDayHook';
import type { ClubRitualProfile } from '../../engine/gm/polaroidKeepsakes';
import { PITCH_TYPE_SHORT_LABELS, type FormState, type PitchType } from '../../engine/models/player';
import type { PlayEvent, TacticalCall } from '../../engine/models/playEvent';
import type { PitcherEnduranceTier } from '../../engine/rpg/pitcherEndurance';
import {
  stealPlayToTacticalCall,
  type StealOptionPreview,
  type StealPlayType,
} from '../../engine/simulation/baserunning';
import {
  BULLPEN_MODE_OPTIONS,
  type BullpenMode,
  type BullpenRecommendation,
  type UpcomingBatterSummary,
} from '../../engine/simulation/bullpenManager';
import type { CatcherPitchCall } from '../../engine/simulation/catcherCalls';
import type { LiveActionCue, SuggestedQuickAction } from '../../engine/simulation/liveActionAdvisor';
import type {
  ArcadeTimingGrade,
  PitchingMode,
  PitchTargetIntent,
} from '../../engine/simulation/pitchMindGames';
import {
  DEFENSIVE_SHIFTS,
  type DefensiveShiftId,
} from '../../engine/simulation/winProbability';
import type { GameDayControlMode } from '../../store/userPreferences';
import { ComicButton } from '../design-system/ComicButton';
import { ArcadeTimingMeter } from './ArcadeTimingMeter';
import { ClubMascotBuddy } from './ClubMascotBuddy';
import { CoachPopsAvatar } from './CoachPopsAvatar';

export interface ArcadeBullpenOption {
  id: string;
  name: string;
  throws: string;
  roleLabel: string;
  ovr?: number;
  isRecommended?: boolean;
  fitTag?: string | null;
  platoonEdge?: 'favorable' | 'neutral' | 'tough';
  freshnessPct?: number;
  pitchMixLabels?: readonly string[];
}

export interface PitcherSignOption {
  pitchType: PitchType;
  label: string;
  mastery: number;
  isFavorite: boolean;
  isWeak: boolean;
}

export interface PickoffQuickOption {
  base: 1 | 2;
  call: 'pickoff_1b' | 'pickoff_2b';
  label: string;
  runnerName?: string;
}

interface LiveActionBarProps {
  watchSettings?: React.ReactNode;
  catcherSuggestion?: React.ReactNode;
  cue: LiveActionCue;
  matchupLabel: string;
  basesLabel: string;
  batterName?: string;
  pitcherName?: string;
  lowerThird?: LiveBroadcastLowerThird;
  clutchRecap?: string | null;
  firstPitchTip?: string | null;
  bullpenOptions?: readonly ArcadeBullpenOption[];
  upcomingBatters?: readonly UpcomingBatterSummary[];
  clubMascot?: string;
  clubColors?: { primary: string; secondary: string; accent: string };
  clubRituals?: ClubRitualProfile;
  mascotMood?: 'happy' | 'cheering' | 'rally' | 'determined';
  onMascotTap?: () => void;
  canArgueCall?: boolean;
  onArgueCall?: () => void;
  buntPreviewLine?: string | null;
  defensiveShift?: DefensiveShiftId;
  onSelectDefensiveShift?: (shift: DefensiveShiftId) => void;
  aiDefenseShiftLabel?: string | null;
  pitcherArsenal?: readonly PitcherSignOption[];
  selectedPitchType?: PitchType | null;
  onSelectPitchType?: (pitchType: PitchType | null) => void;
  pitcherEndurance?: number;
  pitcherEnduranceTier?: PitcherEnduranceTier;
  pitcherStamina?: number;
  pitcherFatigueDropTag?: string | null;
  latestEvent: PlayEvent | null;
  latestEventCommentary?: string | null;
  controlMode: GameDayControlMode;
  pitchingMode?: PitchingMode;
  onSelectPitchingMode?: (mode: PitchingMode) => void;
  bullpenMode?: BullpenMode;
  onSelectBullpenMode?: (mode: BullpenMode) => void;
  bullpenSuggestion?: BullpenRecommendation | null;
  onAcceptBullpenSuggestion?: (relieverId: string) => void;
  onDismissBullpenSuggestion?: (snoozeKey: string) => void;
  catcherCall?: CatcherPitchCall | null;
  shakeOffTotal?: number;
  onShakeOff?: () => void;
  repeatPitchWarning?: boolean;
  batterWeakPitch?: PitchType;
  batterFavoritePitch?: PitchType;
  watchMode: 'live' | 'smart' | 'clutch' | 'paused';
  smartPauseReason?: string | null;
  tacticalCall: TacticalCall;
  pitchTarget?: PitchTargetIntent;
  isBatting: boolean;
  gameCompleted: boolean;
  locked?: boolean;
  humanHype?: number;
  hypeCost?: number;
  readyPowerLabel?: string | null;
  powerArmed?: boolean;
  onArmReadyPower?: () => void;
  speed?: 1 | 2 | 4;
  onCycleSpeed?: () => void;
  arcadeTimingEnabled?: boolean;
  onToggleArcadeTiming?: () => void;
  onePitchMode?: boolean;
  onToggleOnePitchMode?: () => void;
  audioMuted?: boolean;
  onToggleAudio?: () => void;
  quickStealOption?: { label: string; runnerName: string; successPct: number; call: TacticalCall } | null;
  stealOptions?: readonly StealOptionPreview[];
  armedStealPlay?: StealPlayType | null;
  onToggleStealPlay?: (play: StealPlayType | null) => void;
  pickoffOption?: PickoffQuickOption | null;
  onPickoff?: (base: 1 | 2) => void;
  hitAndRunArmed?: boolean;
  onToggleHitAndRun?: () => void;
  strikes?: number;
  isBatterFavorite?: boolean;
  onNextPitch: (timingGrade?: ArcadeTimingGrade) => void;
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
  onOpenBoxScore?: () => void;
  density?: 'full' | 'dock' | 'sheet';
  onOpenTactics?: () => void;
}

const SIMPLE_BAT_APPROACHES = SWING_CALL_GUIDE;

const SIMPLE_PITCH_CALLS = PITCH_CALL_GUIDE;

const PITCHING_MODE_PILLS: readonly { id: PitchingMode; label: string; title: string }[] = [
  { id: 'simple', label: 'Simple', title: 'Catcher calls pitch & location (optional Shake off)' },
  { id: 'normal', label: 'Normal', title: 'Pick Over Plate, Corner, or Low Chase (auto pitch)' },
  { id: 'advanced', label: 'Adv', title: 'Pick location AND pitch type from arsenal' },
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
  upcomingBatters = [],
  clubMascot,
  clubColors,
  clubRituals,
  mascotMood = 'happy',
  onMascotTap,
  canArgueCall = false,
  onArgueCall,
  buntPreviewLine = null,
  defensiveShift = 'standard',
  onSelectDefensiveShift,
  aiDefenseShiftLabel = null,
  pitcherArsenal = [],
  watchSettings, catcherSuggestion, selectedPitchType = null,
  onSelectPitchType,
  pitcherEndurance,
  pitcherEnduranceTier = 'fresh',
  pitcherStamina,
  pitcherFatigueDropTag = null,
  latestEvent,
  latestEventCommentary = null,
  controlMode,
  pitchingMode = 'simple',
  onSelectPitchingMode,
  bullpenMode = 'semi_auto',
  onSelectBullpenMode,
  bullpenSuggestion = null,
  onAcceptBullpenSuggestion,
  onDismissBullpenSuggestion,
  catcherCall = null,
  shakeOffTotal = 0,
  onShakeOff,
  repeatPitchWarning = false,
  batterWeakPitch,
  batterFavoritePitch,
  watchMode,
  smartPauseReason,
  tacticalCall,
  pitchTarget = 'attack_zone',
  isBatting,
  gameCompleted,
  locked = false,
  humanHype = 25,
  hypeCost = 60,
  readyPowerLabel = null,
  powerArmed = false,
  onArmReadyPower,
  speed = 1,
  onCycleSpeed,
  arcadeTimingEnabled = false,
  onToggleArcadeTiming,
  onePitchMode = false,
  onToggleOnePitchMode,
  audioMuted = false,
  onToggleAudio,
  quickStealOption = null,
  stealOptions = [],
  armedStealPlay = null,
  onToggleStealPlay,
  pickoffOption = null,
  onPickoff,
  hitAndRunArmed = false,
  onToggleHitAndRun,
  strikes = 0,
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
  onOpenBoxScore,
  density = 'full',
  onOpenTactics,
}: LiveActionBarProps) {
  const [bullpenOpen, setBullpenOpen] = useState(false);
  const [tacticsOpen, setTacticsOpen] = useState(false);
  const tacticsId = useId();
  const [fastSimOpen, setFastSimOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [mascotTapCount, setMascotTapCount] = useState(0);
  const [mascotCheerText, setMascotCheerText] = useState<string | null>(null);
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
  const isHypeReady = humanHype >= hypeCost;
  const hypeReadoutLabel = isHypeReady ? 'READY! 100%' : `${hypePct}%`;
  const hasBullpenPicker = bullpenOptions.length > 0 && Boolean(onSelectBullpenReliever);
  const recommendedReliever = bullpenOptions.find((rel) => rel.isRecommended) ?? bullpenOptions[0] ?? null;
  const isPitcherTired = typeof pitcherEndurance === 'number' && pitcherEndurance <= 35;
  const showBullpenSuggestion =
    !gameCompleted &&
    !isBatting &&
    bullpenMode === 'semi_auto' &&
    Boolean(bullpenSuggestion) &&
    Boolean(onAcceptBullpenSuggestion);
  const currentPitcherFirst = pitcherName ? pitcherName.split(' ')[0] : 'Pitcher';
  const activeBullpenModeMeta =
    BULLPEN_MODE_OPTIONS.find((opt) => opt.id === bullpenMode) ?? BULLPEN_MODE_OPTIONS[1];
  const hasShiftPicker = !isBatting && Boolean(onSelectDefensiveShift);
  const activeShiftShort =
    DEFENSIVE_SHIFTS.find((s) => s.id === defensiveShift)?.shortLabel ?? 'Standard';
  const showCpuShiftChip =
    isBatting && Boolean(aiDefenseShiftLabel) && aiDefenseShiftLabel !== 'Standard';

  const resolvedStealOptions: readonly {
    playType: StealPlayType;
    label: string;
    successPct: number;
    call: TacticalCall;
  }[] =
    stealOptions.length > 0
      ? stealOptions.map((opt) => ({
          playType: opt.playType,
          label: opt.label,
          successPct: opt.successPct,
          call: stealPlayToTacticalCall(opt.playType),
        }))
      : quickStealOption
        ? [
            {
              playType:
                quickStealOption.call === 'steal_3b' ||
                quickStealOption.call === 'double_steal' ||
                quickStealOption.call === 'steal_home'
                  ? quickStealOption.call
                  : 'steal_2b',
              label: quickStealOption.label,
              successPct: quickStealOption.successPct,
              call: quickStealOption.call,
            },
          ]
        : [];
  const isStealArmed = Boolean(armedStealPlay) || tacticalCall.includes('steal');
  const twoStrikeSteal = isBatting && isStealArmed && strikes === 2;
  const activeTradeoff = isBatting
    ? isStealArmed
      ? twoStrikeSteal
        ? '2 strikes — runner breaks AND batter swings to protect the plate!'
        : hitAndRunArmed
          ? 'Hit & Run — runner breaks and batter swings to put it in play!'
          : 'Runner breaks on the pitch — ball or strike still counts.'
      : tacticalCall === 'bunt' && buntPreviewLine
        ? buntPreviewLine
        : (SIMPLE_BAT_APPROACHES.find((opt) => opt.id === tacticalCall)?.tradeoff ??
          SIMPLE_BAT_APPROACHES[1].tradeoff)
    : pitchingMode === 'simple'
      ? (catcherCall?.reason ?? 'Catcher calls pitch & location — tap Shake off for another sign.')
      : (SIMPLE_PITCH_CALLS.find((opt) => opt.id === pitchTarget)?.tradeoff ??
        SIMPLE_PITCH_CALLS[0].tradeoff);

  const battingAction = isStealArmed
    ? twoStrikeSteal
      ? 'Steal & Swing (2K)'
      : hitAndRunArmed
        ? 'Hit & Run'
        : 'Send Runner'
    : tacticalCall === 'bunt'
      ? onePitchMode
        ? 'Lay down bunt · 1-Pitch'
        : 'Lay down bunt'
      : onePitchMode
        ? 'Swing · 1-Pitch'
        : 'Swing';
  const pitchAction = isBatting ? battingAction : onePitchMode ? 'Throw · 1-Pitch' : 'Throw Pitch';
  const primaryLabel = gameCompleted || !isBatting ? cue.primaryButtonLabel : battingAction + ' (Next Pitch)';
  const controlsLocked = gameCompleted || locked;
  const toggleStealOption = (opt: (typeof resolvedStealOptions)[number]) => {
    const active = armedStealPlay === opt.playType || tacticalCall === opt.call;
    if (onToggleStealPlay) {
      onToggleStealPlay(active ? null : opt.playType);
    } else {
      onSelectTacticalCall(active ? 'normal' : opt.call);
    }
  };
  const enduranceFillClass =
    pitcherEnduranceTier === 'gassed'
      ? 'bg-[#FF4D6D]'
      : pitcherEnduranceTier === 'fatigued'
        ? 'bg-[#FB923C]'
        : pitcherEnduranceTier === 'tiring'
          ? 'bg-[#FFCC49]'
          : pitcherEnduranceTier === 'solid'
            ? 'bg-[#2EC4B6]'
            : 'bg-[#2FB356]';

  const mascotButton = clubMascot && clubColors ? (
    <button
      type="button"
      data-testid="live-dugout-mascot-btn"
      aria-label={`High-five ${clubMascot}`}
      title={`Tap ${clubMascot} for a dugout cheer!`}
      onClick={() => {
        const nextTap = mascotTapCount + 1;
        setMascotTapCount(nextTap);
        const cheer = buildMascotTapCheer(clubMascot, nextTap - 1, clubRituals);
        setMascotCheerText(cheer.text);
        soundEngine.play(cheer.soundCue);
        onMascotTap?.();
      }}
      className="rounded-2xl p-0.5 cursor-pointer hover:scale-105 active:scale-95 transition shrink-0"
    >
      <ClubMascotBuddy
        mascot={clubMascot}
        primaryColor={clubColors.primary}
        secondaryColor={clubColors.secondary}
        accentColor={clubColors.accent}
        mood={mascotMood}
        size="sm"
        testId="live-dugout-mascot-buddy"
      />
    </button>
  ) : null;

  if (density === 'dock') {
    return (
      <div
        data-testid="live-action-bar"
        className="live-thumb-dock rounded-2xl border-[2.5px] border-[#192735] bg-[#FFF7E4] shadow-[3px_3px_0_#192735] p-2"
      >
        {(showBullpenSuggestion && bullpenSuggestion) ||
        (isBatting && resolvedStealOptions.length > 0) ||
        (!isBatting && Boolean(pickoffOption) && Boolean(onPickoff)) ||
        (canArgueCall && Boolean(onArgueCall)) ||
        (readyPowerLabel && onArmReadyPower) ? (
          <div className="live-context-chip" data-testid="dock-context-chip">
            {showBullpenSuggestion && bullpenSuggestion ? (
              <button
                type="button"
                data-testid="bullpen-accept-btn"
                disabled={controlsLocked}
                onClick={() => onAcceptBullpenSuggestion?.(bullpenSuggestion.recommendedReliever.id)}
              >
                Bring In {bullpenSuggestion.recommendedReliever.name.split(' ')[0]}
              </button>
            ) : null}
            {canArgueCall && onArgueCall ? (
              <button
                type="button"
                data-testid="argue-call-chip"
                disabled={controlsLocked}
                onClick={onArgueCall}
                style={{ backgroundColor: '#FFE5EC', color: '#9D0208' }}
              >
                🗣️ Argue Call!
              </button>
            ) : null}
            {!isBatting && pickoffOption && onPickoff ? (
              <button
                type="button"
                data-testid="arcade-pickoff-btn"
                disabled={controlsLocked}
                onClick={() => onPickoff(pickoffOption.base)}
              >
                👀 {pickoffOption.label}
              </button>
            ) : null}
            {isBatting &&
              resolvedStealOptions.map((opt, idx) => {
                const active = armedStealPlay === opt.playType || tacticalCall === opt.call;
                const chipText =
                  active && strikes === 2
                    ? '💨 Steal + Swing (2K)'
                    : `💨 ${opt.label} (${opt.successPct}%)`;
                return (
                  <button
                    key={opt.playType}
                    type="button"
                    data-testid={idx === 0 ? 'arcade-steal-btn' : `arcade-steal-option-${opt.playType}`}
                    aria-pressed={active}
                    disabled={gameCompleted}
                    onClick={() => toggleStealOption(opt)}
                  >
                    {chipText}
                  </button>
                );
              })}
            {readyPowerLabel && onArmReadyPower ? (
              <button
                type="button"
                data-testid="arcade-unleash-power-btn"
                aria-pressed={powerArmed}
                disabled={gameCompleted}
                onClick={onArmReadyPower}
              >
                {powerArmed ? 'ARMED!' : readyPowerLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        {isBatting ? (
          <div data-testid="arcade-call-bar" className="atbat-choices" role="group" aria-label="Swing approach">
            {SIMPLE_BAT_APPROACHES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={tacticalCall === opt.id}
                disabled={gameCompleted}
                onClick={() => onSelectTacticalCall(opt.id)}
              >
                {opt.shortLabel}
              </button>
            ))}
            <button
              type="button"
              data-testid="arcade-bunt-btn"
              aria-pressed={tacticalCall === 'bunt'}
              disabled={gameCompleted}
              onClick={() => onSelectTacticalCall(tacticalCall === 'bunt' ? 'normal' : 'bunt')}
            >
              🏏 Bunt
            </button>
          </div>
        ) : pitchingMode === 'simple' ? (
          <div data-testid="arcade-catcher-call" className="atbat-catcher-call" aria-live="polite">
            <strong>
              🧤 Catcher:{' '}
              {catcherCall ? `${catcherCall.targetLabel} · ${catcherCall.pitchShortLabel}` : 'Over Plate · 4-Seam'}
            </strong>
            {onShakeOff && shakeOffTotal > 1 ? (
              <button type="button" data-testid="arcade-shake-off-btn" disabled={controlsLocked} onClick={onShakeOff}>
                Shake off
              </button>
            ) : null}
          </div>
        ) : (
          <div data-testid="arcade-call-bar" data-pitching-cols="3" className="atbat-choices" role="group" aria-label="Pitch target">
            {SIMPLE_PITCH_CALLS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={pitchTarget === opt.id}
                disabled={gameCompleted}
                onClick={() => onSelectPitchTarget?.(opt.id)}
              >
                {opt.shortLabel}
              </button>
            ))}
          </div>
        )}
        <div className="live-primary-row">
          {!(arcadeTimingEnabled && !gameCompleted) ? (
            <ComicButton
              size="sm"
              data-testid="live-primary-pitch-btn"
              data-play-locked={locked ? 'true' : undefined}
              variant={powerArmed ? 'coral' : 'gold'}
              disabled={controlsLocked}
              aria-busy={locked ? 'true' : undefined}
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => onNextPitch()}
              aria-label={primaryLabel}
              className={`thumb-go flex-1 min-w-0${locked ? ' is-play-locked' : ''}`}
            >
              {gameCompleted ? cue.primaryButtonLabel : pitchAction}
            </ComicButton>
          ) : (
            <ArcadeTimingMeter
              isBatting={isBatting}
              disabled={controlsLocked}
              actionLabel={`${pitchAction}!`}
              powerArmed={powerArmed}
              onLockTiming={(grade) => onNextPitch(grade)}
            />
          )}
          {mascotButton}
          <button
            type="button"
            className="tactics-toggle"
            aria-expanded={false}
            onClick={onOpenTactics}
          >
            Tactics
          </button>
        </div>
        {mascotCheerText ? (
          <div data-testid="live-mascot-cheer-bubble" role="status" className="atbat-mascot-cheer">
            <span>📣 {mascotCheerText}</span>
            <button type="button" onClick={() => setMascotCheerText(null)}>Hide</button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-testid="live-action-bar"
      className="rounded-2xl border-[2.5px] border-[#192735] bg-[#FFF7E4] shadow-[3px_3px_0_#192735] p-2.5 sm:p-3 space-y-2"
    >
      {/* Row 1: Unified Single-Row Arcade Call Bar + 3-Mode Pitching Controls + Slim Hype Bar */}
      <div data-testid="live-calls-block" className="space-y-1.5">
        <div className="flex flex-col gap-1.5">
          {controlMode === 'simple' ? (
            <div className="space-y-1 min-w-0 w-full">
              {!isBatting && onSelectPitchingMode ? (
                <div
                  data-testid="pitching-mode-switcher"
                  role="group"
                  aria-label="Pitching mode"
                  className="flex items-center justify-between sm:justify-start gap-2"
                >
                  <span className="font-display text-[9.5px] uppercase text-[#193D37]/80 shrink-0">
                    Pitching:
                  </span>
                  <div className="inline-flex items-center rounded-lg border-2 border-[#193E37] bg-[#F5EAD0] p-0.5 gap-0.5">
                    {PITCHING_MODE_PILLS.map((modeOpt) => {
                      const active = pitchingMode === modeOpt.id;
                      return (
                        <button
                          key={modeOpt.id}
                          type="button"
                          title={modeOpt.title}
                          aria-pressed={active}
                          disabled={gameCompleted}
                          onClick={() => onSelectPitchingMode(modeOpt.id)}
                          className={`px-2 py-0.5 min-h-[44px] rounded-md font-heading font-extrabold text-[10px] leading-none cursor-pointer transition ${
                            active
                              ? 'bg-[#224F49] text-[#FFCC49]'
                              : 'bg-transparent text-[#193D37] hover:bg-[#FFFDF8]'
                          }`}
                        >
                          {modeOpt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {isBatting ? (
                <div
                  data-testid="arcade-call-bar"
                  className="grid grid-cols-4 items-center gap-1"
                >
                  {SIMPLE_BAT_APPROACHES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.tradeoff}
                      aria-pressed={tacticalCall === opt.id}
                      disabled={gameCompleted}
                      onClick={() => onSelectTacticalCall(opt.id)}
                      className={`px-1 sm:px-2 py-1 min-h-[44px] rounded-lg border-2 border-[#193E37] font-heading font-extrabold text-[10.5px] sm:text-[11px] leading-tight whitespace-nowrap cursor-pointer ${
                        tacticalCall === opt.id
                          ? 'bg-[#224F49] text-white shadow-[inset_0_-3px_#F2C44F]'
                          : 'bg-[#FFFDF8] text-[#193D37] hover:bg-[#FFF3BF]'
                      }`}
                    >
                      {opt.shortLabel}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-testid="arcade-bunt-btn"
                    title={buntPreviewLine ?? 'Lay down a sacrifice or drag bunt for a hit'}
                    aria-pressed={tacticalCall === 'bunt'}
                    disabled={gameCompleted}
                    onClick={() =>
                      onSelectTacticalCall(tacticalCall === 'bunt' ? 'normal' : 'bunt')
                    }
                    className={`px-1 sm:px-2 py-1 min-h-[44px] rounded-lg border-2 border-[#193E37] font-heading font-extrabold text-[10.5px] sm:text-[11px] leading-tight whitespace-nowrap cursor-pointer ${
                      tacticalCall === 'bunt'
                        ? 'bg-[#224F49] text-white shadow-[inset_0_-3px_#F2C44F]'
                        : 'bg-[#FFFDF8] text-[#193D37] hover:bg-[#FFF3BF]'
                    }`}
                  >
                    🏏 Bunt
                  </button>
                </div>
              ) : pitchingMode === 'simple' ? (
                <div
                  data-testid="arcade-catcher-call"
                  aria-live="polite"
                  className="px-2.5 py-1.5 rounded-xl border-2 border-[#193E37] bg-[#FFFDF8] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-extrabold text-xs text-[#193D37] truncate">
                      🧤 Catcher:{' '}
                      {catcherCall
                        ? `${catcherCall.targetLabel} · ${catcherCall.pitchShortLabel}`
                        : 'Over Plate · 4-Seam'}
                    </div>
                  </div>
                  {onShakeOff && shakeOffTotal > 1 ? (
                    <button
                      type="button"
                      data-testid="arcade-shake-off-btn"
                      disabled={controlsLocked}
                      onClick={onShakeOff}
                      className="px-2.5 py-1 min-h-[44px] rounded-lg border-2 border-[#193E37] bg-[#FFF3BF] hover:bg-[#FFCC49] text-[#193D37] font-heading font-extrabold text-[11px] shrink-0 whitespace-nowrap cursor-pointer transition"
                    >
                      Shake off
                    </button>
                  ) : null}
                </div>
              ) : (
                <div
                  data-testid="arcade-call-bar"
                  data-pitching-cols="3"
                  className="grid grid-cols-3 items-center gap-1"
                >
                  {SIMPLE_PITCH_CALLS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.tradeoff}
                      aria-pressed={pitchTarget === opt.id}
                      disabled={gameCompleted}
                      onClick={() => onSelectPitchTarget?.(opt.id)}
                      className={`px-1 sm:px-2 py-1 min-h-[44px] rounded-lg border-2 border-[#193E37] font-heading font-extrabold text-[10.5px] sm:text-[11px] leading-tight whitespace-nowrap cursor-pointer ${
                        pitchTarget === opt.id
                          ? 'bg-[#224F49] text-white shadow-[inset_0_-3px_#F2C44F]'
                          : 'bg-[#FFFDF8] text-[#193D37] hover:bg-[#FFF3BF]'
                      }`}
                    >
                      {opt.shortLabel}
                    </button>
                  ))}
                </div>
              )}

              {isBatting && resolvedStealOptions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {resolvedStealOptions.map((opt, idx) => {
                    const active = armedStealPlay === opt.playType || tacticalCall === opt.call;
                    const chipText =
                      active && strikes === 2
                        ? '💨 Steal + Swing (2K)'
                        : `💨 ${opt.label} (${opt.successPct}%)`;
                    return (
                      <button
                        key={opt.playType}
                        type="button"
                        data-testid={idx === 0 ? 'arcade-steal-btn' : `arcade-steal-option-${opt.playType}`}
                        aria-pressed={active}
                        disabled={gameCompleted}
                        onClick={() => toggleStealOption(opt)}
                        className={`px-2.5 py-1 min-h-[44px] rounded-lg border-2 border-[#193E37] font-heading font-extrabold text-[11px] cursor-pointer transition ${
                          active
                            ? 'bg-[#FFCC49] text-[#152F2E] shadow-[2px_2px_0_#192735]'
                            : 'bg-[#D8F3DC] text-[#1B4332] hover:bg-[#FFCC49]'
                        }`}
                      >
                        {chipText}
                      </button>
                    );
                  })}
                  {onToggleHitAndRun && strikes < 2 ? (
                    <button
                      type="button"
                      data-testid="arcade-hit-and-run-toggle"
                      aria-pressed={hitAndRunArmed}
                      disabled={gameCompleted}
                      onClick={onToggleHitAndRun}
                      className={`px-2.5 py-1 min-h-[44px] rounded-lg border-2 border-[#193E37] font-heading font-extrabold text-[11px] cursor-pointer transition ${
                        hitAndRunArmed
                          ? 'bg-[#224F49] text-[#FFCC49] shadow-[2px_2px_0_#192735]'
                          : 'bg-[#FFFDF8] text-[#193D37] hover:bg-[#FFF3BF]'
                      }`}
                    >
                      🏃 Hit &amp; Run{hitAndRunArmed ? ' ON' : ''}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!isBatting &&
              pitchingMode === 'advanced' &&
              pitcherArsenal.length > 0 &&
              onSelectPitchType ? (
                <div
                  data-testid="arcade-pitch-sign-bar"
                  className="flex flex-nowrap sm:flex-wrap items-center gap-1 pt-0.5 overflow-x-auto pb-0.5"
                >
                  <span className="font-display text-[9.5px] uppercase text-[#193D37]/80 mr-0.5 shrink-0">
                    Pitch:
                  </span>
                  <button
                    type="button"
                    aria-pressed={selectedPitchType === null}
                    disabled={gameCompleted}
                    onClick={() => onSelectPitchType(null)}
                    className={`px-2 py-0.5 min-h-[44px] rounded-md border border-[#193E37] font-heading font-extrabold text-[10px] shrink-0 whitespace-nowrap cursor-pointer transition ${
                      selectedPitchType === null
                        ? 'bg-[#193D37] text-[#FFD166]'
                        : 'bg-[#FFFDF8] text-[#193D37] hover:bg-[#FFF3BF]'
                    }`}
                  >
                    Auto
                  </button>
                  {pitcherArsenal.map((slot) => {
                    const active = selectedPitchType === slot.pitchType;
                    const hitsWeak = batterWeakPitch === slot.pitchType;
                    const hitsFav = batterFavoritePitch === slot.pitchType;
                    return (
                      <button
                        key={slot.pitchType}
                        type="button"
                        aria-pressed={active}
                        disabled={gameCompleted}
                        onClick={() => onSelectPitchType(active ? null : slot.pitchType)}
                        className={`px-2 py-0.5 min-h-[44px] rounded-md border border-[#193E37] font-heading font-extrabold text-[10px] shrink-0 whitespace-nowrap cursor-pointer transition ${
                          active
                            ? 'bg-[#FFCC49] text-[#152F2E] shadow-[1px_1px_0_#192735]'
                            : slot.isWeak
                              ? 'bg-[#FFE5EC] text-[#9D0208] hover:bg-[#FFF3BF]'
                              : 'bg-[#FFFDF8] text-[#193D37] hover:bg-[#FFF3BF]'
                        }`}
                      >
                        {slot.isFavorite ? '★ ' : slot.isWeak ? '⚠ ' : ''}
                        {slot.label} {slot.mastery}
                        {hitsWeak ? ' 🎯' : hitsFav ? ' ⚠️' : ''}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div
                  data-testid="arcade-tradeoff-hint"
                  className="text-[10.5px] sm:text-[11px] font-bold text-[#193D37]/85 min-w-0 flex-1"
                >
                  {activeTradeoff}
                  {!isBatting && repeatPitchWarning ? (
                    <span className="ml-1.5 text-[#9D0208] font-extrabold">
                      · ⚠️ 3rd in a row (predictable!)
                    </span>
                  ) : null}
                </div>
                {showCpuShiftChip ? (
                  <span
                    data-testid="cpu-defense-shift-badge"
                    className="px-1.5 py-0.5 rounded-md border border-[#192735] bg-[#FFE5EC] text-[#9D0208] font-extrabold text-[10px] shrink-0"
                  >
                    🛡️ CPU: {aiDefenseShiftLabel}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* 1-Tap Pickoff 1B/2B & 1-per-game Cartoon "Argue Call!" chip */}
          {(!isBatting && pickoffOption && onPickoff) || (canArgueCall && onArgueCall) ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {!isBatting && pickoffOption && onPickoff ? (
                <button
                  type="button"
                  data-testid="arcade-pickoff-btn"
                  disabled={controlsLocked}
                  onClick={() => onPickoff(pickoffOption.base)}
                  className="px-2.5 py-1 min-h-[44px] rounded-lg border-2 border-[#193E37] bg-[#E0FBFC] hover:bg-[#FFCC49] text-[#152F2E] font-heading font-extrabold text-[11px] cursor-pointer transition disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  👀 {pickoffOption.label}
                </button>
              ) : null}
              {canArgueCall && onArgueCall ? (
                <button
                  type="button"
                  data-testid="argue-call-chip"
                  disabled={controlsLocked}
                  onClick={onArgueCall}
                  className="px-2.5 py-1 min-h-[44px] rounded-lg border-2 border-[#181B2C] bg-[#FFE5EC] hover:bg-[#FFC300] text-[#9D0208] font-heading font-extrabold text-[11px] shadow-[2px_2px_0_#181B2C] cursor-pointer transition disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  🗣️ Argue Call!
                </button>
              ) : null}
            </div>
          ) : null}

          {/* High-Contrast ⚡ Special Power Hype Meter */}
          <div
            data-testid="arcade-hype-bar"
            className={`flex items-center justify-between gap-1.5 w-full px-2 py-1 rounded-xl border-2 border-[#192735] ${
              readyPowerLabel && onArmReadyPower ? 'bg-[#FFF3BF]' : 'bg-[#FFFDF8]'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase text-[#193D37] shrink-0">
                ⚡ Hype
              </span>
              <div
                className={`${
                  readyPowerLabel && onArmReadyPower ? 'hidden sm:block' : 'block'
                } h-2 flex-1 min-w-[44px] rounded-full border border-[#192735] bg-white overflow-hidden`}
              >
                <div
                  className={`h-full transition-all ${
                    isHypeReady ? 'bg-[#E63946]' : 'bg-[#FFCC49]'
                  }`}
                  style={{ width: `${hypePct}%` }}
                />
              </div>
              <span
                className={`font-mono-tabular text-[10px] uppercase shrink-0 whitespace-nowrap ${
                  isHypeReady ? 'text-[#9D0208] font-black' : 'text-[#193D37] font-extrabold'
                }`}
              >
                {hypeReadoutLabel}
              </span>
            </div>
            {readyPowerLabel && onArmReadyPower ? (
              <button
                type="button"
                data-testid="arcade-unleash-power-btn"
                disabled={gameCompleted}
                onClick={onArmReadyPower}
                className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] max-w-[60%] sm:max-w-none rounded-lg border-2 border-[#192735] font-display text-[10px] sm:text-[11px] font-black tracking-wide cursor-pointer shadow-[2px_2px_0_#192735] shrink-0 transition ${
                  powerArmed
                    ? 'bg-[#FF4D6D] text-white'
                    : 'bg-[#FFCC49] text-[#152F2E] ring-2 ring-[#193D37] hover:bg-[#FFD86B]'
                }`}
              >
                <Zap className="w-3 h-3 shrink-0 fill-current" aria-hidden="true" />
                <span className="truncate">{powerArmed ? 'ARMED!' : readyPowerLabel}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Row 2: Balanced Mobile Controller Grid + Anchored Thumb Drawers (Never opens off-screen!) */}
      <div data-testid="live-control-grid" className="space-y-1.5">
        {showBullpenSuggestion && bullpenSuggestion ? (
          <div
            data-testid="bullpen-suggestion-banner"
            role="region"
            aria-label="Bullpen suggestion"
            className="p-2 rounded-xl border-2 border-[#192735] bg-[#FFF3BF] shadow-[2px_2px_0_#192735] space-y-1.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-extrabold uppercase text-[#193D37]">
              <span className="px-1.5 py-0.5 rounded bg-[#E63946] text-white border border-[#192735]">
                📞 BULLPEN CALL · {bullpenSuggestion.shortTag}
              </span>
              <span className="hidden sm:inline text-[#1D3557]">
                {bullpenSuggestion.matchupNote}
              </span>
            </div>
            <div className="text-xs font-extrabold text-[#192735] leading-snug">
              {bullpenSuggestion.headline}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ComicButton
                size="sm"
                variant="turf"
                data-testid="bullpen-accept-btn"
                disabled={controlsLocked}
                onClick={() => onAcceptBullpenSuggestion?.(bullpenSuggestion.recommendedReliever.id)}
                className="flex-1 sm:flex-none min-h-[44px] text-[11px] sm:text-xs"
              >
                📞 Bring In {bullpenSuggestion.recommendedReliever.name.split(' ')[0]}
              </ComicButton>
              {onDismissBullpenSuggestion ? (
                <ComicButton
                  size="sm"
                  variant="cream"
                  data-testid="bullpen-keep-btn"
                  onClick={() => onDismissBullpenSuggestion(bullpenSuggestion.snoozeKey)}
                  className="min-h-[44px] text-[11px] sm:text-xs"
                >
                  Keep {currentPitcherFirst}
                </ComicButton>
              ) : null}
              {hasBullpenPicker ? (
                <ComicButton
                  size="sm"
                  variant="sky"
                  data-testid="bullpen-other-btn"
                  onClick={() => {
                    setTacticsOpen(true);
                    setBullpenOpen(true);
                    setFastSimOpen(false);
                    setShiftOpen(false);
                  }}
                  className="min-h-[44px] text-[11px] sm:text-xs"
                >
                  Other ▾
                </ComicButton>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="live-primary-row">
          {!(arcadeTimingEnabled && !gameCompleted) ? (
            <ComicButton
              size="sm"
              data-testid="live-primary-pitch-btn"
              data-play-locked={locked ? 'true' : undefined}
              variant={cue.kind === 'power_armed' || powerArmed ? 'coral' : 'gold'}
              disabled={controlsLocked}
              aria-busy={locked ? 'true' : undefined}
              icon={<Play className="w-3.5 h-3.5" />}
              aria-label={primaryLabel}
              onClick={() => onNextPitch()}
              className={`flex-1 min-w-0 px-2.5 text-xs whitespace-nowrap${locked ? ' is-play-locked' : ''}`}
            >
              {gameCompleted ? cue.primaryButtonLabel : pitchAction}
            </ComicButton>
          ) : null}

          {density !== 'sheet' && (
            <button type="button" className="tactics-toggle shrink-0" aria-expanded={tacticsOpen} aria-controls={tacticsId}
              onClick={() => setTacticsOpen(!tacticsOpen)}>
              {!isBatting && isPitcherTired && bullpenMode === 'manual' && hasBullpenPicker ? 'Tactics • Pen!' : 'Tactics'}
            </button>
          )}
          {mascotButton}
        </div>

        {catcherSuggestion}
        {/* Optional Interactive Arcade Sweet-Spot Timing Bar anchored directly under thumb controls */}
        {arcadeTimingEnabled && !gameCompleted ? (
          <ArcadeTimingMeter
            isBatting={isBatting}
            disabled={controlsLocked}
            actionLabel={pitchAction + '!'}
            powerArmed={powerArmed}
            onLockTiming={(grade) => onNextPitch(grade)}
          />
        ) : null}

        <div id={tacticsId} className="tactics-panel" data-open={density === 'sheet' || tacticsOpen}>
          {watchSettings}
          <div className="tactics-buttons">
          {onToggleSmartWatch ? (
            <ComicButton
              size="sm"
              variant={watchMode === 'smart' ? 'coral' : 'turf'}
              data-testid="smart-watch-toggle"
              disabled={gameCompleted}
              onClick={onToggleSmartWatch}
              className="w-full px-2 text-[11px] sm:text-xs whitespace-nowrap"
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
              className="px-2.5 text-[11px] sm:text-xs whitespace-nowrap"
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
              setShiftOpen(false);
            }}
            className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
          >
            {watchMode === 'live' ? 'Auto ▾' : 'Sim ▾'}
          </ComicButton>

          {hasBullpenPicker ? (
            <ComicButton
              size="sm"
              variant={
                bullpenOpen
                  ? 'coral'
                  : isPitcherTired && bullpenMode !== 'auto'
                    ? 'gold'
                    : 'sky'
              }
              data-testid="arcade-bullpen-toggle"
              disabled={gameCompleted}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => {
                setBullpenOpen((open) => !open);
                setFastSimOpen(false);
                setShiftOpen(false);
              }}
              className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
            >
              Pen ({bullpenOptions.length})
            </ComicButton>
          ) : null}

          {hasShiftPicker ? (
            <ComicButton
              size="sm"
              variant={shiftOpen || defensiveShift !== 'standard' ? 'gold' : 'cream'}
              data-testid="arcade-shift-toggle"
              disabled={gameCompleted}
              icon={<Shield className="w-3.5 h-3.5" />}
              onClick={() => {
                setShiftOpen((open) => !open);
                setBullpenOpen(false);
                setFastSimOpen(false);
              }}
              className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
            >
              {defensiveShift === 'standard' ? 'Shift ▾' : `${activeShiftShort} ▾`}
            </ComicButton>
          ) : null}

          {onToggleOnePitchMode ? (
            <ComicButton
              size="sm"
              variant={onePitchMode ? 'gold' : 'cream'}
              data-testid="arcade-one-pitch-toggle"
              aria-pressed={onePitchMode}
              title="1-Pitch At-Bats (Default in Simple Mode; Pro Manager defaults to Pitch-by-Pitch)"
              disabled={gameCompleted}
              onClick={onToggleOnePitchMode}
              className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
            >
              {onePitchMode ? '⚡ 1-Pitch ON' : '⚡ 1-Pitch'}
            </ComicButton>
          ) : null}

          {onToggleAudio ? (
            <ComicButton
              size="sm"
              variant={audioMuted ? 'coral' : 'cream'}
              data-testid="tactics-audio-toggle"
              aria-pressed={audioMuted}
              onClick={onToggleAudio}
              className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
            >
              {audioMuted ? '🔇 Muted' : '🔊 Sound'}
            </ComicButton>
          ) : null}

          {onToggleArcadeTiming ? (
            <ComicButton
              size="sm"
              variant={arcadeTimingEnabled ? 'gold' : 'cream'}
              data-testid="arcade-timing-toggle"
              disabled={gameCompleted}
              onClick={onToggleArcadeTiming}
              className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
            >
              {arcadeTimingEnabled ? '🎯 ON' : '🎯 Timing'}
            </ComicButton>
          ) : null}

          {onOpenBoxScore ? (
            <ComicButton
              size="sm"
              variant="sky"
              data-testid="arcade-box-score-btn"
              icon={<ClipboardList className="w-3.5 h-3.5" />}
              onClick={() => {
                setTacticsOpen(false);
                onOpenBoxScore();
              }}
              className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
            >
              Box
            </ComicButton>
          ) : null}

          <ComicButton
            size="sm"
            variant={controlMode === 'advanced' ? 'violet' : 'cream'}
            data-testid="control-mode-toggle"
            icon={<Sliders className="w-3.5 h-3.5" />}
            onClick={onToggleControlMode}
            className="shrink-0 sm:flex-1 px-2 text-[10.5px] sm:text-xs whitespace-nowrap min-h-[44px]"
          >
            {controlMode === 'simple' ? 'Pro' : 'Simple'}
          </ComicButton>
          </div>

      {shiftOpen && onSelectDefensiveShift ? (
        <div
          data-testid="arcade-shift-drawer"
          className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF8E7] space-y-1.5"
        >
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-[#1D3557]">
            <span>🛡️ Defensive Alignment — 1-Tap Shift</span>
            <button
              type="button"
              onClick={() => setShiftOpen(false)}
              className="min-h-[44px] px-2 inline-flex items-center underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {DEFENSIVE_SHIFTS.map((shift) => {
              const active = defensiveShift === shift.id;
              return (
                <button
                  key={shift.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    onSelectDefensiveShift(shift.id);
                    setShiftOpen(false);
                  }}
                  className={`p-1.5 min-h-[44px] rounded-lg border-2 border-[#181B2C] text-left cursor-pointer transition ${
                    active
                      ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]'
                      : 'bg-[#FFFDF7] text-[#181B2C] hover:bg-[#FFF3BF]'
                  }`}
                >
                  <div className="font-display text-[11px] leading-tight">{shift.label}</div>
                  <div className="text-[9.5px] font-bold text-[#4A5068] leading-tight mt-0.5">
                    {shift.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Compact 2-Column Fast Sim Popover Drawer (Auto Play 3D, At-Bat, Half-Inn, Clutch, Sim to End) */}
      {fastSimOpen ? (
        <div
          data-testid="fast-sim-drawer"
          className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF8E7] grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5"
        >
          <ComicButton
            size="sm"
            variant={watchMode === 'live' ? 'coral' : 'sky'}
            disabled={gameCompleted}
            onClick={() => {
              onToggleWatchMode();
              setFastSimOpen(false);
            }}
            className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
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
            className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
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
            className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
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
            className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
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
            className="col-span-2 sm:col-span-1 w-full sm:w-auto px-2 text-[11px] sm:text-xs"
          >
            Sim to End
          </ComicButton>
        </div>
      ) : null}

      {bullpenOpen && bullpenOptions.length > 0 && onSelectBullpenReliever ? (
        <div
          data-testid="arcade-bullpen-drawer"
          className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-extrabold uppercase text-[#1D3557]">
            <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
              <span>📞 Quick Bullpen Call</span>
              <button
                type="button"
                onClick={() => setBullpenOpen(false)}
                className="min-h-[44px] px-2 inline-flex items-center underline cursor-pointer sm:hidden"
              >
                Close
              </button>
            </div>
            {onSelectBullpenMode ? (
              <div
                data-testid="bullpen-mode-switcher"
                role="group"
                aria-label="Bullpen mode"
                className="inline-flex items-center rounded-lg border-2 border-[#193E37] bg-[#FFFDF7] p-0.5 gap-0.5"
              >
                {BULLPEN_MODE_OPTIONS.map((modeOpt) => {
                  const active = bullpenMode === modeOpt.id;
                  return (
                    <button
                      key={modeOpt.id}
                      type="button"
                      title={modeOpt.description}
                      aria-pressed={active}
                      disabled={gameCompleted}
                      onClick={() => onSelectBullpenMode(modeOpt.id)}
                      className={`px-2 py-0.5 min-h-[44px] rounded-md font-heading font-extrabold text-[10px] leading-none normal-case cursor-pointer transition ${
                        active
                          ? 'bg-[#224F49] text-[#FFCC49]'
                          : 'bg-transparent text-[#193D37] hover:bg-[#FFF3BF]'
                      }`}
                    >
                      {modeOpt.shortLabel}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setBullpenOpen(false)}
              className="hidden sm:inline-flex min-h-[44px] px-2 items-center underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] font-bold text-[#1D3557]">
            <span>{activeBullpenModeMeta.description}</span>
            {recommendedReliever ? (
              <span className="px-1.5 py-0.5 rounded bg-[#FFC300] border border-[#181B2C] text-[#181B2C] text-[10px] font-extrabold shrink-0">
                ★ Coach’s Pick: {recommendedReliever.name.split(' ')[0]}
                {recommendedReliever.fitTag ? ` · ${recommendedReliever.fitTag}` : ''}
              </span>
            ) : null}
          </div>
          {upcomingBatters.length > 0 ? (
            <div
              data-testid="bullpen-due-up-strip"
              className="px-2 py-1 rounded-lg border border-[#181B2C]/35 bg-[#FFFDF7] flex flex-wrap items-center gap-1.5 text-[10.5px] font-extrabold text-[#181B2C]"
            >
              <span className="uppercase text-[#1D3557]">
                Due Up: {upcomingBatters.map((b) => b.bats).join(' · ')}
              </span>
              <span className="text-[#4A5068] font-bold">
                ({upcomingBatters.map((b) => `${b.name.split(' ').at(-1)} ${b.bats}`).join(', ')})
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {bullpenOptions.map((rel) => (
              <div key={rel.id} className="flex flex-col gap-0.5">
                <ComicButton
                  size="sm"
                  variant={rel.isRecommended ? 'gold' : 'cream'}
                  data-testid="arcade-bullpen-bring-in"
                  onClick={() => {
                    onSelectBullpenReliever(rel.id);
                    setBullpenOpen(false);
                  }}
                >
                  Bring In {rel.name} ({rel.throws}HP{rel.roleLabel ? ` • ${rel.roleLabel}` : ''})
                  {rel.isRecommended ? ' ★' : ''}
                  {typeof rel.ovr === 'number' ? ` · ${rel.ovr}` : ''}
                </ComicButton>
                {rel.pitchMixLabels && rel.pitchMixLabels.length > 0 ? (
                  <span
                    data-testid="bullpen-pitch-mix"
                    className="px-1.5 text-[9.5px] font-bold text-[#1D3557]"
                  >
                    ⚾ {rel.pitchMixLabels.join(' · ')}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

        </div>
      </div>

      {/* Compact Last-Play Readout directly under the controller so it stays visible above the fold on mobile! */}
      <div
        data-testid="live-last-pitch-strip"
        className="pt-1 border-t border-dashed border-[#181B2C]/20 flex items-center justify-between gap-2 text-[11px]"
      >
        <div
          data-testid="live-last-pitch-readout"
          className="font-bold text-[#181B2C] truncate flex-1 min-w-0"
        >
          {latestEvent ? (
            <>
              <span className="font-extrabold text-[#1B4332] mr-1">
                [{latestEvent.half} {latestEvent.inning}]
              </span>
              {latestEventCommentary ?? latestEvent.commentary}
            </>
          ) : (
            <span className="text-[#4A5068]">
              Eyes on the 3D diamond — press {pitchAction} to start!
            </span>
          )}
        </div>
        {latestEvent?.pitchThrown ? (
          <span
            data-testid="live-pitch-radar-pill"
            className="px-2 py-0.5 rounded-lg bg-[#193D37] text-[#FFCC49] border border-[#192735] font-mono-tabular text-[10px] font-extrabold shrink-0"
          >
            ⚾ {latestEvent.pitchThrown.mph} mph {PITCH_TYPE_SHORT_LABELS[latestEvent.pitchThrown.pitchType]}
            {latestEvent.pitchThrown.isFavoritePitch ? ' ★' : ''}
          </span>
        ) : null}
      </div>

      {/* Visible Live Pitcher Stamina / Fatigue Bar (single sleek row on mobile!) */}
      {typeof pitcherEndurance === 'number' ? (
        <div
          data-testid="live-pitcher-fatigue-strip"
          className="px-2 py-1 rounded-xl border border-[#192735]/30 bg-[#FFFDF8] flex items-center justify-between gap-1.5 text-[10px] font-extrabold text-[#193D37]"
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="uppercase shrink-0 truncate max-w-[82px] sm:max-w-none">
              💪 {pitcherName ? `${pitcherName.split(' ')[0]}` : 'Arm'}
            </span>
            <div className="h-2 flex-1 min-w-[44px] rounded-full border border-[#192735] bg-[#EFE6D2] overflow-hidden">
              <div
                className={`h-full transition-all ${enduranceFillClass}`}
                style={{ width: `${Math.max(4, Math.min(100, pitcherEndurance))}%` }}
              />
            </div>
            <span className="font-mono-tabular shrink-0">
              {pitcherEndurance}%
              <span className="hidden sm:inline"> ({pitcherEnduranceTier.toUpperCase()})</span>
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono-tabular shrink-0">
            {typeof pitcherStamina === 'number' ? (
              <span className="px-1.5 py-0.5 rounded bg-[#E0FBFC] border border-[#192735]/25 text-[#1D3557]">
                STA {pitcherStamina}
              </span>
            ) : null}
            {pitcherFatigueDropTag ? (
              <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-[#FFE5EC] border border-[#9D0208]/40 text-[#9D0208]">
                {pitcherFatigueDropTag}
              </span>
            ) : (
              <span className="hidden sm:inline text-[#1B4332]">Full Stuff &amp; Control</span>
            )}
          </div>
        </div>
      ) : null}

      {/* Row 3: Compact Coach Pops' Contextual Turn & Action Cue + 1-Tap Card Inspection */}
      <div
        data-testid="coach-action-cue"
        className={`rounded-xl border-2 px-2 py-1.5 flex flex-wrap items-center justify-between gap-1.5 ${cuePalette}`}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <CoachPopsAvatar size="sm" testId="live-coach-pops-avatar" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-extrabold">
              <span className={`px-1.5 py-0.5 rounded-md border border-[#181B2C] ${badgePalette}`}>
                {cue.badgeText}
              </span>
              <span className="px-1.5 py-0.5 rounded-md border border-[#181B2C] bg-[#1D3557] text-[#FFFDF7]">
                {cue.turnLabel}
              </span>
              <span className="hidden sm:inline text-[#4A5068] truncate">
                {matchupLabel} • {basesLabel}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-extrabold leading-snug text-[#181B2C]">
              {smartPauseReason ? `⏸️ ${smartPauseReason} — ${cue.headline}` : cue.headline}
            </p>
            {firstPitchTip ? (
              <div
                data-testid="first-pitch-tip"
                className="px-2 py-0.5 rounded-lg border border-[#7209B7]/40 bg-[#F5EEFF] text-[#4C1D95] text-[10px] sm:text-[11px] font-extrabold"
              >
                🧢 {firstPitchTip}
              </div>
            ) : null}
            {(onInspectBatter || onInspectPitcher || onInspectPlayers) ? (
              <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 pt-1 overflow-x-auto">
                {onInspectBatter ? (
                  <button
                    type="button"
                    data-testid="inspect-batter-card-btn"
                    onClick={onInspectBatter}
                    className="px-2.5 py-1 min-h-[44px] rounded-lg border border-[#181B2C] bg-[#FFFDF7] hover:bg-[#FFF3BF] text-[10.5px] font-extrabold text-[#181B2C] shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    🃏 {batterName?.split(' ')[0] ?? 'Batter'}
                  </button>
                ) : null}
                {onInspectPitcher ? (
                  <button
                    type="button"
                    data-testid="inspect-pitcher-card-btn"
                    onClick={onInspectPitcher}
                    className="px-2.5 py-1 min-h-[44px] rounded-lg border border-[#181B2C] bg-[#E0FBFC] hover:bg-[#FFF3BF] text-[10.5px] font-extrabold text-[#1D3557] shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    🃏 {pitcherName?.split(' ')[0] ?? 'Pitcher'}
                  </button>
                ) : null}
                {onInspectPlayers ? (
                  <button
                    type="button"
                    data-testid="inspect-game-players-btn"
                    onClick={onInspectPlayers}
                    className="px-2.5 py-1 min-h-[44px] rounded-lg border border-[#181B2C] bg-[#FBF4E4] hover:bg-[#FFF3BF] text-[10.5px] font-extrabold text-[#181B2C] shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    🃏 All
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
        {mascotCheerText ? (
          <div
            data-testid="live-mascot-cheer-bubble"
            role="status"
            className="w-full px-2.5 py-1 rounded-xl border border-[#181B2C]/35 bg-[#FFFDF7] text-[11px] font-extrabold text-[#193D37] flex items-center justify-between gap-2"
          >
            <span>📣 {mascotCheerText}</span>
            <button
              type="button"
              onClick={() => setMascotCheerText(null)}
              className="min-h-[44px] px-2 inline-flex items-center text-[10px] underline cursor-pointer shrink-0"
            >
              Hide
            </button>
          </div>
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
    </div>
  );
}
