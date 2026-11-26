import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { DugoutCheerMood, TeammateDugoutCheer } from '../../engine/gm/openingDayHook';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { PlayerPortraitBadge } from './PlayerPortraitBadge';

export interface DugoutCheerBubbleProps {
  /** Deterministic teammate cheer payload from `buildTeammateDugoutCheer`; renders nothing when null. */
  cheer: TeammateDugoutCheer | null;
  /** Human club primary color for the mini player portrait badge. */
  primaryColor: string;
  /** Optional club accent color for the portrait badge backdrop. */
  accentColor?: string;
  /** Milliseconds before auto-fading away (defaults to 4200; set 0 to keep visible until dismissed). */
  autoDismissMs?: number;
  /** Optional callback fired when dismissed by user tap or auto-fade timer. */
  onDismiss?: () => void;
  /** Optional extra className for positioning on GameDayScreen. */
  className?: string;
}

const MOOD_STYLES: Readonly<Record<DugoutCheerMood, { bg: string; accentText: string }>> = {
  hype: { bg: 'bg-[#FFF3BF]', accentText: 'text-[#9D0208]' },
  clutch: { bg: 'bg-[#E0FBFC]', accentText: 'text-[#1D3557]' },
  sparkle: { bg: 'bg-[#F3E8FF]', accentText: 'text-[#6D28D9]' },
  rally: { bg: 'bg-[#D8F3DC]', accentText: 'text-[#1B4332]' },
};

/**
 * Cute dismissible & auto-fading dugout teammate cheer pill with mini player portrait badge,
 * ready to mount on GameDayScreen without obstructing mobile controls.
 */
export function DugoutCheerBubble({
  cheer,
  primaryColor,
  accentColor = '#FFC300',
  autoDismissMs = 4200,
  onDismiss,
  className = '',
}: DugoutCheerBubbleProps) {
  const reducedMotion = useUserPreferencesStore((s) => s.reducedMotion);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [fadingId, setFadingId] = useState<string | null>(null);

  const cheerId = cheer?.id ?? null;

  useEffect(() => {
    if (!cheerId || autoDismissMs <= 0) return undefined;
    const fadeLeadMs = reducedMotion ? 0 : Math.min(450, Math.floor(autoDismissMs * 0.2));
    const fadeTimer =
      fadeLeadMs > 0
        ? window.setTimeout(() => setFadingId(cheerId), Math.max(0, autoDismissMs - fadeLeadMs))
        : null;
    const hideTimer = window.setTimeout(() => {
      setDismissedId(cheerId);
      onDismiss?.();
    }, autoDismissMs);

    return () => {
      if (fadeTimer !== null) window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [cheerId, autoDismissMs, onDismiss, reducedMotion]);

  if (!cheer || dismissedId === cheer.id) return null;

  const isFading = !reducedMotion && fadingId === cheer.id;
  const moodStyle = MOOD_STYLES[cheer.mood];
  const firstName = cheer.teammate.name.split(' ')[0];

  const handleDismiss = () => {
    setDismissedId(cheer.id);
    onDismiss?.();
  };

  return (
    <aside
      data-testid="dugout-cheer-bubble"
      data-cheer-mood={cheer.mood}
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 max-w-full sm:max-w-sm pl-2 pr-1 py-1 rounded-2xl border-2 border-[#181B2C] shadow-[3px_3px_0_#181B2C] ${moodStyle.bg} ${
        reducedMotion ? '' : 'transition-opacity duration-300'
      } ${isFading ? 'opacity-0' : 'opacity-100'} ${className}`}
    >
      <PlayerPortraitBadge
        player={cheer.teammate}
        primaryColor={primaryColor}
        accentColor={accentColor}
        size="xs"
        testId="dugout-cheer-portrait"
      />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-[#181B2C]">
          <span className="truncate">{firstName}</span>
          {cheer.isFavorite ? (
            <span
              data-testid="dugout-cheer-fav-star"
              aria-label="Favorite teammate"
              className="text-[#F59E0B] shrink-0"
            >
              ⭐
            </span>
          ) : null}
          <span className="text-[#4A5068] shrink-0">· Dugout</span>
        </div>
        <div className={`font-display text-xs leading-snug truncate ${moodStyle.accentText}`}>
          {cheer.emoji} “{cheer.message}”
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss dugout cheer"
        onClick={handleDismiss}
        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[#181B2C]/35 bg-[#FFFDF7]/90 hover:bg-[#FFFDF7] text-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
}
