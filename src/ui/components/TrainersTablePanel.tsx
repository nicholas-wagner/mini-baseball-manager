import { Stethoscope } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { getActiveHealthRatingPenalties } from '../../engine/health/healthEngine';
import {
  evaluateMedicalStaffEffects,
  extractClubMedicalStaff,
} from '../../engine/health/medicalStaff';
import type { Club } from '../../engine/models/club';
import { setHumanPlayerPlayThrough } from '../../store/clubHubActions';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ComicButton } from '../design-system/ComicButton';

interface TrainersTablePanelProps {
  club: Club;
  onMessage: (msg: string) => void;
}

export function TrainersTablePanel({ club, onMessage }: TrainersTablePanelProps) {
  const enableInjuries = useUserPreferencesStore((s) => s.enableInjuries);
  const enableIllnesses = useUserPreferencesStore((s) => s.enableIllnesses);
  const toggleInjuries = useUserPreferencesStore((s) => s.toggleInjuries);
  const toggleIllnesses = useUserPreferencesStore((s) => s.toggleIllnesses);

  const medicalStaff = extractClubMedicalStaff(club.coaches.activeStaff ?? []);
  const armFx = evaluateMedicalStaffEffects('arm_elbow_shoulder', medicalStaff);
  const affectedPlayers = club.roster.filter((p) => Boolean(p.activeHealthStatus));

  const preventionPct = Math.round((1 - armFx.preventionMultiplier) * 100);
  const healBoostPct = Math.round((armFx.healingSpeedMultiplier - 1) * 100);

  return (
    <div
      data-testid="trainers-table-panel"
      className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-display text-xs text-[#181B2C]">
          <Stethoscope className="w-4 h-4 text-[#E63946]" />
          Clubhouse Trainer’s Table &amp; Medical Room
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ComicButton
            size="sm"
            variant={enableInjuries ? 'turf' : 'cream'}
            onClick={() => {
              toggleInjuries();
              soundEngine.play('ui_pop');
            }}
          >
            Injuries: {enableInjuries ? 'ON' : 'OFF'}
          </ComicButton>
          <ComicButton
            size="sm"
            variant={enableIllnesses ? 'sky' : 'cream'}
            onClick={() => {
              toggleIllnesses();
              soundEngine.play('ui_pop');
            }}
          >
            Illnesses: {enableIllnesses ? 'ON' : 'OFF'}
          </ComicButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] font-bold text-[#181B2C]">
        <span className="px-2 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C]">
          Team MD: {medicalStaff.teamDoctor ? medicalStaff.teamDoctor.name : 'None (Hire in Ballpark HQ)'}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C]">
          Head Trainer:{' '}
          {medicalStaff.athleticTrainer
            ? medicalStaff.athleticTrainer.name
            : 'None (Hire in Ballpark HQ)'}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C]">
          Prevention -{preventionPct}% • Recovery +{healBoostPct}%
        </span>
      </div>

      {affectedPlayers.length === 0 ? (
        <div className="text-xs font-bold text-[#1B4332]">
          All {club.roster.length} active players are 100% healthy and cleared for Opening Day!
        </div>
      ) : (
        <div className="space-y-2">
          {affectedPlayers.map((player) => {
            const status = player.activeHealthStatus!;
            const penalties = getActiveHealthRatingPenalties(player, medicalStaff);
            const penText = Object.entries(penalties)
              .map(([k, v]) => `${k.toUpperCase()} ${v}`)
              .join(', ');
            return (
              <div
                key={player.id}
                className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFE5EC] flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-xs">
                  <div className="font-display text-[#9D0208]">
                    {player.position} {player.name} — {status.name} ({status.gamesRemaining}g left)
                  </div>
                  <div className="text-[11px] font-bold text-[#181B2C]">
                    Status: {status.playingThrough ? 'Playing Through (Stat Dip)' : 'Resting on IL (Faster Healing)'}
                    {penText ? ` • ${penText}` : ''}
                  </div>
                </div>
                {status.canPlayThrough ? (
                  <ComicButton
                    size="sm"
                    variant={status.playingThrough ? 'sky' : 'gold'}
                    onClick={() => {
                      const nextMode = !status.playingThrough;
                      const res = setHumanPlayerPlayThrough(player.id, nextMode);
                      onMessage(
                        res.allowed
                          ? `${player.name} set to ${nextMode ? 'Play Through (stat dip)' : 'Rest on IL (faster recovery)'}.`
                          : (res.reason ?? 'Cannot change medical status.'),
                      );
                      soundEngine.play('ui_pop');
                    }}
                  >
                    {status.playingThrough ? 'Rest on IL' : 'Play Through'}
                  </ComicButton>
                ) : (
                  <span className="px-2 py-1 rounded bg-[#9D0208] text-white text-[10px] font-extrabold">
                    Mandatory IL
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
