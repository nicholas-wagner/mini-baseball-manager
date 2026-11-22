import { ArrowRight, CheckCircle2, Dumbbell, FastForward, Sparkles } from 'lucide-react';
import type {
  ManagerActionInbox,
  ManagerJumpTarget,
} from '../../engine/gm/managerActionInbox';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface ManagerClipboardBannerProps {
  clubName: string;
  recordLabel: string;
  cash: number;
  seriesIndex: number;
  inbox: ManagerActionInbox;
  quickFeedback: string | null;
  onSimNextSeries: () => void;
  onQuickPractice: () => void;
  onActionClick: (target: ManagerJumpTarget) => void;
}

export function ManagerClipboardBanner({
  clubName,
  recordLabel,
  cash,
  seriesIndex,
  inbox,
  quickFeedback,
  onSimNextSeries,
  onQuickPractice,
  onActionClick,
}: ManagerClipboardBannerProps) {
  const seasonRegularDone = seriesIndex >= 7;

  return (
    <ComicCard
      title="MANAGER'S CLIPBOARD — WHAT'S NEXT"
      subtitle={`${clubName} (${recordLabel}) • $${cash.toLocaleString()} Cash • Series ${Math.min(seriesIndex, 7)}/7`}
      headerBg="#1D3557"
      badge={
        <span className="px-2 py-0.5 rounded-full bg-[#FFC300] text-[#181B2C] border-2 border-[#181B2C] font-display text-[10px]">
          GM HQ
        </span>
      }
    >
      <div data-testid="manager-action-inbox" className="space-y-3">
        {/* Top Row: Fast GM Core Loop Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!seasonRegularDone ? (
            <ComicButton
              size="md"
              variant="gold"
              icon={<FastForward className="w-4 h-4" />}
              onClick={onSimNextSeries}
            >
              Sim Next 3-Game Series
            </ComicButton>
          ) : (
            <ComicButton
              size="md"
              variant="gold"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => onActionClick('league')}
            >
              Launch Playoffs &amp; Offseason
            </ComicButton>
          )}

          <ComicButton
            size="sm"
            variant="sky"
            icon={<Dumbbell className="w-4 h-4" />}
            onClick={onQuickPractice}
          >
            Quick Team Practice (+XP)
          </ComicButton>
        </div>

        {quickFeedback ? (
          <div
            data-testid="gm-quick-feedback"
            className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-[#1B4332] text-xs font-extrabold"
          >
            {quickFeedback}
          </div>
        ) : null}

        {/* Dynamic Priority Action Alerts — Obvious & Rewarding */}
        {inbox.items.length === 0 ? (
          <div className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] text-xs font-extrabold text-[#1B4332] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2FB356] shrink-0" />
            <span>{inbox.headline}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {inbox.items.map((item) => {
              const cardStyle =
                item.priority === 'urgent'
                  ? 'bg-[#FFE5EC] border-[#E63946]'
                  : item.priority === 'reward'
                    ? 'bg-[#FFF3BF] border-[#181B2C]'
                    : 'bg-[#E0FBFC] border-[#1D3557]';
              const badgeStyle =
                item.priority === 'urgent'
                  ? 'bg-[#E63946] text-white'
                  : item.priority === 'reward'
                    ? 'bg-[#181B2C] text-[#FFD166]'
                    : 'bg-[#1D3557] text-white';

              return (
                <div
                  key={item.kind}
                  data-testid={`gm-action-${item.kind}`}
                  className={`p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 ${cardStyle}`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded border border-[#181B2C] text-[10px] font-display ${badgeStyle}`}
                      >
                        {item.badge}
                      </span>
                      <span className="text-xs font-extrabold text-[#181B2C] truncate">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-[#4A5068] leading-snug">
                      {item.detail}
                    </p>
                  </div>
                  <ComicButton
                    size="sm"
                    variant={item.priority === 'urgent' ? 'coral' : 'turf'}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => onActionClick(item.target)}
                    className="shrink-0"
                  >
                    {item.ctaLabel}
                  </ComicButton>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ComicCard>
  );
}
