import { useEffect, useState } from 'react';
import { CheckCircle2, FolderOpen, PlusCircle, Save, Trash2, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { getManagerBackstory } from '../../engine/story/backstories';
import {
  CAREER_SLOT_IDS,
  useCareerStoryStore,
  type CareerSlotId,
} from '../../store/careerSlots';
import { useGameStore } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface CareerSlotsModalProps {
  open: boolean;
  onClose: () => void;
  onStartNewInSlot: () => void;
}

const SLOT_TITLES: Readonly<Record<CareerSlotId, string>> = {
  'slot-1': 'Career Slot 1',
  'slot-2': 'Career Slot 2',
  'slot-3': 'Career Slot 3',
  'slot-4': 'Career Slot 4',
};

export function CareerSlotsModal({ open, onClose, onStartNewInSlot }: CareerSlotsModalProps) {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const activeSlotId = useCareerStoryStore((s) => s.activeSlotId);
  const slots = useCareerStoryStore((s) => s.slots);
  const lastAutoSavedIso = useCareerStoryStore((s) => s.lastAutoSavedIso);
  const refreshSlots = useCareerStoryStore((s) => s.refreshSlots);
  const autoSaveActiveCareer = useCareerStoryStore((s) => s.autoSaveActiveCareer);
  const loadCareerSlot = useCareerStoryStore((s) => s.loadCareerSlot);
  const deleteCareerSlot = useCareerStoryStore((s) => s.deleteCareerSlot);
  const startFreshInSlot = useCareerStoryStore((s) => s.startFreshInSlot);

  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<CareerSlotId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      refreshSlots();
      setConfirmDeleteSlot(null);
    }
  }, [open, refreshSlots]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="4 Career Auto-Save Slots"
      className="fixed inset-0 z-50 bg-black/65 flex items-start sm:items-center justify-center p-3 overflow-y-auto"
    >
      <div className="w-full max-w-3xl my-auto">
        <ComicCard
          title="CAREER AUTO-SAVE SLOTS (4 DYNASTIES)"
          subtitle="Progress saves automatically after every game, trade, upgrade & story choice"
          headerBg="#1D3557"
          badge={
            <button
              type="button"
              aria-label="Close Career Slots"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] text-[#181B2C] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-[#1B4332]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2FB356]" />
                Active Slot: {SLOT_TITLES[activeSlotId]}
                {lastAutoSavedIso ? ` • Auto-Saved ✓` : ''}
              </span>
              {humanClub ? (
                <ComicButton
                  size="sm"
                  variant="gold"
                  icon={<Save className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const ok = autoSaveActiveCareer();
                    setNotice(ok ? `Saved ${humanClub.city} ${humanClub.name} to ${SLOT_TITLES[activeSlotId]}!` : 'Nothing to save yet.');
                    soundEngine.play('cash_chime');
                  }}
                >
                  Save Now
                </ComicButton>
              ) : null}
            </div>

            {notice ? (
              <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]">
                {notice}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAREER_SLOT_IDS.map((slotId) => {
                const rec = slots[slotId];
                const isActive = slotId === activeSlotId;
                const confirmingDelete = confirmDeleteSlot === slotId;
                const backstory = rec ? getManagerBackstory(rec.backstoryId) : null;

                return (
                  <div
                    key={slotId}
                    data-testid={`career-${slotId}`}
                    className={`p-3 rounded-2xl border-2 border-[#181B2C] flex flex-col justify-between gap-2.5 ${
                      isActive ? 'bg-[#FFF3BF] shadow-[3px_3px_0_#181B2C]' : 'bg-[#FFFDF7]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xs text-[#181B2C]">
                          {SLOT_TITLES[slotId]}
                        </span>
                        {isActive ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#2FB356] text-white text-[10px] font-extrabold border border-[#181B2C]">
                            ACTIVE
                          </span>
                        ) : null}
                      </div>

                      {rec ? (
                        <>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span
                              className="w-7 h-7 rounded-lg border-2 border-[#181B2C] text-white font-display text-[11px] flex items-center justify-center shrink-0"
                              style={{ backgroundColor: rec.clubPrimaryColor }}
                            >
                              {rec.clubMonogram}
                            </span>
                            <div className="min-w-0">
                              <div className="font-display text-sm text-[#181B2C] truncate">
                                {rec.clubName}
                              </div>
                              <div className="text-[11px] font-extrabold text-[#4A5068]">
                                {rec.leagueTier.toUpperCase()} • S{rec.seasonNumber} ({rec.recordLabel})
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] font-extrabold text-[#7209B7]">
                            {backstory?.badgeIcon} {backstory?.title} • &ldquo;{rec.epithetTitle}&rdquo;
                          </div>
                          <div className="text-[10px] font-bold text-[#4A5068]">
                            {rec.stadiumLabel} • Story {rec.chaptersDone}/3
                          </div>
                        </>
                      ) : (
                        <div className="py-3 text-xs font-bold text-[#4A5068]">
                          Empty Dynasty Slot — ready for a brand-new backstory!
                        </div>
                      )}
                    </div>

                    {confirmingDelete ? (
                      <div className="p-2 rounded-xl border-2 border-[#E63946] bg-[#FFE5EC] space-y-1.5">
                        <div className="text-[11px] font-extrabold text-[#9D0208]">
                          Retire {rec?.clubName} &amp; clear {SLOT_TITLES[slotId]}?
                        </div>
                        <div className="flex gap-1.5">
                          <ComicButton
                            size="sm"
                            variant="coral"
                            onClick={() => {
                              deleteCareerSlot(slotId);
                              setConfirmDeleteSlot(null);
                              setNotice(`Cleared ${SLOT_TITLES[slotId]} — ready to start over!`);
                              soundEngine.play('ui_pop');
                            }}
                          >
                            Confirm Delete
                          </ComicButton>
                          <ComicButton
                            size="sm"
                            variant="cream"
                            onClick={() => setConfirmDeleteSlot(null)}
                          >
                            Cancel
                          </ComicButton>
                        </div>
                      </div>
                    ) : rec ? (
                      <div className="flex flex-wrap gap-1.5">
                        <ComicButton
                          size="sm"
                          variant="turf"
                          icon={<FolderOpen className="w-3.5 h-3.5" />}
                          onClick={() => {
                            const ok = loadCareerSlot(slotId);
                            if (ok) {
                              soundEngine.play('level_up');
                              setNotice(`Resumed ${rec.clubName} from ${SLOT_TITLES[slotId]}!`);
                              onClose();
                            }
                          }}
                        >
                          Resume
                        </ComicButton>
                        <ComicButton
                          size="sm"
                          variant="coral"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setConfirmDeleteSlot(slotId)}
                        >
                          Delete
                        </ComicButton>
                      </div>
                    ) : (
                      <ComicButton
                        size="sm"
                        variant="sky"
                        icon={<PlusCircle className="w-3.5 h-3.5" />}
                        onClick={() => {
                          startFreshInSlot(slotId);
                          soundEngine.play('ui_pop');
                          onStartNewInSlot();
                          onClose();
                        }}
                      >
                        Start New Game Here
                      </ComicButton>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
