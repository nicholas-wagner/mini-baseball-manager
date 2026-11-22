import './designLab.css';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  Camera,
  Dices,
  Flame,
  Globe2,
  Music,
  Palette,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { FlagBadge } from '../../art/flags/FlagBadge';
import { resolveAthleteAppearance } from '../../art/portraits/athleteAppearance';
import {
  generateRandomCardPlayer,
  INITIAL_SHOWCASE_ROSTER,
} from '../../art/portraits/sampleRoster';
import type { PortraitMood } from '../../art/portraits/types';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { soundEngine, type SoundCue } from '../../audio/soundEngine';
import { evaluatePlatoonMatchup } from '../../engine/handedness/handedness';
import type { BatsHand } from '../../engine/handedness/types';
import { NATIONALITIES_CATALOG } from '../../engine/nationalities/nationalitiesCatalog';
import { getNationalityById } from '../../engine/nationalities/pickNationality';
import type { NationalityId } from '../../engine/nationalities/types';
import { CAMERA_PRESET_LABELS, type CameraPresetId } from '../../scene/camera/cameraRig';
import type { CharacterAnimClip } from '../../scene/characters/animationState';
import type { BallVfxStyle } from '../../scene/vfx/ballTrajectory';
import { BallparkCanvas, type ShowcaseTrigger } from '../components/BallparkCanvas';
import { FlipBaseballCard, type BaseballCardPlayer } from '../components/FlipBaseballCard';
import { MiniPlayerSvg } from '../components/MiniPlayerSvg';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { ScoreboardStrip } from '../design-system/ScoreboardStrip';

interface ActionPreset {
  id: string;
  label: string;
  variant: 'turf' | 'coral' | 'gold' | 'sky' | 'cream' | 'violet' | 'scoreboard';
  pitcherClip: CharacterAnimClip;
  batterClip: CharacterAnimClip;
  fielderClip: CharacterAnimClip;
  ballStyle: BallVfxStyle | null;
  sound: SoundCue;
  recommendedCamera?: CameraPresetId;
  callout?: { text: string; color: string; y?: number; z?: number };
}

const COMET_PITCH: ActionPreset = {
  id: 'blazing_comet',
  label: 'Blazing Comet',
  variant: 'coral',
  pitcherClip: 'pitch_super',
  batterClip: 'bat_swing',
  fielderClip: 'field_ready',
  ballStyle: 'blazing_comet',
  sound: 'comet_pitch',
  recommendedCamera: 'over_shoulder_pitcher',
};

const ANIMATION_ACTIONS: readonly ActionPreset[] = [
  {
    id: 'idle',
    label: 'Idle Bounce',
    variant: 'cream',
    pitcherClip: 'idle',
    batterClip: 'bat_stance',
    fielderClip: 'field_ready',
    ballStyle: null,
    sound: 'ui_pop',
  },
  COMET_PITCH,
  {
    id: 'ghost_knuckle',
    label: 'Ghost Knuckle',
    variant: 'violet',
    pitcherClip: 'pitch_super',
    batterClip: 'bat_stance',
    fielderClip: 'field_ready',
    ballStyle: 'ghost_knuckle',
    sound: 'knuckle_warble',
    recommendedCamera: 'over_shoulder_pitcher',
  },
  {
    id: 'tornado_slider',
    label: 'Tornado Slider',
    variant: 'sky',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_swing',
    fielderClip: 'field_ready',
    ballStyle: 'tornado_slider',
    sound: 'pitch_whoosh',
  },
  {
    id: 'moonshot_hr',
    label: 'Bomb-Swing HR',
    variant: 'gold',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_bomb',
    fielderClip: 'field_run',
    ballStyle: 'moonshot_hr',
    sound: 'bomb_crack',
    recommendedCamera: 'over_shoulder_batter',
  },
  {
    id: 'ninja_bunt',
    label: 'Ninja Bunt',
    variant: 'sky',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_bunt',
    fielderClip: 'field_run',
    ballStyle: 'ninja_bunt',
    sound: 'bunt_tap',
    recommendedCamera: 'over_shoulder_batter',
  },
  {
    id: 'sky_leap',
    label: 'Sky-High Leap',
    variant: 'turf',
    pitcherClip: 'idle',
    batterClip: 'bat_swing',
    fielderClip: 'field_high_jump',
    ballStyle: 'line_drive',
    sound: 'spring_boing',
    recommendedCamera: 'broadcast_diamond',
  },
  {
    id: 'dive_catch',
    label: 'Diving Catch',
    variant: 'turf',
    pitcherClip: 'idle',
    batterClip: 'bat_swing',
    fielderClip: 'field_dive',
    ballStyle: 'line_drive',
    sound: 'glove_pop',
    recommendedCamera: 'broadcast_diamond',
  },
  {
    id: 'practice_cage',
    label: 'Practice: Cage',
    variant: 'scoreboard',
    pitcherClip: 'practice_bullpen',
    batterClip: 'practice_cage',
    fielderClip: 'field_run',
    ballStyle: null,
    sound: 'bat_crack',
    recommendedCamera: 'practice_diorama',
    callout: { text: '+35 BAT XP!', color: '#2FB356', y: 2.3, z: -0.4 },
  },
  {
    id: 'practice_bullpen',
    label: 'Practice: Bullpen',
    variant: 'scoreboard',
    pitcherClip: 'practice_bullpen',
    batterClip: 'bat_stance',
    fielderClip: 'field_ready',
    ballStyle: 'fastball',
    sound: 'glove_pop',
    recommendedCamera: 'showcase_closeup',
  },
  {
    id: 'celebrate_hr',
    label: 'HR Celebration',
    variant: 'gold',
    pitcherClip: 'celebrate_hr',
    batterClip: 'celebrate_hr',
    fielderClip: 'celebrate_hr',
    ballStyle: null,
    sound: 'organ_homerun',
    callout: { text: 'VICTORY!', color: '#FFC300', y: 2.8, z: -10.2 },
  },
];

const MOOD_OPTIONS: readonly { id: PortraitMood; label: string }[] = [
  { id: 'happy', label: 'Happy' },
  { id: 'determined', label: 'Focused' },
  { id: 'fired_up', label: 'Fired Up' },
  { id: 'sweating', label: 'Practice Sweat' },
  { id: 'shocked', label: 'Shocked' },
  { id: 'rival_glare', label: 'Rival Glare' },
];

const SOUNDBOARD_CUES: readonly { cue: SoundCue; label: string }[] = [
  { cue: 'organ_charge', label: 'Organ: Charge!' },
  { cue: 'organ_homerun', label: 'Organ: Home Run!' },
  { cue: 'bat_crack', label: 'Bat Crack' },
  { cue: 'bomb_crack', label: 'Bomb Blast' },
  { cue: 'comet_pitch', label: 'Comet Pitch' },
  { cue: 'knuckle_warble', label: 'Ghost Knuckle' },
  { cue: 'spring_boing', label: 'High-Jump Boing' },
  { cue: 'crowd_cheer', label: 'Crowd Roar' },
  { cue: 'level_up', label: 'RPG Level Up' },
  { cue: 'cash_chime', label: 'Sim-City Cash' },
];

export function DesignLabScreen() {
  const cardCollection = useRef<HTMLDivElement>(null);
  const [teamIdx, setTeamIdx] = useState(0);
  const [roster, setRoster] = useState<BaseballCardPlayer[]>([...INITIAL_SHOWCASE_ROSTER]);
  const [selectedHeroId, setSelectedHeroId] = useState<string>(INITIAL_SHOWCASE_ROSTER[0].id);
  const [mood, setMood] = useState<PortraitMood>('happy');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('over_shoulder_pitcher');
  const [activeActionId, setActiveActionId] = useState<string>('idle');
  const [pitcherClip, setPitcherClip] = useState<CharacterAnimClip>('idle');
  const [batterClip, setBatterClip] = useState<CharacterAnimClip>('bat_stance');
  const [fielderClip, setFielderClip] = useState<CharacterAnimClip>('field_ready');
  const [trigger, setTrigger] = useState<ShowcaseTrigger | null>(null);
  const [turntableNudge, setTurntableNudge] = useState(0);
  const [rollSeed, setRollSeed] = useState(9601);
  const [opposingBatterBats, setOpposingBatterBats] = useState<BatsHand>('R');

  const activeTeam = SAMPLE_TEAM_PALETTES[teamIdx];
  const heroPlayer = roster.find((p) => p.id === selectedHeroId) ?? roster[0];
  const pitchingMotion = resolveAthleteAppearance(heroPlayer.traits).pitchingMotion;
  const pitcherLabel = { overhand: 'Pitcher', sidearm: 'Sidearm', underhand: 'Underhand' }[pitchingMotion];
  const heroNation = getNationalityById(heroPlayer.nationalityId);
  const heroHeritage = heroNation.heritageAbility;
  const platoon = evaluatePlatoonMatchup(opposingBatterBats, heroPlayer.throws);
  const heroInspectorBatSide = heroPlayer.bats === 'S' ? 'L' : heroPlayer.bats;

  const handleTriggerHeritagePower = () => {
    setActiveActionId('heritage_power');
    setPitcherClip(heroHeritage.category === 'pitching' ? 'pitch_super' : 'celebrate_hr');
    setBatterClip(heroHeritage.category === 'batting' ? 'bat_bomb' : 'bat_swing');
    setFielderClip(
      heroHeritage.category === 'fielding' ? 'field_high_jump' : 'field_run',
    );
    const playAccent = () => soundEngine.play(
      heroHeritage.category === 'luck'
        ? 'cash_chime'
        : heroHeritage.category === 'fielding'
          ? 'spring_boing'
          : heroHeritage.category === 'batting'
            ? 'bomb_crack'
            : 'comet_pitch',
    );
    setTrigger({
      onAccent: playAccent,
      ballStyle: heroHeritage.ballStyle,
      callout: {
        text: heroHeritage.calloutText,
        color: heroHeritage.vfxColor,
        y: 2.75,
        z: -8.5,
      },
    });
  };

  const handleAction = (preset: ActionPreset, keepCamera = false) => {
    setActiveActionId(preset.id);
    setPitcherClip(preset.pitcherClip);
    setBatterClip(preset.batterClip);
    setFielderClip(preset.fielderClip);
    if (preset.recommendedCamera && !keepCamera) {
      setCameraPreset(preset.recommendedCamera);
    }
    const playAccent = () => soundEngine.play(preset.sound);
    if (!preset.ballStyle) playAccent();
    setTrigger({
      ballStyle: preset.ballStyle,
      callout: preset.callout,
      onAccent: preset.ballStyle ? playAccent : undefined,
    });
  };

  const activePreset = ANIMATION_ACTIONS.find(action => action.id === activeActionId);
  const heritageSelected = activeActionId === 'heritage_power';
  const replayLabel = heritageSelected ? heroHeritage.name : activePreset?.label;
  const canReplay = activeActionId !== 'idle';
  const throwOrReplay = () => {
    if (heritageSelected) handleTriggerHeritagePower();
    else handleAction(canReplay && activePreset ? activePreset : COMET_PITCH, true);
  };

  const handleRollNewPlayer = (forcedNationalityId?: NationalityId) => {
    soundEngine.play('level_up');
    const nextSeed = rollSeed + 37;
    setRollSeed(nextSeed);
    const rookie = generateRandomCardPlayer(nextSeed, forcedNationalityId);
    setRoster([rookie, ...INITIAL_SHOWCASE_ROSTER]);
    setSelectedHeroId(rookie.id);
  };

  // Reset after the new first card mounts so native scroll snapping targets the rookie.
  useLayoutEffect(() => {
    if (cardCollection.current) cardCollection.current.scrollLeft = 0;
  }, [roster]);

  return (
    <div className="space-y-5">
      {/* Live Retro Scoreboard Header */}
      <ScoreboardStrip
        awayAbbr={SAMPLE_TEAM_PALETTES[1].monogram}
        awayScore={3}
        awayColor={SAMPLE_TEAM_PALETTES[1].primary}
        homeAbbr={activeTeam.monogram}
        homeScore={4}
        homeColor={activeTeam.primary}
        inning={9}
        half="BOT"
        balls={3}
        strikes={2}
        outs={2}
        rivalryLabel="CROSSTOWN RIVALRY"
      />

      {/* Top Hero Section: Over-the-Shoulder 3D Mini Ballpark */}
      <ComicCard
        title="Sandlot Park"
        subtitle={`${heroPlayer.name} #${heroPlayer.jerseyNumber} · ${heroPlayer.throws}HP vs ${platoon.effectiveBatSide}HB`}
        headerBg={activeTeam.secondary}
        badge={
          <ComicButton
            size="sm"
            variant="gold"
            aria-label={canReplay ? `Replay ${replayLabel}` : 'Throw pitch'}
            icon={canReplay ? <RotateCcw size={15} /> : <Play size={15} />}
            onClick={throwOrReplay}
          >
            {canReplay ? 'Replay' : 'Throw pitch'}
          </ComicButton>
        }
      >
        <div className="space-y-4">
          <BallparkCanvas
            heroTraits={heroPlayer.traits}
            heroTeam={activeTeam}
            heroJersey={heroPlayer.jerseyNumber}
            heroThrows={heroPlayer.throws}
            batterSide={platoon.effectiveBatSide}
            cameraPreset={cameraPreset}
            pitcherClip={pitcherClip}
            batterClip={batterClip}
            fielderClip={fielderClip}
            moodOverride={mood === 'happy' ? undefined : mood}
            trigger={trigger}
            turntableNudge={turntableNudge}
          />

          {/* Live Platoon Matchup & Batter Handedness Switcher */}
          <div className="bg-[#F1E4C8] border-2 border-[#181B2C] rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-full sm:w-auto font-heading font-bold text-xs uppercase tracking-wider text-[#181B2C]">
                Opposing batter
              </span>
              {(['R', 'L', 'S'] as const).map((hand) => (
                <ComicButton
                  key={hand}
                  size="sm"
                  variant={opposingBatterBats === hand ? 'sky' : 'cream'}
                  active={opposingBatterBats === hand}
                  onClick={() => {
                    soundEngine.play('ui_pop');
                    setOpposingBatterBats(hand);
                  }}
                >
                  {hand === 'R' ? 'Righty (R)' : hand === 'L' ? 'Lefty (L)' : 'Switch (S)'}
                </ComicButton>
              ))}
            </div>
            <span
              className={[
                'px-2.5 py-1 rounded-lg border-2 border-[#181B2C] font-heading font-bold text-xs',
                platoon.advantage === 'pitcher'
                  ? 'bg-[#2FB356] text-white'
                  : 'bg-[#FF4D6D] text-white',
              ].join(' ')}
            >
              ⚡ {platoon.label}
            </span>
          </div>

          {/* Camera Angle Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 font-heading font-bold text-xs uppercase tracking-wider text-[#4A5068]">
                <Camera className="w-4 h-4 text-[#1B4332]" />
                3D Camera Angles
              </span>
              {cameraPreset === 'showcase_closeup' ? (
                <div className="flex items-center gap-1.5">
                  <ComicButton
                    size="sm"
                    variant="cream"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => setTurntableNudge((n) => n - 0.8)}
                  >
                    Spin Left
                  </ComicButton>
                  <ComicButton
                    size="sm"
                    variant="cream"
                    icon={<RotateCw className="w-3.5 h-3.5" />}
                    onClick={() => setTurntableNudge((n) => n + 0.8)}
                  >
                    Spin Right
                  </ComicButton>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(CAMERA_PRESET_LABELS) as CameraPresetId[]).map((presetId) => (
                <ComicButton
                  key={presetId}
                  size="sm"
                  variant={cameraPreset === presetId ? 'gold' : 'cream'}
                  active={cameraPreset === presetId}
                  onClick={() => {
                    soundEngine.play('ui_pop');
                    setCameraPreset(presetId);
                  }}
                >
                  {CAMERA_PRESET_LABELS[presetId]}
                </ComicButton>
              ))}
            </div>
          </div>

          {/* Animations & Special Powers Trigger Deck */}
          <div className="space-y-2 pt-2 border-t-2 border-dashed border-[#181B2C]/20">
            <div className="inline-flex items-center gap-1.5 font-heading font-bold text-xs uppercase tracking-wider text-[#4A5068]">
              <Zap className="w-4 h-4 text-[#FF4D6D]" />
              Trigger Animations, Practice Drills &amp; Special Powers
            </div>
            <div className="flex flex-wrap gap-2">
              <ComicButton
                size="sm"
                variant="violet"
                active={activeActionId === 'heritage_power'}
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleTriggerHeritagePower}
              >
                ★ {heroHeritage.name} ({heroNation.shortCode})
              </ComicButton>
              {ANIMATION_ACTIONS.map((action) => (
                <ComicButton
                  key={action.id}
                  size="sm"
                  variant={action.variant}
                  active={activeActionId === action.id}
                  onClick={() => handleAction(action)}
                >
                  {action.label}
                </ComicButton>
              ))}
            </div>
          </div>
        </div>
      </ComicCard>

      {/* Live Articulated Vector SVG Mini-Player Showcase */}
      <ComicCard
        title="Chibi Rig Inspector"
        subtitle={`${heroPlayer.name} · ${activeTeam.city} ${activeTeam.name}`}
        headerBg={activeTeam.secondary}
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="rig-study">
            <span className="rig-caption">
              {pitcherLabel} · Front
            </span>
            <MiniPlayerSvg
              traits={heroPlayer.traits}
              team={activeTeam}
              jerseyNumber={heroPlayer.jerseyNumber}
              role="pitcher"
              facing="front"
              throwsHand={heroPlayer.throws}
              clip={pitcherClip}
              moodOverride={mood === 'happy' ? undefined : mood}
              className="rig-figure"
            />
          </div>

          <div className="rig-study">
            <span className="rig-caption">
              {pitcherLabel} · Back
            </span>
            <MiniPlayerSvg
              traits={heroPlayer.traits}
              team={activeTeam}
              jerseyNumber={heroPlayer.jerseyNumber}
              role="pitcher"
              facing="back"
              throwsHand={heroPlayer.throws}
              clip={pitcherClip}
              moodOverride={mood === 'happy' ? undefined : mood}
              className="rig-figure"
            />
          </div>

          <div className="rig-study">
            <span className="rig-caption">
              Batter · {heroPlayer.bats === 'S' ? 'Switch' : `${heroPlayer.bats}HB`}
            </span>
            <MiniPlayerSvg
              traits={heroPlayer.traits}
              team={activeTeam}
              jerseyNumber={heroPlayer.jerseyNumber}
              role="batter"
              facing="front"
              batSide={heroInspectorBatSide}
              clip={batterClip}
              moodOverride={mood === 'happy' ? undefined : mood}
              className="rig-figure"
            />
          </div>

          <div className="rig-study">
            <span className="rig-caption">
              Fielder · {heroPlayer.throws}H
            </span>
            <MiniPlayerSvg
              traits={heroPlayer.traits}
              team={activeTeam}
              jerseyNumber={heroPlayer.jerseyNumber}
              role="fielder"
              facing="front"
              throwsHand={heroPlayer.throws}
              clip={fielderClip}
              moodOverride={mood === 'happy' ? undefined : mood}
              className="rig-figure"
            />
          </div>
          {(['front', 'back'] as const).map(facing => (
            <div className="rig-study" key={facing}>
              <span className="rig-caption">Catcher · {facing === 'front' ? 'Front' : 'Back'}</span>
              <MiniPlayerSvg traits={heroPlayer.traits} team={activeTeam} jerseyNumber={heroPlayer.jerseyNumber}
                role="catcher" facing={facing} throwsHand={heroPlayer.throws} clip="field_ready" className="rig-figure" />
            </div>
          ))}
        </div>
      </ComicCard>

      {/* Retro 90s Baseball Cards & Portrait Studio */}
      <ComicCard
        title="Baseball Card Studio"
        subtitle="Flip a card for stats or send a player to the mound."
        headerBg="#1B4332"
        halftone
        badge={
          <ComicButton
            size="sm"
            variant="gold"
            icon={<Dices className="w-4 h-4" />}
            onClick={() => handleRollNewPlayer()}
          >
            Roll Weighted Player
          </ComicButton>
        }
      >
        <div className="space-y-4">
          {/* 3D Flip Baseball Card Grid */}
          <div
            ref={cardCollection}
            role="region"
            aria-label="Player cards"
            className="card-collection grid sm:grid-cols-2 xl:grid-cols-4 gap-5 pt-1"
          >
            {roster.map((player) => (
              <FlipBaseballCard
                key={player.id}
                player={player}
                team={activeTeam}
                mood={mood}
                selected={player.id === heroPlayer.id}
                onSelect={() => {
                  soundEngine.play('ui_pop');
                  setSelectedHeroId(player.id);
                }}
              />
            ))}
          </div>

          <div className="bg-[#F1E4C8] border-2 border-[#181B2C] rounded-xl p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-heading font-bold text-xs uppercase tracking-wider text-[#181B2C]">
                <Globe2 className="w-4 h-4 text-[#7209B7]" />
                Global Scouting · {NATIONALITIES_CATALOG.length} national teams
              </span>
              <span className="text-[11px] font-extrabold text-[#7209B7]">
                Active: ★ {heroHeritage.name} — {heroHeritage.mythOrAnimal}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NATIONALITIES_CATALOG.map((nat) => (
                <button
                  key={nat.id}
                  type="button"
                  title={`${nat.name} (${nat.weight}%) — ${nat.heritageAbility.name} (${nat.heritageAbility.mythOrAnimal})`}
                  onClick={() => handleRollNewPlayer(nat.id)}
                  className={[
                    'min-h-11 px-2 py-1 rounded-xl border-2 border-[#181B2C] font-heading font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-transform hover:-translate-y-0.5',
                    heroPlayer.nationalityId === nat.id
                      ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]'
                      : 'bg-[#FBF4E4] text-[#181B2C]',
                  ].join(' ')}
                >
                  <FlagBadge nationalityId={nat.id} />
                  <span>{nat.shortCode}</span>
                  <span className="text-[10px] font-mono-tabular text-[#4A5068]">
                    {nat.weight}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Team Palette & Expression Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-[#F1E4C8] border-2 border-[#181B2C] rounded-xl p-3 space-y-2">
              <div className="inline-flex items-center gap-1.5 font-heading font-bold text-xs uppercase tracking-wider text-[#181B2C]">
                <Palette className="w-4 h-4" />
                Club uniform
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_TEAM_PALETTES.map((palette, idx) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => {
                      soundEngine.play('ui_pop');
                      setTeamIdx(idx);
                    }}
                    className={[
                      'min-h-11 px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] font-heading font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-transform',
                      teamIdx === idx
                        ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]'
                        : 'bg-[#FBF4E4] text-[#181B2C]',
                    ].join(' ')}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#181B2C]"
                      style={{ backgroundColor: palette.primary }}
                    />
                    {palette.city} {palette.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F1E4C8] border-2 border-[#181B2C] rounded-xl p-3 space-y-2">
              <div className="inline-flex items-center gap-1.5 font-heading font-bold text-xs uppercase tracking-wider text-[#181B2C]">
                <Flame className="w-4 h-4 text-[#FF4D6D]" />
                Field expression
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map((m) => (
                  <ComicButton
                    key={m.id}
                    size="sm"
                    variant={mood === m.id ? 'coral' : 'cream'}
                    active={mood === m.id}
                    onClick={() => {
                      soundEngine.play('ui_pop');
                      setMood(m.id);
                    }}
                  >
                    {m.label}
                  </ComicButton>
                ))}
              </div>
            </div>
          </div>

        </div>
      </ComicCard>

      {/* Built-in Procedural 90s Synth & Ballpark Organ Soundboard */}
      <ComicCard
        title="Ballpark Soundboard"
        headerBg="#7209B7"
        badge={<Sparkles className="w-5 h-5 text-[#FFC300]" />}
      >
        <div className="flex flex-wrap gap-2">
          {SOUNDBOARD_CUES.map((item) => (
            <ComicButton
              key={item.cue}
              size="sm"
              variant={item.cue.startsWith('organ_') ? 'gold' : 'cream'}
              icon={<Music className="w-3.5 h-3.5" />}
              onClick={() => soundEngine.play(item.cue)}
            >
              {item.label}
            </ComicButton>
          ))}
        </div>
      </ComicCard>
    </div>
  );
}
