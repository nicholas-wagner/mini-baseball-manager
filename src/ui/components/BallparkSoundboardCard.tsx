import { Music, Sparkles } from 'lucide-react';
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
  return (
    <ComicCard
      title={`Ballpark Soundboard (${ALL_SOUNDBOARD_CUES.length} Procedural 90s SFX)`}
      subtitle="100% offline Web Audio synth — tap any cue to preview"
      headerBg="#7209B7"
      badge={<Sparkles className="w-5 h-5 text-[#FFC300]" />}
    >
      <div data-testid="ballpark-soundboard" className="space-y-3">
        {CATEGORY_SECTIONS.map((section) => {
          const cues = ALL_SOUNDBOARD_CUES.filter((item) => item.category === section.id);
          return (
            <div key={section.id} className="space-y-1.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                {section.title}
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
    </ComicCard>
  );
}
