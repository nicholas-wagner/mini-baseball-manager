import { useState } from 'react';
import { BookMarked, Compass, ScrollText, Sparkles, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  getManagerBackstory,
  MANAGER_BACKSTORIES,
  type ManagerBackstoryId,
} from '../../engine/story/backstories';
import {
  buildDynastyEpilogue,
  getNextAvailableStoryChapter,
  resolveManagerEpithet,
  STORY_CHARACTERS,
  type StoryCharacterId,
} from '../../engine/story/storyEngine';
import { useCareerStoryStore } from '../../store/careerSlots';
import { useGameStore } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface StoryChapterModalProps {
  open: boolean;
  onClose: () => void;
}

type StoryModalTab = 'chapter' | 'backstories' | 'scrapbook';

export function StoryChapterModal({ open, onClose }: StoryChapterModalProps) {
  const club = useGameStore((s) => s.getHumanClub());
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const storyState = useCareerStoryStore((s) => s.storyState);
  const backstoryApplied = useCareerStoryStore((s) => s.backstoryApplied);
  const chooseCareerBackstory = useCareerStoryStore((s) => s.chooseCareerBackstory);
  const resolveActiveStoryChoice = useCareerStoryStore((s) => s.resolveActiveStoryChoice);

  const [tab, setTab] = useState<StoryModalTab>('chapter');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!open) return null;

  const activeBackstory = getManagerBackstory(storyState.backstoryId);
  const epithet = resolveManagerEpithet(storyState.alignment);
  const gamesPlayed = club ? club.wins + club.losses : 0;
  const nextChapter = getNextAvailableStoryChapter(storyState, { gamesPlayed, seasonNumber });
  const epilogue = club ? buildDynastyEpilogue(storyState, club) : null;

  const handleChooseOrigin = (id: ManagerBackstoryId) => {
    const res = chooseCareerBackstory(id);
    setFeedback(res.message);
    soundEngine.play(res.applied ? 'level_up' : 'ui_pop');
    if (res.applied) setTab('chapter');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dynasty Story and Backstories"
      className="fixed inset-0 z-50 bg-black/65 flex items-start sm:items-center justify-center p-3 overflow-y-auto"
    >
      <div className="w-full max-w-4xl my-auto">
        <ComicCard
          title={`${activeBackstory.badgeIcon} ${activeBackstory.arcTitle.toUpperCase()} — CHOOSE YOUR ADVENTURE`}
          subtitle={`Origin: ${activeBackstory.title} • Title: "${epithet.title}" • Chapters ${storyState.completedChapterIds.length}/3`}
          headerBg="#7209B7"
          badge={
            <button
              type="button"
              aria-label="Close Story Modal"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] text-[#181B2C] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div
              data-testid="story-modal-tabs"
              className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2"
            >
              <ComicButton
                size="sm"
                variant={tab === 'chapter' ? 'gold' : 'cream'}
                active={tab === 'chapter'}
                icon={<ScrollText className="w-3.5 h-3.5" />}
                onClick={() => setTab('chapter')}
                className="w-full sm:w-auto px-1.5 sm:px-3 text-[10.5px] sm:text-xs"
              >
                <span className="hidden sm:inline">Active Story Beat {nextChapter ? '★' : ''}</span>
                <span className="sm:hidden">Story{nextChapter ? ' ★' : ''}</span>
              </ComicButton>
              <ComicButton
                size="sm"
                variant={tab === 'backstories' ? 'gold' : 'cream'}
                active={tab === 'backstories'}
                icon={<Compass className="w-3.5 h-3.5" />}
                onClick={() => setTab('backstories')}
                className="w-full sm:w-auto px-1.5 sm:px-3 text-[10.5px] sm:text-xs"
              >
                <span className="hidden sm:inline">8 Manager Backstories</span>
                <span className="sm:hidden">8 Origins</span>
              </ComicButton>
              <ComicButton
                size="sm"
                variant={tab === 'scrapbook' ? 'gold' : 'cream'}
                active={tab === 'scrapbook'}
                icon={<BookMarked className="w-3.5 h-3.5" />}
                onClick={() => setTab('scrapbook')}
                className="w-full sm:w-auto px-1.5 sm:px-3 text-[10.5px] sm:text-xs"
              >
                <span className="hidden sm:inline">Persona &amp; Scrapbook ({storyState.scrapbook.length})</span>
                <span className="sm:hidden">Book ({storyState.scrapbook.length})</span>
              </ComicButton>
            </div>

            {feedback ? (
              <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]">
                {feedback}
              </div>
            ) : null}

            {tab === 'chapter' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FBF4E4] text-xs font-bold text-[#181B2C]">
                  <span className="font-display text-[#7209B7] mr-1.5">
                    {activeBackstory.badgeIcon} {activeBackstory.title}:
                  </span>
                  {activeBackstory.openingNarration}
                </div>

                {!club ? (
                  <div className="p-4 rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7] text-center space-y-2">
                    <div className="font-display text-sm text-[#181B2C]">
                      Pick your Backstory now, then head to Play Ball to found your club!
                    </div>
                    <ComicButton size="sm" variant="gold" onClick={() => setTab('backstories')}>
                      Browse All 8 Backstories
                    </ComicButton>
                  </div>
                ) : nextChapter ? (
                  <div
                    data-testid="active-story-chapter"
                    className="p-4 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFFDF7] space-y-3 shadow-[3px_3px_0_#181B2C]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-extrabold uppercase text-[#7209B7]">
                          {STORY_CHARACTERS[nextChapter.speakerId].emoji} {nextChapter.speakerName} •{' '}
                          {nextChapter.speakerRole}
                        </div>
                        <div className="font-display text-base text-[#181B2C]">
                          {nextChapter.title}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#FFC300] border border-[#181B2C] text-[10px] font-extrabold">
                        ACT {nextChapter.act} OF 3
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[#181B2C] leading-relaxed">
                      {nextChapter.narrative}
                    </p>

                    {nextChapter.flagReactiveNote &&
                    storyState.storyFlags.includes(nextChapter.flagReactiveNote.flag) ? (
                      <div className="p-2.5 rounded-xl border border-[#181B2C] bg-[#E0FBFC] text-xs font-extrabold text-[#1D3557]">
                        💬 {nextChapter.flagReactiveNote.extraLine}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      {nextChapter.choices.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            const res = resolveActiveStoryChoice(nextChapter.id, option.id);
                            if (res.resolved && res.choice) {
                              setFeedback(
                                `${res.choice.outcomeText}${
                                  res.boostedPlayerName
                                    ? ` (+${res.choice.bonusSp} SP to ${res.boostedPlayerName}!)`
                                    : ''
                                }`,
                              );
                              soundEngine.play('trophy_fanfare');
                            }
                          }}
                          className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] hover:bg-[#FFF3BF] text-left flex flex-col justify-between gap-2 cursor-pointer shadow-[2px_2px_0_#181B2C] transition"
                        >
                          <div className="space-y-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] text-[10px] font-extrabold">
                              {option.toneTag}
                            </span>
                            <div className="font-display text-xs text-[#181B2C]">{option.label}</div>
                          </div>
                          <div className="text-[10px] font-extrabold text-[#4A5068]">
                            {option.cashDelta !== 0
                              ? `${option.cashDelta > 0 ? '+' : '-'}$${Math.abs(option.cashDelta).toLocaleString()} `
                              : ''}
                            {option.hypeDelta !== 0 ? `• +${option.hypeDelta} Hype ` : ''}
                            {option.fanBaseDelta > 0 ? `• +${option.fanBaseDelta} Fans ` : ''}
                            {option.bonusSp > 0 ? `• +${option.bonusSp} SP` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border-2 border-[#181B2C] bg-[#D8F3DC] space-y-2">
                    <div className="font-display text-sm text-[#1B4332]">
                      {storyState.completedChapterIds.length >= 3
                        ? `🏆 ${epilogue?.headline ?? 'Story Arc Complete!'}`
                        : 'Play more games on the diamond to unlock your next Story Act!'}
                    </div>
                    <p className="text-xs font-bold text-[#181B2C]">
                      {storyState.completedChapterIds.length >= 3
                        ? epilogue?.summary
                        : `Games played so far: ${gamesPlayed}. Act II unlocks after 3 games; Act III after 8 games (or Season 2)!`}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {tab === 'backstories' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[58vh] overflow-y-auto pr-1">
                {MANAGER_BACKSTORIES.map((bg) => {
                  const isCurrent = storyState.backstoryId === bg.id;
                  return (
                    <div
                      key={bg.id}
                      className={`p-3 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
                        isCurrent ? 'bg-[#FFF3BF]' : 'bg-[#FFFDF7]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-xs text-[#181B2C]">
                            {bg.badgeIcon} {bg.title}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white border border-[#181B2C]"
                            style={{ backgroundColor: bg.accentColor }}
                          >
                            {bg.arcTitle}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-[#4A5068]">{bg.tagline}</p>
                        <div className="text-[10px] font-extrabold text-[#1B4332]">
                          + {bg.perks.join(' • ')}
                        </div>
                        <div className="text-[10px] font-bold text-[#9D0208]">
                          − {bg.tradeOffs.join(' • ')}
                        </div>
                      </div>
                      <ComicButton
                        size="sm"
                        variant={isCurrent ? 'turf' : 'sky'}
                        disabled={backstoryApplied && Boolean(club)}
                        onClick={() => handleChooseOrigin(bg.id)}
                      >
                        {isCurrent && backstoryApplied
                          ? 'Active Origin ✓'
                          : isCurrent
                            ? 'Selected Origin'
                            : `Choose ${bg.title.split(' ')[0]}`}
                      </ComicButton>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {tab === 'scrapbook' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm text-[#181B2C]">
                      <Sparkles className="w-4 h-4 inline mr-1 text-[#FFC300]" />
                      Skipper Title: &ldquo;{epithet.title}&rdquo;
                    </span>
                    <span className="text-xs font-extrabold text-[#1B4332]">
                      +{epithet.hypeBonus} Hype Aura • +{epithet.clutchBonus} Clutch Aura
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#4A5068]">{epithet.flavor}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-extrabold pt-1">
                    {(Object.keys(STORY_CHARACTERS) as StoryCharacterId[]).map((cid) => (
                      <div key={cid} className="p-2 rounded-lg border border-[#181B2C]/30 bg-[#FBF4E4]">
                        <div>
                          {STORY_CHARACTERS[cid].emoji} {STORY_CHARACTERS[cid].name}
                        </div>
                        <div className="text-[#1B4332]">
                          Bond: {storyState.relationships[cid] >= 0 ? '+' : ''}
                          {storyState.relationships[cid]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {storyState.scrapbook.length === 0 ? (
                  <p className="text-xs font-bold text-[#4A5068]">
                    Your Career Scrapbook is fresh — make your first Choose-Your-Own-Adventure decision to start writing franchise history!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {storyState.scrapbook.map((entry) => (
                      <div
                        key={entry.chapterId}
                        className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-0.5"
                      >
                        <div className="text-[10px] font-extrabold uppercase text-[#7209B7]">
                          Season {entry.seasonNumber} • {entry.chapterTitle}
                        </div>
                        <div className="font-display text-xs text-[#181B2C]">
                          🗞️ {entry.gazetteHeadline}
                        </div>
                        <div className="text-xs font-bold text-[#4A5068]">
                          Choice: {entry.choiceLabel} — {entry.outcomeSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
