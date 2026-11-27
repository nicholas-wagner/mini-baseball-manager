import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Coins,
  Dumbbell,
  Newspaper,
  Palette,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  BALLPARK_CATALOG,
  getBallparkPreset,
} from '../../engine/ballparks/stadiumCatalog';
import ballparkArt from '../../art/portraits/illustrations/ballpark.png';
import {
  buildStadiumUpgradeCards,
  getStadiumTierProfile,
} from '../../engine/ballparks/stadiumProgression';
import { LEAGUE_TIER_ORDER } from '../../engine/models/club';
import {
  computeClubStaffPayroll,
  evaluateClubStaffBonuses,
  generateStaffHiringPool,
  STAFF_ROLE_LABELS,
  STAFF_SALARY_BUDGET_BY_TIER,
  STAFF_SLOT_LIMITS_BY_TIER,
} from '../../engine/gm/coaches';
import {
  DOCTOR_SPECIALTY_LABELS,
  generateMedicalStaffMarket,
  TRAINER_SPECIALTY_LABELS,
} from '../../engine/health/medicalStaff';
import { isPitcherPosition } from '../../engine/models/player';
import { createSeededRng } from '../../engine/rng/seededRng';
import { evaluateClubhouseChemistry } from '../../engine/rpg/chemistry';
import {
  PRACTICE_COMPLEX_ACTIVITIES,
  type PracticeComplexActivityId,
} from '../../engine/rpg/practiceEngine';
import { RELIC_CATALOG } from '../../engine/rpg/relics';
import {
  commissionHumanBallpark,
  equipHumanPlayerRelic,
  fireHumanClubStaff,
  hireHumanAthleticTrainer,
  hireHumanClubStaff,
  hireHumanTeamDoctor,
  runHumanPracticeActivity,
  runHumanStaffClinic,
  unequipHumanPlayerRelic,
  upgradeHumanStadium,
} from '../../store/clubHubActions';
import { useGameStore } from '../../store/gameStore';
import { BallparkEconomyPanel } from '../components/BallparkEconomyPanel';
import { FrontOfficeGazettePanel } from '../components/FrontOfficeGazettePanel';
import { FrontOfficeModeBar } from '../components/FrontOfficeModeBar';
import { PaintedUniformPreview } from '../components/PaintedUniformPreview';
import { UniformDesignerPanel } from '../components/UniformDesignerPanel';
import { WorldSpectaclesPanel } from '../components/WorldSpectaclesPanel';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

type HubRoomId = 'ballpark_room' | 'gear_room' | 'staff_room' | 'events_room';

type HubSubTab =
  | 'stadiums'
  | 'economy'
  | 'uniforms'
  | 'relics'
  | 'staff'
  | 'practice'
  | 'frontoffice'
  | 'spectacles';

const ROOM_TO_DEFAULT_SUBTAB: Readonly<Record<HubRoomId, HubSubTab>> = {
  ballpark_room: 'stadiums',
  gear_room: 'uniforms',
  staff_room: 'staff',
  events_room: 'spectacles',
};

function getRoomForSubTab(tab: HubSubTab): HubRoomId {
  if (tab === 'stadiums' || tab === 'economy') return 'ballpark_room';
  if (tab === 'uniforms' || tab === 'relics') return 'gear_room';
  if (tab === 'staff' || tab === 'practice' || tab === 'frontoffice') return 'staff_room';
  return 'events_room';
}

export interface ClubHubScreenProps {
  initialSubTab?: HubSubTab;
}

export function ClubHubScreen({ initialSubTab = 'stadiums' }: ClubHubScreenProps = {}) {
  const club = useGameStore((s) => s.getHumanClub());
  const leagues = useGameStore((s) => s.leagues);
  const worldSeed = useGameStore((s) => s.worldSeed);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const individualDrillsRemaining = useGameStore((s) => s.individualDrillsRemaining);

  const [subTab, setSubTab] = useState<HubSubTab>(initialSubTab);
  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [activeClip, setActiveClip] = useState<
    'idle' | 'practice_cage' | 'practice_bullpen' | 'field_dive' | 'field_run' | 'celebrate_hr'
  >('idle');
  const [notice, setNotice] = useState<string | null>(null);

  const staffMarket = useMemo(() => {
    if (!club) return [];
    return generateStaffHiringPool(
      createSeededRng(worldSeed + seasonNumber * 401),
      club.leagueTier,
    );
  }, [club, worldSeed, seasonNumber]);

  const medicalMarket = useMemo(() => {
    if (!club) return { doctors: [], trainers: [] };
    return generateMedicalStaffMarket(
      createSeededRng(worldSeed + seasonNumber * 709),
      club.leagueTier,
    );
  }, [club, worldSeed, seasonNumber]);

  if (!club) return null;

  const activePark = getBallparkPreset(club.stadium.ballparkId);
  const tierProfile = getStadiumTierProfile(club.leagueTier);
  const activeStaff = club.coaches.activeStaff ?? [];
  const staffBonuses = evaluateClubStaffBonuses(activeStaff);
  const chemistry = evaluateClubhouseChemistry(club.roster);
  const staffSlotCap = STAFF_SLOT_LIMITS_BY_TIER[club.leagueTier];
  const staffBudget = STAFF_SALARY_BUDGET_BY_TIER[club.leagueTier];
  const staffPayroll = computeClubStaffPayroll(activeStaff);
  const selectedPlayer =
    club.roster.find((p) => p.id === selectedPlayerId) ?? club.roster[0];

  const handleCommissionPark = (parkId: typeof activePark.id) => {
    const res = commissionHumanBallpark(parkId);
    setNotice(
      res.commissioned
        ? `Commissioned new home venue: ${getBallparkPreset(parkId).name}!`
        : (res.reason ?? 'Unavailable.'),
    );
    soundEngine.play(res.commissioned ? 'cash_chime' : 'ui_pop');
  };

  const handleRunPractice = (activityId: PracticeComplexActivityId, clip: typeof activeClip) => {
    if (!selectedPlayer) return;
    const res = runHumanPracticeActivity(selectedPlayer.id, { activityId });
    setActiveClip(res.trained ? clip : 'idle');
    setNotice(res.summary);
    soundEngine.play(res.trained ? 'level_up' : 'ui_pop');
  };

  const activeRoom = getRoomForSubTab(subTab);

  return (
    <div data-testid="club-hub-screen" className="space-y-4 min-w-0 overflow-x-clip">
      <ComicCard
        title={`${club.city.toUpperCase()} ${club.name.toUpperCase()} — CLUBHOUSE HQ`}
        subtitle={`Uniforms, Relics, Ballpark, Trades & Gazette • Cash $${club.economy.cash.toLocaleString()} • Home: ${activePark.name} • Staff ${activeStaff.length}/${staffSlotCap}`}
        headerBg="#1B4332"
        badge={
          <div
            data-testid="hub-room-tabs"
            className="grid grid-cols-2 min-w-0 gap-1.5 w-full sm:flex sm:flex-wrap xl:grid xl:grid-cols-4"
          >
            <ComicButton
              size="sm"
              variant={activeRoom === 'ballpark_room' ? 'gold' : 'cream'}
              active={activeRoom === 'ballpark_room'}
              icon={<Building2 className="w-3.5 h-3.5" />}
              onClick={() => setSubTab(ROOM_TO_DEFAULT_SUBTAB.ballpark_room)}
              className="w-full sm:w-auto min-w-0 px-2 text-[11px] sm:text-xs whitespace-normal leading-tight text-center"
            >
              Ballpark &amp; Economy
            </ComicButton>
            <ComicButton
              size="sm"
              variant={activeRoom === 'gear_room' ? 'gold' : 'cream'}
              active={activeRoom === 'gear_room'}
              icon={<Palette className="w-3.5 h-3.5" />}
              onClick={() => setSubTab(ROOM_TO_DEFAULT_SUBTAB.gear_room)}
              className="w-full sm:w-auto min-w-0 px-2 text-[11px] sm:text-xs whitespace-normal leading-tight text-center"
            >
              Uniforms &amp; Gear
            </ComicButton>
            <ComicButton
              size="sm"
              variant={activeRoom === 'staff_room' ? 'gold' : 'cream'}
              active={activeRoom === 'staff_room'}
              icon={<Users className="w-3.5 h-3.5" />}
              onClick={() => setSubTab(ROOM_TO_DEFAULT_SUBTAB.staff_room)}
              className="w-full sm:w-auto min-w-0 px-2 text-[11px] sm:text-xs whitespace-normal leading-tight text-center"
            >
              Staff &amp; Front Office
            </ComicButton>
            <ComicButton
              size="sm"
              variant={activeRoom === 'events_room' ? 'gold' : 'cream'}
              active={activeRoom === 'events_room'}
              icon={<Trophy className="w-3.5 h-3.5" />}
              onClick={() => setSubTab(ROOM_TO_DEFAULT_SUBTAB.events_room)}
              className="w-full sm:w-auto min-w-0 px-2 text-[11px] sm:text-xs whitespace-normal leading-tight text-center"
            >
              Events &amp; Duels
            </ComicButton>
          </div>
        }
      >
        {/* Clean Contextual Sub-Room Switcher (2–3 choices per room instead of 9 cramped tabs!) */}
        {activeRoom !== 'events_room' ? (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 pb-2 border-b-2 border-dashed border-[#181B2C]/20">
            {activeRoom === 'ballpark_room' ? (
              <>
                <ComicButton
                  size="sm"
                  variant={subTab === 'stadiums' ? 'sky' : 'cream'}
                  active={subTab === 'stadiums'}
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  onClick={() => setSubTab('stadiums')}
                >
                  Ballparks ({BALLPARK_CATALOG.length})
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant={subTab === 'economy' ? 'sky' : 'cream'}
                  active={subTab === 'economy'}
                  icon={<Coins className="w-3.5 h-3.5" />}
                  onClick={() => setSubTab('economy')}
                >
                  Economy &amp; District
                </ComicButton>
              </>
            ) : null}
            {activeRoom === 'gear_room' ? (
              <>
                <ComicButton
                  size="sm"
                  variant={subTab === 'uniforms' ? 'sky' : 'cream'}
                  active={subTab === 'uniforms'}
                  icon={<Palette className="w-3.5 h-3.5" />}
                  onClick={() => setSubTab('uniforms')}
                >
                  Uniform Studio
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant={subTab === 'relics' ? 'sky' : 'cream'}
                  active={subTab === 'relics'}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => setSubTab('relics')}
                >
                  Relics &amp; Chemistry
                </ComicButton>
              </>
            ) : null}
            {activeRoom === 'staff_room' ? (
              <>
                <ComicButton
                  size="sm"
                  variant={subTab === 'staff' ? 'sky' : 'cream'}
                  active={subTab === 'staff'}
                  icon={<Users className="w-3.5 h-3.5" />}
                  onClick={() => setSubTab('staff')}
                >
                  Coaches &amp; Staff
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant={subTab === 'practice' ? 'sky' : 'cream'}
                  active={subTab === 'practice'}
                  icon={<Dumbbell className="w-3.5 h-3.5" />}
                  onClick={() => setSubTab('practice')}
                >
                  Practice Complex ({individualDrillsRemaining}/2)
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant={subTab === 'frontoffice' ? 'sky' : 'cream'}
                  active={subTab === 'frontoffice'}
                  icon={<Newspaper className="w-3.5 h-3.5" />}
                  onClick={() => setSubTab('frontoffice')}
                >
                  Gazette &amp; Front Office
                </ComicButton>
              </>
            ) : null}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-3 p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]">
            {notice}
          </div>
        ) : null}

        {subTab === 'stadiums' ? (
          <div className="space-y-3">
            {(() => {
              const upgradeCards = buildStadiumUpgradeCards(club);
              const capPct = Math.min(
                100,
                Math.round((club.stadium.capacity / Math.max(1, tierProfile.maxCapacity)) * 100),
              );
              const tierIdx = LEAGUE_TIER_ORDER.indexOf(club.leagueTier);
              return (
                <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
                  {/* Visual Sandlot -> Majors Home Ballpark Showcase */}
                  <div
                    data-testid="ballpark-visual-banner"
                    className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3 items-center"
                  >
                    <div className="relative rounded-xl border-2 border-[#181B2C] overflow-hidden shadow-[3px_3px_0_#181B2C] h-28 sm:h-28 bg-[#63CAFF]">
                      <img
                        src={ballparkArt}
                        alt={`${activePark.name} illustration`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#181B2C]/90 text-[#FFD166] font-display text-[10px]">
                        Seating Lv.{club.stadium.seatingTier}
                      </span>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="font-display text-sm text-[#181B2C] leading-tight">
                        🏟️ {activePark.name} ({tierProfile.label})
                      </div>
                      <div className="text-xs font-bold text-[#4A5068]">
                        {activePark.tagline}
                      </div>
                      {/* Capacity Progress Bar + Sandlot -> Majors Ladder */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-[#1B4332]">
                          <span>
                            Fans: {club.stadium.capacity.toLocaleString()} /{' '}
                            {tierProfile.maxCapacity.toLocaleString()}
                          </span>
                          <span>{capPct}% Full Tier</span>
                        </div>
                        <div className="h-2.5 rounded-full border border-[#181B2C] bg-[#FBF4E4] overflow-hidden">
                          <div
                            className="h-full bg-[#2FB356] transition-all"
                            style={{ width: `${capPct}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5 text-[9px] font-extrabold">
                          {(['Rookie', 'Low-A', 'High-A', 'AA', 'AAA', 'Majors'] as const).map(
                            (step, idx) => (
                              <span
                                key={step}
                                className={`px-1.5 py-0.5 rounded border border-[#181B2C] ${
                                  idx === tierIdx
                                    ? 'bg-[#FFC300] text-[#181B2C]'
                                    : idx < tierIdx
                                      ? 'bg-[#D8F3DC] text-[#1B4332]'
                                      : 'bg-[#FBF4E4] text-[#4A5068]'
                                }`}
                              >
                                {idx === tierIdx ? '★ ' : ''}
                                {step}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] font-extrabold pt-0.5">
                        <span className="px-2 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C]">
                          LF {activePark.factors.leftWallFt} / CF {activePark.factors.centerWallFt} / RF {activePark.factors.rightWallFt} ft
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C]">
                          HR {activePark.factors.hrFactor.toFixed(2)}x
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C]">
                          {activePark.factors.isDome ? 'Indoor Dome' : 'Open Air'} • {activePark.factors.surface === 'fast_turf' ? 'Fast Turf' : 'Natural Grass'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fun Payoff Stadium Upgrade Cards (Clear Ready vs Tier-Locked Goals!) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-dashed border-[#181B2C]/20">
                    {upgradeCards.map((upg) => {
                      const canBuy = upg.status === 'ready';
                      const isInstalled = upg.status === 'installed';
                      const isLocked = upg.status === 'locked_tier';
                      return (
                        <div
                          key={upg.id}
                          data-testid="stadium-upgrade-card"
                          className={`p-2.5 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
                            isInstalled
                              ? 'bg-[#D8F3DC]'
                              : canBuy
                                ? 'bg-[#FFF8E7] shadow-[2px_2px_0_#181B2C]'
                                : 'bg-[#F4F1E8]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-display text-xs text-[#181B2C]">
                                {upg.emoji} {upg.label}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-[#4A5068] mt-0.5">
                              {upg.funPayoff}
                            </p>
                          </div>
                          <ComicButton
                            size="sm"
                            variant={isInstalled ? 'turf' : canBuy ? 'gold' : 'cream'}
                            disabled={isInstalled || isLocked || upg.status === 'need_cash'}
                            onClick={() => {
                              const res = upgradeHumanStadium(upg.id);
                              setNotice(
                                res.upgraded
                                  ? `Upgraded stadium: ${upg.label}!`
                                  : (res.reason ?? 'Unavailable.'),
                              );
                              soundEngine.play(res.upgraded ? 'cash_chime' : 'ui_pop');
                            }}
                            className="w-full"
                          >
                            {upg.statusBadge}
                          </ComicButton>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {BALLPARK_CATALOG.map((park) => {
                const isHome = park.id === activePark.id;
                return (
                  <div
                    key={park.id}
                    className={`p-3 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
                      isHome ? 'bg-[#D8F3DC]' : 'bg-[#FFFDF7]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm text-[#181B2C]">{park.name}</span>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166]">
                          {park.unlockTier.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#4A5068] mt-0.5">{park.tagline}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] font-extrabold text-[#181B2C]">
                        <span>HR {park.factors.hrFactor}x</span>
                        <span>• XBH {park.factors.doublesTriplesFactor}x</span>
                        <span>• Cap {park.baseCapacity.toLocaleString()}</span>
                      </div>
                    </div>
                    <ComicButton
                      size="sm"
                      variant={isHome ? 'turf' : 'sky'}
                      disabled={isHome}
                      onClick={() => handleCommissionPark(park.id)}
                    >
                      {isHome ? 'Active Home Ballpark' : `Commission ($${park.commissionCost.toLocaleString()})`}
                    </ComicButton>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {subTab === 'economy' ? (
          <BallparkEconomyPanel club={club} onNotice={setNotice} />
        ) : null}

        {subTab === 'uniforms' ? (
          <UniformDesignerPanel club={club} onNotice={setNotice} />
        ) : null}

        {subTab === 'staff' ? (
          <div className="space-y-4">
            <FrontOfficeModeBar club={club} onApplied={setNotice} />
            <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
              <span>
                Active Staff Slots: {activeStaff.length} / {staffSlotCap} ({club.leagueTier.toUpperCase()} Cap)
              </span>
              <span>
                Staff Payroll: ${staffPayroll.toLocaleString()} / ${staffBudget.toLocaleString()}
              </span>
            </div>

            {activeStaff.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeStaff.map((member) => (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-display text-xs text-[#181B2C]">
                          {member.name} • Lv.{member.level} (Tier {member.tier})
                        </div>
                        <div className="text-[11px] font-extrabold text-[#1B4332]">
                          {STAFF_ROLE_LABELS[member.role]} — {member.specialtyLabel}
                        </div>
                      </div>
                      <span className="font-mono-tabular text-xs font-extrabold">
                        ${member.salaryPerSeason.toLocaleString()}/yr
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-[#181B2C]">+ {member.perkSummary}</div>
                    <div className="text-[10px] font-bold text-[#9D0208]">− {member.tradeOffSummary}</div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <ComicButton
                        size="sm"
                        variant="gold"
                        onClick={() => {
                          const res = runHumanStaffClinic(member.id);
                          setNotice(res.upgraded ? `${member.name} leveled up at Coaching Clinic!` : (res.reason ?? 'Clinic unavailable.'));
                          soundEngine.play(res.upgraded ? 'level_up' : 'ui_pop');
                        }}
                      >
                        Clinic Upgrade (${(member.level * 1200).toLocaleString()})
                      </ComicButton>
                      <ComicButton
                        size="sm"
                        variant="coral"
                        onClick={() => {
                          fireHumanClubStaff(member.id);
                          setNotice(`Released ${member.name} to open a staff slot.`);
                          soundEngine.play('ui_pop');
                        }}
                      >
                        Release
                      </ComicButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-[#4A5068]">
                No dugout coaches, Equipment Manager, or medical staff hired yet — pick your favorite trade-off below!
              </p>
            )}

            <div className="space-y-2">
              <div className="font-display text-xs uppercase text-[#181B2C]">
                Available Coaching &amp; Equipment Manager Candidates
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {staffMarket.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs text-[#181B2C]">
                        {candidate.name} (Tier {candidate.tier})
                      </span>
                      <span className="font-mono-tabular text-[11px] font-extrabold text-[#1B4332]">
                        ${candidate.salaryPerSeason.toLocaleString()}/yr
                      </span>
                    </div>
                    <div className="text-[11px] font-extrabold text-[#1D3557]">
                      {STAFF_ROLE_LABELS[candidate.role]} • {candidate.specialtyLabel}
                    </div>
                    <div className="text-[10px] font-bold text-[#1B4332]">+ {candidate.perkSummary}</div>
                    <div className="text-[10px] font-bold text-[#9D0208]">− {candidate.tradeOffSummary}</div>
                    <ComicButton
                      size="sm"
                      variant="turf"
                      onClick={() => {
                        const res = hireHumanClubStaff(candidate);
                        setNotice(res.hired ? `Hired ${candidate.name} as ${STAFF_ROLE_LABELS[candidate.role]}!` : (res.reason ?? 'Could not hire.'));
                        soundEngine.play(res.hired ? 'cash_chime' : 'ui_pop');
                      }}
                    >
                      Hire {STAFF_ROLE_LABELS[candidate.role].split(' ')[0]}
                    </ComicButton>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Specialty Team Doctors & Head Athletic Trainers */}
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-3">
              <div className="font-display text-xs uppercase text-[#181B2C]">
                🩺 Specialty Team Doctors &amp; Head Athletic Trainers ({medicalMarket.doctors.length} MDs • {medicalMarket.trainers.length} Trainers)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {medicalMarket.doctors.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-white flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xs text-[#181B2C]">
                          {doc.name} (Tier {doc.tier})
                        </span>
                        <span className="font-mono-tabular text-[11px] font-extrabold text-[#1B4332]">
                          ${doc.salaryPerSeason.toLocaleString()}/yr
                        </span>
                      </div>
                      <div className="text-[10px] font-extrabold text-[#1D3557]">
                        {DOCTOR_SPECIALTY_LABELS[doc.specialty]}
                      </div>
                    </div>
                    <ComicButton
                      size="sm"
                      variant="sky"
                      onClick={() => {
                        const res = hireHumanTeamDoctor(doc);
                        setNotice(res.hired ? `Hired ${doc.name} as Team Doctor!` : (res.reason ?? 'Could not hire.'));
                        soundEngine.play(res.hired ? 'cash_chime' : 'ui_pop');
                      }}
                    >
                      Hire Doctor
                    </ComicButton>
                  </div>
                ))}
                {medicalMarket.trainers.slice(0, 4).map((trn) => (
                  <div
                    key={trn.id}
                    className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-white flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xs text-[#181B2C]">
                          {trn.name} (Tier {trn.tier})
                        </span>
                        <span className="font-mono-tabular text-[11px] font-extrabold text-[#1B4332]">
                          ${trn.salaryPerSeason.toLocaleString()}/yr
                        </span>
                      </div>
                      <div className="text-[10px] font-extrabold text-[#1D3557]">
                        {TRAINER_SPECIALTY_LABELS[trn.specialty]}
                      </div>
                    </div>
                    <ComicButton
                      size="sm"
                      variant="turf"
                      onClick={() => {
                        const res = hireHumanAthleticTrainer(trn);
                        setNotice(res.hired ? `Hired ${trn.name} as Head Athletic Trainer!` : (res.reason ?? 'Could not hire.'));
                        soundEngine.play(res.hired ? 'cash_chime' : 'ui_pop');
                      }}
                    >
                      Hire Trainer
                    </ComicButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {subTab === 'practice' && selectedPlayer ? (
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
            <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7] text-center space-y-2">
              <label htmlFor="practice-player-select" className="block text-[11px] font-extrabold uppercase text-[#4A5068]">
                Active Athlete
              </label>
              <select
                id="practice-player-select"
                value={selectedPlayer.id}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  setActiveClip('idle');
                }}
                className="w-full min-h-[44px] px-2 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
              >
                {club.roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.position} — {p.name} (Fatigue {p.fatigue})
                  </option>
                ))}
              </select>
              <div className="w-36 h-40 mx-auto">
                <PaintedUniformPreview
                  traits={selectedPlayer.traits}
                  team={club.colors}
                  jerseyNumber={selectedPlayer.jerseyNumber}
                  role={isPitcherPosition(selectedPlayer.position) ? 'pitcher' : 'batter'}
                  throwsHand={selectedPlayer.throws}
                  batSide={selectedPlayer.bats === 'L' ? 'L' : 'R'}
                  clip={activeClip}
                />
              </div>
              <div className="text-xs font-extrabold text-[#181B2C]">
                Form: {selectedPlayer.formState.toUpperCase()} ({selectedPlayer.formScore}) • Fatigue {selectedPlayer.fatigue}/100
              </div>
              <div className="text-[11px] font-extrabold text-[#1B4332]">
                🏋️ Clubhouse Drills Remaining: {individualDrillsRemaining}/2 (Refreshes every game/series)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRACTICE_COMPLEX_ACTIVITIES.map((act) => {
                const isPitcher = isPitcherPosition(selectedPlayer.position);
                const roleMismatch =
                  (act.roleScope === 'pitcher' && !isPitcher) ||
                  (act.roleScope === 'hitter' && isPitcher);
                const outOfDrills = individualDrillsRemaining <= 0;
                return (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="font-display text-xs text-[#181B2C]">{act.label}</div>
                      <div className="text-[11px] font-extrabold text-[#1B4332] mt-0.5">+ {act.gainText}</div>
                      <div className="text-[10px] font-bold text-[#9D0208]">− {act.compromiseText}</div>
                    </div>
                    <ComicButton
                      size="sm"
                      variant={roleMismatch || outOfDrills ? 'cream' : 'sky'}
                      disabled={roleMismatch || outOfDrills}
                      onClick={() => handleRunPractice(act.id, act.chibiClip)}
                    >
                      Run {act.label}
                    </ComicButton>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {subTab === 'relics' && selectedPlayer ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm text-[#181B2C]">
                  Clubhouse Chemistry: {chemistry.chemistryTier.toUpperCase()} ({chemistry.moraleScore}/100)
                </span>
                <span className="text-[11px] font-extrabold text-[#1B4332]">
                  Equipment Manager Relic Boost: {Math.round(staffBonuses.relicBonusMultiplier * 100)}%
                </span>
              </div>
              {chemistry.activeBonds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {chemistry.activeBonds.map((bond) => (
                    <span
                      key={bond.id}
                      className="px-2 py-1 rounded-lg bg-[#D8F3DC] border border-[#181B2C] text-[11px] font-extrabold text-[#181B2C]"
                    >
                      ⚡ {bond.name}: {bond.memberNames.join(' & ')}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-bold text-[#4A5068]">
                  Build high-power duos, keystone gloves, or glue captains to unlock Clubhouse Synergy Bonds!
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="relic-player-select" className="text-xs font-extrabold uppercase text-[#181B2C]">
                  90s Gear Locker ({selectedPlayer.name} — {selectedPlayer.equippedRelicIds.length}/2 Equipped)
                </label>
                <select
                  id="relic-player-select"
                  value={selectedPlayer.id}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="min-h-[44px] px-2 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
                >
                  {club.roster.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.position} — {p.name} ({p.equippedRelicIds.length}/2 Relics)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {RELIC_CATALOG.slice(0, 9).map((relic) => {
                  const equipped = selectedPlayer.equippedRelicIds.includes(relic.id);
                  return (
                    <div
                      key={relic.id}
                      className={`p-2 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-1.5 ${
                        equipped ? 'bg-[#FFF3BF]' : 'bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-display text-xs text-[#181B2C]">{relic.name}</div>
                        <div className="text-[10px] font-bold text-[#4A5068]">{relic.flavor}</div>
                      </div>
                      <ComicButton
                        size="sm"
                        variant={equipped ? 'coral' : 'turf'}
                        onClick={() => {
                          if (equipped) {
                            unequipHumanPlayerRelic(selectedPlayer.id, relic.id);
                            setNotice(`Unequipped ${relic.name} from ${selectedPlayer.name}.`);
                          } else {
                            const res = equipHumanPlayerRelic(selectedPlayer.id, relic.id);
                            setNotice(
                              res.equipped
                                ? `Equipped ${relic.name} on ${selectedPlayer.name}!`
                                : (res.reason ?? 'Cannot equip.'),
                            );
                          }
                          soundEngine.play('ui_pop');
                        }}
                      >
                        {equipped ? 'Unequip' : 'Equip Relic'}
                      </ComicButton>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {subTab === 'frontoffice' ? (
          <FrontOfficeGazettePanel
            club={club}
            tierClubs={leagues[club.leagueTier] ?? [club]}
            worldSeed={worldSeed}
            seasonNumber={seasonNumber}
            onNotice={setNotice}
          />
        ) : null}

        {subTab === 'spectacles' ? (
          <WorldSpectaclesPanel
            club={club}
            leagues={leagues}
            worldSeed={worldSeed}
            seasonNumber={seasonNumber}
            onNotice={setNotice}
          />
        ) : null}
      </ComicCard>
    </div>
  );
}
