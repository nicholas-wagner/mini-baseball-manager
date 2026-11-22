import { useCallback, useEffect, useState } from 'react';
import { Download, FolderOpen, Save, Trash2, Upload, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { useGameStore } from '../../store/gameStore';
import {
  SAVE_SLOT_IDS,
  createSaveRepository,
  type SaveRepository,
  type SaveSlotId,
  type SaveSlotMetadata,
} from '../../store/persistence';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface SaveSlotsModalProps {
  open: boolean;
  onClose: () => void;
  repository?: SaveRepository;
}

const SLOT_LABELS: Record<SaveSlotId, string> = {
  'slot-1': 'Slot 1',
  'slot-2': 'Slot 2',
  'slot-3': 'Slot 3',
};

export function SaveSlotsModal({ open, onClose, repository }: SaveSlotsModalProps) {
  const [repo] = useState<SaveRepository>(() => repository ?? createSaveRepository());
  const [slots, setSlots] = useState<SaveSlotMetadata[]>([]);
  const [jsonPayload, setJsonPayload] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const worldSeed = useGameStore((s) => s.worldSeed);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentSeriesIndex = useGameStore((s) => s.currentSeriesIndex);
  const humanClubId = useGameStore((s) => s.humanClubId);
  const manager = useGameStore((s) => s.manager);
  const leagues = useGameStore((s) => s.leagues);
  const settings = useGameStore((s) => s.settings);
  const exportCurrentCareerJson = useGameStore((s) => s.exportCurrentCareerJson);
  const importCareerJson = useGameStore((s) => s.importCareerJson);

  const refreshSlots = useCallback(async () => {
    const listed = await repo.listSlots();
    setSlots(listed);
  }, [repo]);

  useEffect(() => {
    if (open) {
      void refreshSlots();
    }
  }, [open, refreshSlots]);

  if (!open) return null;

  const handleSaveSlot = async (slotId: SaveSlotId) => {
    if (!humanClubId || !manager) {
      setErrorMessage('Create a club first before saving.');
      return;
    }
    setErrorMessage(null);
    await repo.saveSlot(slotId, {
      schemaVersion: 1,
      savedAtIso: new Date().toISOString(),
      worldSeed,
      seasonNumber,
      currentSeriesIndex,
      humanClubId,
      manager,
      leagues,
      rivalries: [],
      trophies: [],
      newspaperArchive: [],
      unlockedCosmeticIds: [],
      settings,
    });
    soundEngine.play('cash_chime');
    setStatusMessage(`Saved career to ${SLOT_LABELS[slotId]}.`);
    await refreshSlots();
  };

  const handleLoadSlot = async (slotId: SaveSlotId) => {
    setErrorMessage(null);
    const loaded = await repo.loadSlot(slotId);
    if (!loaded) {
      setErrorMessage(`${SLOT_LABELS[slotId]} is empty.`);
      return;
    }
    importCareerJson(JSON.stringify(loaded));
    soundEngine.play('level_up');
    setStatusMessage(`Loaded career from ${SLOT_LABELS[slotId]}.`);
  };

  const handleDeleteSlot = async (slotId: SaveSlotId) => {
    await repo.deleteSlot(slotId);
    soundEngine.play('ui_pop');
    setStatusMessage(`Cleared ${SLOT_LABELS[slotId]}.`);
    await refreshSlots();
  };

  const handleExportJson = () => {
    setErrorMessage(null);
    try {
      const exported = exportCurrentCareerJson();
      setJsonPayload(exported);
      soundEngine.play('ui_pop');
      setStatusMessage('Backup JSON ready to copy or save offline.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to export JSON backup.');
    }
  };

  const handleImportJson = () => {
    setErrorMessage(null);
    try {
      importCareerJson(jsonPayload);
      soundEngine.play('level_up');
      setStatusMessage('Imported JSON save backup into active session!');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid save JSON payload.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 p-3 sm:p-6 flex items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Save & Backup Slots"
    >
      <div className="w-full max-w-2xl">
        <ComicCard
          title="SAVE & BACKUP SLOTS"
          subtitle="Local IndexedDB + Offline JSON Portable Career Storage"
          headerBg="#1B4332"
          badge={
            <ComicButton size="sm" variant="cream" icon={<X className="w-4 h-4" />} onClick={onClose}>
              Close
            </ComicButton>
          }
        >
          <div className="space-y-4">
            {statusMessage ? (
              <div className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-[#1B4332] text-xs font-extrabold">
                {statusMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div
                role="alert"
                className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FFE3E8] text-[#9E1B32] text-xs font-extrabold"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="space-y-2.5">
              {SAVE_SLOT_IDS.map((slotId, index) => {
                const meta = slots.find((item) => item.slotId === slotId);
                return (
                  <div
                    key={slotId}
                    className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-display text-xs text-[#181B2C]">
                        {meta ? meta.clubName : `${SLOT_LABELS[slotId]} — Empty`}
                      </div>
                      <div className="text-[11px] font-bold text-[#4A5068]">
                        {meta
                          ? `Season ${meta.seasonNumber} • ${meta.leagueTier.toUpperCase()} • ${meta.recordLabel}`
                          : 'No dynasty stored in this slot yet'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ComicButton
                        size="sm"
                        variant="gold"
                        icon={<Save className="w-4 h-4" />}
                        aria-label={`Save to Slot ${index + 1}`}
                        onClick={() => void handleSaveSlot(slotId)}
                      >
                        Save
                      </ComicButton>
                      <ComicButton
                        size="sm"
                        variant="turf"
                        disabled={!meta}
                        icon={<FolderOpen className="w-4 h-4" />}
                        aria-label={`Load Slot ${index + 1}`}
                        onClick={() => void handleLoadSlot(slotId)}
                      >
                        Load
                      </ComicButton>
                      {meta ? (
                        <ComicButton
                          size="sm"
                          variant="coral"
                          icon={<Trash2 className="w-4 h-4" />}
                          aria-label={`Delete Slot ${index + 1}`}
                          onClick={() => void handleDeleteSlot(slotId)}
                        >
                          Clear
                        </ComicButton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t-2 border-dashed border-[#181B2C]/30 pt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="json-backup-payload"
                  className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C]"
                >
                  JSON Backup Payload
                </label>
                <div className="flex flex-wrap gap-2">
                  <ComicButton
                    size="sm"
                    variant="sky"
                    icon={<Download className="w-4 h-4" />}
                    onClick={handleExportJson}
                  >
                    Export JSON Backup
                  </ComicButton>
                  <ComicButton
                    size="sm"
                    variant="scoreboard"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={handleImportJson}
                  >
                    Import JSON Backup
                  </ComicButton>
                </div>
              </div>
              <textarea
                id="json-backup-payload"
                aria-label="JSON Backup Payload"
                rows={4}
                value={jsonPayload}
                onChange={(e) => setJsonPayload(e.target.value)}
                placeholder="Click Export JSON Backup or paste a saved dynasty JSON string here..."
                className="w-full rounded-xl border-2 border-[#181B2C] bg-white p-2.5 font-mono-tabular text-[11px] text-[#181B2C]"
              />
            </div>
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
