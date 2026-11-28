import { useState } from 'react';
import { getHealthConditionArtworkUrl } from '../../art/health/healthConditionPrint';

interface HealthConditionArtProps {
  conditionId: string;
  conditionName: string;
  kind: 'injury' | 'illness';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'w-12 h-12 rounded-lg',
  md: 'w-16 h-16 rounded-xl',
  lg: 'w-28 h-28 rounded-xl',
};

export function HealthConditionArt({
  conditionId,
  conditionName,
  kind,
  size = 'md',
  className = '',
}: HealthConditionArtProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const artUrl = getHealthConditionArtworkUrl(conditionId);

  return (
    <div
      data-testid={`health-condition-art-${conditionId}`}
      className={`${SIZE_CLASSES[size]} border-2 border-[#181B2C] bg-[#FFF8E7] overflow-hidden shrink-0 flex items-center justify-center shadow-[2px_2px_0_#181B2C] ${className}`}
    >
      {artUrl && !imgFailed ? (
        <img
          src={artUrl}
          alt={`${conditionName} manga illustration`}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xl" aria-hidden="true">
          {kind === 'injury' ? '🩹' : '🩺'}
        </span>
      )}
    </div>
  );
}
