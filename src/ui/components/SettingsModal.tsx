import { Eye, Settings, Smartphone, Volume2, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { FRONT_OFFICE_MODE_OPTIONS } from '../../engine/gm/frontOfficeMode';
import { BULLPEN_MODE_OPTIONS } from '../../engine/simulation/bullpenManager';
import { getAccessibleStatGrade } from '../../scene/core/performanceBudget';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ComicButton } from '../design-system/ComicButton';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SAMPLE_RATINGS = [92, 80, 68, 54, 40] as const;

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const sfxVolume = useUserPreferencesStore((s) => s.sfxVolume);
  const hapticsEnabled = useUserPreferencesStore((s) => s.hapticsEnabled);
  const wakeLockEnabled = useUserPreferencesStore((s) => s.wakeLockEnabled);
  const reducedMotion = useUserPreferencesStore((s) => s.reducedMotion);
  const colorblindStatSymbols = useUserPreferencesStore((s) => s.colorblindStatSymbols);
  const enableInjuries = useUserPreferencesStore((s) => s.enableInjuries);
  const enableIllnesses = useUserPreferencesStore((s) => s.enableIllnesses);
  const pitchingMode = useUserPreferencesStore((s) => s.pitchingMode);
  const bullpenMode = useUserPreferencesStore((s) => s.bullpenMode);
  const frontOfficeMode = useUserPreferencesStore((s) => s.frontOfficeMode);
  const onePitchMode = useUserPreferencesStore((s) => s.onePitchMode);

  const setSfxVolume = useUserPreferencesStore((s) => s.setSfxVolume);
  const toggleHaptics = useUserPreferencesStore((s) => s.toggleHaptics);
  const toggleWakeLock = useUserPreferencesStore((s) => s.toggleWakeLock);
  const toggleReducedMotion = useUserPreferencesStore((s) => s.toggleReducedMotion);
  const toggleColorblindStatSymbols = useUserPreferencesStore((s) => s.toggleColorblindStatSymbols);
  const toggleInjuries = useUserPreferencesStore((s) => s.toggleInjuries);
  const toggleIllnesses = useUserPreferencesStore((s) => s.toggleIllnesses);
  const setPitchingMode = useUserPreferencesStore((s) => s.setPitchingMode);
  const setBullpenMode = useUserPreferencesStore((s) => s.setBullpenMode);
  const setFrontOfficeMode = useUserPreferencesStore((s) => s.setFrontOfficeMode);
  const toggleOnePitchMode = useUserPreferencesStore((s) => s.toggleOnePitchMode);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Settings and Accessibility"
    >
      <div
        data-testid="settings-modal"
        className="w-full max-w-xl min-w-0 max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden"
      >
        <div className="px-3 sm:px-4 py-3 bg-[#1D3557] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Settings className="w-5 h-5 text-[#FFD166] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-xs sm:text-base tracking-wide truncate">
                SETTINGS &amp; ACCESSIBILITY
              </div>
              <div className="text-[11px] font-bold text-[#FFD166] truncate">
                Android PWA haptics, battery saver, colorblind symbols &amp; dynasty realism
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Settings"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3.5 min-h-0 flex-1 overflow-y-auto">
          {/* Audio Volume */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xs text-[#181B2C] flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#7209B7]" />
                SFX Master Volume ({Math.round(sfxVolume * 100)}%)
              </span>
              <ComicButton
                size="sm"
                variant="cream"
                onClick={() => soundEngine.play('bat_crack')}
              >
                Test Bat Crack
              </ComicButton>
            </div>
            <input
              aria-label="SFX Volume"
              type="range"
              min={0}
              max={100}
              value={Math.round(sfxVolume * 100)}
              onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
              className="w-full accent-[#1D3557]"
            />
          </div>

          {/* Mobile & Performance */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="font-display text-xs text-[#181B2C] flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#2FB356]" />
              Android PWA &amp; Performance
            </div>
            <div className="flex flex-wrap gap-2">
              <ComicButton
                size="sm"
                variant={hapticsEnabled ? 'turf' : 'cream'}
                onClick={() => {
                  toggleHaptics();
                  soundEngine.play('ui_pop');
                }}
              >
                Android Haptics: {hapticsEnabled ? 'ON' : 'OFF'}
              </ComicButton>
              <ComicButton
                size="sm"
                variant={wakeLockEnabled ? 'sky' : 'cream'}
                onClick={() => {
                  toggleWakeLock();
                  soundEngine.play('ui_pop');
                }}
              >
                Keep Screen Awake: {wakeLockEnabled ? 'ON' : 'OFF'}
              </ComicButton>
              <ComicButton
                size="sm"
                variant={reducedMotion ? 'gold' : 'cream'}
                onClick={() => {
                  toggleReducedMotion();
                  soundEngine.play('ui_pop');
                }}
              >
                Reduced Motion: {reducedMotion ? 'ON' : 'OFF'}
              </ComicButton>
              <ComicButton
                size="sm"
                data-testid="settings-one-pitch-toggle"
                variant={onePitchMode ? 'gold' : 'cream'}
                aria-pressed={onePitchMode}
                onClick={() => {
                  toggleOnePitchMode();
                  soundEngine.play('ui_pop');
                }}
              >
                ⚡ 1-Pitch At-Bats: {onePitchMode ? 'ON' : 'OFF'}
              </ComicButton>
            </div>
            <p className="text-[11px] font-bold text-[#4A5068]">
              1-Pitch At-Bats (Default in Simple) sims full realistic counts &amp; fatigue underneath and plays the 3D deciding pitch — Pro Manager defaults to Pitch-by-Pitch (steals still run pitch-by-pitch).
            </p>
          </div>

          {/* Accessibility & Colorblind Stat Symbols */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-xs text-[#181B2C] flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#E63946]" />
                Colorblind-Safe Stat Grade Shapes
              </span>
              <ComicButton
                size="sm"
                variant={colorblindStatSymbols ? 'gold' : 'cream'}
                onClick={() => {
                  toggleColorblindStatSymbols();
                  soundEngine.play('ui_pop');
                }}
              >
                Colorblind Stat Symbols: {colorblindStatSymbols ? 'ON' : 'OFF'}
              </ComicButton>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_RATINGS.map((val) => {
                const g = getAccessibleStatGrade(val);
                return (
                  <span
                    key={g.grade}
                    className="px-2 py-0.5 rounded-lg border border-[#181B2C] text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: g.colorHex }}
                  >
                    {g.symbol} {g.grade} ({g.label})
                  </span>
                );
              })}
            </div>
          </div>

          {/* Pitching Controls Mode */}
          <div
            data-testid="settings-pitching-mode"
            className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2"
          >
            <div className="font-display text-xs text-[#181B2C]">
              Pitching Controls (Default: Simple)
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'simple', label: 'Simple (Catcher Calls)' },
                  { id: 'normal', label: 'Normal (Pick Location)' },
                  { id: 'advanced', label: 'Advanced (Spot + Pitch)' },
                ] as const
              ).map((opt) => (
                <ComicButton
                  key={opt.id}
                  size="sm"
                  variant={pitchingMode === opt.id ? 'gold' : 'cream'}
                  active={pitchingMode === opt.id}
                  aria-pressed={pitchingMode === opt.id}
                  onClick={() => {
                    setPitchingMode(opt.id);
                    soundEngine.play('ui_pop');
                  }}
                >
                  {opt.label}
                </ComicButton>
              ))}
            </div>
            <p className="text-[11px] font-bold text-[#4A5068]">
              {pitchingMode === 'simple'
                ? 'Simple: Catcher calls both pitch and location automatically (optional Shake off).'
                : pitchingMode === 'normal'
                  ? 'Normal: You pick Over Plate, Corner, or Low Chase; pitch type is chosen automatically.'
                  : 'Advanced: You pick both location (Over Plate / Corner / Low Chase) and pitch type from the pitcher’s arsenal.'}
            </p>
          </div>

          {/* Bullpen Management Mode */}
          <div
            data-testid="settings-bullpen-mode"
            className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2"
          >
            <div className="font-display text-xs text-[#181B2C]">
              Bullpen Management (Default: Ask Me)
            </div>
            <div className="flex flex-wrap gap-2">
              {BULLPEN_MODE_OPTIONS.map((opt) => (
                <ComicButton
                  key={opt.id}
                  size="sm"
                  variant={bullpenMode === opt.id ? 'gold' : 'cream'}
                  active={bullpenMode === opt.id}
                  aria-pressed={bullpenMode === opt.id}
                  onClick={() => {
                    setBullpenMode(opt.id);
                    soundEngine.play('ui_pop');
                  }}
                >
                  {opt.label}
                </ComicButton>
              ))}
            </div>
            <p className="text-[11px] font-bold text-[#4A5068]">
              {BULLPEN_MODE_OPTIONS.find((opt) => opt.id === bullpenMode)?.description}
            </p>
          </div>

          {/* Front Office Assistant GM Mode */}
          <div
            data-testid="settings-front-office-mode"
            className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2"
          >
            <div className="font-display text-xs text-[#181B2C]">
              Front Office Management (Default: Auto)
            </div>
            <div className="flex flex-wrap gap-2">
              {FRONT_OFFICE_MODE_OPTIONS.map((opt) => (
                <ComicButton
                  key={opt.id}
                  size="sm"
                  variant={frontOfficeMode === opt.id ? 'gold' : 'cream'}
                  active={frontOfficeMode === opt.id}
                  aria-pressed={frontOfficeMode === opt.id}
                  onClick={() => {
                    setFrontOfficeMode(opt.id);
                    soundEngine.play('ui_pop');
                  }}
                >
                  {opt.label}
                </ComicButton>
              ))}
            </div>
            <p className="text-[11px] font-bold text-[#4A5068]">
              {FRONT_OFFICE_MODE_OPTIONS.find((opt) => opt.id === frontOfficeMode)?.description}
            </p>
          </div>

          {/* Dynasty Health Realism */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="font-display text-xs text-[#181B2C]">
              Dynasty Health &amp; Realism Toggles
            </div>
            <div className="flex flex-wrap gap-2">
              <ComicButton
                size="sm"
                variant={enableInjuries ? 'turf' : 'coral'}
                onClick={() => {
                  toggleInjuries();
                  soundEngine.play('ui_pop');
                }}
              >
                Injuries: {enableInjuries ? 'ON' : 'OFF'}
              </ComicButton>
              <ComicButton
                size="sm"
                variant={enableIllnesses ? 'sky' : 'coral'}
                onClick={() => {
                  toggleIllnesses();
                  soundEngine.play('ui_pop');
                }}
              >
                Illnesses: {enableIllnesses ? 'ON' : 'OFF'}
              </ComicButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
