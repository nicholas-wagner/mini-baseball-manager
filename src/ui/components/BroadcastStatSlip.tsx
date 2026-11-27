import { useEffect, useState } from 'react';
import type { BroadcastStatSlipData } from '../../engine/simulation/broadcastSlips';
import { useUserPreferencesStore } from '../../store/userPreferences';

export interface BroadcastStatSlipProps {
  slip: BroadcastStatSlipData | null;
  autoHideMs?: number;
  reducedMotion?: boolean;
  className?: string;
}

const DEFAULT_AUTO_HIDE_MS = 2_800;
const FADE_OUT_MS = 240;

export function BroadcastStatSlip({
  slip,
  autoHideMs = DEFAULT_AUTO_HIDE_MS,
  reducedMotion,
  className = '',
}: BroadcastStatSlipProps) {
  const prefReducedMotion = useUserPreferencesStore((s) => s.reducedMotion);
  const isReducedMotion = reducedMotion ?? prefReducedMotion;
  const [fadingId, setFadingId] = useState<string | null>(null);
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  const slipId = slip?.id ?? null;

  useEffect(() => {
    if (!slipId) return undefined;
    const hideTimer = window.setTimeout(() => {
      setHiddenId(slipId);
    }, autoHideMs);

    const fadeDelay = !isReducedMotion && autoHideMs > FADE_OUT_MS ? autoHideMs - FADE_OUT_MS : null;
    const fadeTimer =
      fadeDelay !== null
        ? window.setTimeout(() => {
            setFadingId(slipId);
          }, fadeDelay)
        : null;

    return () => {
      window.clearTimeout(hideTimer);
      if (fadeTimer !== null) window.clearTimeout(fadeTimer);
    };
  }, [slipId, autoHideMs, isReducedMotion]);

  if (!slip || hiddenId === slip.id) return null;

  const isFading = !isReducedMotion && fadingId === slip.id;
  const isMilestone = slip.kind === 'milestone' || slip.kind === 'pitcher_spotlight';

  return (
    <div
      data-testid="broadcast-stat-slip"
      data-slip-kind={slip.kind}
      data-reduced-motion={isReducedMotion ? 'true' : 'false'}
      aria-live="polite"
      className={`pointer-events-none select-none max-h-[52px] max-w-full sm:max-w-[360px] overflow-hidden rounded-lg border border-[#FFFDF7]/25 border-l-[5px] bg-[#181B2C]/95 px-2.5 py-1 text-[#FFFDF7] shadow-[2px_3px_0_rgba(0,0,0,0.55)] ${
        isReducedMotion
          ? 'transition-none'
          : isFading
            ? 'opacity-0 -translate-x-1 transition-all duration-200'
            : 'opacity-100 translate-x-0 transition-all duration-200'
      } ${className}`}
      style={{ borderLeftColor: slip.accentHex }}
    >
      <div className="flex items-center justify-between gap-1.5 leading-tight min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`shrink-0 rounded px-1 py-0.5 font-display text-[8.5px] uppercase tracking-wider leading-none ${
              isMilestone
                ? 'bg-[#FFC300] text-[#181B2C]'
                : 'bg-[#FFFDF7]/15 text-[#FFD166]'
            }`}
          >
            {slip.kicker}
          </span>
          <span className="truncate font-display text-[11px] sm:text-xs text-[#FFFDF7]">
            {slip.title}
          </span>
        </div>
        {slip.badgeText ? (
          <span className="shrink-0 rounded bg-[#FFC300]/20 border border-[#FFD166]/50 px-1 py-0.5 text-[9px] font-extrabold leading-none text-[#FFD166] whitespace-nowrap">
            {slip.badgeText}
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 truncate font-mono-tabular text-[10px] font-bold leading-tight text-[#DCE7F5]">
        {slip.statLine}
      </div>
    </div>
  );
}
