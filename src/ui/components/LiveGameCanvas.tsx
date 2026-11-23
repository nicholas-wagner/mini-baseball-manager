import { useUserPreferencesStore } from '../../store/userPreferences';
import { Camera } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Club } from '../../engine/models/club';
import type { PlayEvent } from '../../engine/models/playEvent';
import type { GameSessionState } from '../../engine/simulation/gameState';
import type { CameraPresetId } from '../../scene/camera/cameraRig';
import type { ChoreographedStep } from '../../scene/playback/eventChoreographer';
import { GameSceneController } from '../../scene/playback/gameSceneController';

import type { AtBatPreview } from '../../scene/playback/firstAtBatPresentation';

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
  preview?: AtBatPreview | null;
  lastEvent?: PlayEvent | null;
  cameraMode?: LiveCameraMode;
  onChangeCameraMode?: (mode: LiveCameraMode) => void;
  celebrateConfetti?: boolean;
  overlay?: ReactNode;
  entrance?: ReactNode;
}

export function LiveGameCanvas({
  awayClub,
  homeClub,
  session,
  choreo = null,
  lastEvent = null,
  preview = null,
  cameraMode = 'auto',
  onChangeCameraMode,
  celebrateConfetti = false,
  overlay = null,
  entrance,
}: LiveGameCanvasProps) {
  const reducedMotion = useUserPreferencesStore(s => s.reducedMotion);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraButton = useRef<HTMLButtonElement>(null);
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

  useEffect(() => { controllerRef.current?.setPreview(preview); }, [preview]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const steady = reducedMotion || Boolean(media?.matches);
      const automatic = steady ? 'broadcast_diamond' : null;
      controllerRef.current?.setCameraOverride(cameraMode === 'auto' ? automatic : cameraMode as CameraPresetId, steady);
    };
    apply();
    media?.addEventListener?.('change', apply);
    return () => media?.removeEventListener?.('change', apply);
  }, [cameraMode, reducedMotion]);

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

      {entrance}
      {overlay ? (
        <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-center">
          {overlay}
        </div>
      ) : null}

      {onChangeCameraMode ? (
        <div
          data-testid="camera-angle-switcher"
          className="absolute bottom-1 right-1 z-20 flex flex-col items-end text-white"
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setCameraOpen(false); }}
          onKeyDown={e => { if (e.key === 'Escape') { setCameraOpen(false); cameraButton.current?.focus(); } }}
        >
          <button type="button" ref={cameraButton} aria-expanded={cameraOpen} aria-label="Camera angles"
            className="order-last flex h-11 w-11 items-center justify-center rounded-full bg-[#132c36]/90 cursor-pointer"
            onClick={() => setCameraOpen(v => !v)}><Camera size={19} /></button>
          {cameraOpen && <div className="grid grid-cols-2 rounded-lg border-2 border-[#F2CB75] bg-[#132c36] p-1">
          {CAMERA_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-label={opt.ariaLabel}
              aria-pressed={cameraMode === opt.id}
              onClick={() => { onChangeCameraMode(opt.id); setCameraOpen(false); cameraButton.current?.focus(); }}
              className={`min-h-11 px-2 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition ${
                cameraMode === opt.id
                  ? 'bg-[#FFC300] text-[#181B2C]'
                  : 'text-[#FBF4E4] hover:bg-white/15'
              }`}
            >
              {opt.label}
            </button>
          ))}</div>}
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
