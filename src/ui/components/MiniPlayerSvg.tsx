import { useEffect, useMemo, useState } from 'react';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../../art/portraits/types';
import {
  evaluateMiniPlayerPose,
  type MiniPlayerFacing,
  type MiniPlayerRole,
} from '../../art/playerSvg/miniPlayerPose';
import { renderMiniPlayerSvgString } from '../../art/playerSvg/renderMiniPlayerSvg';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import type { CharacterAnimClip } from '../../scene/characters/animationState';

interface MiniPlayerSvgProps {
  traits: PortraitTraits;
  team: PortraitTeamColors;
  jerseyNumber: number;
  role: MiniPlayerRole;
  facing?: MiniPlayerFacing;
  throwsHand?: ThrowsHand;
  batSide?: EffectiveBatSide;
  clip?: CharacterAnimClip;
  moodOverride?: PortraitMood;
  animate?: boolean;
  className?: string;
}

export function MiniPlayerSvg({
  traits,
  team,
  jerseyNumber,
  role,
  facing = 'front',
  throwsHand = 'R',
  batSide = 'R',
  clip = 'idle',
  moodOverride,
  animate = true,
  className = 'w-full h-full',
}: MiniPlayerSvgProps) {
  const [timeSec, setTimeSec] = useState(0);

  useEffect(() => {
    if (!animate) return undefined;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // 30 FPS quantized state updates keep SVG animation buttery without heavy React churn
      const elapsed = Math.floor(((now - start) / 1000) * 30) / 30;
      setTimeSec((prev) => (prev === elapsed ? prev : elapsed));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animate]);

  const svgMarkup = useMemo(() => {
    const pose = evaluateMiniPlayerPose(clip, timeSec, role);
    return renderMiniPlayerSvgString(
      { traits, team, jerseyNumber, role, facing, throwsHand, batSide, moodOverride },
      pose,
    );
  }, [traits, team, jerseyNumber, role, facing, throwsHand, batSide, clip, moodOverride, timeSec]);

  return (
    <div
      data-testid={`mini-player-svg-${facing}`}
      className={`${className} [&>svg]:w-full [&>svg]:h-full [&>svg]:block select-none`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
