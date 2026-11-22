import { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  DUGOUT_GUIDE_CHAPTERS,
  evaluateRoadToMajorsChecklist,
} from '../../engine/story/dugoutGuide';
import { useCareerStoryStore } from '../../store/careerSlots';
import { useGameStore } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface DugoutGuideModalProps {
  open: boolean;
  onClose: () => void;
  onJumpToTab: (tabId: 'lab' | 'gameday' | 'roster' | 'league' | 'skills' | 'economy') => void;
}

export function DugoutGuideModal({ open, onClose, onJumpToTab }: DugoutGuideModalProps) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const club = useGameStore((s) => s.getHumanClub());
  const storyState = useCareerStoryStore((s) => s.storyState);

  if (!open) return null;

  const chapter = DUGOUT_GUIDE_CHAPTERS[chapterIdx] ?? DUGOUT_GUIDE_CHAPTERS[0];
  const checklist = evaluateRoadToMajorsChecklist(club, club ? storyState : null);
  const completedCount = checklist.filter((s) => s.completed).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Coach Pops Dugout Handbook"
      className="fixed inset-0 z-50 bg-black/65 flex items-start sm:items-center justify-center p-3 overflow-y-auto"
    >
      <div className="w-full max-w-3xl my-auto">
        <ComicCard
          title="COACH POPS’ DUGOUT HANDBOOK"
          subtitle="Upbeat 90s Skipper’s Field Guide • Tap any chapter or jump straight in!"
          headerBg="#1B4332"
          badge={
            <button
              type="button"
              aria-label="Close Dugout Handbook"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] text-[#181B2C] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-4">
            {/* Chapter Selector Ribbon */}
            <div className="flex flex-wrap gap-1.5">
              {DUGOUT_GUIDE_CHAPTERS.map((ch, idx) => (
                <ComicButton
                  key={ch.id}
                  size="sm"
                  variant={idx === chapterIdx ? 'gold' : 'cream'}
                  active={idx === chapterIdx}
                  onClick={() => {
                    soundEngine.play('card_flip');
                    setChapterIdx(idx);
                  }}
                >
                  {ch.emoji} {ch.chapterNumber}. {ch.title.split(' ')[0]}
                </ComicButton>
              ))}
            </div>

            {/* Active Chapter Comic Panel */}
            <div className="p-4 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFFDF7] space-y-3 shadow-[3px_3px_0_#181B2C]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-base text-[#181B2C]">
                    {chapter.emoji} Chapter {chapter.chapterNumber}: {chapter.title}
                  </div>
                  <div className="text-xs font-extrabold text-[#1D3557]">{chapter.subtitle}</div>
                </div>
                <BookOpen className="w-5 h-5 text-[#1B4332] shrink-0" />
              </div>

              <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] text-xs font-extrabold text-[#181B2C] italic">
                🧢 Coach Pops: {chapter.coachPopsQuote}
              </div>

              <ul className="space-y-2 text-xs font-bold text-[#181B2C]">
                {chapter.highlights.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#E63946] shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]">
                ⭐ Pops’ Pro Tip: {chapter.popsProTip}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex gap-2">
                  <ComicButton
                    size="sm"
                    variant="cream"
                    disabled={chapterIdx === 0}
                    onClick={() => setChapterIdx((i) => Math.max(0, i - 1))}
                  >
                    ← Prev
                  </ComicButton>
                  <ComicButton
                    size="sm"
                    variant="cream"
                    disabled={chapterIdx >= DUGOUT_GUIDE_CHAPTERS.length - 1}
                    onClick={() =>
                      setChapterIdx((i) => Math.min(DUGOUT_GUIDE_CHAPTERS.length - 1, i + 1))
                    }
                  >
                    Next →
                  </ComicButton>
                </div>
                <ComicButton
                  size="sm"
                  variant="turf"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => {
                    soundEngine.play('ui_pop');
                    onJumpToTab(chapter.jumpTabId);
                    onClose();
                  }}
                >
                  {chapter.jumpLabel}
                </ComicButton>
              </div>
            </div>

            {/* Interactive Road to the Majors Progress Checklist */}
            <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#181B2C]">
                <span>🏆 YOUR ROAD TO THE MAJORS CHECKLIST</span>
                <span className="px-2 py-0.5 rounded bg-[#FFC300] border border-[#181B2C]">
                  {completedCount} / {checklist.length} Done
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-bold">
                {checklist.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#181B2C]/25 ${
                      step.completed ? 'bg-[#D8F3DC] text-[#1B4332]' : 'bg-white text-[#4A5068]'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#2FB356]" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
