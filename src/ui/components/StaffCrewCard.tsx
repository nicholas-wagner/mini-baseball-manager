import { Lock, Sparkles, Star } from 'lucide-react';
import { STAFF_ROLE_LABELS } from '../../engine/gm/coaches';
import {
  getNextStaffAbility,
  getStaffRankInfo,
  getStaffUnlockedAbilities,
} from '../../engine/gm/staffProgression';
import type { StaffMember } from '../../engine/models/manager';
import { ComicButton } from '../design-system/ComicButton';

interface StaffCrewCardProps {
  member: StaffMember;
  mode: 'active' | 'market';
  replacingMember?: StaffMember | null;
  onRecruit?: () => void;
  onClinic?: () => void;
  onLetGo?: () => void;
}

export function StaffCrewCard({
  member,
  mode,
  replacingMember = null,
  onRecruit,
  onClinic,
  onLetGo,
}: StaffCrewCardProps) {
  const rank = getStaffRankInfo(member.level);
  const unlockedAbilities = getStaffUnlockedAbilities(member);
  const nextAbility = getNextStaffAbility(member);
  const xpPct = rank.xpToNext
    ? Math.min(100, Math.round((member.xp / Math.max(1, rank.xpToNext)) * 100))
    : 100;

  return (
    <div
      data-testid={mode === 'active' ? `active-staff-card-${member.id}` : `market-staff-card-${member.id}`}
      className={`p-2.5 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
        rank.isMaxLocked
          ? 'bg-gradient-to-br from-[#FFFDF7] via-[#FFF8E1] to-[#FFE08A]'
          : mode === 'active'
            ? 'bg-[#D8F3DC]'
            : 'bg-[#FFFDF7]'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-xs text-[#181B2C] truncate">{member.name}</span>
              <span
                data-testid={`staff-rank-badge-${member.id}`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-[#181B2C] font-display text-[9.5px] uppercase shrink-0"
                style={{ backgroundColor: rank.badgeBg, color: rank.badgeText }}
              >
                {rank.isMaxLocked ? <Lock className="w-2.5 h-2.5" /> : <Star className="w-2.5 h-2.5" />}
                {rank.label}
                {rank.isMaxLocked ? ' · MAX' : ` (R${member.level})`}
              </span>
            </div>
            <div className="text-[10.5px] font-extrabold text-[#1D3557] mt-0.5">
              {STAFF_ROLE_LABELS[member.role]} • {member.specialtyLabel}
            </div>
          </div>
          <span className="font-mono-tabular text-[11px] font-extrabold text-[#1B4332] shrink-0">
            ${member.salaryPerSeason.toLocaleString()}/yr
          </span>
        </div>

        {/* XP / Rank Progress Bar */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[9.5px] font-extrabold text-[#4A5068]">
            <span>
              {rank.isMaxLocked
                ? '★ Legendary Rank Locked (Peak Mastery)'
                : `Rank XP: ${member.xp} / ${rank.xpToNext} → ${getStaffRankInfo((member.level + 1) as StaffMember['level']).label}`}
            </span>
            <span>{xpPct}%</span>
          </div>
          <div className="h-2 rounded-full border border-[#181B2C] bg-white overflow-hidden">
            <div
              className={`h-full transition-all ${rank.isMaxLocked ? 'bg-[#FFC300]' : 'bg-[#2FB356]'}`}
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>

        <div className="text-[10px] font-bold text-[#1B4332]">+ {member.perkSummary}</div>
        <div className="text-[10px] font-bold text-[#9D0208]">− {member.tradeOffSummary}</div>

        {/* Learned Rank Abilities */}
        {unlockedAbilities.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {unlockedAbilities.map((ab) => (
              <span
                key={ab.id}
                title={ab.effectText}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] text-[9.5px] font-extrabold"
              >
                <Sparkles className="w-2.5 h-2.5" />
                {ab.name}
              </span>
            ))}
          </div>
        ) : null}

        {nextAbility ? (
          <div className="text-[9.5px] font-bold text-[#4A5068]">
            Next Unlock at {getStaffRankInfo(nextAbility.unlockLevel).label}:{' '}
            <span className="text-[#1D3557]">{nextAbility.name}</span> ({nextAbility.effectText})
          </div>
        ) : null}

        {mode === 'market' && replacingMember ? (
          <div className="px-2 py-1 rounded-lg bg-[#FFF3BF] border border-[#181B2C]/40 text-[10px] font-extrabold text-[#7A4F01]">
            Replaces current {STAFF_ROLE_LABELS[replacingMember.role]}: {replacingMember.name} (
            {getStaffRankInfo(replacingMember.level).label}, $
            {replacingMember.salaryPerSeason.toLocaleString()}/yr)
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {mode === 'active' ? (
          <>
            {onClinic ? (
              <ComicButton
                size="sm"
                variant={rank.isMaxLocked ? 'cream' : 'gold'}
                disabled={rank.isMaxLocked}
                onClick={onClinic}
              >
                {rank.isMaxLocked ? '🔒 Legendary Max' : `Clinic +1 Rank ($${(member.level * 1200).toLocaleString()})`}
              </ComicButton>
            ) : null}
            {onLetGo ? (
              <ComicButton size="sm" variant="coral" onClick={onLetGo}>
                Let Go
              </ComicButton>
            ) : null}
          </>
        ) : onRecruit ? (
          <ComicButton
            size="sm"
            variant={member.role === 'team_doctor' ? 'sky' : 'turf'}
            onClick={onRecruit}
          >
            {replacingMember
              ? `Replace ${STAFF_ROLE_LABELS[member.role].split(' ')[0]}`
              : `Hire ${STAFF_ROLE_LABELS[member.role].split(' ')[0]}`}
          </ComicButton>
        ) : null}
      </div>
    </div>
  );
}
