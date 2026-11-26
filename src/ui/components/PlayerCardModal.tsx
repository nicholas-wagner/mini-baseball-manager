import { PlayerHobbyPanel } from './OffTheClock';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSearch, Pencil, Star, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import type { Club } from '../../engine/models/club';
import {
  COED_TRAIT_LABELS,
  EXPERIENCE_TIER_LABELS,
  isPitcherPosition,
  PITCH_TYPE_SHORT_LABELS,
  PRESSURE_PROFILE_LABELS,
  type Player,
} from '../../engine/models/player';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { formStateToCardMood, toBaseballCardPlayer } from '../utils/playerCardAdapter';
import { FlipBaseballCard } from './FlipBaseballCard';

export interface InspectableCardEntry {
  player: Player;
  club: Club;
  roleTag?: string;
  liveStatLine?: string;
}

interface PlayerCardModalProps {
  open: boolean;
  entry: InspectableCardEntry | null;
  allEntries?: readonly InspectableCardEntry[];
  batterId?: string;
  pitcherId?: string;
  runnerIds?: readonly string[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onCustomizePlayer?: (patch: { nickname?: string; jerseyNumber?: number }) => void;
  onSelectPlayerId?: (playerId: string) => void;
  onOpenDossier?: (player: Player) => void;
  onDownloadCard?: (player: Player, club: Club) => void;
  onClose: () => void;
}

export function PlayerCardModal({
  open,
  entry,
  allEntries = [],
  batterId,
  pitcherId,
  runnerIds = [],
  isFavorite = false,
  onToggleFavorite,
  onCustomizePlayer,
  onSelectPlayerId,
  onOpenDossier,
  onDownloadCard,
  onClose,
}: PlayerCardModalProps) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftNickname, setDraftNickname] = useState('');
  const [draftJersey, setDraftJersey] = useState('');

  if (!open || !entry) return null;

  const { player, club, roleTag, liveStatLine } = entry;
  const teamColors = {
    primary: club.colors.primary,
    secondary: club.colors.secondary,
    accent: club.colors.accent,
    monogram: club.colors.monogram,
  };

  const currentIdx = allEntries.findIndex((e) => e.player.id === player.id);
  const canCycle = allEntries.length > 1 && Boolean(onSelectPlayerId);
  const handleCycle = (delta: number) => {
    if (!canCycle || !onSelectPlayerId) return;
    const nextIdx = (currentIdx + delta + allEntries.length) % allEntries.length;
    soundEngine.play('card_flip');
    onSelectPlayerId(allEntries[nextIdx].player.id);
  };

  const isLiveGameMode = Boolean(batterId || pitcherId);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/80 p-3 sm:p-5 flex items-start sm:items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Player Baseball Card"
    >
      <div className="w-full max-w-2xl my-2 sm:my-auto">
        <ComicCard
          title={`${player.name} • #${player.jerseyNumber} ${player.position}`}
          subtitle={`${club.city} ${club.name}${roleTag ? ` • ${roleTag}` : ''}${
            canCycle && !isLiveGameMode ? ` • Card ${currentIdx + 1} of ${allEntries.length}` : ''
          }`}
          headerBg={club.colors.secondary}
          badge={
            <button
              type="button"
              onClick={onClose}
              aria-label="Close player card"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#FFFDF7] border-2 border-[#181B2C] flex items-center justify-center text-[#181B2C] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-3">
            {/* Live Game Quick Switch Tabs: At Bat / Pitching / Runners on Base */}
            {isLiveGameMode && onSelectPlayerId ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {batterId ? (
                  <ComicButton
                    size="sm"
                    data-testid="card-modal-batter-tab"
                    variant={player.id === batterId ? 'coral' : 'cream'}
                    active={player.id === batterId}
                    onClick={() => {
                      soundEngine.play('card_flip');
                      onSelectPlayerId(batterId);
                    }}
                  >
                    🏏 At Bat
                  </ComicButton>
                ) : null}
                {pitcherId ? (
                  <ComicButton
                    size="sm"
                    data-testid="card-modal-pitcher-tab"
                    variant={player.id === pitcherId ? 'sky' : 'cream'}
                    active={player.id === pitcherId}
                    onClick={() => {
                      soundEngine.play('card_flip');
                      onSelectPlayerId(pitcherId);
                    }}
                  >
                    ⚾ Pitching
                  </ComicButton>
                ) : null}
                {runnerIds.map((rId, idx) => {
                  const found = allEntries.find((e) => e.player.id === rId);
                  if (!found) return null;
                  return (
                    <ComicButton
                      key={rId}
                      size="sm"
                      variant={player.id === rId ? 'gold' : 'cream'}
                      active={player.id === rId}
                      onClick={() => {
                        soundEngine.play('card_flip');
                        onSelectPlayerId(rId);
                      }}
                    >
                      🏃 {idx + 1}B: {found.player.name.split(' ')[0]}
                    </ComicButton>
                  );
                })}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-[270px_1fr] gap-2.5 sm:gap-4 items-start">
              <div className="mx-auto w-full max-w-[244px] sm:max-w-[270px] space-y-2">
                <FlipBaseballCard
                  player={toBaseballCardPlayer(player)}
                  team={teamColors}
                  mood={formStateToCardMood(player.formState)}
                />
                <PlayerHobbyPanel playerId={player.id} clubId={club.id} />
                {canCycle ? (
                  <div className="flex items-center justify-between gap-2">
                    <ComicButton
                      size="sm"
                      variant="cream"
                      aria-label="Previous player"
                      icon={<ChevronLeft className="w-4 h-4" />}
                      onClick={() => handleCycle(-1)}
                    >
                      Prev
                    </ComicButton>
                    <span className="text-[11px] font-extrabold text-[#4A5068]">
                      {currentIdx + 1} / {allEntries.length}
                    </span>
                    <ComicButton
                      size="sm"
                      variant="cream"
                      aria-label="Next player"
                      icon={<ChevronRight className="w-4 h-4" />}
                      onClick={() => handleCycle(1)}
                    >
                      Next
                    </ComicButton>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 min-w-0">
                {(onToggleFavorite || onCustomizePlayer) ? (
                  <div
                    data-testid="card-modal-personalize-bar"
                    className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF8E7] space-y-2"
                  >
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
                      {onToggleFavorite ? (
                        <ComicButton
                          size="sm"
                          variant={isFavorite ? 'gold' : 'cream'}
                          data-testid="toggle-favorite-player-btn"
                          icon={<Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#E63946] text-[#E63946]' : ''}`} />}
                          onClick={() => {
                            onToggleFavorite();
                            soundEngine.play('ui_pop');
                          }}
                          className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
                        >
                          {isFavorite ? 'Club Favorite!' : 'Star Favorite'}
                        </ComicButton>
                      ) : null}
                      {onCustomizePlayer ? (
                        <ComicButton
                          size="sm"
                          variant={editingProfile ? 'violet' : 'sky'}
                          data-testid="edit-nickname-toggle"
                          icon={<Pencil className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setDraftNickname(player.nickname);
                            setDraftJersey(String(player.jerseyNumber));
                            setEditingProfile((v) => !v);
                          }}
                          className="w-full sm:w-auto px-2 text-[11px] sm:text-xs"
                        >
                          {editingProfile ? 'Cancel Edit' : 'Nickname & #'}
                        </ComicButton>
                      ) : null}
                    </div>
                    {editingProfile && onCustomizePlayer ? (
                      <div className="flex flex-wrap items-end gap-2 pt-1">
                        <div className="flex-1 min-w-[130px]">
                          <label
                            htmlFor="card-custom-nickname"
                            className="block text-[10px] font-extrabold uppercase text-[#181B2C]"
                          >
                            Custom Nickname
                          </label>
                          <input
                            id="card-custom-nickname"
                            type="text"
                            maxLength={20}
                            value={draftNickname}
                            onChange={(e) => setDraftNickname(e.target.value)}
                            className="w-full min-h-[36px] px-2 rounded-lg border-2 border-[#181B2C] bg-white text-xs font-bold text-[#181B2C]"
                          />
                        </div>
                        <div className="w-16">
                          <label
                            htmlFor="card-custom-jersey"
                            className="block text-[10px] font-extrabold uppercase text-[#181B2C]"
                          >
                            Jersey #
                          </label>
                          <input
                            id="card-custom-jersey"
                            type="number"
                            min={0}
                            max={99}
                            value={draftJersey}
                            onChange={(e) => setDraftJersey(e.target.value)}
                            className="w-full min-h-[36px] px-2 rounded-lg border-2 border-[#181B2C] bg-white text-xs font-mono-tabular font-bold text-[#181B2C]"
                          />
                        </div>
                        <ComicButton
                          size="sm"
                          variant="turf"
                          onClick={() => {
                            const parsedNum = Number(draftJersey);
                            onCustomizePlayer({
                              nickname: draftNickname,
                              jerseyNumber: Number.isNaN(parsedNum) ? undefined : parsedNum,
                            });
                            setEditingProfile(false);
                            soundEngine.play('level_up');
                          }}
                        >
                          Save Nickname
                        </ComicButton>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {liveStatLine ? (
                  <div
                    data-testid="card-modal-live-statline"
                    className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]"
                  >
                    📊 Today&apos;s Line: {liveStatLine}
                  </div>
                ) : null}

                <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
                  {isPitcherPosition(player.position) && player.pitchArsenal ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-[#181B2C]">
                        <span>Pitch Arsenal ({player.pitchArsenal.repertoire.length})</span>
                        <span className="text-[#1B4332]">
                          ★ {PITCH_TYPE_SHORT_LABELS[player.pitchArsenal.favoritePitch]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {player.pitchArsenal.repertoire.map((slot) => {
                          const isFav = slot.pitchType === player.pitchArsenal!.favoritePitch;
                          const isWeak = slot.pitchType === player.pitchArsenal!.weakestPitch;
                          return (
                            <span
                              key={slot.pitchType}
                              className={`px-1.5 py-0.5 rounded border border-[#181B2C] text-[10px] font-extrabold ${
                                isFav
                                  ? 'bg-[#FFC300] text-[#181B2C]'
                                  : isWeak
                                    ? 'bg-[#FFE5EC] text-[#9D0208]'
                                    : 'bg-white text-[#181B2C]'
                              }`}
                            >
                              {isFav ? '★ ' : ''}
                              {PITCH_TYPE_SHORT_LABELS[slot.pitchType]} {slot.mastery}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] font-extrabold uppercase text-[#181B2C]">
                        Batter Pitch Scouting
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold">
                        <span className="px-2 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C] text-[#1B4332]">
                          Crushes: {PITCH_TYPE_SHORT_LABELS[player.batterPitchProfile.favoritePitch]}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#FFE5EC] border border-[#181B2C] text-[#9D0208]">
                          Weak vs: {PITCH_TYPE_SHORT_LABELS[player.batterPitchProfile.weakPitch]}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C] text-[#181B2C]">
                          Bunt: {player.ratings.bunt}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-[#181B2C]/15 text-[10px] font-extrabold">
                    <span className="px-1.5 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C] text-[#1D3557]">
                      {PRESSURE_PROFILE_LABELS[player.pressureProfile]}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#F6EEFF] border border-[#181B2C] text-[#4A148C]">
                      {COED_TRAIT_LABELS[player.coEdTrait]}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C] text-[#1B4332]">
                      {EXPERIENCE_TIER_LABELS[player.careerService.experienceTier]} •{' '}
                      {player.careerService.seasonsPlayed} Yr
                    </span>
                  </div>
                </div>

                {/* Quick Player Switcher List (inspect any player in the game or on your roster!) */}
                {allEntries.length > 1 && onSelectPlayerId ? (
                  <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase text-[#181B2C]">
                      {isLiveGameMode ? 'Tap Any Player in This Game' : 'Jump To Teammate'}
                    </div>
                    <div className="flex flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto sm:max-h-36 sm:overflow-y-auto pb-0.5">
                      {allEntries.map((item) => {
                        const active = item.player.id === player.id;
                        return (
                          <button
                            key={item.player.id}
                            type="button"
                            data-testid="card-modal-player-chip"
                            onClick={() => {
                              soundEngine.play('card_flip');
                              onSelectPlayerId(item.player.id);
                            }}
                            className={`px-2.5 py-1.5 min-h-[40px] rounded-lg border border-[#181B2C] text-[10.5px] font-extrabold shrink-0 whitespace-nowrap cursor-pointer ${
                              active
                                ? 'bg-[#FFC300] text-[#181B2C]'
                                : 'bg-white text-[#181B2C] hover:bg-[#FFF3BF]'
                            }`}
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1 align-middle border border-[#181B2C]"
                              style={{ backgroundColor: item.club.colors.primary }}
                            />
                            {item.player.position} {item.player.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {(onOpenDossier || onDownloadCard) ? (
                  <div className="flex flex-wrap gap-2">
                    {onOpenDossier ? (
                      <ComicButton
                        size="sm"
                        variant="sky"
                        icon={<FileSearch className="w-3.5 h-3.5" />}
                        onClick={() => onOpenDossier(player)}
                      >
                        Full Scouting Dossier
                      </ComicButton>
                    ) : null}
                    {onDownloadCard ? (
                      <ComicButton
                        size="sm"
                        variant="gold"
                        icon={<Download className="w-3.5 h-3.5" />}
                        onClick={() => onDownloadCard(player, club)}
                      >
                        Download PNG
                      </ComicButton>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
