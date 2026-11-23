import { useState } from 'react';
import { Award, Check, Lock, RotateCcw, Sparkles, Star } from 'lucide-react';
import { FlagBadge } from '../../art/flags/FlagBadge';
import { soundEngine } from '../../audio/soundEngine';
import { sortPlayersForSkillTree } from '../../engine/gm/openingDayHook';
import {
  MANAGER_SKILL_NODES,
  unlockManagerSkillNode,
} from '../../engine/manager/managerTree';
import {
  computePlayerOverall,
  SPECIALIST_LABELS,
} from '../../engine/models/player';
import {
  canUnlockNextHeritageTier,
  getHeritageBranch,
} from '../../engine/rpg/heritageTrees';
import {
  canUnlockSkillNode,
  getAvailableSkillBranches,
  getMaxEquippedPowerSlots,
  getNodesForBranch,
  SKILL_RESPEC_CASH_FEE,
  type SkillBranchId,
} from '../../engine/rpg/skillTrees';
import { unlockHumanManagerNode } from '../../store/clubHubActions';
import { useGameStore } from '../../store/gameStore';
import { PlayerPortraitBadge } from '../components/PlayerPortraitBadge';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

const BRANCH_LABELS: Record<SkillBranchId, string> = {
  pitcher: 'Pitching Mastery Tree',
  batter: 'Batting Mastery Tree',
  fielder: 'Defensive Craft Tree',
};

export function SkillTreeScreen() {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const manager = useGameStore((s) => s.manager);
  const favoritePlayerIds = useGameStore((s) => s.favoritePlayerIds);
  const unlockPlayerSkill = useGameStore((s) => s.unlockPlayerSkill);
  const unlockPlayerHeritageTier = useGameStore((s) => s.unlockPlayerHeritageTier);
  const togglePlayerSpecialPower = useGameStore((s) => s.togglePlayerSpecialPower);
  const respecPlayerSkillTree = useGameStore((s) => s.respecPlayerSkillTree);

  const [treeMode, setTreeMode] = useState<'players' | 'manager'>('players');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [activeBranch, setActiveBranch] = useState<SkillBranchId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!humanClub) return null;

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
  const nextHeritage = canUnlockNextHeritageTier(player);
  const maxPowerSlots = getMaxEquippedPowerSlots(player.level);

  const handleUnlockNode = (nodeId: string, nodeName: string) => {
    const res = unlockPlayerSkill(player.id, nodeId);
    if (res.unlocked) {
      soundEngine.play('level_up');
      setFeedback(`Unlocked ${nodeName} for ${player.name}!`);
    } else {
      setFeedback(res.reason ?? 'Unable to unlock skill node.');
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

  const handleRespec = () => {
    const res = respecPlayerSkillTree(player.id);
    if (res.refundedSp > 0) {
      soundEngine.play('cash_chime');
      setFeedback(`Respecced ${player.name}: refunded ${res.refundedSp} SP ($${SKILL_RESPEC_CASH_FEE}).`);
    } else {
      setFeedback(res.reason ?? 'Nothing to respec.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-2.5 rounded-2xl border-2 border-[#181B2C] bg-[#FFF3BF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-[3px_3px_0_#181B2C]">
        <div className="text-[11px] sm:text-xs font-extrabold text-[#181B2C] leading-snug">
          ⚡ Spend <span className="underline">Skill Points (SP)</span> for Heritage &amp; Special Powers — base stats auto-level!
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

      {treeMode === 'manager' && manager ? (
        <ComicCard
          title={`MANAGER SKILL TREE — ${manager.name.toUpperCase()} (LV.${manager.level})`}
          subtitle={`${manager.skillPoints} Manager SP Ready • Unlock Skipper Powers, Coaching Boosts & Mogul Bonuses`}
          headerBg="#7209B7"
        >
          <div data-testid="manager-skill-tree-panel" className="space-y-3">
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
                const check = unlockManagerSkillNode(manager, node.id);
                return (
                  <div
                    key={node.id}
                    className={`p-3 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
                      owned ? 'bg-[#D8F3DC]' : check.unlocked ? 'bg-[#FFF3BF]' : 'bg-[#FFFDF7]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-xs font-display text-[#181B2C]">
                        <span>{node.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] text-[10px] uppercase">
                          {node.branch}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-[#4A5068] mt-1">{node.description}</p>
                    </div>
                    <ComicButton
                      size="sm"
                      variant={owned ? 'turf' : check.unlocked ? 'gold' : 'cream'}
                      disabled={owned || !check.unlocked}
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
                      {owned ? 'Unlocked ✓' : `Unlock (${node.spCost} SP)`}
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
        subtitle={`${humanClub.city} ${humanClub.name} • Cash $${humanClub.economy.cash.toLocaleString()} • Spend SP to evolve specialists & unlock scarce finishers`}
        headerBg="#1D3557"
      >
        <div className="space-y-3">
          {/* Roster Selector Strip (SP-ready players & ⭐ Favorites sorted first!) */}
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

          {feedback ? (
            <div
              data-testid="skill-tree-feedback"
              className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]"
            >
              {feedback}
            </div>
          ) : null}

          {/* Selected Player Summary Header with Cute Manga Portrait */}
          <div className="p-2.5 sm:p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <PlayerPortraitBadge
                player={player}
                primaryColor={humanClub.colors.primary}
                accentColor={humanClub.colors.accent}
                size="md"
                testId="skill-tree-player-portrait"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <FlagBadge nationalityId={player.nationalityId} />
                  <span className="font-display text-sm text-[#181B2C]">
                    {player.name} ({player.position})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-display text-[11px]">
                    {player.skillPoints} SP Available
                  </span>
                </div>
                <div className="text-[11px] font-bold text-[#4A5068] mt-0.5">
                  {SPECIALIST_LABELS[player.specialistArchetype]} • Powers:{' '}
                  {player.equippedPowerIds.length}/{maxPowerSlots} • Heritage:{' '}
                  {player.heritageTierUnlocked}/3
                </div>
              </div>
            </div>
            {player.unlockedSkillIds.length > 0 ? (
              <ComicButton
                size="sm"
                variant="coral"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleRespec}
              >
                Respec (${SKILL_RESPEC_CASH_FEE})
              </ComicButton>
            ) : null}
          </div>

          {/* 3-Tier Cultural Heritage Branch (TASK-020) */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#F6EEFF] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-display text-xs text-[#4A148C]">
                <Star className="w-4 h-4 fill-[#FFC300] text-[#181B2C]" />
                {heritageBranch.nationName} Heritage Branch: {heritageBranch.ability.name} (
                {heritageBranch.ability.mythOrAnimal})
              </div>
              <ComicButton
                size="sm"
                variant="violet"
                disabled={!nextHeritage.allowed}
                onClick={handleUnlockHeritage}
              >
                {player.heritageTierUnlocked >= 3
                  ? 'Heritage Mastered ✓'
                  : `Unlock Tier ${player.heritageTierUnlocked + 1} (${nextHeritage.nextTier?.spCost ?? 0} SP)`}
              </ComicButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {heritageBranch.tiers.map((tierNode) => {
                const owned = player.heritageTierUnlocked >= tierNode.tier;
                return (
                  <div
                    key={tierNode.tier}
                    className={`p-2.5 rounded-xl border-2 border-[#181B2C] ${
                      owned ? 'bg-[#D8F3DC]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-display text-[#181B2C]">
                      <span>{tierNode.title}</span>
                      <span>{owned ? '✓' : `${tierNode.spCost} SP`}</span>
                    </div>
                    <p className="text-[11px] font-bold text-[#4A5068] mt-1">
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
                onClick={() => setActiveBranch(branch)}
              >
                {BRANCH_LABELS[branch]}
              </ComicButton>
            ))}
          </div>

          {/* Branching Tier 1 -> Tier 2 -> Tier 3 Capstone Grid */}
          <div className="space-y-3">
            {([1, 2, 3] as const).map((tier) => {
              const tierNodes = branchNodes.filter((n) => n.tier === tier);
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                    {tier === 3
                      ? 'Tier 3 — Capstone Special Powers (Scarce Limited-Charge Finishers)'
                      : `Tier ${tier} — Foundation & Specialist Upgrades`}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {tierNodes.map((node) => {
                      const isUnlocked = player.unlockedSkillIds.includes(node.id);
                      const check = canUnlockSkillNode(player, node.id);
                      const isEquipped =
                        node.capstonePowerId !== undefined &&
                        player.equippedPowerIds.includes(node.capstonePowerId);
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
                              {check.allowed ? `Unlock (${node.spCost} SP)` : check.reason ?? 'Locked'}
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
