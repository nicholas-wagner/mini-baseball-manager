import { PITCH_CALL_GUIDE, SWING_CALL_GUIDE } from "../../engine/gm/openingDayHook";
import type { TacticalCall } from "../../engine/models/playEvent";
import type { GameSessionState } from "../../engine/simulation/gameState";
import type { LiveActionCue } from "../../engine/simulation/liveActionAdvisor";
import type {
  ArcadeTimingGrade,
  PitchTargetIntent,
} from "../../engine/simulation/pitchMindGames";
import { ArcadeTimingMeter } from "./ArcadeTimingMeter";
import "./firstAtBat.css";

const pitches = PITCH_CALL_GUIDE.filter(
  (p) => p.id === "attack_zone" || p.id === "paint_corners" || p.id === "bury_offspeed",
);
const swings = [
  { id: "contact" as const, name: "Contact", tradeoff: SWING_CALL_GUIDE[0].tradeoff },
  { id: "power" as const, name: "Power", tradeoff: SWING_CALL_GUIDE[2].tradeoff },
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
  const action = batting ? "Swing" : activePitch.actionLabel;
  const tradeoffText = batting
    ? call === "power"
      ? "More power. Easier to miss."
      : "Easier to connect. Less power."
    : activePitch.tradeoff;
  const tip =
    cue.suggestedAction &&
    ((batting && cue.kind === "steal_opportunity") ||
      (!batting && cue.kind === "pitcher_gassed"));
  return (
    <section className="atbat-guide" aria-label="First at-bat">
      <header>
        <span>Coach Pops</span>
        <div className="atbat-header-actions">
          {onToggleArcadeTiming ? (
            <button
              type="button"
              data-testid="guided-timing-toggle"
              aria-pressed={arcadeTimingEnabled}
              onClick={onToggleArcadeTiming}
            >
              {arcadeTimingEnabled ? "🎯 Timing ON" : "🎯 Timing"}
            </button>
          ) : null}
          <button type="button" aria-expanded={expanded} onClick={onExpand}>
            {expanded ? "Fewer controls" : "More controls"}
          </button>
        </div>
      </header>
      <h3>
        {score} {objective}
      </h3>
      {!expanded && (
        <>
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
                    {p.label}
                  </button>
                ))}
          </div>
          <p className="swing-tradeoff" data-testid="guided-tradeoff-hint" aria-live="polite">
            {tradeoffText}
          </p>
          {arcadeTimingEnabled ? (
            <div className="mt-2 space-y-2">
              {readyPowerName && onArmPower ? (
                <button
                  type="button"
                  data-testid="guided-unleash-power-btn"
                  disabled={locked}
                  aria-pressed={powerArmed}
                  onClick={onArmPower}
                  className={`atbat-power ${powerArmed ? "is-armed" : ""}`}
                >
                  {powerArmed
                    ? `🔥 ${readyPowerName} ARMED`
                    : `⚡ ${readyPowerName}`}
                </button>
              ) : null}
              <ArcadeTimingMeter
                isBatting={batting}
                disabled={locked}
                actionLabel={action}
                powerArmed={powerArmed}
                onLockTiming={(grade) => onPitch(grade)}
              />
            </div>
          ) : (
            <div className="atbat-action-row">
              <button className="atbat-go" disabled={locked} onClick={() => onPitch()}>
                {powerArmed ? "⚡ " : ""}
                {action}
              </button>
              {readyPowerName && onArmPower ? (
                <button
                  type="button"
                  data-testid="guided-unleash-power-btn"
                  disabled={locked}
                  aria-pressed={powerArmed}
                  onClick={onArmPower}
                  className={`atbat-power ${powerArmed ? "is-armed" : ""}`}
                >
                  {powerArmed ? `🔥 ${readyPowerName}` : `⚡ ${readyPowerName}`}
                </button>
              ) : null}
            </div>
          )}
          {tip && !powerArmed && (
            <button
              className="atbat-tip"
              onClick={onSuggested}
              disabled={locked}
            >
              {cue.suggestedAction!.label}
            </button>
          )}
        </>
      )}
    </section>
  );
}
