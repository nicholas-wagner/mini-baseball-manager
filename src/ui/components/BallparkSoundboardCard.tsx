import { useEffect, useState } from 'react';
import { Disc3, MapPin, Music, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { BGM_TRACKS, bgmEngine } from '../../audio/bgmEngine';
import {
  ALL_SOUNDBOARD_CUES,
  soundEngine,
  type SoundboardCategory,
} from '../../audio/soundEngine';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

const CATEGORY_SECTIONS: readonly { id: SoundboardCategory; title: string }[] = [
  { id: 'action', title: 'On-Field Baseball Action' },
  { id: 'atmosphere', title: 'Ballpark Organ & Crowd' },
  { id: 'rpg', title: 'RPG, Cards & Front Office' },
];

export function BallparkSoundboardCard() {
  const [bgmState, setBgmState] = useState(() => bgmEngine.getState());

  useEffect(() => bgmEngine.subscribe(setBgmState), []);

  const activeTrack = BGM_TRACKS.find((t) => t.id === bgmState.trackId) ?? BGM_TRACKS[0];

  return (
    <ComicCard
      title={`Ballpark Soundboard (${ALL_SOUNDBOARD_CUES.length} Procedural 90s SFX)`}
      subtitle="100% offline Web Audio synth + 10 unique per-stadium 90s arcade soundtracks"
      headerBg="#7209B7"
      badge={<Sparkles className="w-5 h-5 text-[#FFC300]" />}
    >
      <div className="space-y-4">
        {/* Per-Stadium 90s Arcade Background Music Jukebox */}
        <div
          data-testid="arcade-bgm-jukebox"
          className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display text-xs sm:text-sm text-[#181B2C] flex items-center gap-1.5">
                <Disc3
                  className={`w-4 h-4 text-[#7209B7] ${
                    bgmState.enabled && !bgmState.masterMuted ? 'animate-spin' : ''
                  }`}
                />
                90s Arcade Stadium Jukebox ({BGM_TRACKS.length} Unique Ballpark Themes)
              </div>
              <div className="text-[11px] font-bold text-[#4A5068]">
                {bgmState.enabled
                  ? `Now Spinning: ${activeTrack.title} (${activeTrack.stadiumLabel}) • ${activeTrack.vibe} • ${activeTrack.bpm} BPM`
                  : 'Background music muted — SFX still active!'}
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
                {bgmState.autoMatchStadium ? 'Auto: Match Stadium' : 'Manual Track Pin'}
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
                onClick={() => {
                  bgmEngine.toggleEnabled();
                }}
              >
                {bgmState.enabled ? 'Music ON' : 'Music OFF'}
              </ComicButton>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
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
                  className={`min-h-[48px] px-2.5 py-2 rounded-xl border-2 border-[#181B2C] text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#FFC300] text-[#181B2C] shadow-[3px_3px_0_#181B2C]'
                      : 'bg-[#FFFDF7] text-[#181B2C] hover:bg-white'
                  }`}
                >
                  <div className="font-display text-[11px] leading-tight flex items-center gap-1">
                    <Music className="w-3 h-3 shrink-0" />
                    <span className="truncate">{track.title}</span>
                  </div>
                  <div className="text-[10px] font-extrabold text-[#4A5068] truncate mt-0.5">
                    🏟️ {track.stadiumLabel}
                  </div>
                </button>
              );
            })}
          </div>

          <label className="flex flex-wrap items-center gap-3 text-xs font-extrabold text-[#181B2C]">
            <span>Music Volume ({Math.round(bgmState.volume * 100)}%)</span>
            <input
              aria-label="Background Music Volume"
              type="range"
              min={0}
              max={100}
              value={Math.round(bgmState.volume * 100)}
              onChange={(e) => bgmEngine.setVolume(Number(e.target.value) / 100)}
              className="flex-1 min-w-[140px] accent-[#7209B7]"
            />
          </label>
        </div>

        {/* 40-Cue Procedural Ballpark Soundboard */}
        <div data-testid="ballpark-soundboard" className="space-y-3">
          {CATEGORY_SECTIONS.map((section) => {
            const cues = ALL_SOUNDBOARD_CUES.filter((item) => item.category === section.id);
            return (
              <div key={section.id} className="space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                  {section.title} ({cues.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {cues.map((item) => (
                    <ComicButton
                      key={item.cue}
                      size="sm"
                      variant={
                        item.cue.startsWith('organ_') || item.cue === 'trophy_fanfare'
                          ? 'gold'
                          : item.category === 'atmosphere'
                            ? 'sky'
                            : 'cream'
                      }
                      icon={<Music className="w-3.5 h-3.5" />}
                      onClick={() => soundEngine.play(item.cue)}
                    >
                      {item.label}
                    </ComicButton>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ComicCard>
  );
}
