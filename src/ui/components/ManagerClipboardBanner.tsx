import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FastForward,
  Flame,
  Mail,
  RefreshCw,
  Snowflake,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  SERIES_GAMEPLAN_OPTIONS,
  type GmInboxEvent,
  type PromotionChaseStatus,
  type RosterSpotlightReport,
  type SeriesGameplanId,
  type TiredStarterAlert,
} from '../../engine/gm/gmSeasonPulse';
import {
  TEAM_PRACTICE_OPTIONS,
  type ManagerActionInbox,
  type ManagerJumpTarget,
  type TeamPracticeFocusId,
  type TeamPracticeRecommendation,
} from '../../engine/gm/managerActionInbox';
import { CoachPopsAvatar } from './CoachPopsAvatar';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface ManagerClipboardBannerProps {
  clubName: string;
  recordLabel: string;
  cash: number;
  seriesIndex: number;
  inbox: ManagerActionInbox;
  promotionChase: PromotionChaseStatus;
  activeGameplan: SeriesGameplanId;
  tiredStarter: TiredStarterAlert | null;
  gmInboxEvent: GmInboxEvent | null;
  rosterSpotlight: RosterSpotlightReport;
  spotlightUsedThisSeries: boolean;
  practiceAvailable: boolean;
  lastPracticeFocusLabel?: string | null;
  recommendedPractice: TeamPracticeRecommendation;
  quickFeedback: string | null;
  onSimNextSeries: () => void;
  onSelectPractice: (focusId: TeamPracticeFocusId) => void;
  onSelectGameplan: (plan: SeriesGameplanId) => void;
  onSwapFreshStarter: (freshPitcherId: string) => void;
  onResolveGmInboxChoice: (choiceIndex: 0 | 1) => void;
  onSpotlightBreakout: (playerId: string) => void;
  onActionClick: (target: ManagerJumpTarget) => void;
}

export function ManagerClipboardBanner({
  clubName,
  recordLabel,
  cash,
  seriesIndex,
  inbox,
  promotionChase,
  activeGameplan,
  tiredStarter,
  gmInboxEvent,
  rosterSpotlight,
  spotlightUsedThisSeries,
  practiceAvailable,
  lastPracticeFocusLabel = null,
  recommendedPractice,
  quickFeedback,
  onSimNextSeries,
  onSelectPractice,
  onSelectGameplan,
  onSwapFreshStarter,
  onResolveGmInboxChoice,
  onSpotlightBreakout,
  onActionClick,
}: ManagerClipboardBannerProps) {
  const [openDrawer, setOpenDrawer] = useState<'none' | 'practice' | 'gameplan'>('none');
  const seasonRegularDone = seriesIndex >= 7;
  const activePlanMeta =
    SERIES_GAMEPLAN_OPTIONS.find((opt) => opt.id === activeGameplan) ?? SERIES_GAMEPLAN_OPTIONS[0];

  const zoneBg =
    promotionChase.zone === 'first_place'
      ? 'bg-[#FFC300] text-[#181B2C]'
      : promotionChase.zone === 'playoff_spot'
        ? 'bg-[#D8F3DC] text-[#1B4332]'
        : promotionChase.zone === 'relegation_danger'
          ? 'bg-[#FFE5EC] text-[#9D0208]'
          : 'bg-[#E0FBFC] text-[#1D3557]';

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
        {/* 1. Live Promotion Chase & Season Owner Goal Strip with Coach Pops */}
        <div
          data-testid="promotion-chase-strip"
          className={`rounded-xl border-2 border-[#181B2C] px-3 py-2 flex items-center gap-2.5 ${zoneBg}`}
        >
          <CoachPopsAvatar size="sm" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-extrabold">
              <span className="flex items-center gap-1.5 font-display">
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                {promotionChase.headline}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFFDF7] text-[#181B2C] border border-[#181B2C]">
                {promotionChase.nextTierRewardText}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-extrabold opacity-90">
                <span>{promotionChase.ownerGoalTitle}</span>
                <span>{promotionChase.ownerGoalProgressPct}%</span>
              </div>
              <div className="h-2 rounded-full border border-[#181B2C] bg-[#FFFDF7] overflow-hidden">
                <div
                  className="h-full bg-[#2FB356] transition-all"
                  style={{ width: `${promotionChase.ownerGoalProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Fast GM Core Loop Controls (Sim Series + Team Practice + Series Gameplan) */}
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
            variant={practiceAvailable ? (openDrawer === 'practice' ? 'violet' : 'sky') : 'cream'}
            disabled={!practiceAvailable}
            icon={<Dumbbell className="w-4 h-4" />}
            onClick={() => setOpenDrawer((d) => (d === 'practice' ? 'none' : 'practice'))}
          >
            {practiceAvailable
              ? openDrawer === 'practice'
                ? 'Hide Practice Choices'
                : 'Team Practice (1/1 — Pick Focus)'
              : `Practice Done ✓${lastPracticeFocusLabel ? ` (${lastPracticeFocusLabel})` : ''}`}
          </ComicButton>

          <ComicButton
            size="sm"
            variant={openDrawer === 'gameplan' || activeGameplan !== 'balanced' ? 'violet' : 'cream'}
            data-testid="gameplan-toggle"
            icon={<ClipboardList className="w-4 h-4" />}
            onClick={() => setOpenDrawer((d) => (d === 'gameplan' ? 'none' : 'gameplan'))}
          >
            Gameplan: {activePlanMeta.icon} {activePlanMeta.label}
          </ComicButton>
        </div>

        {/* 2A. 1-Tap Inline Team Practice Focus Chooser */}
        {practiceAvailable && openDrawer === 'practice' ? (
          <div
            data-testid="team-practice-picker"
            className="p-2.5 rounded-2xl border-2 border-[#181B2C] bg-[#F5EEFF] space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-extrabold text-[#4C1D95]">
              <span>Pick 1 Focus Before Your Next Game (Each Has a Real Trade-Off):</span>
              <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C] text-[#181B2C] text-[10px]">
                ★ Coach’s Pick: {recommendedPractice.reason}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEAM_PRACTICE_OPTIONS.map((opt) => {
                const isRecommended = opt.id === recommendedPractice.focusId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setOpenDrawer('none');
                      onSelectPractice(opt.id);
                    }}
                    className={`p-2.5 rounded-xl border-2 border-[#181B2C] text-left min-h-[72px] transition-transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isRecommended
                        ? 'bg-[#FFF3BF] shadow-[3px_3px_0_#181B2C]'
                        : 'bg-[#FFFDF7] shadow-[2px_2px_0_#181B2C]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display text-xs text-[#181B2C]">
                        {opt.icon} {opt.label}
                      </span>
                      {isRecommended ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-display text-[9px] shrink-0">
                          ★ RECOMMENDED
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px] font-extrabold">
                      <span className="px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#1B4332] text-[#1B4332]">
                        + {opt.gainBadge}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#FFE5EC] border border-[#9D0208] text-[#9D0208]">
                        − {opt.tradeoffBadge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 2B. 1-Tap Inline Pre-Series Gameplan Picker */}
        {openDrawer === 'gameplan' ? (
          <div
            data-testid="series-gameplan-picker"
            className="p-2.5 rounded-2xl border-2 border-[#181B2C] bg-[#E0FBFC] space-y-2"
          >
            <div className="text-[11px] font-extrabold text-[#1D3557]">
              Choose Your Series &amp; Live Game Philosophy (Applies to Simmed Series &amp; 3D Games):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SERIES_GAMEPLAN_OPTIONS.map((opt) => {
                const selected = opt.id === activeGameplan;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelectGameplan(opt.id);
                      setOpenDrawer('none');
                    }}
                    className={`p-2.5 rounded-xl border-2 border-[#181B2C] text-left min-h-[72px] transition-transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between gap-1.5 ${
                      selected
                        ? 'bg-[#FFC300] shadow-[3px_3px_0_#181B2C]'
                        : 'bg-[#FFFDF7] shadow-[2px_2px_0_#181B2C]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display text-xs text-[#181B2C]">
                        {opt.icon} {opt.label}
                      </span>
                      {selected ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-display text-[9px]">
                          ACTIVE ✓
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px] font-extrabold">
                      <span className="px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#1B4332] text-[#1B4332]">
                        + {opt.gainBadge}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#FFE5EC] border border-[#9D0208] text-[#9D0208]">
                        − {opt.tradeoffBadge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {quickFeedback ? (
          <div
            data-testid="gm-quick-feedback"
            className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-[#1B4332] text-xs font-extrabold"
          >
            {quickFeedback}
          </div>
        ) : null}

        {/* 3. Tired Scheduled Starter 1-Tap Swap Alert */}
        {tiredStarter ? (
          <div
            data-testid="tired-starter-alert"
            className="p-2.5 rounded-xl border-2 border-[#E63946] bg-[#FFE5EC] flex flex-wrap items-center justify-between gap-2"
          >
            <div className="text-xs font-extrabold text-[#9D0208]">
              🩺 Next scheduled starter{' '}
              <span className="underline">{tiredStarter.tiredStarter.name}</span> is gassed (
              {tiredStarter.tiredEndurance}% End) — {tiredStarter.fresherStarter.name} is fresh (
              {tiredStarter.fresherEndurance}% End)!
            </div>
            <ComicButton
              size="sm"
              variant="coral"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => onSwapFreshStarter(tiredStarter.fresherStarter.id)}
            >
              Start Fresh Arm ({tiredStarter.fresherStarter.name})
            </ComicButton>
          </div>
        ) : null}

        {/* 4. Incoming GM Inbox Card (AI Trade Offer or Clubhouse Trade-Off Dilemma) */}
        {gmInboxEvent ? (
          <div
            data-testid="gm-inbox-event-card"
            className="p-3 rounded-2xl border-[3px] border-[#181B2C] bg-gradient-to-br from-[#FFF3BF] to-[#FFFDF7] shadow-[3px_3px_0_#181B2C] space-y-2"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#7209B7] text-white border border-[#181B2C] font-display text-[10px] inline-flex items-center gap-1">
                <Mail className="w-3 h-3" /> {gmInboxEvent.badge}
              </span>
              <span className="font-display text-xs sm:text-sm text-[#181B2C]">
                {gmInboxEvent.title}
              </span>
            </div>
            <p className="text-xs font-bold text-[#4A5068] leading-snug">
              {gmInboxEvent.description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gmInboxEvent.choices.map((choice, idx) => (
                <ComicButton
                  key={choice.label}
                  size="sm"
                  variant={idx === 0 ? 'turf' : 'cream'}
                  data-testid={`gm-inbox-choice-${idx}`}
                  onClick={() => onResolveGmInboxChoice(idx as 0 | 1)}
                  className="justify-between text-left"
                >
                  <span className="flex flex-col items-start leading-tight">
                    <span>{choice.label}</span>
                    <span className="text-[10px] opacity-85 font-bold">{choice.effectHint}</span>
                  </span>
                </ComicButton>
              ))}
            </div>
          </div>
        ) : null}

        {/* 5. Hot-Hand / Breakout Watch & Cold Starter Strip */}
        {rosterSpotlight.breakout || rosterSpotlight.coldStarter ? (
          <div
            data-testid="breakout-watch-strip"
            className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            {rosterSpotlight.breakout ? (
              <div className="flex flex-wrap items-center gap-1.5 font-extrabold text-[#181B2C]">
                <Flame className="w-4 h-4 text-[#FF4D6D] shrink-0" />
                <span>
                  Breakout Watch: {rosterSpotlight.breakout.player.position}{' '}
                  {rosterSpotlight.breakout.player.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C] text-[10px]">
                  {rosterSpotlight.breakout.badgeText}
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5">
              {rosterSpotlight.breakout?.canSpotlightInLineup && !spotlightUsedThisSeries ? (
                <ComicButton
                  size="sm"
                  variant="gold"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => onSpotlightBreakout(rosterSpotlight.breakout!.player.id)}
                >
                  ⭐ Spotlight #1 (+20 XP)
                </ComicButton>
              ) : null}
              {rosterSpotlight.coldStarter ? (
                <span className="px-2 py-1 rounded-lg bg-[#E0FBFC] border border-[#181B2C] text-[10px] font-extrabold text-[#1D3557] inline-flex items-center gap-1">
                  <Snowflake className="w-3 h-3" /> Cold Starter: {rosterSpotlight.coldStarter.name}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 6. Dynamic Priority Action Alerts — Obvious & Rewarding */}
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
