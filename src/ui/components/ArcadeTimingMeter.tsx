import { useEffect, useState } from 'react';
import {
  evaluateArcadeTimingCursor,
  type ArcadeTimingGrade,
} from '../../engine/simulation/pitchMindGames';
import { useUserPreferencesStore } from '../../store/userPreferences';

interface ArcadeTimingMeterProps {
  isBatting: boolean;
  disabled?: boolean;
  actionLabel: string;
  powerArmed?: boolean;
  onLockTiming: (grade: ArcadeTimingGrade) => void;
}

const GRADE_BADGES: Readonly<
  Record<ArcadeTimingGrade, { text: string; bg: string; color: string }>
> = {
  perfect: { text: '💥 PERFECT TIMING!', bg: '#FFC300', color: '#181B2C' },
  good: { text: '✓ GOOD TIMING!', bg: '#D8F3DC', color: '#1B4332' },
  late: { text: '😅 OFF-TIMING', bg: '#FFE5EC', color: '#9D0208' },
};

/**
 * Compact, tactile sweet-spot timing bar usable for optional interactive swings & pitches.
 * Reuses the same 0–100 sweet-spot feel as the 30s Home Run Derby while respecting Reduced Motion.
 */
export function ArcadeTimingMeter({
  isBatting,
  disabled = false,
  actionLabel,
  powerArmed = false,
  onLockTiming,
}: ArcadeTimingMeterProps) {
  const reducedMotion = useUserPreferencesStore((s) => s.reducedMotion);
  const [cursorPos, setCursorPos] = useState(50);
  const [lastGrade, setLastGrade] = useState<ArcadeTimingGrade | null>(null);

  useEffect(() => {
    if (disabled || reducedMotion) {
      return undefined;
    }
    let frameId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsedSec = (now - start) / 1000;
      const wave = 50 + Math.sin(elapsedSec * 2.9) * 45;
      setCursorPos(Math.round(wave));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [disabled, reducedMotion]);

  const handleLock = () => {
    if (disabled) return;
    const grade = reducedMotion ? 'good' : evaluateArcadeTimingCursor(cursorPos);
    setLastGrade(grade);
    onLockTiming(grade);
  };

  const badge = lastGrade ? GRADE_BADGES[lastGrade] : null;

  return (
    <div
      data-testid="arcade-timing-meter"
      className="rounded-xl border-2 border-[#182632] bg-[#173D37] px-2.5 py-2 space-y-1.5 text-[#FFF7E4]"
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-wide">
        <span className="text-[#FFDC90]">
          🎯 {isBatting ? 'Tap in the GOLD sweet spot to crush it!' : 'Hit the GOLD spot for maximum stuff!'}
        </span>
        {badge ? (
          <span
            data-testid="arcade-timing-grade"
            className="px-1.5 py-0.5 rounded border border-[#181B2C] font-display text-[9px] shrink-0"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {badge.text}
          </span>
        ) : null}
      </div>

      <div
        className="relative h-7 rounded-full border-2 border-[#FFDC90] bg-[#102624] overflow-hidden"
        aria-label="Sweet-spot timing bar"
      >
        <div
          className="absolute inset-y-0 bg-[#2FB356]/55"
          style={{ left: '26%', width: '48%' }}
        />
        <div
          className="absolute inset-y-0 bg-[#FFCC49] border-x-2 border-white"
          style={{ left: '39%', width: '22%' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-[#E63946] shadow flex items-center justify-center text-[11px]"
          style={{ left: `${reducedMotion ? 50 : cursorPos}%` }}
        >
          ⚾
        </div>
      </div>

      <button
        type="button"
        data-testid="arcade-timing-go-btn"
        disabled={disabled}
        onClick={handleLock}
        className="w-full min-h-[44px] rounded-lg border-2 border-[#182632] bg-[#FFCC49] hover:bg-[#FFD86B] text-[#152F2E] font-display text-sm font-black shadow-[2px_2px_0_#182632] cursor-pointer disabled:opacity-60 transition"
      >
        {powerArmed ? '⚡ ' : '🎯 '}
        {actionLabel}
      </button>
    </div>
  );
}
