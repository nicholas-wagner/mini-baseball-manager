import type { GameDayWeather } from '../../engine/simulation/weather';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { Camera, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Club } from '../../engine/models/club';
import type { PlayEvent, PlaySoundCue } from '../../engine/models/playEvent';
import type { GameSessionState } from '../../engine/simulation/gameState';
import type { DefensiveShiftId } from '../../engine/simulation/winProbability';
import type { CameraPresetId } from '../../scene/camera/cameraRig';
import type { ChoreographedStep } from '../../scene/playback/eventChoreographer';
import { GameSceneController } from '../../scene/playback/gameSceneController';

import type { AtBatPreview, PlayerEntranceCue } from '../../scene/playback/firstAtBatPresentation';

export type LiveCameraMode = 'auto' | 'over_shoulder_pitcher' | 'over_shoulder_batter' | 'broadcast_diamond';

const CAMERA_MODE_OPTIONS: readonly { id: LiveCameraMode; label: string; ariaLabel: string }[] = [
  { id: 'auto', label: '🎥 Auto', ariaLabel: 'Auto Cam' },
  { id: 'over_shoulder_pitcher', label: '⚾ Pitcher', ariaLabel: 'Pitcher Cam' },
  { id: 'over_shoulder_batter', label: '🏏 Batter', ariaLabel: 'Batter Cam' },
  { id: 'broadcast_diamond', label: '🏟️ Wide', ariaLabel: 'Wide Cam' },
];

interface LiveGameCanvasProps {
  weather?: GameDayWeather | null;
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
  broadcastSlip?: ReactNode;
  entrance?: ReactNode;
  defensiveShift?: DefensiveShiftId;
  guided?: boolean;
  playFinished?: boolean;
  entranceCue?: PlayerEntranceCue | null;
  onEntranceEnd?: () => void;
  onAudioCue?: (cue: PlaySoundCue) => void;
  shakeOffSignal?: number;
  showStretchCue?: boolean;
  audioMuted?: boolean;
  onToggleAudio?: () => void;
}

let webglPlayback: boolean | undefined;

/** True when this browser can host the WebGL playback clock that drives play audio. */
export function isLiveWebglAvailable(): boolean {
  if (webglPlayback !== undefined) return webglPlayback;
  if (typeof document === 'undefined') {
    webglPlayback = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    webglPlayback = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webglPlayback = false;
  }
  return webglPlayback;
}

export function LiveGameCanvas({
  awayClub,
  homeClub,
  weather = null,
  session,
  choreo = null,
  lastEvent = null,
  preview = null,
  cameraMode = 'auto',
  onChangeCameraMode,
  celebrateConfetti = false,
  overlay = null,
  broadcastSlip = null,
  entrance,
  defensiveShift,
  guided = false,
  playFinished = false,
  entranceCue = null,
  onEntranceEnd,
  onAudioCue,
  shakeOffSignal = 0,
  showStretchCue = false,
  audioMuted = false,
  onToggleAudio,
}: LiveGameCanvasProps) {
  const reducedMotion = useUserPreferencesStore(s => s.reducedMotion);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraButton = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<GameSceneController | null>(null);
  const prevShakeOffRef = useRef(shakeOffSignal);
  const onAudioCueRef = useRef(onAudioCue);
  onAudioCueRef.current = onAudioCue;
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    try {
      const controller = new GameSceneController(container);
      controller.setOnAudioCue((cue) => onAudioCueRef.current?.(cue));
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

  useEffect(() => { controllerRef.current?.setWeather(weather); }, [weather]);

  useEffect(() => {
    if (!defensiveShift) return;
    const ctrl = controllerRef.current as (GameSceneController & {
      setDefensiveShift?: (s: DefensiveShiftId) => void;
    }) | null;
    ctrl?.setDefensiveShift?.(defensiveShift);
  }, [defensiveShift]);

  useEffect(() => { controllerRef.current?.setIdlePreview(preview); }, [preview]);

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

  useEffect(() => {
    if (shakeOffSignal > prevShakeOffRef.current) {
      controllerRef.current?.triggerPitcherShakeOff();
    }
    prevShakeOffRef.current = shakeOffSignal;
  }, [shakeOffSignal]);

  useEffect(() => {
    if (playFinished) controllerRef.current?.finishReplay();
  }, [playFinished, awayClub, homeClub, session, choreo, lastEvent]);

  useEffect(() => {
    if (controllerRef.current) controllerRef.current.setEntrance(entranceCue, onEntranceEnd);
    else if (entranceCue) {
      const timer = window.setTimeout(() => onEntranceEnd?.(), 1600);
      return () => window.clearTimeout(timer);
    }
  }, [entranceCue, onEntranceEnd]);

  return (
    <div className={`live-field relative w-full ${guided ? 'h-[250px] sm:h-[350px] lg:h-[388px]' : 'h-[204px] sm:h-[320px] lg:h-[370px]'} rounded-2xl border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] overflow-hidden bg-[#63CAFF]`}>
      <div
        ref={containerRef}
        className="w-full h-full"
        data-testid="live-game-3d-canvas"
        data-preview={preview ?? ''}
        data-defensive-shift={defensiveShift ?? ''}
        data-shake-off-signal={String(shakeOffSignal)}
      />

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
        <div
          data-testid="live-canvas-overlay"
          className="pointer-events-none absolute left-2 right-14 top-2 z-20 flex justify-start"
        >
          {overlay}
        </div>
      ) : null}

      {onToggleAudio ? (
        <button
          type="button"
          data-testid="live-audio-toggle"
          aria-label={audioMuted ? 'Unmute audio' : 'Mute audio'}
          aria-pressed={audioMuted}
          onClick={onToggleAudio}
          className="absolute top-1 right-1 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#F2CB75]/70 bg-[#132c36]/90 text-white cursor-pointer"
        >
          {audioMuted ? <VolumeX size={19} aria-hidden="true" /> : <Volume2 size={19} aria-hidden="true" />}
        </button>
      ) : null}

      {broadcastSlip ? (
        <div
          data-testid="live-broadcast-slip-slot"
          className={`pointer-events-none select-none absolute left-2 right-14 z-[15] flex justify-start ${
            showStretchCue ? 'bottom-8' : 'bottom-2'
          }`}
        >
          {broadcastSlip}
        </div>
      ) : null}

      {showStretchCue ? (
        <span
          data-testid="from-the-stretch-cue"
          className="pointer-events-none absolute bottom-1.5 left-2 z-20 px-2 py-0.5 rounded-full border border-[#F2CB75] bg-[#132c36]/90 text-[#FFF7E4] text-[10px] font-extrabold tracking-wide shadow-sm"
        >
          ⚾ From the Stretch
        </span>
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
