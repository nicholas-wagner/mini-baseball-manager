import { useEffect, useState } from 'react';
import { Disc3, MapPin, Music, Volume2, VolumeX, X } from 'lucide-react';
import { BGM_TRACKS, bgmEngine } from '../../audio/bgmEngine';
import { ComicButton } from '../design-system/ComicButton';

interface MusicJukeboxModalProps {
  open: boolean;
  onClose: () => void;
}

export function MusicJukeboxModal({ open, onClose }: MusicJukeboxModalProps) {
  const [bgmState, setBgmState] = useState(() => bgmEngine.getState());

  useEffect(() => bgmEngine.subscribe(setBgmState), []);

  if (!open) return null;

  const activeTrack = BGM_TRACKS.find((t) => t.id === bgmState.trackId) ?? BGM_TRACKS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 flex items-start sm:items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="90s Arcade Stadium Jukebox"
    >
      <div
        data-testid="music-jukebox-modal"
        className="w-full max-w-2xl rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden"
      >
        <div className="px-4 py-3 bg-[#7209B7] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Disc3
              className={`w-5 h-5 text-[#FFD166] shrink-0 ${
                bgmState.enabled && !bgmState.masterMuted ? 'animate-spin' : ''
              }`}
            />
            <div className="min-w-0">
              <div className="font-display text-sm sm:text-base tracking-wide truncate">
                90s ARCADE STADIUM JUKEBOX
              </div>
              <div className="text-[11px] font-bold text-[#FFD166] truncate">
                Unique environmental music for every ballpark — gentle volume &amp; mutable anytime
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Music Jukebox"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display text-xs sm:text-sm text-[#181B2C]">
                {bgmState.enabled ? `♪ ${activeTrack.title}` : '♪ Background Music Muted'}
              </div>
              <div className="text-[11px] font-bold text-[#4A5068]">
                🏟️ {activeTrack.stadiumLabel} • {activeTrack.vibe} ({activeTrack.bpm} BPM)
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ComicButton
                size="sm"
                variant={bgmState.autoMatchStadium ? 'sky' : 'cream'}
                active={bgmState.autoMatchStadium}
                icon={<MapPin className="w-3.5 h-3.5" />}
                onClick={() => bgmEngine.setAutoMatchStadium(!bgmState.autoMatchStadium)}
              >
                {bgmState.autoMatchStadium ? 'Auto: Match Stadium' : 'Manual Pin'}
              </ComicButton>
              <ComicButton
                size="sm"
                variant={bgmState.enabled ? 'turf' : 'coral'}
                icon={
                  bgmState.enabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )
                }
                onClick={() => bgmEngine.toggleEnabled()}
              >
                {bgmState.enabled ? 'Music ON' : 'Music OFF'}
              </ComicButton>
            </div>
          </div>

          <label className="block p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5 text-xs font-extrabold text-[#181B2C]">
            <div className="flex justify-between">
              <span>Gentle Background Volume</span>
              <span className="font-mono-tabular">{Math.round(bgmState.volume * 100)}%</span>
            </div>
            <input
              aria-label="Jukebox Volume"
              type="range"
              min={0}
              max={100}
              value={Math.round(bgmState.volume * 100)}
              onChange={(e) => bgmEngine.setVolume(Number(e.target.value) / 100)}
              className="w-full accent-[#7209B7]"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BGM_TRACKS.map((track) => {
              const selected = bgmState.trackId === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (!bgmState.enabled) bgmEngine.setEnabled(true);
                    bgmEngine.selectTrack(track.id);
                  }}
                  className={`min-h-[52px] p-2.5 rounded-xl border-2 border-[#181B2C] text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#FFC300] text-[#181B2C] shadow-[3px_3px_0_#181B2C]'
                      : 'bg-white text-[#181B2C] hover:bg-[#FFFDF7]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xs flex items-center gap-1">
                      <Music className="w-3.5 h-3.5 shrink-0" />
                      {track.title}
                    </span>
                    <span className="text-[10px] font-mono-tabular font-extrabold text-[#4A5068]">
                      {track.bpm} BPM
                    </span>
                  </div>
                  <div className="text-[10px] font-extrabold text-[#1B4332] mt-0.5">
                    🏟️ {track.stadiumLabel} — {track.vibe}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
