import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Club } from '../../engine/models/club';
import type { PlayEvent } from '../../engine/models/playEvent';
import type { GameSessionState } from '../../engine/simulation/gameState';
import type { ChoreographedStep } from '../../scene/playback/eventChoreographer';
import { GameSceneController } from '../../scene/playback/gameSceneController';

interface LiveGameCanvasProps {
  awayClub: Club;
  homeClub: Club;
  session: GameSessionState;
  choreo?: ChoreographedStep | null;
  lastEvent?: PlayEvent | null;
  overlay?: ReactNode;
}

export function LiveGameCanvas({
  awayClub,
  homeClub,
  session,
  choreo = null,
  lastEvent = null,
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
    controllerRef.current?.syncMatchup(awayClub, homeClub, session, choreo, lastEvent);
  }, [awayClub, homeClub, session, choreo, lastEvent]);

  return (
    <div className="relative w-full h-[220px] sm:h-[320px] lg:h-[370px] rounded-2xl border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] overflow-hidden bg-[#63CAFF]">
      <div ref={containerRef} className="w-full h-full" data-testid="live-game-3d-canvas" />
      {overlay ? (
        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex justify-center">
          {overlay}
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
