import { useEffect, useRef, useState } from 'react';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../../art/portraits/types';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import type { CameraPresetId } from '../../scene/camera/cameraRig';
import type { CharacterAnimClip } from '../../scene/characters/animationState';
import { DesignLabSceneController } from '../../scene/DesignLabSceneController';
import type { BallVfxStyle } from '../../scene/vfx/ballTrajectory';

export interface ShowcaseTrigger {
  nonce: number;
  ballStyle: BallVfxStyle | null;
  callout?: { text: string; color: string; y?: number; z?: number };
}

interface BallparkCanvasProps {
  heroTraits: PortraitTraits;
  heroTeam: PortraitTeamColors;
  heroJersey: number;
  heroThrows?: ThrowsHand;
  batterSide?: EffectiveBatSide;
  cameraPreset: CameraPresetId;
  pitcherClip: CharacterAnimClip;
  batterClip: CharacterAnimClip;
  fielderClip: CharacterAnimClip;
  moodOverride?: PortraitMood;
  trigger?: ShowcaseTrigger | null;
  turntableNudge?: number;
}

export function BallparkCanvas({
  heroTraits,
  heroTeam,
  heroJersey,
  heroThrows = 'R',
  batterSide = 'R',
  cameraPreset,
  pitcherClip,
  batterClip,
  fielderClip,
  moodOverride,
  trigger,
  turntableNudge = 0,
}: BallparkCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<DesignLabSceneController | null>(null);
  const lastNudgeRef = useRef(0);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const controller = new DesignLabSceneController(
        container,
        heroTraits,
        heroTeam,
        heroJersey,
      );
      controllerRef.current = controller;
      setWebglUnavailable(false);
      return () => {
        controller.dispose();
        controllerRef.current = null;
      };
    } catch {
      // Graceful fallback inside jsdom or browsers without WebGL
      setWebglUnavailable(true);
      return undefined;
    }
    // Mount Three.js controller once; live updates flow through dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.setHeroAppearance(
      heroTraits,
      heroTeam,
      heroJersey,
      heroThrows,
      batterSide,
    );
  }, [heroTraits, heroTeam, heroJersey, heroThrows, batterSide]);

  useEffect(() => {
    controllerRef.current?.setAnimationClips({
      cameraPreset,
      pitcherClip,
      batterClip,
      fielderClip,
      moodOverride,
    });
  }, [cameraPreset, pitcherClip, batterClip, fielderClip, moodOverride]);

  useEffect(() => {
    if (!trigger) return;
    controllerRef.current?.triggerShowcaseAction(trigger.ballStyle, trigger.callout);
  }, [trigger]);

  useEffect(() => {
    const delta = turntableNudge - lastNudgeRef.current;
    lastNudgeRef.current = turntableNudge;
    if (delta !== 0) {
      controllerRef.current?.nudgeTurntable(delta);
    }
  }, [turntableNudge]);

  return (
    <div className="relative w-full h-[300px] sm:h-[390px] lg:h-[440px] rounded-2xl border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] overflow-hidden bg-[#63CAFF]">
      <div ref={containerRef} className="w-full h-full" data-testid="ballpark-3d-canvas" />
      {webglUnavailable ? (
        <div className="absolute inset-0 bg-turf-stripes flex flex-col items-center justify-center p-4 text-center">
          <div className="comic-panel px-4 py-3 max-w-xs">
            <div className="font-display text-sm text-[#181B2C]">3D Ballpark Viewport</div>
            <p className="text-xs font-bold text-[#4A5068] mt-1">
              WebGL preview activates automatically in browser. Active camera:{' '}
              <span className="text-[#1B4332]">{cameraPreset}</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
