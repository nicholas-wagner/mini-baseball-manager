import { Award, FileSearch, Sparkles, X } from 'lucide-react';
import { FlagBadge } from '../../art/flags/FlagBadge';
import {
  computePlayerOverall,
  EXPERIENCE_TIER_LABELS,
  isPitcherPosition,
  MARKET_TIER_LABELS,
  MENTAL_TRAIT_LABELS,
  PITCH_TYPE_SHORT_LABELS,
  PRESSURE_PROFILE_LABELS,
  SPECIALIST_LABELS,
  type Player,
  type PlayerRatings,
} from '../../engine/models/player';
import { getNationalityById } from '../../engine/nationalities/pickNationality';
import { getRelicById } from '../../engine/rpg/relics';
import {
  evaluateCapstoneGameplayProfile,
  evaluateHeritageGameplayProfile,
} from '../../engine/rpg/specialPowerEffects';
import {
  computeBattingSabermetrics,
  computeFieldingSabermetrics,
  computePitchingSabermetrics,
  formatRate3,
} from '../../engine/simulation/sabermetrics';

interface PlayerDossierModalProps {
  player: Player | null;
  clubName?: string;
  onClose: () => void;
}

const RATING_GROUPS: readonly {
  title: string;
  keys: readonly { key: keyof PlayerRatings; label: string }[];
}[] = [
  {
    title: 'Batting & Plate Discipline',
    keys: [
      { key: 'contact', label: 'Contact' },
      { key: 'power', label: 'Power' },
      { key: 'gapPower', label: 'Gap Power' },
      { key: 'eye', label: 'Eye' },
      { key: 'bunt', label: 'Bunt' },
    ],
  },
  {
    title: 'Pitching Arsenal & Endurance',
    keys: [
      { key: 'velocity', label: 'Velocity' },
      { key: 'movement', label: 'Movement' },
      { key: 'control', label: 'Control' },
      { key: 'stamina', label: 'Stamina' },
    ],
  },
  {
    title: 'Speed, Defense & Intangibles',
    keys: [
      { key: 'speed', label: 'Speed' },
      { key: 'fielding', label: 'Fielding' },
      { key: 'range', label: 'Range' },
      { key: 'arm', label: 'Arm' },
      { key: 'clutch', label: 'Clutch' },
      { key: 'luck', label: 'Luck' },
    ],
  },
];

export function PlayerDossierModal({ player, clubName, onClose }: PlayerDossierModalProps) {
  if (!player) return null;

  const ovr = computePlayerOverall(player);
  const nation = getNationalityById(player.nationalityId);
  const heritage = evaluateHeritageGameplayProfile(player, 1.0);
  const capstones = evaluateCapstoneGameplayProfile(player, 1.0);
  const battingSaber = computeBattingSabermetrics(player.seasonStats);
  const pitchingSaber = computePitchingSabermetrics(player.seasonStats);
  const fieldingSaber = computeFieldingSabermetrics(player.seasonStats);
  const relics = (player.equippedRelicIds ?? [])
    .map((id) => getRelicById(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} Scouting Dossier`}
    >
      <div
        data-testid="player-dossier-modal"
        className="w-full max-w-3xl min-w-0 max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden"
      >
        {/* Header */}
        <div className="px-3 sm:px-4 py-3 bg-[#1D3557] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileSearch className="w-5 h-5 text-[#FFD166] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm sm:text-base tracking-wide truncate">
                #{player.jerseyNumber} {player.name} ({player.position}) — OVR {ovr}
              </div>
              <div className="text-[11px] font-bold text-[#FFD166] truncate">
                “{player.nickname}” • {clubName ?? 'League Club'} • Age {player.age} • B/T:{' '}
                {player.bats}/{player.throws} • {MARKET_TIER_LABELS[player.marketTier]}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Scouting Dossier"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-4 space-y-3.5 min-h-0 flex-1 overflow-y-auto">
          {/* Identity, National Heritage & Career Service */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs text-[#4C1D95] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  National Heritage &amp; Powers
                </span>
                <FlagBadge nationalityId={player.nationalityId} label={nation.shortCode} />
              </div>
              <div className="text-xs font-extrabold text-[#181B2C]">
                {heritage.ability.name} — Tier {player.heritageTierUnlocked}/3 ({heritage.ability.category.toUpperCase()})
              </div>
              <div className="text-[11px] font-bold text-[#4A5068]">
                {heritage.ability.shortEffect}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {capstones.equippedPowerNames.length > 0 ? (
                  capstones.equippedPowerNames.map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded bg-[#FFC300] border border-[#181B2C] text-[10px] font-extrabold text-[#181B2C]"
                    >
                      ⚡ {name}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] font-bold text-[#4A5068]">
                    No individual capstone powers equipped yet (unlock in Skill Tree).
                  </span>
                )}
              </div>
              {relics.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {relics.map((r) => (
                    <span
                      key={r.id}
                      className="px-2 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C] text-[10px] font-extrabold text-[#1D3557]"
                    >
                      🎒 {r.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="font-display text-xs text-[#1B4332] flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                Career Service &amp; Scouting Profile
              </div>
              <div className="text-xs font-extrabold text-[#181B2C]">
                {SPECIALIST_LABELS[player.specialistArchetype]} • LV.{player.level} ({player.skillPoints} SP)
              </div>
              <div className="text-[11px] font-bold text-[#4A5068]">
                Experience: {EXPERIENCE_TIER_LABELS[player.careerService.experienceTier]} ({player.careerService.experienceScore}/100) •{' '}
                {player.careerService.seasonsPlayed} Seasons • {player.careerService.careerPlayoffGames} Playoff Games
              </div>
              <div className="text-[11px] font-bold text-[#4A5068]">
                Contract: ${player.contract.salaryPerSeason.toLocaleString()}/yr ({player.contract.yearsRemaining} yr left) •
                Pressure: {PRESSURE_PROFILE_LABELS[player.pressureProfile]} • Mental:{' '}
                {player.mentalTraits.map((t) => MENTAL_TRAIT_LABELS[t]).join(', ') || 'Steady'} • Personality: {player.personality}
              </div>
              <div className="text-[11px] font-bold text-[#1D3557]">
                {isPitcherPosition(player.position) && player.pitchArsenal
                  ? `Arsenal (${player.pitchArsenal.repertoire.length}): ${player.pitchArsenal.repertoire
                      .map((p) => `${PITCH_TYPE_SHORT_LABELS[p.pitchType]} ${p.mastery}`)
                      .join(' • ')}`
                  : `Crushes ${PITCH_TYPE_SHORT_LABELS[player.batterPitchProfile.favoritePitch]} • Weak vs ${PITCH_TYPE_SHORT_LABELS[player.batterPitchProfile.weakPitch]}`}
              </div>
            </div>
          </div>

          {/* Season Sabermetrics Bar */}
          <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[11px] font-bold flex flex-wrap justify-between gap-2">
            {isPitcherPosition(player.position) ? (
              <>
                <span>ERA {pitchingSaber.era.toFixed(2)}</span>
                <span>WHIP {pitchingSaber.whip.toFixed(2)}</span>
                <span>K/9 {pitchingSaber.kPer9.toFixed(1)}</span>
                <span>BB/9 {pitchingSaber.bbPer9.toFixed(1)}</span>
                <span>Strike% {Math.round(pitchingSaber.strikeRate * 100)}%</span>
                <span>
                  W-L-SV {player.seasonStats.wins}-{player.seasonStats.losses}-{player.seasonStats.saves}
                </span>
              </>
            ) : (
              <>
                <span>AVG {formatRate3(battingSaber.avg)}</span>
                <span>OBP {formatRate3(battingSaber.obp)}</span>
                <span>SLG {formatRate3(battingSaber.slg)}</span>
                <span>OPS {formatRate3(battingSaber.ops)}</span>
                <span>HR {player.seasonStats.homeRuns}</span>
                <span>RBI {player.seasonStats.rbis}</span>
                <span>SB {player.seasonStats.stolenBases}</span>
                <span>FPCT {formatRate3(fieldingSaber.fpct)}</span>
              </>
            )}
          </div>

          {/* All 15 Ratings vs Stat Caps */}
          <div className="space-y-2">
            <div className="font-display text-xs uppercase text-[#181B2C]">
              All 15 Player Attributes vs. Stat Caps (Ceiling)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {RATING_GROUPS.map((group) => (
                <div
                  key={group.title}
                  className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-white space-y-1.5"
                >
                  <div className="font-display text-[10px] uppercase text-[#1D3557]">
                    {group.title}
                  </div>
                  {group.keys.map(({ key, label }) => {
                    const current = player.ratings[key];
                    const cap = player.statCaps[key];
                    return (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] font-extrabold text-[#181B2C]">
                          <span>{label}</span>
                          <span className="font-mono-tabular">
                            {current} <span className="text-[#4A5068]">/ {cap}</span>
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-[#E9DFC9] border border-[#181B2C]/60 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-[#FFC300]/55"
                            style={{ width: `${Math.min(100, cap)}%` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 bg-[#1B4332]"
                            style={{ width: `${Math.min(100, current)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
