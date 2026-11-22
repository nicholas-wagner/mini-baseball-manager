import { useState } from 'react';
import { Dices, Play } from 'lucide-react';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { soundEngine } from '../../audio/soundEngine';
import { createSeededRng } from '../../engine/rng/seededRng';
import { useGameStore } from '../../store/gameStore';
import { MiniPlayerSvg } from '../components/MiniPlayerSvg';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface ClubCreatorScreenProps {
  onCreated: () => void;
}

const EXTRA_CITIES = ['Cedar', 'Harbor', 'Meteor', 'Oakwood', 'Rocket', 'Clover'] as const;
const EXTRA_NAMES = ['Sox', 'Foxes', 'Badgers', 'Hounds', 'Meteors', 'Bears'] as const;

export function ClubCreatorScreen({ onCreated }: ClubCreatorScreenProps) {
  const startNewCareer = useGameStore((s) => s.startNewCareer);

  const [city, setCity] = useState('Sandlot');
  const [clubName, setClubName] = useState('Comets');
  const [mascot, setMascot] = useState('Rocket Dog');
  const [monogram, setMonogram] = useState('SC');
  const [managerName, setManagerName] = useState('Coach Skip');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [seedNonce, setSeedNonce] = useState(1994);

  const palette = SAMPLE_TEAM_PALETTES[paletteIndex];
  const previewTraits = createPortraitTraits(seedNonce);

  const handleRandomize = () => {
    const nextSeed = seedNonce + 137;
    const rng = createSeededRng(nextSeed);
    const nextPaletteIdx = (paletteIndex + rng.int(1, SAMPLE_TEAM_PALETTES.length - 1)) % SAMPLE_TEAM_PALETTES.length;
    const pickedPalette = SAMPLE_TEAM_PALETTES[nextPaletteIdx];
    const nextCity = rng.pick(EXTRA_CITIES);
    const nextName = rng.pick(EXTRA_NAMES);

    setPaletteIndex(nextPaletteIdx);
    setCity(nextCity);
    setClubName(nextName);
    setMascot(pickedPalette.mascot);
    setMonogram(`${nextCity[0]}${nextName[0]}`.toUpperCase());
    setSeedNonce(nextSeed);
    soundEngine.play('ui_pop');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startNewCareer({
      city,
      clubName,
      mascot,
      monogram,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      managerName,
      seed: seedNonce,
    });
    soundEngine.play('organ_charge');
    onCreated();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ComicCard
        title="FOUND YOUR 90s SANDLOT CLUB"
        subtitle="Customize your franchise colors, chibi uniform, and Rookie Sandlot League start"
        headerBg="#1B4332"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5 items-start">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="club-city"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#181B2C] mb-1"
                >
                  Club City
                </label>
                <input
                  id="club-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border-2 border-[#181B2C] bg-white font-bold text-sm text-[#181B2C]"
                />
              </div>

              <div>
                <label
                  htmlFor="club-name"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#181B2C] mb-1"
                >
                  Club Name
                </label>
                <input
                  id="club-name"
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border-2 border-[#181B2C] bg-white font-bold text-sm text-[#181B2C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="club-monogram"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#181B2C] mb-1"
                >
                  Monogram
                </label>
                <input
                  id="club-monogram"
                  type="text"
                  maxLength={2}
                  value={monogram}
                  onChange={(e) => setMonogram(e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] px-3 rounded-xl border-2 border-[#181B2C] bg-white font-display text-sm text-[#181B2C]"
                />
              </div>

              <div>
                <label
                  htmlFor="club-mascot"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#181B2C] mb-1"
                >
                  Mascot
                </label>
                <input
                  id="club-mascot"
                  type="text"
                  value={mascot}
                  onChange={(e) => setMascot(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border-2 border-[#181B2C] bg-white font-bold text-sm text-[#181B2C]"
                />
              </div>

              <div>
                <label
                  htmlFor="manager-name"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#181B2C] mb-1"
                >
                  Manager Name
                </label>
                <input
                  id="manager-name"
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border-2 border-[#181B2C] bg-white font-bold text-sm text-[#181B2C]"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C] mb-1.5">
                Uniform Colors
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEAM_PALETTES.map((item, idx) => (
                  <ComicButton
                    key={item.id}
                    size="sm"
                    variant={paletteIndex === idx ? 'gold' : 'cream'}
                    active={paletteIndex === idx}
                    onClick={() => setPaletteIndex(idx)}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-[#181B2C] inline-block"
                      style={{ backgroundColor: item.primary }}
                    />
                    {item.name}
                  </ComicButton>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <ComicButton
                variant="sky"
                icon={<Dices className="w-4 h-4" />}
                onClick={handleRandomize}
              >
                Randomize Club
              </ComicButton>
              <ComicButton
                type="submit"
                variant="turf"
                icon={<Play className="w-4 h-4" />}
              >
                Start Sandlot Dynasty
              </ComicButton>
            </div>
          </div>

          <div className="p-3 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFFDF7] text-center shadow-[3px_3px_0_#181B2C]">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
              Home Chibi Uniform Preview
            </div>
            <div className="w-40 h-44 mx-auto my-2">
              <MiniPlayerSvg
                traits={previewTraits}
                team={{
                  primary: palette.primary,
                  secondary: palette.secondary,
                  accent: palette.accent,
                  monogram: monogram.slice(0, 2) || 'SC',
                }}
                jerseyNumber={24}
                role="pitcher"
                facing="front"
                clip="idle"
                animate={false}
              />
            </div>
            <div className="font-display text-sm text-[#181B2C]">
              {city || 'Sandlot'} {clubName || 'Comets'}
            </div>
            <div className="text-xs font-bold text-[#4A5068]">Mascot: {mascot || 'Rocket Dog'}</div>
          </div>
        </form>
      </ComicCard>
    </div>
  );
}
