import { useState } from 'react';
import { Dices, Play, Sparkles } from 'lucide-react';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import { ILLUSTRATED_PLAYER_POOL } from '../../art/portraits/illustratedPlayerPool';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { soundEngine } from '../../audio/soundEngine';
import {
  STARTING_ROSTER_PRESETS,
  type StartingRosterPreset,
} from '../../engine/gm/rosterPresets';
import { createSeededRng } from '../../engine/rng/seededRng';
import { newCareerSeed, useGameStore } from '../../store/gameStore';
import { ClubMascotBuddy } from '../components/ClubMascotBuddy';
import { PaintedUniformPreview } from '../components/PaintedUniformPreview';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface ClubCreatorScreenProps {
  onCreated: () => void;
}

const EXTRA_CITIES = ['Cedar', 'Harbor', 'Meteor', 'Oakwood', 'Rocket', 'Clover'] as const;
const EXTRA_NAMES = ['Sox', 'Foxes', 'Badgers', 'Hounds', 'Meteors', 'Bears'] as const;

const QUICK_STARTER_CLUBS = [
  {
    id: 'comets',
    emoji: '🚀',
    label: 'Sandlot Comets',
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    paletteIndex: 0,
  },
  {
    id: 'otters',
    emoji: '🦦',
    label: 'Harbor Otters',
    city: 'Harbor',
    clubName: 'Otters',
    mascot: 'Splash Otter',
    monogram: 'HO',
    paletteIndex: 1,
  },
  {
    id: 'foxes',
    emoji: '🦊',
    label: 'Clover Foxes',
    city: 'Clover',
    clubName: 'Foxes',
    mascot: 'Lucky Fox',
    monogram: 'CF',
    paletteIndex: 2,
  },
  {
    id: 'bears',
    emoji: '🐻',
    label: 'Meteor Bears',
    city: 'Meteor',
    clubName: 'Bears',
    mascot: 'Astro Bear',
    monogram: 'MB',
    paletteIndex: 3,
  },
] as const;

const MASCOT_ANIMAL_OPTIONS = [
  { id: 'dog', emoji: '🐶', label: 'Dog', mascotName: 'Rocket Dog' },
  { id: 'otter', emoji: '🦦', label: 'Otter', mascotName: 'Splash Otter' },
  { id: 'fox', emoji: '🦊', label: 'Fox', mascotName: 'Lucky Fox' },
  { id: 'bear', emoji: '🐻', label: 'Bear', mascotName: 'Astro Bear' },
  { id: 'buddy', emoji: '⚾', label: 'Buddy', mascotName: 'Slugger Buddy' },
] as const;

export function ClubCreatorScreen({ onCreated }: ClubCreatorScreenProps) {
  const startNewCareer = useGameStore((s) => s.startNewCareer);

  const [city, setCity] = useState('Sandlot');
  const [clubName, setClubName] = useState('Comets');
  const [tipCount, setTipCount] = useState(0);
  const [mascot, setMascot] = useState('Rocket Dog');
  const [monogram, setMonogram] = useState('SC');
  const [managerName, setManagerName] = useState('Coach Skip');
  const [startingPreset, setStartingPreset] = useState<StartingRosterPreset>('balanced');
  const [enableInjuries, setEnableInjuries] = useState(true);
  const [enableIllnesses, setEnableIllnesses] = useState(true);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [seedNonce, setSeedNonce] = useState(newCareerSeed);

  const palette = SAMPLE_TEAM_PALETTES[paletteIndex];
  const previewTraits = createPortraitTraits(seedNonce);
  const featuredMangaCards = [0, 1, 2].map(
    (offset) =>
      ILLUSTRATED_PLAYER_POOL[(paletteIndex * 3 + offset) % ILLUSTRATED_PLAYER_POOL.length],
  );

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
      startingPreset,
      enableInjuries,
      enableIllnesses,
      seed: seedNonce,
    });
    soundEngine.play('organ_charge');
    onCreated();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ComicCard
        title="⚾ FOUND YOUR 90s SANDLOT CLUB — PICK YOUR TEAM!"
        subtitle="Jump onto the 3D Sandlot diamond in 5 seconds • Collect 90s manga cards & chase the Mini Majors!"
        headerBg="#1B4332"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Above-the-Fold 5-Second Toy Box Hero (Quick Club + Cute Mascot + Fanned Manga Cards + BIG PLAY BUTTON!) */}
          <div className="p-3.5 rounded-2xl border-[3px] border-[#181B2C] bg-gradient-to-br from-[#FFF8E7] via-[#FFFDF7] to-[#E0FBFC] shadow-[4px_4px_0_#181B2C] grid grid-cols-1 md:grid-cols-[1fr_270px] gap-4 items-center">
            <div className="space-y-3">
              <div data-testid="quick-club-presets" className="space-y-1.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C]">
                  ⚡ Step 1: Pick a Cute Starter Club
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_STARTER_CLUBS.map((preset) => {
                    const isActive = city === preset.city && clubName === preset.clubName;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setCity(preset.city);
                          setClubName(preset.clubName);
                          setMascot(preset.mascot);
                          setMonogram(preset.monogram);
                          setPaletteIndex(preset.paletteIndex % SAMPLE_TEAM_PALETTES.length);
                          soundEngine.play('ui_pop');
                        }}
                        className={`p-2 rounded-xl border-2 border-[#181B2C] text-left min-h-[52px] cursor-pointer transition ${
                          isActive
                            ? 'bg-[#FFC300] shadow-[3px_3px_0_#181B2C]'
                            : 'bg-[#FFFDF7] hover:bg-[#FFF3BF]'
                        }`}
                      >
                        <div className="font-display text-xs text-[#181B2C]">
                          {preset.emoji} {preset.label}
                        </div>
                        <div className="text-[10px] font-bold text-[#4A5068] truncate">
                          {preset.mascot}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div data-testid="mascot-animal-picker" className="space-y-1.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C]">
                  🐾 Step 2: Pick Your Team Mascot Buddy
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MASCOT_ANIMAL_OPTIONS.map((opt) => {
                    const selected = mascot.toLowerCase().includes(opt.id) || mascot === opt.mascotName;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setMascot(opt.mascotName);
                          setTipCount(n => n + 1);
                          soundEngine.play('ui_pop');
                        }}
                        className={`px-2.5 py-1.5 min-h-[44px] rounded-xl border-2 border-[#181B2C] text-xs font-extrabold cursor-pointer transition ${
                          selected
                            ? 'bg-[#FF4D6D] text-white shadow-[2px_2px_0_#181B2C]'
                            : 'bg-[#FFFDF7] text-[#181B2C] hover:bg-[#FFF3BF]'
                        }`}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <ComicButton
                  type="submit"
                  size="lg"
                  variant="turf"
                  icon={<Play className="w-4 h-4" />}
                  className="flex-1 sm:flex-none"
                >
                  Play Opening Day
                </ComicButton>
                <ComicButton
                  variant="sky"
                  size="md"
                  icon={<Dices className="w-4 h-4" />}
                  onClick={handleRandomize}
                >
                  Randomize Club
                </ComicButton>
              </div>
            </div>

            {/* Live Bouncing Mascot + Fanned 3 Real Manga Player Cards Showcase (Top-of-screen on Mobile, Right column on Desktop!) */}
            <div className="order-first md:order-last p-2.5 sm:p-3 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFFDF7] text-center shadow-[3px_3px_0_#181B2C] flex items-center justify-between gap-2 md:block md:space-y-2.5">
              <div className="flex items-center justify-start md:justify-center gap-2 min-w-0">
                <button type="button" aria-label={'Tip the cap of ' + mascot} onClick={() => setTipCount(n => n + 1)}>
                <ClubMascotBuddy key={tipCount} tipCap={tipCount > 0}
                  mascot={mascot || 'Rocket Dog'}
                  primaryColor={palette.primary}
                  secondaryColor={palette.secondary}
                  accentColor={palette.accent}
                  mood="cheering"
                  size="sm"
                />
                </button>
                <div className="text-left min-w-0">
                  <div className="font-display text-xs sm:text-sm text-[#181B2C] leading-tight truncate">
                    {city || 'Sandlot'} {clubName || 'Comets'}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#4A5068] truncate">
                    {mascot || 'Rocket Dog'}
                  </div>
                  <div className="flex md:hidden items-center gap-1 mt-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-[#181B2C]"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-[#181B2C]"
                      style={{ backgroundColor: palette.secondary }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-[#181B2C]"
                      style={{ backgroundColor: palette.accent }}
                    />
                  </div>
                </div>
              </div>

              <div
                data-testid="creator-manga-fan"
                className="flex items-end justify-center pt-1 pb-0.5 px-1 shrink-0"
              >
                {featuredMangaCards.map((card, idx) => {
                  const tiltClass =
                    idx === 0
                      ? '-rotate-6 -mr-3 z-0'
                      : idx === 1
                        ? 'z-10 -translate-y-1 scale-105'
                        : 'rotate-6 -ml-3 z-0';
                  return (
                    <div
                      key={card.id}
                      className={`w-[56px] md:w-[80px] rounded-lg border-2 border-[#181B2C] bg-[#FFF8E7] p-0.5 shadow-[2px_3px_0_#181B2C] transition-transform ${tiltClass}`}
                    >
                      <img
                        src={card.illustration}
                        alt={`${card.name} manga baseball card`}
                        width={80}
                        height={100}
                        className="w-full aspect-[4/5] object-cover rounded-[4px] border border-[#181B2C]/30"
                      />
                      <div className="hidden md:flex items-center justify-between px-1 py-0.5 text-[9px] font-extrabold text-[#181B2C]">
                        <span className="truncate">{card.name.split(' ')[0]}</span>
                        <span className="font-mono-tabular text-[#9D0208]">{card.position}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:flex items-center justify-center gap-2 text-[10px] font-extrabold text-[#1B4332]">
                <span>🃏 3,000+ Manga Cards</span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full border border-[#181B2C]"
                    style={{ backgroundColor: palette.primary }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-[#181B2C]"
                    style={{ backgroundColor: palette.secondary }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-[#181B2C]"
                    style={{ backgroundColor: palette.accent }}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* 2. Optional Customization & Strategy Details (Already Ready Above — Tweak Anytime!) */}
          <div className="p-3.5 rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-dashed border-[#181B2C]/25 pb-2">
              <span className="font-display text-xs uppercase text-[#1D3557] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F77F00]" />
                Optional: Customize Club Name, Uniform, Starting Roster &amp; Rules
              </span>
              <span className="text-[10px] font-bold text-[#4A5068]">
                Defaults are already ready to play above!
              </span>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 items-center">
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
              <div className="w-28 h-32 mx-auto rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] p-1">
                <PaintedUniformPreview
                  traits={previewTraits}
                  team={{
                    primary: palette.primary,
                    secondary: palette.secondary,
                    accent: palette.accent,
                    monogram: monogram.slice(0, 2) || 'SC',
                  }}
                  jerseyNumber={24}
                  role="pitcher"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C]">
                  Starting Roster Build (Fair Rookie Sandlot Parity)
                </span>
                <span className="text-[10px] font-extrabold text-[#1B4332]">
                  Climb Rookie → Mini Majors World Champs!
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {STARTING_ROSTER_PRESETS.map((preset) => {
                  const active = startingPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setStartingPreset(preset.id);
                        soundEngine.play('ui_pop');
                      }}
                      className={`p-2 rounded-xl border-2 border-[#181B2C] text-left min-h-[68px] transition cursor-pointer ${
                        active
                          ? 'bg-[#FFF3BF] shadow-[3px_3px_0_#181B2C]'
                          : 'bg-[#FFFDF7]'
                      }`}
                    >
                      <div className="font-display text-xs text-[#181B2C]">{preset.label}</div>
                      <div className="text-[10px] font-extrabold text-[#1B4332] mt-0.5">
                        + {preset.pros}
                      </div>
                      <div className="text-[10px] font-bold text-[#9D0208]">
                        − {preset.cons}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C]">
                Career Realism Toggles (Low-Frequency, Fun-First)
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 min-h-[44px] px-2.5 rounded-lg border-2 border-[#181B2C] bg-[#FFFDF7] text-xs font-extrabold text-[#181B2C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableInjuries}
                    onChange={(e) => setEnableInjuries(e.target.checked)}
                    className="w-4 h-4 accent-[#1B4332]"
                  />
                  Athletic Injuries ({enableInjuries ? 'ON' : 'OFF'})
                </label>
                <label className="inline-flex items-center gap-2 min-h-[44px] px-2.5 rounded-lg border-2 border-[#181B2C] bg-[#FFFDF7] text-xs font-extrabold text-[#181B2C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableIllnesses}
                    onChange={(e) => setEnableIllnesses(e.target.checked)}
                    className="w-4 h-4 accent-[#1B4332]"
                  />
                  Illnesses ({enableIllnesses ? 'ON' : 'OFF'})
                </label>
              </div>
            </div>
          </div>
        </form>
      </ComicCard>
    </div>
  );
}
