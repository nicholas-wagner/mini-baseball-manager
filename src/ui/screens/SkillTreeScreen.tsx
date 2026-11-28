import { useState } from 'react';
import { Award, Check, Lock, RotateCcw, Sparkles, Star, Undo2 } from 'lucide-react';
import { FlagBadge } from '../../art/flags/FlagBadge';
import { soundEngine } from '../../audio/soundEngine';
import { sortPlayersForSkillTree } from '../../engine/gm/openingDayHook';
import {
  canUnlockManagerSkillNode,
  getManagerBuildIdentity,
  MANAGER_SKILL_NODES,
  MANAGER_SKILL_SP_CAP,
} from '../../engine/manager/managerTree';
import {
  computePlayerOverall,
  SPECIALIST_LABELS,
} from '../../engine/models/player';
import {
  canUnlockNextHeritageTier,
  getHeritageBranch,
} from '../../engine/rpg/heritageTrees';
import { getHeritageTacticalGuide } from '../../engine/rpg/specialPowerEffects';
import {
  pickCoachRecommendedSkillNode,
  type SkillTreeAssistMode,
} from '../../engine/rpg/skillTreeAssist';
import {
  canRetrainPlayerSkills,
  canUnlockSkillNode,
  getAvailableSkillBranches,
  getMaxEquippedPowerSlots,
  getNodesForBranch,
  getPlayerBuildIdentity,
  MAX_CAREER_RETRAINS_PER_PLAYER,
  SKILL_NODES_BY_ID,
  SKILL_RESPEC_CASH_FEE,
  type PlayerBuildTone,
  type SkillBranchId,
} from '../../engine/rpg/skillTrees';
import { unlockHumanManagerNode } from '../../store/clubHubActions';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { PlayerPortraitBadge } from '../components/PlayerPortraitBadge';
import { SkillTreeConstellation } from '../components/SkillTreeConstellation';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

const BRANCH_LABELS: Record<SkillBranchId, string> = {
  pitcher: 'Pitching Mastery Tree',
  batter: 'Batting Mastery Tree',
  fielder: 'Defensive Craft Tree',
};

const BUILD_TONE_CLASSES: Record<PlayerBuildTone, string> = {
  balanced: 'bg-[#E0FBFC] text-[#1D3557]',
  power: 'bg-[#FFE5EC] text-[#9D0208]',
  contact: 'bg-[#D8F3DC] text-[#1B4332]',
  speed: 'bg-[#FFF3BF] text-[#7A4F01]',
  heat: 'bg-[#FFE5EC] text-[#9D0208]',
  spin: 'bg-[#F3E8FF] text-[#5B21B6]',
  control: 'bg-[#E0F2FE] text-[#075985]',
  glove: 'bg-[#D8F3DC] text-[#1B4332]',
  two_way: 'bg-[#FFC300] text-[#181B2C]',
};

const MANAGER_TONE_CLASSES: Record<'skipper' | 'coach' | 'mogul' | 'balanced', string> = {
  skipper: 'bg-[#FFE5EC] text-[#9D0208]',
  coach: 'bg-[#D8F3DC] text-[#1B4332]',
  mogul: 'bg-[#FFF3BF] text-[#7A4F01]',
  balanced: 'bg-[#E0FBFC] text-[#1D3557]',
};

function formatBuildIdentityPill(identity: { shortTag: string; label: string }): string {
  const [icon = '', ...rest] = identity.shortTag.trim().split(/\s+/);
  const tagWord = rest.join(' ').trim();
  if (!tagWord || identity.label.toLowerCase().includes(tagWord.toLowerCase())) {
    return icon ? `${icon} ${identity.label}` : identity.label;
  }
  return `${identity.shortTag} · ${identity.label}`;
}

export function SkillTreeScreen() {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const manager = useGameStore((s) => s.manager);
  const activeOffseason = useGameStore((s) => s.activeOffseason);
  const favoritePlayerIds = useGameStore((s) => s.favoritePlayerIds);
  const unlockPlayerSkill = useGameStore((s) => s.unlockPlayerSkill);
  const applyCoachSkillsForPlayer = useGameStore((s) => s.applyCoachSkillsForPlayer);
  const applyCoachSkillsForRoster = useGameStore((s) => s.applyCoachSkillsForRoster);
  const undoPlayerSkillUnlock = useGameStore((s) => s.undoPlayerSkillUnlock);
  const unlockPlayerHeritageTier = useGameStore((s) => s.unlockPlayerHeritageTier);
  const togglePlayerSpecialPower = useGameStore((s) => s.togglePlayerSpecialPower);
  const retrainPlayerSkills = useGameStore((s) => s.retrainPlayerSkills);
  const skillTreeMode = useUserPreferencesStore((s) => s.skillTreeMode);
  const setSkillTreeMode = useUserPreferencesStore((s) => s.setSkillTreeMode);

  const [treeMode, setTreeMode] = useState<'players' | 'manager'>('players');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [activeBranch, setActiveBranch] = useState<SkillBranchId | null>(null);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sessionUnlockedByPlayer, setSessionUnlockedByPlayer] = useState<Record<string, string[]>>({});

  if (!humanClub) return null;

  const isOffseason = Boolean(activeOffseason);
  const totalPlayerSp = humanClub.roster.reduce((sum, p) => sum + p.skillPoints, 0);
  const managerSp = manager?.skillPoints ?? 0;

  const sortedRoster = sortPlayersForSkillTree(humanClub.roster, favoritePlayerIds);
  const defaultPlayerWithSp = sortedRoster[0];
  const player =
    humanClub.roster.find((p) => p.id === selectedPlayerId) ??
    defaultPlayerWithSp;

  const availableBranches = getAvailableSkillBranches(player);
  const currentBranch: SkillBranchId =
    activeBranch && availableBranches.includes(activeBranch)
      ? activeBranch
      : availableBranches[0];

  const branchNodes = getNodesForBranch(currentBranch);
  const heritageBranch = getHeritageBranch(player.nationalityId);
  const heritageGuide = getHeritageTacticalGuide(player.nationalityId);
  const coachRecommendation =
    skillTreeMode !== 'manual' ? pickCoachRecommendedSkillNode(player) : null;
  const nextHeritage = canUnlockNextHeritageTier(player);
  const maxPowerSlots = getMaxEquippedPowerSlots(player.level);
  const buildIdentity = getPlayerBuildIdentity(player);
  const budgetPct = Math.min(100, Math.round((buildIdentity.spentSp / Math.max(1, buildIdentity.maxSp)) * 100));
  const sessionStack = (sessionUnlockedByPlayer[player.id] ?? []).filter((id) =>
    player.unlockedSkillIds.includes(id),
  );
  const retrainCheck = canRetrainPlayerSkills(player, {
    isOffseason,
    clubCash: humanClub.economy.cash,
  });
  const retrainsUsed = player.careerRetrainsUsed ?? 0;

  const managerIdentity = manager ? getManagerBuildIdentity(manager) : null;
  const managerBudgetPct = managerIdentity
    ? Math.min(100, Math.round((managerIdentity.spentSp / Math.max(1, managerIdentity.maxSp)) * 100))
    : 0;

  const handleUnlockNode = (nodeId: string, nodeName: string) => {
    const res = unlockPlayerSkill(player.id, nodeId);
    if (res.unlocked) {
      soundEngine.play('level_up');
      setSessionUnlockedByPlayer((prev) => ({
        ...prev,
        [player.id]: [...(prev[player.id] ?? []), nodeId],
      }));
      setFeedback(`Unlocked ${nodeName} for ${player.name}!`);
    } else {
      setFeedback(res.reason ?? 'Unable to unlock skill node.');
    }
  };

  const handleUndoLast = () => {
    const lastNodeId = sessionStack[sessionStack.length - 1];
    if (!lastNodeId) return;
    const nodeName = SKILL_NODES_BY_ID[lastNodeId]?.name ?? lastNodeId;
    const res = undoPlayerSkillUnlock(player.id, lastNodeId);
    if (res.undone) {
      soundEngine.play('ui_pop');
      setSessionUnlockedByPlayer((prev) => ({
        ...prev,
        [player.id]: (prev[player.id] ?? []).slice(0, -1),
      }));
      setFeedback(`Undid ${nodeName} — refunded ${res.refundedSp} SP for free.`);
    } else {
      setFeedback(res.reason ?? 'Unable to undo skill node.');
    }
  };

  const handleUnlockHeritage = () => {
    const res = unlockPlayerHeritageTier(player.id);
    if (res.unlocked) {
      soundEngine.play('heritage_power_surge');
      setFeedback(
        `${player.name} awakened ${heritageBranch.ability.name} Tier ${player.heritageTierUnlocked + 1}!`,
      );
    } else {
      setFeedback(res.reason ?? 'Unable to unlock Cultural Heritage tier.');
    }
  };

  const handleTogglePower = (powerId: string) => {
    const res = togglePlayerSpecialPower(player.id, powerId);
    if (res.changed) {
      soundEngine.play('ui_pop');
      setFeedback(`Updated equipped special powers for ${player.name}.`);
    } else {
      setFeedback(res.reason ?? 'Unable to toggle special power.');
    }
  };

  const handleRetrain = () => {
    const res = retrainPlayerSkills(player.id);
    if (res.refundedSp > 0) {
      soundEngine.play('cash_chime');
      setSessionUnlockedByPlayer((prev) => ({ ...prev, [player.id]: [] }));
      setFeedback(
        `Retrained ${player.name}: refunded ${res.refundedSp} SP ($${SKILL_RESPEC_CASH_FEE.toLocaleString()}).`,
      );
    } else {
      setFeedback(res.reason ?? 'Unable to retrain right now.');
    }
  };

  const handleApplyCoachPicksPlayer = () => {
    const res = applyCoachSkillsForPlayer(player.id);
    if (res.unlockedCount > 0) {
      soundEngine.play('level_up');
      setFeedback(`Coach Pops awakened for ${player.name}: ${res.unlockedNodeNames.join(', ')}!`);
    } else {
      setFeedback(`${player.name} has no unlockable Coach's Picks right now.`);
    }
  };

  const handleApplyCoachPicksRoster = () => {
    const res = applyCoachSkillsForRoster();
    if (res.appliedSummary.length > 0) {
      soundEngine.play('level_up');
      setFeedback(`Auto-spent SP across ${res.appliedSummary.length} player(s): ${res.appliedSummary.slice(0, 3).join(' • ')}`);
    } else {
      setFeedback('No players currently have unlockable Coach Picks.');
    }
  };

  const handleSelectSkillTreeMode = (mode: SkillTreeAssistMode) => {
    setSkillTreeMode(mode);
    soundEngine.play('ui_pop');
    if (mode === 'auto') {
      const res = applyCoachSkillsForRoster();
      setFeedback(
        res.appliedSummary.length > 0
          ? `Skill Assistant set to Auto — applied ${res.appliedSummary.length} upgrade(s)!`
          : 'Skill Assistant set to Auto — Coaching Staff will automatically spend earned SP after games.',
      );
    } else if (mode === 'semi_auto') {
      setFeedback("Skill Assistant set to Ask Me — Coach's Picks glow in the constellation for 1-tap approval.");
    } else {
      setFeedback('Skill Assistant set to Manual — full hands-on control over every constellation star.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-2 rounded-2xl border-2 border-[#181B2C] bg-[#FFF3BF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 shadow-[3px_3px_0_#181B2C]">
        <div className="text-[10.5px] sm:text-xs font-extrabold text-[#181B2C] leading-tight">
          ⚡ Build real player &amp; manager identities — mix Tier 1–2 skills for balanced builds or lock in a Tier-3 Capstone!
        </div>
        <div className="grid grid-cols-2 sm:flex gap-1.5 shrink-0">
          <ComicButton
            size="sm"
            variant={treeMode === 'players' ? 'gold' : 'cream'}
            active={treeMode === 'players'}
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => setTreeMode('players')}
            className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
          >
            Player Skill Trees{totalPlayerSp > 0 ? ` (${totalPlayerSp} SP)` : ''}
          </ComicButton>
          <ComicButton
            size="sm"
            variant={treeMode === 'manager' ? 'violet' : 'cream'}
            active={treeMode === 'manager'}
            icon={<Award className="w-3.5 h-3.5" />}
            onClick={() => setTreeMode('manager')}
            className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
          >
            Manager Skill Tree{managerSp > 0 ? ` (${managerSp} SP)` : ''}
          </ComicButton>
        </div>
      </div>

      {treeMode === 'manager' && manager && managerIdentity ? (
        <ComicCard
          title={`MANAGER SKILL TREE — ${manager.name.toUpperCase()} (LV.${manager.level})`}
          subtitle={`${manager.skillPoints} Manager SP Ready • Max ${MANAGER_SKILL_SP_CAP} / 15 SP & 1 Tier-4 Capstone — shape your GM identity`}
          headerBg="#7209B7"
        >
          <div data-testid="manager-skill-tree-panel" className="space-y-3">
            <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  data-testid="manager-legacy-budget"
                  className="font-display text-xs text-[#181B2C]"
                >
                  Manager Legacy Budget: {managerIdentity.spentSp} / {managerIdentity.maxSp} SP
                </div>
                <span
                  data-testid="manager-build-identity"
                  className={`px-2 py-0.5 rounded-lg border-2 border-[#181B2C] text-[11px] font-display ${MANAGER_TONE_CLASSES[managerIdentity.tone]}`}
                >
                  {managerIdentity.label}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full border-2 border-[#181B2C] bg-[#EFECE4] overflow-hidden">
                <div
                  className="h-full bg-[#7209B7] transition-all"
                  style={{ width: `${managerBudgetPct}%` }}
                />
              </div>
              <p className="text-[10.5px] font-bold text-[#4A5068]">
                Spread points across Tier 1–3 as a Balanced GM, or commit to 1 Tier-4 Capstone (Skipper Legend, Player-Dev Guru, or Cash Mogul).
              </p>
            </div>

            {feedback ? (
              <div
                data-testid="skill-tree-feedback"
                className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]"
              >
                {feedback}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {MANAGER_SKILL_NODES.map((node) => {
                const owned = manager.unlockedNodeIds.includes(node.id);
                const check = canUnlockManagerSkillNode(manager, node.id);
                const isCapstone = node.spCost >= 2;
                const isCapstoneLocked = !owned && isCapstone && Boolean(managerIdentity.capstoneId);
                return (
                  <div
                    key={node.id}
                    className={`p-3 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
                      owned ? 'bg-[#D8F3DC]' : check.allowed ? 'bg-[#FFF3BF]' : 'bg-[#FFFDF7]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-xs font-display text-[#181B2C]">
                        <span>{node.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] text-[10px] uppercase shrink-0">
                          {node.branch}
                        </span>
                      </div>
                      {isCapstoneLocked ? (
                        <span
                          data-testid={`manager-capstone-locked-${node.id}`}
                          className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md border border-[#181B2C] bg-[#FFE5EC] text-[#9D0208] text-[10px] font-extrabold"
                        >
                          🔒 Capstone Locked
                        </span>
                      ) : null}
                      <p className="text-[11px] font-bold text-[#4A5068] mt-1">{node.description}</p>
                    </div>
                    <ComicButton
                      size="sm"
                      data-testid={`manager-node-btn-${node.id}`}
                      variant={owned ? 'turf' : check.allowed ? 'gold' : 'cream'}
                      disabled={owned || !check.allowed}
                      onClick={() => {
                        const res = unlockHumanManagerNode(node.id);
                        if (res.unlocked) {
                          soundEngine.play('level_up');
                          setFeedback(`Unlocked Manager Skill: ${node.name}!`);
                        } else {
                          setFeedback(res.reason ?? 'Unable to unlock Manager node.');
                        }
                      }}
                    >
                      {owned
                        ? 'Unlocked ✓'
                        : check.allowed
                          ? `Unlock (${node.spCost} SP)`
                          : isCapstoneLocked
                            ? '🔒 Capstone Locked'
                            : check.reason ?? `Unlock (${node.spCost} SP)`}
                    </ComicButton>
                  </div>
                );
              })}
            </div>
          </div>
        </ComicCard>
      ) : (
      <ComicCard
        title="PLAYER SKILL TREES & HERITAGE MASTERY"
        subtitle={`${humanClub.city} ${humanClub.name} • Cash $${humanClub.economy.cash.toLocaleString()} • Balanced Tier 1–2 across lanes OR 1 Tier-3 Capstone specialist`}
        headerBg="#1D3557"
      >
        <div className="space-y-2.5">
          {/* Roster Selector Strip (SP-ready players & ⭐ Favorites sorted first!) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#4A5068]">
              <span>Select Player (swipe →)</span>
              {sortedRoster.filter((p) => p.skillPoints > 0).length > 0 ? (
                <span
                  data-testid="skill-tree-ready-hint"
                  className="px-1.5 py-0.5 rounded bg-[#E63946] text-white text-[9.5px] font-display"
                >
                  ⚡ {sortedRoster.filter((p) => p.skillPoints > 0).length} ready →
                </span>
              ) : null}
            </div>
            <div data-testid="skill-tree-player-strip" className="flex gap-2 overflow-x-auto pb-1">
              {sortedRoster.map((p) => {
                const selected = p.id === player.id;
                const isFav = favoritePlayerIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayerId(p.id);
                      setActiveBranch(null);
                      setFeedback(null);
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] text-left min-h-[44px] cursor-pointer transition ${
                      selected
                        ? 'bg-[#FFC300] shadow-[3px_3px_0_#181B2C]'
                        : p.skillPoints > 0
                          ? 'bg-[#FFF3BF]'
                          : 'bg-[#FFFDF7]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-display text-xs text-[#181B2C]">
                      <PlayerPortraitBadge
                        player={p}
                        primaryColor={humanClub.colors.primary}
                        accentColor={humanClub.colors.accent}
                        size="xs"
                      />
                      <FlagBadge nationalityId={p.nationalityId} size="sm" />
                      <span>
                        {isFav ? '⭐ ' : ''}
                        {p.position} {p.name}
                      </span>
                      {p.skillPoints > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#E63946] text-white text-[9px] font-display">
                          ⚡ {p.skillPoints} SP
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] font-extrabold text-[#4A5068]">
                      LV.{p.level} • {p.skillPoints} SP • OVR {computePlayerOverall(p)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {feedback ? (
            <div
              data-testid="skill-tree-feedback"
              className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]"
            >
              {feedback}
            </div>
          ) : null}

          {/* Selected Player Summary + Career Talent Budget + Build Identity + Undo/Retrain */}
          <div
            data-testid="skill-tree-player-summary"
            className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <PlayerPortraitBadge
                  player={player}
                  primaryColor={humanClub.colors.primary}
                  accentColor={humanClub.colors.accent}
                  size="xs"
                  testId="skill-tree-player-portrait"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FlagBadge nationalityId={player.nationalityId} size="sm" />
                    <span className="font-display text-xs sm:text-sm text-[#181B2C] truncate">
                      {player.name} ({player.position})
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-display text-[10px]">
                      {player.skillPoints} SP Available
                    </span>
                    <span
                      data-testid="player-build-identity"
                      className={`px-2 py-0.5 rounded-md border border-[#181B2C] font-display text-[10px] ${BUILD_TONE_CLASSES[buildIdentity.tone]}`}
                    >
                      {formatBuildIdentityPill(buildIdentity)}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-bold text-[#4A5068]">
                    {SPECIALIST_LABELS[player.specialistArchetype]} • Powers:{' '}
                    {player.equippedPowerIds.length}/{maxPowerSlots} • Heritage:{' '}
                    {player.heritageTierUnlocked}/3
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {sessionStack.length > 0 ? (
                  <ComicButton
                    size="sm"
                    variant="sky"
                    data-testid="skill-tree-undo-btn"
                    icon={<Undo2 className="w-3.5 h-3.5" />}
                    onClick={handleUndoLast}
                  >
                    ↩ Undo Last
                  </ComicButton>
                ) : null}
                {player.unlockedSkillIds.length > 0 ? (
                  <ComicButton
                    size="sm"
                    variant="coral"
                    data-testid="skill-tree-retrain-btn"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    disabled={!retrainCheck.allowed}
                    title={retrainCheck.reason ?? 'Full Offseason skill retrain'}
                    onClick={handleRetrain}
                  >
                    {retrainsUsed >= MAX_CAREER_RETRAINS_PER_PLAYER
                      ? 'Retrain Used (1/1)'
                      : `Offseason Retrain ($${SKILL_RESPEC_CASH_FEE.toLocaleString()} · 1/career)`}
                  </ComicButton>
                ) : null}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10.5px] font-extrabold text-[#181B2C]">
                <span data-testid="career-talent-budget">
                  Career Talent: {buildIdentity.spentSp} / {buildIdentity.maxSp} SP
                  {buildIdentity.remainingBudgetSp === 0 ? ' (Cap Reached)' : ` (${buildIdentity.remainingBudgetSp} SP room)`}
                </span>
                {player.unlockedSkillIds.length > 0 && !retrainCheck.allowed && retrainCheck.reason ? (
                  <span className="text-[10px] font-bold text-[#9D0208]">
                    {retrainCheck.reason}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#4A5068]">
                    Balanced = Tier 1–2 across lanes • Specialist = 1 Tier-3 Capstone
                  </span>
                )}
              </div>
              <div className="h-2 w-full rounded-full border border-[#181B2C] bg-[#EFECE4] overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    buildIdentity.remainingBudgetSp === 0 ? 'bg-[#E63946]' : 'bg-[#2FB356]'
                  }`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3-Mode Skill Assistant Bar (Auto / Ask Me / Manual) + 1-Tap Coach Picks */}
          <div
            data-testid="skill-tree-assist-bar"
            className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[10.5px] uppercase text-[#1D3557]">
                Skill Assistant:
              </span>
              {(
                [
                  { id: 'auto', label: '🤖 Auto' },
                  { id: 'semi_auto', label: '💡 Ask Me' },
                  { id: 'manual', label: '🛠️ Manual' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`skill-assist-mode-${opt.id}`}
                  aria-pressed={skillTreeMode === opt.id}
                  onClick={() => handleSelectSkillTreeMode(opt.id)}
                  className={`px-2.5 py-1 min-h-[36px] rounded-lg border-2 border-[#181B2C] font-display text-[10.5px] cursor-pointer transition ${
                    skillTreeMode === opt.id
                      ? 'bg-[#1D3557] text-[#FFD166] shadow-[2px_2px_0_#181B2C]'
                      : 'bg-[#FFFDF7] text-[#181B2C] hover:bg-[#FFF3BF]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {player.skillPoints > 0 && coachRecommendation ? (
                <ComicButton
                  size="sm"
                  data-testid="apply-coach-picks-player-btn"
                  variant="gold"
                  onClick={handleApplyCoachPicksPlayer}
                >
                  ⚡ Apply Coach&apos;s Picks ({player.name.split(' ')[0]})
                </ComicButton>
              ) : null}
              {totalPlayerSp > 0 ? (
                <ComicButton
                  size="sm"
                  data-testid="apply-coach-picks-roster-btn"
                  variant="turf"
                  onClick={handleApplyCoachPicksRoster}
                >
                  ⚡ Auto-Spend Club SP ({totalPlayerSp})
                </ComicButton>
              ) : null}
            </div>
          </div>

          {/* 3-Tier Cultural Heritage Branch (TASK-020, TASK-134) */}
          <div
            data-testid="heritage-crest-card"
            className="p-2 sm:p-3 rounded-xl border-2 border-[#181B2C] bg-[#F6EEFF] space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-display text-[11px] sm:text-xs text-[#4A148C] min-w-0">
                <Star className="w-4 h-4 fill-[#FFC300] text-[#181B2C] shrink-0" />
                <span className="truncate">
                  {heritageBranch.nationName} Heritage: {heritageBranch.ability.name}
                </span>
              </div>
              <ComicButton
                size="sm"
                variant="violet"
                disabled={!nextHeritage.allowed}
                onClick={handleUnlockHeritage}
                aria-label={
                  player.heritageTierUnlocked >= 3
                    ? 'Heritage Mastered'
                    : `Unlock Tier ${player.heritageTierUnlocked + 1} (${nextHeritage.nextTier?.spCost ?? 0} SP)`
                }
                className="shrink-0 whitespace-nowrap px-2 text-[10.5px] sm:text-xs"
              >
                {player.heritageTierUnlocked >= 3 ? (
                  'Mastered ✓'
                ) : (
                  <>
                    <span className="sm:hidden">
                      Unlock T{player.heritageTierUnlocked + 1} ({nextHeritage.nextTier?.spCost ?? 0} SP)
                    </span>
                    <span className="hidden sm:inline">
                      Unlock Tier {player.heritageTierUnlocked + 1} ({nextHeritage.nextTier?.spCost ?? 0} SP)
                    </span>
                  </>
                )}
              </ComicButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10.5px] font-bold">
              <div className="px-2 py-1 rounded-lg border border-[#181B2C]/30 bg-white text-[#181B2C]">
                <span className="font-display text-[#9D0208]">🏏 Batting:</span> {heritageGuide.battingEffectSummary}
              </div>
              <div className="px-2 py-1 rounded-lg border border-[#181B2C]/30 bg-white text-[#181B2C]">
                <span className="font-display text-[#1D3557]">⚾ Pitching:</span> {heritageGuide.pitchingEffectSummary}
              </div>
              <div className="px-2 py-1 rounded-lg border border-[#181B2C]/30 bg-[#FFF3BF] text-[#181B2C]">
                <span className="font-display text-[#7A4F01]">🎯 Best When (+35%):</span> {heritageGuide.bestWhenLabel}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {heritageBranch.tiers.map((tierNode) => {
                const owned = player.heritageTierUnlocked >= tierNode.tier;
                return (
                  <div
                    key={tierNode.tier}
                    className={`p-1.5 sm:p-2.5 rounded-xl border-2 border-[#181B2C] ${
                      owned ? 'bg-[#D8F3DC]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[9.5px] sm:text-xs font-display text-[#181B2C]">
                      <span className="truncate">T{tierNode.tier}</span>
                      <span className="shrink-0">{owned ? '✓' : `${tierNode.spCost}SP`}</span>
                    </div>
                    <p className="text-[9.5px] sm:text-[11px] font-bold text-[#4A5068] mt-0.5 leading-tight line-clamp-3 sm:line-clamp-none">
                      {tierNode.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Branch Switcher */}
          <div className="flex flex-wrap gap-2">
            {availableBranches.map((branch) => (
              <ComicButton
                key={branch}
                size="sm"
                variant={currentBranch === branch ? 'gold' : 'cream'}
                active={currentBranch === branch}
                onClick={() => {
                  setActiveBranch(branch);
                  setSelectedStarId(null);
                }}
              >
                {BRANCH_LABELS[branch]}
              </ComicButton>
            ))}
          </div>

          {/* Skyrim-Inspired Ballpark Night-Sky Constellation Map */}
          <SkillTreeConstellation
            player={player}
            branch={currentBranch}
            selectedNodeId={selectedStarId}
            coachRecommendation={coachRecommendation}
            onSelectNode={(nodeId) => setSelectedStarId(nodeId)}
            onUnlockNode={handleUnlockNode}
            onTogglePower={handleTogglePower}
          />

          {/* Branching Tier 1 -> Tier 2 -> Tier 3 Capstone Grid */}
          <div className="space-y-3">
            {([1, 2, 3] as const).map((tier) => {
              const tierNodes = branchNodes.filter((n) => n.tier === tier);
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                    {tier === 3
                      ? 'Tier 3 — Capstone Specializations (1 lane max; All-Stars / Lv 12 unlock 1 Primary + 1 Fielder)'
                      : `Tier ${tier} — Foundation & Balanced Upgrades`}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {tierNodes.map((node) => {
                      const isUnlocked = player.unlockedSkillIds.includes(node.id);
                      const check = canUnlockSkillNode(player, node.id);
                      const isEquipped =
                        node.capstonePowerId !== undefined &&
                        player.equippedPowerIds.includes(node.capstonePowerId);
                      const isSpecializedOut =
                        !isUnlocked &&
                        node.tier === 3 &&
                        !check.allowed &&
                        Boolean(check.reason && /specialized in|max \d+ tier-3 capstone/i.test(check.reason));
                      return (
                        <div
                          key={node.id}
                          className={`p-3 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
                            isUnlocked
                              ? 'bg-[#D8F3DC]'
                              : check.allowed
                                ? 'bg-[#FFFDF7] shadow-[3px_3px_0_#181B2C]'
                                : 'bg-[#EFECE4] opacity-85'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-display text-xs text-[#181B2C]">
                                {node.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] text-[10px] font-extrabold shrink-0">
                                {node.spCost} SP
                              </span>
                            </div>
                            {isSpecializedOut ? (
                              <span
                                data-testid={`capstone-locked-pill-${node.id}`}
                                title={check.reason}
                                className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md border border-[#181B2C] bg-[#FFE5EC] text-[#9D0208] text-[10px] font-extrabold"
                              >
                                🔒 Specialized
                              </span>
                            ) : null}
                            <p className="text-[11px] font-bold text-[#4A5068] mt-1">
                              {node.description}
                            </p>
                          </div>

                          {isUnlocked ? (
                            node.capstonePowerId ? (
                              <ComicButton
                                size="sm"
                                variant={isEquipped ? 'turf' : 'sky'}
                                icon={<Sparkles className="w-3.5 h-3.5" />}
                                onClick={() => handleTogglePower(node.capstonePowerId!)}
                              >
                                {isEquipped ? 'Equipped ✓' : 'Equip Power'}
                              </ComicButton>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-xs font-extrabold text-[#1B4332]">
                                <Check className="w-3.5 h-3.5" /> Unlocked
                              </div>
                            )
                          ) : (
                            <ComicButton
                              size="sm"
                              variant={check.allowed ? 'turf' : 'cream'}
                              icon={check.allowed ? undefined : <Lock className="w-3.5 h-3.5" />}
                              disabled={!check.allowed}
                              onClick={() => handleUnlockNode(node.id, node.name)}
                            >
                              {check.allowed
                                ? `Unlock (${node.spCost} SP)`
                                : isSpecializedOut
                                  ? '🔒 Specialized'
                                  : check.reason ?? 'Locked'}
                            </ComicButton>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ComicCard>
      )}
    </div>
  );
}
