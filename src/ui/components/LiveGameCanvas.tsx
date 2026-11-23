import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Club } from '../../engine/models/club';
import type { PlayEvent } from '../../engine/models/playEvent';
import type { GameSessionState } from '../../engine/simulation/gameState';
import type { CameraPresetId } from '../../scene/camera/cameraRig';
import type { ChoreographedStep } from '../../scene/playback/eventChoreographer';
import { GameSceneController } from '../../scene/playback/gameSceneController';

export type LiveCameraMode = 'auto' | 'over_shoulder_pitcher' | 'over_shoulder_batter' | 'broadcast_diamond';

const CAMERA_MODE_OPTIONS: readonly { id: LiveCameraMode; label: string; ariaLabel: string }[] = [
  { id: 'auto', label: '🎥 Auto', ariaLabel: 'Auto Cam' },
  { id: 'over_shoulder_pitcher', label: '⚾ Pitcher', ariaLabel: 'Pitcher Cam' },
  { id: 'over_shoulder_batter', label: '🏏 Batter', ariaLabel: 'Batter Cam' },
  { id: 'broadcast_diamond', label: '🏟️ Wide', ariaLabel: 'Wide Cam' },
];

interface LiveGameCanvasProps {
  awayClub: Club;
  homeClub: Club;
  session: GameSessionState;
  choreo?: ChoreographedStep | null;
  lastEvent?: PlayEvent | null;
  cameraMode?: LiveCameraMode;
  onChangeCameraMode?: (mode: LiveCameraMode) => void;
  celebrateConfetti?: boolean;
  overlay?: ReactNode;
}

export function LiveGameCanvas({
  awayClub,
  homeClub,
  session,
  choreo = null,
  lastEvent = null,
  cameraMode = 'auto',
  onChangeCameraMode,
  celebrateConfetti = false,
  overlay = null,
}: LiveGameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<GameSceneController | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    try {
      const controller = new GameSceneController(container);
      controllerRef.current = controller;
      setWebglUnavailable(false);
      return () => {
        controller.dispose();
        controllerRef.current = null;
      };
    } catch {
      setWebglUnavailable(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    controllerRef.current?.setCameraOverride(
      cameraMode === 'auto' ? null : (cameraMode as CameraPresetId),
    );
  }, [cameraMode]);

  useEffect(() => {
    controllerRef.current?.syncMatchup(awayClub, homeClub, session, choreo, lastEvent);
  }, [awayClub, homeClub, session, choreo, lastEvent]);

  return (
    <div className="relative w-full h-[220px] sm:h-[320px] lg:h-[370px] rounded-2xl border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] overflow-hidden bg-[#63CAFF]">
      <div ref={containerRef} className="w-full h-full" data-testid="live-game-3d-canvas" />

      {celebrateConfetti ? (
        <div
          aria-hidden="true"
          data-testid="comic-confetti-burst"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        >
          {[
            { left: '12%', top: '18%', bg: '#FFC300' },
            { left: '24%', top: '30%', bg: '#FF4D6D' },
            { left: '38%', top: '14%', bg: '#00E5FF' },
            { left: '54%', top: '26%', bg: '#2FB356' },
            { left: '68%', top: '15%', bg: '#FFC300' },
            { left: '82%', top: '28%', bg: '#FF4D6D' },
            { left: '18%', top: '60%', bg: '#00E5FF' },
            { left: '78%', top: '58%', bg: '#2FB356' },
          ].map((dot, idx) => (
            <span
              key={idx}
              className="absolute w-3 h-3 rounded-sm border border-[#181B2C] animate-bounce"
              style={{ left: dot.left, top: dot.top, backgroundColor: dot.bg }}
            />
          ))}
        </div>
      ) : null}

      {overlay ? (
        <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-center">
          {overlay}
        </div>
      ) : null}

      {onChangeCameraMode ? (
        <div
          data-testid="camera-angle-switcher"
          className="absolute bottom-2 right-2 z-20 flex items-center gap-1 bg-[#181B2C]/85 px-1.5 py-1 rounded-xl border-2 border-[#FFD166]"
        >
          {CAMERA_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-label={opt.ariaLabel}
              onClick={() => onChangeCameraMode(opt.id)}
              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition ${
                cameraMode === opt.id
                  ? 'bg-[#FFC300] text-[#181B2C]'
                  : 'text-[#FBF4E4] hover:bg-white/15'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {webglUnavailable ? (
        <div className="absolute inset-0 bg-turf-stripes flex flex-col items-center justify-center p-4 text-center">
          <div className="comic-panel px-4 py-3 max-w-xs">
            <div className="font-display text-sm text-[#181B2C]">Live 3D Diamond</div>
            <p className="text-xs font-bold text-[#4A5068] mt-1">
              Inning {session.inning} ({session.half}) • {session.away.name} {session.away.score} -{' '}
              {session.home.score} {session.home.name}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
