import { useState } from "react";
import { Zap } from "lucide-react";
import { soundEngine } from "../../audio/soundEngine";
import { buildMascotTapCheer, PITCH_CALL_GUIDE } from "../../engine/gm/openingDayHook";
import type { ClubRitualProfile } from "../../engine/gm/polaroidKeepsakes";
import { ClubMascotBuddy } from "./ClubMascotBuddy";
import type { PitchType } from "../../engine/models/player";
import type { TacticalCall } from "../../engine/models/playEvent";
import type { StealOptionPreview, StealPlayType } from "../../engine/simulation/baserunning";
import type { BullpenMode, BullpenRecommendation } from "../../engine/simulation/bullpenManager";
import type { CatcherPitchCall } from "../../engine/simulation/catcherCalls";
import type { GameSessionState } from "../../engine/simulation/gameState";
import type { LiveActionCue } from "../../engine/simulation/liveActionAdvisor";
import type {
  ArcadeTimingGrade,
  PitchingMode,
  PitchTargetIntent,
} from "../../engine/simulation/pitchMindGames";
import { ArcadeTimingMeter } from "./ArcadeTimingMeter";
import type { PickoffQuickOption, PitcherSignOption } from "./LiveActionBar";
import "./firstAtBat.css";

const pitches = PITCH_CALL_GUIDE;
const swings = [
  { id: "contact" as const, name: "Contact" },
  { id: "power" as const, name: "Power" },
  { id: "bunt" as const, name: "🏏 Bunt" },
] as const;

const PITCHING_MODE_OPTIONS: readonly { id: PitchingMode; label: string }[] = [
  { id: "simple", label: "🧤 Pitching: Simple (Catcher calls)" },
  { id: "normal", label: "🎯 Pitching: Normal (Pick location)" },
  { id: "advanced", label: "⚾ Pitching: Advanced (Spot + Pitch)" },
];

const BULLPEN_MODE_MENU_OPTIONS: readonly { id: BullpenMode; label: string }[] = [
  { id: "auto", label: "🤖 Bullpen: Auto (Coach swaps)" },
  { id: "semi_auto", label: "📞 Bullpen: Ask Me (1-tap call)" },
  { id: "manual", label: "🧤 Bullpen: Manual (Full control)" },
];

export function FirstAtBat({
  session,
  batting,
  target,
  call,
  locked,
  expanded,
  powerArmed,
  readyPowerName = null,
  arcadeTimingEnabled = false,
  onePitchMode = false,
  pitchingMode = "simple",
  bullpenMode = "semi_auto",
  bullpenSuggestion = null,
  activePitcherFirstName = "Pitcher",
  catcherCall = null,
  shakeOffTotal = 0,
  pitcherArsenal = [],
  selectedPitchType = null,
  stealOptions = [],
  armedStealPlay = null,
  onToggleStealPlay,
  pickoffOption = null,
  onPickoff,
  cue,
  onTarget,
  onSwing,
  onPitch,
  onShakeOff,
  onSelectPitchType,
  onSelectPitchingMode,
  onSelectBullpenMode,
  onAcceptBullpenSuggestion,
  onDismissBullpenSuggestion,
  onArmPower,
  onToggleArcadeTiming,
  onToggleOnePitchMode,
  onExpand,
  onSuggested,
  mascotName = null,
  mascotColors = null,
  mascotMood = "happy",
  clubRituals,
  onMascotTap,
  canArgueCall = false,
  onArgueCall,
}: {
  session: GameSessionState;
  batting: boolean;
  target: PitchTargetIntent;
  call: TacticalCall;
  locked: boolean;
  powerArmed: boolean;
  readyPowerName?: string | null;
  arcadeTimingEnabled?: boolean;
  onePitchMode?: boolean;
  pitchingMode?: PitchingMode;
  bullpenMode?: BullpenMode;
  bullpenSuggestion?: BullpenRecommendation | null;
  activePitcherFirstName?: string;
  catcherCall?: CatcherPitchCall | null;
  shakeOffTotal?: number;
  pitcherArsenal?: readonly PitcherSignOption[];
  selectedPitchType?: PitchType | null;
  stealOptions?: readonly StealOptionPreview[];
  armedStealPlay?: StealPlayType | null;
  onToggleStealPlay?: (play: StealPlayType | null) => void;
  pickoffOption?: PickoffQuickOption | null;
  onPickoff?: (base: 1 | 2) => void;
  expanded: boolean;
  cue: LiveActionCue;
  onTarget: (target: PitchTargetIntent) => void;
  onSwing: (call: TacticalCall) => void;
  onPitch: (timingGrade?: ArcadeTimingGrade) => void;
  onShakeOff?: () => void;
  onSelectPitchType?: (pitchType: PitchType | null) => void;
  onSelectPitchingMode?: (mode: PitchingMode) => void;
  onSelectBullpenMode?: (mode: BullpenMode) => void;
  onAcceptBullpenSuggestion?: (relieverId: string) => void;
  onDismissBullpenSuggestion?: (snoozeKey: string) => void;
  onArmPower?: () => void;
  onToggleArcadeTiming?: () => void;
  onToggleOnePitchMode?: () => void;
  onExpand: () => void;
  onSuggested: () => void;
  mascotName?: string | null;
  mascotColors?: { primary: string; secondary: string; accent: string } | null;
  mascotMood?: "happy" | "cheering" | "rally" | "determined";
  clubRituals?: ClubRitualProfile;
  onMascotTap?: () => void;
  canArgueCall?: boolean;
  onArgueCall?: () => void;
}) {
  const [mascotTapCount, setMascotTapCount] = useState(0);
  const [mascotCheerText, setMascotCheerText] = useState<string | null>(null);
  const ours = session.home.isHuman ? session.home.score : session.away.score;
  const theirs = session.home.isHuman ? session.away.score : session.home.score;
  const score =
    ours === theirs
      ? "Tie game."
      : (ours > theirs ? "Up by " : "Down by ") + Math.abs(ours - theirs) + ".";
  const objective = batting
    ? session.bases[1] || session.bases[2]
      ? session.outs === 1
        ? "One out. A single could score a run."
        : "Bring the runner home."
      : "Get on base."
    : session.outs === 2
      ? "Get the last out."
      : session.outs === 0
        ? "Get the first out."
        : "Get the next out.";
  const activePitch = pitches.find((p) => p.id === target) ?? pitches[0];
  const twoStrikeSteal = Boolean(batting && armedStealPlay && session.strikes === 2);
  const action = batting
    ? armedStealPlay
      ? twoStrikeSteal
        ? "Steal & Swing (2K)"
        : "Send Runner"
      : call === "bunt"
        ? onePitchMode
          ? "Lay down bunt · 1-Pitch"
          : "Lay down bunt"
        : onePitchMode
          ? "Swing · 1-Pitch"
          : "Swing"
    : onePitchMode
      ? "Throw · 1-Pitch"
      : pitchingMode === "simple"
        ? "Throw Pitch"
        : activePitch.actionLabel;
  const tradeoffText = batting
    ? armedStealPlay
      ? twoStrikeSteal
        ? "2 strikes — runner goes AND batter swings to protect!"
        : "Runner breaks on the pitch — ball or strike still counts."
      : call === "bunt"
        ? "Tap down the line. Great with speed or runners."
        : call === "power"
          ? "More power. Easier to miss."
          : "Easier to connect. Less power."
    : pitchingMode === "simple"
      ? catcherCall?.reason ?? "Catcher calls pitch and spot."
      : activePitch.tradeoff;
  const tip =
    cue.suggestedAction &&
    ((batting && cue.kind === "steal_opportunity") ||
      (!batting && cue.kind === "pitcher_gassed"));
  const showOptionsMenu =
    !expanded &&
    Boolean(
      onToggleOnePitchMode ||
        (tip && !powerArmed) ||
        (!batting && (onSelectPitchingMode || onSelectBullpenMode)),
    );
  const showGuidedBullpenCall =
    !expanded &&
    !batting &&
    bullpenMode === "semi_auto" &&
    Boolean(bullpenSuggestion) &&
    Boolean(onAcceptBullpenSuggestion);

  return (
    <section
      className={expanded ? "atbat-guide is-expanded" : "atbat-guide"}
      aria-label="First at-bat"
    >
      <header>
        <span>Coach Pops</span>
        <div className="atbat-header-actions">
          {!expanded && onToggleArcadeTiming && (
            <button
              type="button"
              data-testid="guided-timing-toggle"
              className="atbat-timing-pill"
              disabled={locked}
              aria-pressed={arcadeTimingEnabled}
              onClick={onToggleArcadeTiming}
              title="Toggle optional arcade sweet-spot timing bar"
            >
              {arcadeTimingEnabled ? "🎯 ON" : "🎯 Timing"}
            </button>
          )}
          {!expanded && readyPowerName && onArmPower && (
            <button
              type="button"
              data-testid="guided-unleash-power-btn"
              className="atbat-power-pill"
              disabled={locked}
              aria-pressed={powerArmed}
              onClick={onArmPower}
              title={`Tap to ${powerArmed ? "disarm" : "arm"} ${readyPowerName}`}
            >
              <Zap className="w-3 h-3 shrink-0 fill-current" aria-hidden="true" />
              <span className="truncate">
                {powerArmed ? "ARMED!" : readyPowerName.replace(/\s*\([^)]*\)\s*$/, "")}
              </span>
            </button>
          )}
          {showOptionsMenu && (
            <details
              className="atbat-options"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  event.currentTarget.open = false;
                }
              }}
            >
              <summary>Options</summary>
              <div
                onClick={(event) => {
                  const details = event.currentTarget.closest("details")!;
                  details.open = false;
                  details.querySelector("summary")?.focus();
                }}
              >
                {onToggleOnePitchMode && (
                  <button
                    type="button"
                    data-testid="guided-one-pitch-toggle"
                    aria-pressed={onePitchMode}
                    onClick={onToggleOnePitchMode}
                  >
                    {onePitchMode
                      ? "⚡ 1-Pitch Mode: ON (Default in Simple)"
                      : "⚡ 1-Pitch Mode: OFF (Pitch-by-Pitch)"}
                  </button>
                )}
                {!batting &&
                  onSelectPitchingMode &&
                  PITCHING_MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`guided-pitching-mode-${opt.id}`}
                      aria-pressed={pitchingMode === opt.id}
                      onClick={() => onSelectPitchingMode(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                {!batting &&
                  onSelectBullpenMode &&
                  BULLPEN_MODE_MENU_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`guided-bullpen-mode-${opt.id}`}
                      aria-pressed={bullpenMode === opt.id}
                      onClick={() => onSelectBullpenMode(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                {tip && !powerArmed && (
                  <button type="button" onClick={onSuggested} disabled={locked}>
                    {cue.suggestedAction!.label}
                  </button>
                )}
              </div>
            </details>
          )}
          {mascotName && mascotColors && (
            <button
              type="button"
              data-testid="live-dugout-mascot-btn"
              aria-label={`High-five ${mascotName}`}
              className="atbat-mascot"
              onClick={() => {
                const nextTap = mascotTapCount + 1;
                setMascotTapCount(nextTap);
                const cheer = buildMascotTapCheer(mascotName, nextTap - 1, clubRituals);
                setMascotCheerText(cheer.text);
                soundEngine.play(cheer.soundCue);
                onMascotTap?.();
              }}
            >
              <ClubMascotBuddy
                mascot={mascotName}
                primaryColor={mascotColors.primary}
                secondaryColor={mascotColors.secondary}
                accentColor={mascotColors.accent}
                mood={mascotMood}
                size="sm"
              />
            </button>
          )}
          <button type="button" aria-expanded={expanded} onClick={onExpand}>
            {expanded ? "Fewer controls" : "More controls"}
          </button>
        </div>
      </header>
      {mascotCheerText && (
        <div className="atbat-mascot-cheer" data-testid="live-mascot-cheer-bubble" role="status">
          <span>📣 {mascotCheerText}</span>
          <button type="button" onClick={() => setMascotCheerText(null)}>
            Hide
          </button>
        </div>
      )}
      {!expanded && (
        <>
          {showGuidedBullpenCall && bullpenSuggestion ? (
            <div
              className="atbat-bullpen-call"
              data-testid="bullpen-suggestion-banner"
              role="region"
              aria-label="Bullpen suggestion"
            >
              <p className="atbat-bullpen-headline">
                <strong>📞 {bullpenSuggestion.shortTag}:</strong> {bullpenSuggestion.headline}
              </p>
              <div className="atbat-bullpen-actions">
                <button
                  type="button"
                  className="atbat-bullpen-accept"
                  data-testid="bullpen-accept-btn"
                  disabled={locked}
                  onClick={() =>
                    onAcceptBullpenSuggestion?.(bullpenSuggestion.recommendedReliever.id)
                  }
                >
                  Bring In {bullpenSuggestion.recommendedReliever.name.split(" ")[0]}
                </button>
                {onDismissBullpenSuggestion ? (
                  <button
                    type="button"
                    className="atbat-bullpen-keep"
                    data-testid="bullpen-keep-btn"
                    disabled={locked}
                    onClick={() => onDismissBullpenSuggestion(bullpenSuggestion.snoozeKey)}
                  >
                    Keep {activePitcherFirstName}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <h3>
            {score} {objective}
          </h3>
          {canArgueCall && onArgueCall ? (
            <div className="atbat-steal-strip" role="group" aria-label="Manager drama">
              <button
                type="button"
                data-testid="argue-call-chip"
                className="atbat-steal-chip"
                disabled={locked}
                onClick={onArgueCall}
                style={{ backgroundColor: "#FFE5EC", color: "#9D0208" }}
              >
                🗣️ Argue Call!
              </button>
            </div>
          ) : null}
          {batting ? (
            <>
              {stealOptions.length > 0 && onToggleStealPlay ? (
                <div
                  className="atbat-steal-strip"
                  role="group"
                  aria-label="Base steal options"
                >
                  {stealOptions.map((opt, idx) => {
                    const isArmed = armedStealPlay === opt.playType;
                    const chipLabel =
                      isArmed && session.strikes === 2
                        ? "💨 Steal + Swing (2K)"
                        : `💨 ${opt.label} (${opt.successPct}%)`;
                    return (
                      <button
                        key={opt.playType}
                        type="button"
                        data-testid={idx === 0 ? "guided-steal-btn" : `guided-steal-option-${opt.playType}`}
                        className="atbat-steal-chip"
                        aria-pressed={isArmed}
                        disabled={locked}
                        onClick={() => onToggleStealPlay(isArmed ? null : opt.playType)}
                      >
                        {chipLabel}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="atbat-choices" role="group" aria-label="Swing approach">
                {swings.map((s) => (
                  <button
                    key={s.id}
                    disabled={locked}
                    aria-pressed={s.id === call}
                    onClick={() => onSwing(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {pickoffOption && onPickoff ? (
                <div className="atbat-steal-strip" role="group" aria-label="Pickoff throw">
                  <button
                    type="button"
                    data-testid="guided-pickoff-btn"
                    className="atbat-steal-chip"
                    disabled={locked}
                    onClick={() => onPickoff(pickoffOption.base)}
                  >
                    👀 {pickoffOption.label}
                  </button>
                </div>
              ) : null}
              {pitchingMode === "simple" ? (
                <div
                  className="atbat-catcher-call"
                  data-testid="guided-catcher-call"
                  aria-live="polite"
                >
                  <div className="atbat-catcher-copy">
                    <strong>
                      🧤 Catcher:{" "}
                      {catcherCall
                        ? `${catcherCall.targetLabel} · ${catcherCall.pitchShortLabel}`
                        : "Over Plate · 4-Seam"}
                    </strong>
                  </div>
                  {onShakeOff && shakeOffTotal > 1 && (
                    <button
                      type="button"
                      className="atbat-shake-btn"
                      data-testid="guided-shake-off-btn"
                      disabled={locked}
                      onClick={onShakeOff}
                    >
                      Shake off
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="atbat-choices" role="group" aria-label="Pitch target">
                    {pitches.map((p) => (
                      <button
                        key={p.id}
                        disabled={locked}
                        aria-pressed={p.id === target}
                        onClick={() => onTarget(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {pitchingMode === "advanced" && pitcherArsenal.length > 0 && onSelectPitchType && (
                    <div
                      className="atbat-pitch-signs"
                      data-testid="guided-pitch-sign-bar"
                      role="group"
                      aria-label="Pitch selection"
                    >
                      <button
                        type="button"
                        disabled={locked}
                        aria-pressed={selectedPitchType === null}
                        onClick={() => onSelectPitchType(null)}
                      >
                        Auto
                      </button>
                      {pitcherArsenal.map((slot) => {
                        const active = selectedPitchType === slot.pitchType;
                        return (
                          <button
                            key={slot.pitchType}
                            type="button"
                            disabled={locked}
                            aria-pressed={active}
                            onClick={() => onSelectPitchType(active ? null : slot.pitchType)}
                          >
                            {slot.isFavorite ? "★ " : slot.isWeak ? "⚠ " : ""}
                            {slot.label} {slot.mastery}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <p className="swing-tradeoff" data-testid="guided-tradeoff-hint" aria-live="polite">
            {tradeoffText}
          </p>
          {arcadeTimingEnabled ? (
            <ArcadeTimingMeter
              isBatting={batting}
              disabled={locked}
              actionLabel={action}
              powerArmed={powerArmed}
              onLockTiming={(grade) => onPitch(grade)}
            />
          ) : (
            <button
              className={locked ? "atbat-go is-play-locked" : "atbat-go"}
              disabled={locked}
              aria-busy={locked ? "true" : undefined}
              data-play-locked={locked ? "true" : undefined}
              onClick={() => onPitch()}
            >
              {powerArmed ? "⚡ " : ""}
              {action}
            </button>
          )}
        </>
      )}
    </section>
  );
}
