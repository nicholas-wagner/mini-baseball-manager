import { SprayChart } from './DugoutScouting';
import type { ContactPoint } from '../../engine/simulation/dugoutCalls';
import { useState } from 'react';
import { RotateCw, Sparkles, Star } from 'lucide-react';
import { EnlargePrint } from './EnlargePrint';
import { FlagBadge } from '../../art/flags/FlagBadge';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import pendingPortrait from '../../art/portraits/illustrations/portrait-pending.svg';
import type {
  CardRarity,
  PortraitMood,
  PortraitTeamColors,
  PortraitTraits,
} from '../../art/portraits/types';
import type { BatsHand, FieldPosition, ThrowsHand } from '../../engine/handedness/types';
import {
  buildFallbackCardStatRows,
  type CardStatRow,
} from '../../engine/models/playerCardStats';
import { getNationalityById } from '../../engine/nationalities/pickNationality';
import type { NationalityId } from '../../engine/nationalities/types';
import type { PlayerBuildTone } from '../../engine/rpg/skillTrees';
import { getStatGrade } from '../design-system/statGrade';
import { StatBadge } from '../design-system/StatBadge';

export interface BaseballCardBuildIdentity {
  label: string;
  shortTag: string;
  tone: PlayerBuildTone;
  spentSp: number;
  maxSp: number;
}

export interface BaseballCardPlayer {
  id: string;
  name: string;
  nickname: string;
  position: FieldPosition;
  bats: BatsHand;
  throws: ThrowsHand;
  jerseyNumber: number;
  nationalityId: NationalityId;
  hometown: string;
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
  /** Role-specific rating rows (Pitchers: Velocity/Movement/Control/Stamina/Clutch; Hitters: Contact/Power/Speed/Fielding/Arm). */
  cardStatRows?: readonly CardStatRow[];
  /** Role-specific derived sabermetric stat line (Pitchers: ERA/WHIP/K9/Strk%; Hitters: AVG/OBP/OPS/FPCT). */
  statLine?: string;
  bio: string;
  habit?: string;
  contactPoints?: readonly ContactPoint[];
  buildIdentity?: BaseballCardBuildIdentity;
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
  selected = false,
  onSelect,
}: FlipBaseballCardProps) {
  const [flipped, setFlipped] = useState(false);

  const [failedIllustration, setFailedIllustration] = useState<string>();
  const print = playerIllustration(player.id);
  const illustration = print !== failedIllustration ? print : undefined;

  const nationality = getNationalityById(player.nationalityId);
  const heritage = nationality.heritageAbility;
  const ovrMeta = getStatGrade(player.overall);
  const frameClass =
    player.rarity === 'mvp'
      ? 'holo-frame'
      : player.rarity === 'allstar'
        ? 'chrome-frame'
        : 'bg-[#FBF4E4]';

  const popularityStars = Math.max(1, Math.min(5, Math.round(player.popularity / 20)));
  const statRows = player.cardStatRows ?? buildFallbackCardStatRows(player.position, player.stats);

  return (
    <div className="card-perspective w-full max-w-[280px] h-full mx-auto">
      <div
        className={[
          'card-flipper w-full h-full grid motion-reduce:transition-none',
          flipped ? 'is-flipped' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* CARD FRONT */}
        <article
          inert={flipped}
          aria-hidden={flipped}
          aria-label={`${player.name} baseball card front`}
          className={[
            'card-face [grid-area:1/1] min-w-0 rounded-[20px] p-2 border-[3px] border-[#181B2C] shadow-[5px_5px_0_#181B2C] flex flex-col',
            frameClass,
            selected ? 'ring-4 ring-[#00E5FF]' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="flex-1 bg-[#FBF4E4] rounded-[14px] border-2 border-[#181B2C] overflow-hidden flex flex-col">
            {/* Top Team Pennant */}
            <div
              className="min-h-9 px-2 py-1.5 border-b-2 border-[#181B2C] flex items-center justify-between gap-1"
              style={{ backgroundColor: team.secondary }}
            >
              <span className="font-display text-[10px] leading-tight tracking-wide text-white">
                <span className="mr-1.5 text-[#FFD166]">{player.position}</span>
                {RARITY_LABELS[player.rarity]}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  title={`Bats ${player.bats} / Throws ${player.throws}`}
                  className="px-1.5 py-0.5 rounded-md bg-[#181B2C] text-[#FFD166] border border-[#181B2C] font-mono-tabular text-[10px] font-extrabold"
                >
                  {player.bats}/{player.throws}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#FBF4E4] text-[#181B2C] border border-[#181B2C] font-mono-tabular text-[11px] font-extrabold">
                  #{player.jerseyNumber}
                </span>
              </div>
            </div>

            {/* Retro 90s Cartoon Portrait */}
            <div className="relative border-b-2 border-[#181B2C] overflow-hidden aspect-[4/5] shrink-0 bg-[#FBF4E4]">
              <img src={illustration ?? pendingPortrait} alt={illustration ? `${player.name} manga illustration` : 'Portrait pending'}
                width={560} height={700} className="block w-full h-full object-cover"
                onError={illustration ? () => setFailedIllustration(illustration) : undefined} />
              {illustration && <EnlargePrint name={player.name} src={illustration} />}
            </div>

            {/* Nameplate, Cultural Heritage Ability & Special Powers */}
            <div className="flex-1 flex flex-col">
              <div className="border-b-2 border-[#181B2C] px-2.5 pt-2 pb-2 text-[#FBF4E4]"
                style={{ background: `linear-gradient(116deg, ${team.secondary} 88%, ${team.primary} 88% 90%, ${team.secondary} 90% 92%, ${team.primary} 92%)` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base leading-tight">{player.name}</h3>
                    <p className="mt-0.5 text-[11px] leading-tight font-bold">
                      &ldquo;{player.nickname}&rdquo; · {player.hometown}
                    </p>
                  </div>
                  <div className="shrink-0 rounded border border-[#181B2C] px-1.5 py-0.5 text-center"
                    style={{ backgroundColor: ovrMeta.bg, color: ovrMeta.text }}>
                    <div className="text-[8px] font-extrabold leading-none">OVR</div>
                    <div className="font-display text-base leading-none">{player.overall}</div>
                  </div>
                </div>
              </div>

              <div
                data-testid="card-meta-strip"
                className="flex items-center gap-1.5 px-2.5 pt-1.5 text-[10px] font-bold text-[#4A5068]"
              >
                <span aria-label={`Club ${team.monogram}`} className="rounded px-1 leading-4 font-display text-white" style={{ backgroundColor: team.secondary }}>
                  {team.monogram}
                </span>
                <FlagBadge nationalityId={player.nationalityId} label={nationality.shortCode} />
                <span className="font-mono-tabular">LV.{player.level}</span>
                {!onSelect ? (
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    aria-label={`Flip ${player.name} card to stats`}
                    className="ml-auto min-h-[40px] py-1 px-2.5 rounded-lg bg-[#F1E4C8] text-[#181B2C] border-2 border-[#181B2C] font-heading font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8A3]"
                  >
                    <RotateCw className="w-3 h-3" />
                    Stats
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1 px-2.5 py-2">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[#181B2C] text-[10px] font-extrabold text-white"
                  style={{ backgroundColor: '#7209B7' }}
                  title={`${heritage.mythOrAnimal}: ${heritage.shortEffect}`}
                >
                  ★ {heritage.name}
                </span>
                {player.specialPowers.slice(0, 1).map((power) => (
                  <span
                    key={power}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#FFC300] border border-[#181B2C] text-[10px] font-extrabold text-[#181B2C]"
                  >
                    <Sparkles className="w-3 h-3" />
                    {power}
                  </span>
                ))}
                {player.buildIdentity && player.buildIdentity.spentSp > 0 ? (
                  <span
                    data-testid="card-build-identity-badge"
                    title={`${player.buildIdentity.label} (${player.buildIdentity.spentSp}/${player.buildIdentity.maxSp} SP)`}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-[#181B2C] bg-[#1D3557] text-[#FFD166] text-[10px] font-extrabold max-w-full truncate"
                  >
                    {player.buildIdentity.shortTag}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Card Footer Actions (shown when Send-to-3D selector is also present) */}
            {onSelect ? (
              <div className="px-2.5 pb-2 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={onSelect}
                  className="flex-1 min-h-11 py-1 px-2 rounded-lg bg-[#2FB356] text-[#181B2C] border-2 border-[#181B2C] font-heading font-bold text-[11px] cursor-pointer hover:brightness-105"
                >
                  {selected ? 'On 3D Field ✓' : 'Send to 3D'}
                </button>
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  aria-label={`Flip ${player.name} card to stats`}
                  className="min-h-11 py-1 px-2 rounded-lg bg-[#F1E4C8] text-[#181B2C] border-2 border-[#181B2C] font-heading font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8A3]"
                >
                  <RotateCw className="w-3 h-3" />
                  Stats
                </button>
              </div>
            ) : null}
          </div>
        </article>

        {/* CARD BACK */}
        <article
          inert={!flipped}
          aria-hidden={!flipped}
          aria-label={`${player.name} baseball card back`}
          className="card-face card-face-back [grid-area:1/1] min-w-0 rounded-[20px] p-2 bg-[#F1E4C8] border-[3px] border-[#181B2C] shadow-[5px_5px_0_#181B2C] flex flex-col"
        >
          <div className="flex-1 bg-[#FBF4E4] rounded-[14px] border-2 border-[#181B2C] p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between border-b-2 border-[#181B2C] pb-1 gap-x-2 gap-y-0.5">
                <div className="min-w-0">
                  <div className="font-display text-xs text-[#181B2C] truncate">{player.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-[#4A5068]">
                    <FlagBadge nationalityId={player.nationalityId} />
                    <span>
                      {player.hometown} • {player.position}
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-0.5 text-[#FFC300] shrink-0"
                  aria-label="Fan Popularity"
                >
                  {Array.from({ length: popularityStars }, (_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#FFC300] stroke-[#181B2C]" />
                  ))}
                </div>
              </div>

              <div className="mt-1.5 space-y-1">
                {statRows.map((row) => (
                  <StatBadge key={row.key} label={row.label} value={row.value} showBar />
                ))}
              </div>
              {player.statLine ? (
                <div className="mt-1.5 rounded-lg bg-[#181B2C] px-2 py-1 text-center font-mono-tabular text-[9px] font-bold tracking-tight text-[#FFD166]">
                  {player.statLine}
                </div>
              ) : null}
            </div>

            {player.habit && <strong className="mt-1 text-[11px]">{player.habit}</strong>}
            {player.contactPoints && <SprayChart points={player.contactPoints}/>}
            <p className="my-2 border-l-[3px] pl-2 text-[11px] italic leading-snug" style={{ borderColor: team.primary }}>
              {player.bio}
            </p>
            <div className="space-y-1.5">
              <div className="bg-[#7209B7]/10 border border-[#7209B7]/40 rounded-lg p-1.5 text-[10px] leading-snug">
                <div className="font-extrabold text-[#7209B7]">
                  ★ {heritage.name} ({heritage.mythOrAnimal})
                </div>
                <div className="font-bold text-[#181B2C]">{heritage.shortEffect}</div>
              </div>

              <button
                type="button"
                onClick={() => setFlipped(false)}
                aria-label={`Flip ${player.name} card to portrait`}
                className="w-full min-h-11 py-1.5 rounded-lg bg-[#1B4332] text-[#FFD166] border-2 border-[#181B2C] font-heading font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
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
