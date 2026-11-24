import { PITCH_CALL_GUIDE } from "../../engine/gm/openingDayHook";
import type { TacticalCall } from "../../engine/models/playEvent";
import type { GameSessionState } from "../../engine/simulation/gameState";
import type { LiveActionCue } from "../../engine/simulation/liveActionAdvisor";
import type {
  ArcadeTimingGrade,
  PitchTargetIntent,
} from "../../engine/simulation/pitchMindGames";
import { ArcadeTimingMeter } from "./ArcadeTimingMeter";
import "./firstAtBat.css";

const pitches = PITCH_CALL_GUIDE;
const swings = [
  { id: "contact" as const, name: "Contact" },
  { id: "power" as const, name: "Power" },
  { id: "bunt" as const, name: "🏏 Bunt" },
] as const;

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
  cue,
  onTarget,
  onSwing,
  onPitch,
  onArmPower,
  onToggleArcadeTiming,
  onExpand,
  onSuggested,
}: {
  session: GameSessionState;
  batting: boolean;
  target: PitchTargetIntent;
  call: TacticalCall;
  locked: boolean;
  powerArmed: boolean;
  readyPowerName?: string | null;
  arcadeTimingEnabled?: boolean;
  expanded: boolean;
  cue: LiveActionCue;
  onTarget: (target: PitchTargetIntent) => void;
  onSwing: (call: TacticalCall) => void;
  onPitch: (timingGrade?: ArcadeTimingGrade) => void;
  onArmPower?: () => void;
  onToggleArcadeTiming?: () => void;
  onExpand: () => void;
  onSuggested: () => void;
}) {
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
  const action = batting
    ? call === "bunt"
      ? "Lay down bunt"
      : "Swing"
    : activePitch.actionLabel;
  const tradeoffText = batting
    ? call === "bunt"
      ? "Tap down the line. Great with speed or runners."
      : call === "power"
        ? "More power. Easier to miss."
        : "Easier to connect. Less power."
    : activePitch.tradeoff;
  const tip =
    cue.suggestedAction &&
    ((batting && cue.kind === "steal_opportunity") ||
      (!batting && cue.kind === "pitcher_gassed"));
  return (
    <section
      className={expanded ? "atbat-guide is-expanded" : "atbat-guide"}
      aria-label="First at-bat"
    >
      <header>
        <span>Coach Pops</span>
        <div className="atbat-header-actions">
          {!expanded && <details className="atbat-options" onKeyDown={event => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }} onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
          }}>
            <summary>Options</summary>
            <div onClick={event => {
              const details = event.currentTarget.closest('details')!;
              details.open = false;
              details.querySelector('summary')?.focus();
            }}>
              {onToggleArcadeTiming && <button type="button" data-testid="guided-timing-toggle"
                aria-pressed={arcadeTimingEnabled} onClick={onToggleArcadeTiming}>{arcadeTimingEnabled ? 'Turn timing off' : 'Try swing or pitch timing'}</button>}
              {readyPowerName && onArmPower && <button type="button" data-testid="guided-unleash-power-btn"
                disabled={locked} aria-pressed={powerArmed} onClick={onArmPower}>{powerArmed ? 'Disarm ' : 'Arm '}{readyPowerName}</button>}
              {tip && !powerArmed && <button type="button" onClick={onSuggested} disabled={locked}>{cue.suggestedAction!.label}</button>}
            </div>
          </details>}
          <button type="button" aria-expanded={expanded} onClick={onExpand}>
            {expanded ? "Fewer controls" : "More controls"}
          </button>
        </div>
      </header>
      {!expanded && (
        <>
          <h3>
            {score} {objective}
          </h3>
          <div
            className="atbat-choices"
            role="group"
            aria-label={batting ? "Swing approach" : "Pitch target"}
          >
            {batting
              ? swings.map((s) => (
                  <button
                    key={s.id}
                    disabled={locked}
                    aria-pressed={s.id === call}
                    onClick={() => onSwing(s.id)}
                  >
                    {s.name}
                  </button>
                ))
              : pitches.map((p) => (
                  <button
                    key={p.id}
                    disabled={locked}
                    aria-pressed={p.id === target}
                    onClick={() => onTarget(p.id)}
                  >
                    {p.id === "high_heat" ? "🔥 Heat" : p.label}
                  </button>
                ))}
          </div>
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
            <button className="atbat-go" disabled={locked} onClick={() => onPitch()}>
              {powerArmed ? "⚡ " : ""}{action}
            </button>
          )}
        </>
      )}
    </section>
  );
}
