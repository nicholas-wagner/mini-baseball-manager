import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import type { CelebrationStickerUnlock } from '../../engine/gm/celebrationStickers';
import type { Club } from '../../engine/models/club';
import { ClubMascotBuddy } from './ClubMascotBuddy';

interface CelebrationStickerToastProps {
  unlock: CelebrationStickerUnlock | null;
  club: Club;
  onOpenAlbum?: () => void;
  onDismiss: () => void;
}

export function CelebrationStickerToast({
  unlock,
  club,
  onOpenAlbum,
  onDismiss,
}: CelebrationStickerToastProps) {
  useEffect(() => {
    if (!unlock) return undefined;
    const timer = window.setTimeout(onDismiss, 6500);
    return () => window.clearTimeout(timer);
  }, [unlock, onDismiss]);

  if (!unlock) return null;

  return (
    <aside
      data-testid="celebration-sticker-toast"
      role="status"
      aria-live="polite"
      className="fixed top-[62px] left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-24px)] max-w-[376px] pointer-events-auto"
    >
      <div
        className="p-2 rounded-2xl border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] flex items-center gap-2"
        style={{ backgroundColor: unlock.sticker.accentBg }}
      >
        <ClubMascotBuddy
          mascot={club.mascot}
          primaryColor={club.colors.primary}
          secondaryColor={club.colors.secondary}
          accentColor={club.colors.accent}
          mood="cheering"
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-[#7209B7]">
            <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>New Sticker Unlocked!</span>
          </div>
          <div className="font-display text-xs text-[#181B2C] leading-tight truncate">
            {unlock.sticker.emoji} {unlock.sticker.title}
          </div>
          <div className="text-[10.5px] font-bold text-[#1D3557] leading-tight truncate">
            {unlock.mascotQuip}
          </div>
        </div>
        {onOpenAlbum ? (
          <button
            type="button"
            data-testid="sticker-toast-album-btn"
            onClick={() => {
              soundEngine.play('ui_pop');
              onOpenAlbum();
            }}
            className="min-h-[44px] px-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFC300] hover:bg-[#FFD166] text-[#181B2C] font-display text-[10.5px] shadow-[2px_2px_0_#181B2C] cursor-pointer shrink-0 whitespace-nowrap"
          >
            Album →
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Dismiss sticker notification"
          onClick={() => {
            soundEngine.play('ui_pop');
            onDismiss();
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] text-[#181B2C] flex items-center justify-center cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
