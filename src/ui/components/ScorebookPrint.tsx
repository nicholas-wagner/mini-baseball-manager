import { useState } from "react";
import type { ScorebookMoment } from "../../engine/gm/scorebookMoments";
import { playerIllustration } from "../../art/portraits/illustratedPlayerPool";
import pending from "../../art/portraits/illustrations/portrait-pending.svg";
import { EnlargePrint } from "./EnlargePrint";

export function ScorebookPrint({
  moments,
  kept = [],
  onKeep,
}: {
  moments: readonly ScorebookMoment[];
  kept?: readonly ScorebookMoment[];
  onKeep?: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string>();
  const index = Math.max(
    0,
    moments.findIndex((m) => m.id === selected),
  );
  const moment = moments[index];
  if (!moment) return null;
  const saved = kept.some((m) => m.id === moment.id);
  const src = playerIllustration(moment.playerId);
  return (
    <section aria-label="Scorebook prints" className="scorebook-print">
      <div className="scorebook-photo">
        <img
          src={src ?? pending}
          alt={moment.playerName + " scorebook print"}
        />
        {src && <EnlargePrint name={moment.playerName} src={src} />}
      </div>
      <div>
        <small>Scorebook · vs {moment.opponent}</small>
        <h4>{moment.playerName}</h4>
        <b>{moment.caption}</b>
        <p>
          {moment.half === "BOT" ? "Bottom" : "Top"} {moment.inning} ·{" "}
          {moment.situation}
        </p>
        <div className="scorebook-actions">
          {onKeep && (
            <button disabled={saved} onClick={() => onKeep(moment.id)}>
              {saved ? "✓ In your album" : "Keep this moment"}
            </button>
          )}
          {moments.length > 1 && (
            <button
              onClick={() =>
                setSelected(moments[(index + 1) % moments.length].id)
              }
              aria-label="Next scorebook print"
            >
              {index + 1}/{moments.length} →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
