import type { GameSessionState } from "../../engine/simulation/gameState";
import type { TacticalCall } from "../../engine/models/playEvent";
import type { PitchTargetIntent } from "../../engine/simulation/pitchMindGames";
import type { LiveActionCue } from "../../engine/simulation/liveActionAdvisor";
import "./firstAtBat.css";

const pitches = [
  { id: "attack_zone", name: "Over the plate", action: "Pitch over the plate" },
  { id: "paint_corners", name: "Corner", action: "Pitch to the corner" },
  { id: "bury_offspeed", name: "Low and away", action: "Pitch low" },
] as const;
const swings = [
  { id: "contact", name: "Make contact", action: "Swing for contact" },
  { id: "power", name: "Swing big", action: "Swing for power" },
] as const;

export function FirstAtBat({
  session,
  batting,
  target,
  call,
  locked,
  expanded,
  powerArmed,
  cue,
  onTarget,
  onSwing,
  onPitch,
  onExpand,
  onSuggested,
}: {
  session: GameSessionState;
  batting: boolean;
  target: PitchTargetIntent;
  call: TacticalCall;
  locked: boolean;
  powerArmed: boolean;
  expanded: boolean;
  cue: LiveActionCue;
  onTarget: (target: PitchTargetIntent) => void;
  onSwing: (call: TacticalCall) => void;
  onPitch: () => void;
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
      ? session.outs === 1 ? "One out. A single could score a run." : "Bring the runner home."
      : "Get on base."
    : session.outs === 2
      ? "Get the last out."
      : session.outs === 0
        ? "Get the first out."
        : "Get the next out.";
  const action = batting
    ? swings.find((s) => s.id === call)?.action
    : pitches.find((p) => p.id === target)?.action;
  const tip =
    cue.suggestedAction &&
    ((batting && cue.kind === "steal_opportunity") || (!batting && cue.kind === "pitcher_gassed") ||
      (cue.kind === "power_ready" && session.strikes === 2));
  return (
    <section className="atbat-guide" aria-label="First at-bat">
      <header>
        <span>Coach Pops</span>
        <button type="button" aria-expanded={expanded} onClick={onExpand}>
          {expanded ? "Fewer controls" : "More controls"}
        </button>
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
                    {p.name}
                  </button>
                ))}
          </div>
          <button className="atbat-go" disabled={locked} onClick={() => onPitch()}>
            {powerArmed ? "⚡ " : ""}
            {action ?? (batting ? "Next pitch" : "Throw pitch")}
          </button>
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
