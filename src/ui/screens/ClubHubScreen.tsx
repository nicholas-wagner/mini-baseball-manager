import { useMemo, useState } from 'react';
import { Award, Building2, Dumbbell, Users } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  BALLPARK_CATALOG,
  getBallparkPreset,
} from '../../engine/ballparks/stadiumCatalog';
import {
  computeClubStaffPayroll,
  generateStaffHiringPool,
  STAFF_ROLE_LABELS,
  STAFF_SALARY_BUDGET_BY_TIER,
  STAFF_SLOT_LIMITS_BY_TIER,
} from '../../engine/gm/coaches';
import { generateMedicalStaffMarket } from '../../engine/health/medicalStaff';
import {
  MANAGER_SKILL_NODES,
} from '../../engine/manager/managerTree';
import { isPitcherPosition } from '../../engine/models/player';
import { createSeededRng } from '../../engine/rng/seededRng';
import {
  PRACTICE_COMPLEX_ACTIVITIES,
  type PracticeComplexActivityId,
} from '../../engine/rpg/practiceEngine';
import {
  commissionHumanBallpark,
  fireHumanClubStaff,
  hireHumanClubStaff,
  runHumanPracticeActivity,
  runHumanStaffClinic,
  unlockHumanManagerNode,
} from '../../store/clubHubActions';
import { useGameStore } from '../../store/gameStore';
import { MiniPlayerSvg } from '../components/MiniPlayerSvg';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

type HubSubTab = 'stadiums' | 'staff' | 'practice' | 'manager';

export function ClubHubScreen() {
  const club = useGameStore((s) => s.getHumanClub());
  const manager = useGameStore((s) => s.manager);
  const worldSeed = useGameStore((s) => s.worldSeed);
  const seasonNumber = useGameStore((s) => s.seasonNumber);

  const [subTab, setSubTab] = useState<HubSubTab>('stadiums');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [activeClip, setActiveClip] = useState<'idle' | 'practice_cage' | 'practice_bullpen' | 'field_dive' | 'field_run' | 'celebrate_hr'>('idle');
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
  const activeStaff = club.coaches.activeStaff ?? [];
  const staffSlotCap = STAFF_SLOT_LIMITS_BY_TIER[club.leagueTier];
  const staffBudget = STAFF_SALARY_BUDGET_BY_TIER[club.leagueTier];
  const staffPayroll = computeClubStaffPayroll(activeStaff);
  const selectedPlayer =
    club.roster.find((p) => p.id === selectedPlayerId) ?? club.roster[0];

  const handleCommissionPark = (parkId: typeof activePark.id) => {
    const res = commissionHumanBallpark(parkId);
    setNotice(res.commissioned ? `Commissioned new home venue: ${getBallparkPreset(parkId).name}!` : (res.reason ?? 'Unavailable.'));
    soundEngine.play(res.commissioned ? 'cash_chime' : 'ui_pop');
  };

  const handleRunPractice = (activityId: PracticeComplexActivityId, clip: typeof activeClip) => {
    if (!selectedPlayer) return;
    const res = runHumanPracticeActivity(selectedPlayer.id, { activityId });
    setActiveClip(res.trained ? clip : 'idle');
    setNotice(res.summary);
    soundEngine.play(res.trained ? 'level_up' : 'ui_pop');
  };

  return (
    <div className="space-y-4">
      <ComicCard
        title={`${club.city.toUpperCase()} ${club.name.toUpperCase()} — CLUBHOUSE & BALLPARK HQ`}
        subtitle={`Cash $${club.economy.cash.toLocaleString()} • Home: ${activePark.name} • Staff ${activeStaff.length}/${staffSlotCap}`}
        headerBg="#1B4332"
        badge={
          <div className="flex flex-wrap gap-1.5">
            <ComicButton
              size="sm"
              variant={subTab === 'stadiums' ? 'gold' : 'cream'}
              active={subTab === 'stadiums'}
              icon={<Building2 className="w-3.5 h-3.5" />}
              onClick={() => setSubTab('stadiums')}
            >
              Ballparks ({BALLPARK_CATALOG.length})
            </ComicButton>
            <ComicButton
              size="sm"
              variant={subTab === 'staff' ? 'gold' : 'cream'}
              active={subTab === 'staff'}
              icon={<Users className="w-3.5 h-3.5" />}
              onClick={() => setSubTab('staff')}
            >
              Coaches & Staff
            </ComicButton>
            <ComicButton
              size="sm"
              variant={subTab === 'practice' ? 'gold' : 'cream'}
              active={subTab === 'practice'}
              icon={<Dumbbell className="w-3.5 h-3.5" />}
              onClick={() => setSubTab('practice')}
            >
              Practice Complex
            </ComicButton>
            <ComicButton
              size="sm"
              variant={subTab === 'manager' ? 'gold' : 'cream'}
              active={subTab === 'manager'}
              icon={<Award className="w-3.5 h-3.5" />}
              onClick={() => setSubTab('manager')}
            >
              Manager RPG ({manager?.skillPoints ?? 0} SP)
            </ComicButton>
          </div>
        }
      >
        {notice ? (
          <div className="mb-3 p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]">
            {notice}
          </div>
        ) : null}

        {subTab === 'stadiums' ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display text-sm text-[#181B2C]">
                  Current Home Venue: {activePark.name}
                </div>
                <div className="text-xs font-bold text-[#4A5068]">{activePark.tagline}</div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold">
                <span className="px-2 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C]">
                  LF {activePark.factors.leftWallFt} / CF {activePark.factors.centerWallFt} / RF {activePark.factors.rightWallFt} ft
                </span>
                <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C]">
                  HR {activePark.factors.hrFactor.toFixed(2)}x (L {activePark.factors.leftyHrFactor.toFixed(2)}x / R {activePark.factors.rightyHrFactor.toFixed(2)}x)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C]">
                  {activePark.factors.isDome ? 'Indoor Dome' : 'Open Air'} • {activePark.factors.surface === 'fast_turf' ? 'Fast Turf' : 'Natural Grass'}
                </span>
              </div>
            </div>

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

        {subTab === 'staff' ? (
          <div className="space-y-4">
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
                No dugout coaches or Equipment Manager hired yet — pick your favorite trade-off below!
              </p>
            )}

            <div className="space-y-2">
              <div className="font-display text-xs uppercase text-[#181B2C]">
                Available Coaching & Equipment Manager Candidates
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

            <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-1">
              <div className="font-display text-xs text-[#181B2C]">
                Specialty Medical Market Preview ({medicalMarket.doctors.length} Team Doctors • {medicalMarket.trainers.length} Athletic Trainers)
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-[#181B2C]">
                {medicalMarket.doctors.slice(0, 3).map((d) => (
                  <span key={d.id} className="px-2 py-0.5 rounded bg-white border border-[#181B2C]">
                    {d.name}: {d.summary} (${d.salaryPerSeason.toLocaleString()})
                  </span>
                ))}
                {medicalMarket.trainers.slice(0, 3).map((t) => (
                  <span key={t.id} className="px-2 py-0.5 rounded bg-white border border-[#181B2C]">
                    {t.name}: {t.summary} (${t.salaryPerSeason.toLocaleString()})
                  </span>
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
                <MiniPlayerSvg
                  traits={selectedPlayer.traits}
                  team={club.colors}
                  jerseyNumber={selectedPlayer.jerseyNumber}
                  role={isPitcherPosition(selectedPlayer.position) ? 'pitcher' : 'batter'}
                  throwsHand={selectedPlayer.throws}
                  batSide={selectedPlayer.bats === 'L' ? 'L' : 'R'}
                  facing="front"
                  clip={activeClip}
                />
              </div>
              <div className="text-xs font-extrabold text-[#181B2C]">
                Form: {selectedPlayer.formState.toUpperCase()} ({selectedPlayer.formScore}) • Fatigue {selectedPlayer.fatigue}/100
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRACTICE_COMPLEX_ACTIVITIES.map((act) => {
                const isPitcher = isPitcherPosition(selectedPlayer.position);
                const roleMismatch =
                  (act.roleScope === 'pitcher' && !isPitcher) ||
                  (act.roleScope === 'hitter' && isPitcher);
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
                      variant={roleMismatch ? 'cream' : 'sky'}
                      disabled={roleMismatch}
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

        {subTab === 'manager' && manager ? (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
              <span>
                Manager {manager.name} • Lv.{manager.level} ({manager.xp} XP)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#FFC300] border border-[#181B2C]">
                Available Manager SP: {manager.skillPoints}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['skipper', 'coach', 'mogul'] as const).map((branch) => (
                <div key={branch} className="space-y-2">
                  <div className="font-display text-xs uppercase px-2 py-1 rounded-lg bg-[#181B2C] text-[#FFD166]">
                    {branch} Branch
                  </div>
                  {MANAGER_SKILL_NODES.filter((n) => n.branch === branch).map((node) => {
                    const unlocked = manager.unlockedNodeIds.includes(node.id);
                    return (
                      <div
                        key={node.id}
                        className={`p-2.5 rounded-xl border-2 border-[#181B2C] space-y-1 ${
                          unlocked ? 'bg-[#D8F3DC]' : 'bg-[#FFFDF7]'
                        }`}
                      >
                        <div className="font-display text-xs text-[#181B2C]">{node.name}</div>
                        <div className="text-[11px] font-bold text-[#4A5068]">{node.description}</div>
                        <ComicButton
                          size="sm"
                          variant={unlocked ? 'turf' : 'gold'}
                          disabled={unlocked}
                          onClick={() => {
                            const res = unlockHumanManagerNode(node.id);
                            setNotice(res.unlocked ? `Unlocked Manager skill: ${node.name}!` : (res.reason ?? 'Locked.'));
                            soundEngine.play(res.unlocked ? 'level_up' : 'ui_pop');
                          }}
                        >
                          {unlocked ? 'Unlocked ✓' : `Unlock (${node.spCost} SP)`}
                        </ComicButton>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </ComicCard>
    </div>
  );
}
