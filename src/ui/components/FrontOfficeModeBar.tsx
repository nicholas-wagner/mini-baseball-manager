import { useState } from 'react';
import { Briefcase, Sparkles } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  evaluateRoutineFrontOfficePlan,
  FRONT_OFFICE_MODE_OPTIONS,
  type FrontOfficeMode,
} from '../../engine/gm/frontOfficeMode';
import type { ThrowsHand } from '../../engine/handedness/types';
import type { Club } from '../../engine/models/club';
import { runHumanRoutineFrontOfficePass } from '../../store/clubHubActions';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ComicButton } from '../design-system/ComicButton';

interface FrontOfficeModeBarProps {
  club: Club;
  opponentStarterThrows?: ThrowsHand;
  compact?: boolean;
  onApplied?: (summary: string) => void;
}

export function FrontOfficeModeBar({
  club,
  opponentStarterThrows,
  compact = false,
  onApplied,
}: FrontOfficeModeBarProps) {
  const frontOfficeMode = useUserPreferencesStore((s) => s.frontOfficeMode);
  const setFrontOfficeMode = useUserPreferencesStore((s) => s.setFrontOfficeMode);
  const [feedback, setFeedback] = useState<string | null>(null);

  const plan = evaluateRoutineFrontOfficePlan(club, opponentStarterThrows);
  const activeMeta =
    FRONT_OFFICE_MODE_OPTIONS.find((opt) => opt.id === frontOfficeMode) ??
    FRONT_OFFICE_MODE_OPTIONS[0];

  const handleModeChange = (mode: FrontOfficeMode) => {
    setFrontOfficeMode(mode);
    setFeedback(null);
    soundEngine.play('ui_pop');
  };

  const handleApplyChecklist = () => {
    const res = runHumanRoutineFrontOfficePass(opponentStarterThrows);
    const msg = res.applied
      ? `✓ Assistant GM applied: ${res.actions.join(' ')}`
      : '✓ Front office is already spotless!';
    setFeedback(msg);
    onApplied?.(msg);
    soundEngine.play(res.applied ? 'level_up' : 'ui_pop');
  };

  return (
    <div
      data-testid="front-office-mode-bar"
      className={`${
        compact ? 'p-2.5' : 'p-3'
      } rounded-2xl border-2 border-[#181B2C] bg-[#FFF8E7] shadow-[2px_2px_0_#181B2C] space-y-2`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Briefcase className="w-4 h-4 text-[#1D3557] shrink-0" />
          <span className="font-display text-xs text-[#181B2C]">
            ASSISTANT GM / FRONT OFFICE
          </span>
        </div>
        <div
          role="group"
          aria-label="Front office mode"
          className="inline-flex items-center rounded-lg border-2 border-[#193E37] bg-[#FFFDF7] p-0.5 gap-0.5"
        >
          {FRONT_OFFICE_MODE_OPTIONS.map((opt) => {
            const active = frontOfficeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.description}
                aria-pressed={active}
                onClick={() => handleModeChange(opt.id)}
                className={`px-2 py-0.5 min-h-[32px] rounded-md font-heading font-extrabold text-[10.5px] leading-none cursor-pointer transition ${
                  active
                    ? 'bg-[#224F49] text-[#FFCC49]'
                    : 'bg-transparent text-[#193D37] hover:bg-[#FFF3BF]'
                }`}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] font-bold text-[#4A5068]">{activeMeta.description}</p>

      {plan.needsAction && frontOfficeMode !== 'manual' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-[#181B2C]/20">
          <div className="flex flex-wrap gap-1">
            {plan.items.map((item) => (
              <span
                key={item.kind}
                className="px-2 py-0.5 rounded-lg border border-[#181B2C] bg-[#FFF3BF] text-[10.5px] font-extrabold text-[#181B2C]"
              >
                📋 {item.label}
              </span>
            ))}
          </div>
          <ComicButton
            size="sm"
            variant="turf"
            data-testid="front-office-apply-btn"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={handleApplyChecklist}
          >
            {frontOfficeMode === 'auto' ? 'Run Assistant GM Now' : 'Apply Checklist'}
          </ComicButton>
        </div>
      ) : null}

      {feedback ? (
        <div
          role="status"
          className="px-2.5 py-1 rounded-lg border border-[#1B4332] bg-[#D8F3DC] text-[#1B4332] text-[11px] font-extrabold"
        >
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
