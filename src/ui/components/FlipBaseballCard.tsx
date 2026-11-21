import { useMemo, useState } from 'react';
import { RotateCw, Sparkles, Star } from 'lucide-react';
import { renderPortraitSvgString } from '../../art/portraits/generatePortrait';
import type {
  CardRarity,
  PortraitMood,
  PortraitTeamColors,
  PortraitTraits,
} from '../../art/portraits/types';
import { getStatGrade } from '../design-system/statGrade';
import { StatBadge } from '../design-system/StatBadge';

export interface BaseballCardPlayer {
  id: string;
  name: string;
  nickname: string;
  position: string;
  jerseyNumber: number;
  overall: number;
  rarity: CardRarity;
  level: number;
  popularity: number;
  traits: PortraitTraits;
  specialPowers: readonly string[];
  stats: {
    contact: number;
    power: number;
    speed: number;
    pitching: number;
    fielding: number;
  };
  bio: string;
}

interface FlipBaseballCardProps {
  player: BaseballCardPlayer;
  team: PortraitTeamColors;
  mood?: PortraitMood;
  selected?: boolean;
  onSelect?: () => void;
}

const RARITY_LABELS: Record<CardRarity, string> = {
  rookie: '1994 ROOKIE',
  allstar: 'ALL-STAR CHROME',
  mvp: 'MVP HOLO FOIL',
};

export function FlipBaseballCard({
  player,
  team,
  mood = 'happy',
  selected = false,
  onSelect,
}: FlipBaseballCardProps) {
  const [flipped, setFlipped] = useState(false);

  const portraitSvg = useMemo(
    () => renderPortraitSvgString(player.traits, team, mood),
    [player.traits, team, mood],
  );

  const ovrMeta = getStatGrade(player.overall);
  const frameClass =
    player.rarity === 'mvp'
      ? 'holo-frame'
      : player.rarity === 'allstar'
        ? 'chrome-frame'
        : 'bg-[#FBF4E4]';

  const popularityStars = Math.max(1, Math.min(5, Math.round(player.popularity / 20)));

  return (
    <div className="card-perspective w-full max-w-[260px] mx-auto">
      <div
        className={[
          'card-flipper w-full h-[370px]',
          flipped ? 'is-flipped' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* CARD FRONT */}
        <article
          aria-label={`${player.name} baseball card front`}
          className={[
            'card-face absolute inset-0 rounded-[20px] p-2 border-[3px] border-[#181B2C] shadow-[5px_5px_0_#181B2C] flex flex-col',
            frameClass,
            selected ? 'ring-4 ring-[#00E5FF]' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="flex-1 bg-[#FBF4E4] rounded-[14px] border-2 border-[#181B2C] overflow-hidden flex flex-col">
            {/* Top Team Pennant */}
            <div
              className="px-2.5 py-1.5 border-b-2 border-[#181B2C] flex items-center justify-between"
              style={{ backgroundColor: team.primary }}
            >
              <span className="font-display text-[10px] tracking-wider text-white drop-shadow-[1px_1px_0_#181B2C]">
                {RARITY_LABELS[player.rarity]}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#FBF4E4] text-[#181B2C] border border-[#181B2C] font-mono-tabular text-[11px] font-extrabold">
                #{player.jerseyNumber}
              </span>
            </div>

            {/* Retro 90s Cartoon Portrait */}
            <div className="relative mx-2.5 mt-2.5 rounded-xl border-[2.5px] border-[#181B2C] overflow-hidden aspect-square bg-[#7CE0FF]">
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                dangerouslySetInnerHTML={{ __html: portraitSvg }}
              />
              {/* Position Chip */}
              <span
                className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg border-2 border-[#181B2C] font-display text-[11px] text-white"
                style={{ backgroundColor: team.secondary }}
              >
                {player.position}
              </span>
              {/* OVR Badge */}
              <div
                className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-lg border-2 border-[#181B2C] text-center shadow-[2px_2px_0_#181B2C]"
                style={{ backgroundColor: ovrMeta.bg, color: ovrMeta.text }}
              >
                <div className="text-[8px] font-extrabold leading-none">OVR</div>
                <div className="font-display text-sm leading-none">{player.overall}</div>
              </div>
              {/* Level Pill */}
              <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[10px] font-bold">
                LV.{player.level}
              </span>
            </div>

            {/* Nameplate & Special Powers */}
            <div className="px-2.5 pt-2 pb-2 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-sm leading-tight text-[#181B2C] truncate">
                  {player.name}
                </h3>
                <p className="text-[11px] font-bold text-[#4A5068] truncate">
                  &ldquo;{player.nickname}&rdquo;
                </p>
              </div>

              <div className="flex flex-wrap gap-1 mt-1.5">
                {player.specialPowers.map((power) => (
                  <span
                    key={power}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#FFC300] border border-[#181B2C] text-[10px] font-extrabold text-[#181B2C]"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {power}
                  </span>
                ))}
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="px-2.5 pb-2 flex items-center justify-between gap-1.5">
              {onSelect ? (
                <button
                  type="button"
                  onClick={onSelect}
                  className="flex-1 py-1 px-2 rounded-lg bg-[#2FB356] text-white border-2 border-[#181B2C] font-heading font-bold text-[11px] cursor-pointer hover:brightness-105"
                >
                  {selected ? 'On 3D Field ✓' : 'Send to 3D'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setFlipped(true)}
                aria-label={`Flip ${player.name} card to stats`}
                className="py-1 px-2 rounded-lg bg-[#F1E4C8] text-[#181B2C] border-2 border-[#181B2C] font-heading font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8A3]"
              >
                <RotateCw className="w-3 h-3" />
                Stats
              </button>
            </div>
          </div>
        </article>

        {/* CARD BACK */}
        <article
          aria-label={`${player.name} baseball card back`}
          className="card-face card-face-back absolute inset-0 rounded-[20px] p-2 bg-[#F1E4C8] border-[3px] border-[#181B2C] shadow-[5px_5px_0_#181B2C] flex flex-col"
        >
          <div className="flex-1 bg-[#FBF4E4] rounded-[14px] border-2 border-[#181B2C] p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-[#181B2C] pb-1.5">
                <div>
                  <div className="font-display text-xs text-[#181B2C]">{player.name}</div>
                  <div className="text-[10px] font-bold text-[#4A5068]">
                    {player.position} • #{player.jerseyNumber} • LV.{player.level}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-[#FFC300]" aria-label="Fan Popularity">
                  {Array.from({ length: popularityStars }, (_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#FFC300] stroke-[#181B2C]" />
                  ))}
                </div>
              </div>

              <div className="mt-2.5 space-y-2">
                <StatBadge label="Contact" value={player.stats.contact} showBar />
                <StatBadge label="Power" value={player.stats.power} showBar />
                <StatBadge label="Pitching" value={player.stats.pitching} showBar />
                <StatBadge label="Speed" value={player.stats.speed} showBar />
                <StatBadge label="Fielding" value={player.stats.fielding} showBar />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] leading-snug font-bold text-[#4A5068] bg-[#F1E4C8] p-2 rounded-lg border border-[#181B2C]/30">
                {player.bio}
              </p>

              <button
                type="button"
                onClick={() => setFlipped(false)}
                aria-label={`Flip ${player.name} card to portrait`}
                className="w-full py-1.5 rounded-lg bg-[#1B4332] text-[#FFD166] border-2 border-[#181B2C] font-heading font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Back to Portrait
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
