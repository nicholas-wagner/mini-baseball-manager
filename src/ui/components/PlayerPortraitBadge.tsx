import { useState } from 'react';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import pendingPortrait from '../../art/portraits/illustrations/portrait-pending.svg';
import type { Player } from '../../engine/models/player';

interface PlayerPortraitBadgeProps {
  player: Pick<Player, 'id' | 'name' | 'jerseyNumber' | 'position'>;
  primaryColor: string;
  accentColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  testId?: string;
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'w-8 h-8 rounded-lg',
  sm: 'w-11 h-11 rounded-xl',
  md: 'w-14 h-14 rounded-xl',
  lg: 'w-20 h-20 rounded-2xl',
};

export function PlayerPortraitBadge({
  player,
  primaryColor,
  accentColor = '#FFC300',
  size = 'md',
  testId,
}: PlayerPortraitBadgeProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = playerIllustration(player.id);
  const resolvedSrc = src && src !== failedSrc ? src : pendingPortrait;

  return (
    <div
      data-testid={testId}
      className={`relative shrink-0 overflow-hidden border-2 border-[#181B2C] shadow-[2px_2px_0_#181B2C] ${SIZE_CLASSES[size]}`}
      style={{
        background: `radial-gradient(circle at 50% 25%, ${accentColor}55, ${primaryColor})`,
      }}
    >
      <img
        src={resolvedSrc}
        alt={`${player.name} portrait`}
        onError={() => {
          if (src) setFailedSrc(src);
        }}
        className="w-full h-full object-cover object-top"
      />
      {size !== 'xs' ? (
        <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[9px] font-extrabold leading-tight rounded-tl-md">
          #{player.jerseyNumber}
        </span>
      ) : null}
    </div>
  );
}
