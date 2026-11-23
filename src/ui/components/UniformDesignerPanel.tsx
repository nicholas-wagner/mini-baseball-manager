import { useId, useState } from 'react';
import { Palette, Sparkles } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  CAP_STYLES,
  CREST_EMBLEMS,
  extractClubUniformCustomization,
  JERSEY_PATTERNS,
  STIRRUP_STYLES,
  UNIFORM_PRESETS,
  type UniformCustomization,
} from '../../engine/customization/uniformDesigner';
import type { Club, CrestEmblemId } from '../../engine/models/club';
import { isPitcherPosition } from '../../engine/models/player';
import { applyHumanUniformCustomization } from '../../store/clubHubActions';
import { PaintedUniformPreview } from './PaintedUniformPreview';
import { ComicButton } from '../design-system/ComicButton';

interface UniformDesignerPanelProps {
  club: Club;
  onNotice: (message: string) => void;
}

function renderCrestIcon(emblem: CrestEmblemId, accent: string, primary: string) {
  switch (emblem) {
    case 'lightning_bolt':
      return <path d="M52 24 L38 50 L49 50 L43 72 L62 44 L51 44 Z" fill={accent} stroke="#181B2C" strokeWidth="2.5" />;
    case 'comet_star':
      return (
        <path
          d="M50 23 L55 39 L72 39 L58 49 L63 65 L50 55 L37 65 L42 49 L28 39 L45 39 Z"
          fill={accent}
          stroke="#181B2C"
          strokeWidth="2.5"
        />
      );
    case 'crown_shield':
      return (
        <path
          d="M32 60 L35 34 L44 46 L50 30 L56 46 L65 34 L68 60 Z"
          fill={accent}
          stroke="#181B2C"
          strokeWidth="2.5"
        />
      );
    case 'crossed_bats':
      return (
        <g stroke="#181B2C" strokeWidth="2.2">
          <path d="M32 64 L66 30 L70 34 L36 68 Z" fill={accent} />
          <path d="M68 64 L34 30 L30 34 L64 68 Z" fill={primary} />
        </g>
      );
    case 'rocket_paw':
      return (
        <g fill={accent} stroke="#181B2C" strokeWidth="2">
          <circle cx="50" cy="54" r="10" />
          <circle cx="37" cy="40" r="4.5" />
          <circle cx="46" cy="34" r="4.5" />
          <circle cx="55" cy="34" r="4.5" />
          <circle cx="63" cy="40" r="4.5" />
        </g>
      );
    case 'baseball_diamond':
    default:
      return (
        <g>
          <polygon points="50,24 72,46 50,68 28,46" fill={accent} stroke="#181B2C" strokeWidth="2.5" />
          <circle cx="50" cy="46" r="6" fill="#FFFFFF" stroke="#181B2C" strokeWidth="2" />
        </g>
      );
  }
}

function UniformKitShowcaseSvg({ draft, clubName }: { draft: UniformCustomization; clubName: string }) {
  const uid = useId().replace(/:/g, '');
  const isPinstripe = draft.jerseyPattern === 'vintage_pinstripes';
  const isRaglan = draft.jerseyPattern === 'raglan_sleeves';
  const isGradient = draft.jerseyPattern === 'neon_90s_gradient';
  const isStripe = draft.jerseyPattern === 'racing_chest_stripe';
  const isVest = draft.jerseyPattern === 'retro_vest';

  return (
    <svg
      viewBox="0 0 260 155"
      className="w-full max-w-[280px] mx-auto rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7]"
      role="img"
      aria-label={`${clubName} custom uniform preview`}
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={draft.primary} />
          <stop offset="55%" stopColor={draft.secondary} />
          <stop offset="100%" stopColor={draft.accent} />
        </linearGradient>
        <pattern id={`pin-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#FFFDF7" />
          <line x1="2" y1="0" x2="2" y2="8" stroke={draft.primary} strokeWidth="1.6" />
        </pattern>
      </defs>

      {/* Club Crest Badge */}
      <g transform="translate(8, 12)">
        <path
          d="M50 6 L88 22 L84 68 C82 88 50 100 50 100 C50 100 18 88 16 68 L12 22 Z"
          fill={draft.secondary}
          stroke="#181B2C"
          strokeWidth="3.2"
        />
        <path
          d="M50 12 L81 25 L78 65 C76 81 50 92 50 92 C50 92 24 81 22 65 L19 25 Z"
          fill={draft.primary}
        />
        {renderCrestIcon(draft.crestEmblem, draft.accent, draft.primary)}
        <rect x="24" y="68" width="52" height="19" rx="5" fill="#181B2C" />
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fill="#FFD166"
          fontSize="12"
          fontWeight="900"
          fontFamily="Bungee, sans-serif"
        >
          {draft.monogram}
        </text>
      </g>

      {/* Jersey Torso Preview */}
      <g transform="translate(122, 16)">
        {/* Sleeves */}
        <path
          d="M22 18 L4 34 L16 52 L28 42 Z"
          fill={isRaglan || isVest ? draft.secondary : draft.primary}
          stroke="#181B2C"
          strokeWidth="2.8"
        />
        <path
          d="M86 18 L104 34 L92 52 L80 42 Z"
          fill={isRaglan || isVest ? draft.secondary : draft.primary}
          stroke="#181B2C"
          strokeWidth="2.8"
        />
        {/* Body */}
        <path
          d="M22 18 L40 12 Q54 22 68 12 L86 18 L82 96 L26 96 Z"
          fill={
            isPinstripe
              ? `url(#pin-${uid})`
              : isGradient
                ? `url(#grad-${uid})`
                : isRaglan
                  ? '#FFFDF7'
                  : draft.primary
          }
          stroke="#181B2C"
          strokeWidth="3"
        />
        {isStripe ? (
          <rect x="25" y="42" width="58" height="14" fill={draft.accent} stroke="#181B2C" strokeWidth="2" />
        ) : null}
        {isVest ? (
          <path d="M24 18 L24 96 M84 18 L84 96" stroke={draft.accent} strokeWidth="3.5" />
        ) : null}
        <line x1="54" y1="20" x2="54" y2="96" stroke="#181B2C" strokeWidth="1.8" strokeDasharray="4 3" />
        <text
          x="54"
          y="64"
          textAnchor="middle"
          fill={isPinstripe || isRaglan ? draft.secondary : '#FFFDF7'}
          stroke="#181B2C"
          strokeWidth="0.9"
          fontSize="19"
          fontWeight="900"
          fontFamily="Bungee, sans-serif"
        >
          {draft.monogram}
        </text>
      </g>

      {/* Cap + Stirrup Strip */}
      <g transform="translate(128, 118)">
        {/* Cap */}
        {draft.capStyle === 'throwback_pillbox' ? (
          <g>
            <rect x="4" y="4" width="38" height="18" rx="3" fill={draft.primary} stroke="#181B2C" strokeWidth="2.4" />
            <line x1="4" y1="10" x2="42" y2="10" stroke={draft.accent} strokeWidth="3" />
            <rect x="18" y="20" width="34" height="6" rx="3" fill={draft.secondary} stroke="#181B2C" strokeWidth="2" />
          </g>
        ) : (
          <g>
            <path d="M6 22 A18 16 0 0 1 42 22 Z" fill={draft.primary} stroke="#181B2C" strokeWidth="2.4" />
            {draft.capStyle === 'two_tone_panel' ? (
              <path d="M16 22 A10 14 0 0 1 34 22 Z" fill="#FFFDF7" stroke="#181B2C" strokeWidth="1.6" />
            ) : null}
            <rect x="20" y="20" width="32" height="6" rx="3" fill={draft.secondary} stroke="#181B2C" strokeWidth="2" />
          </g>
        )}

        {/* Stirrup Sock Swatch */}
        <g transform="translate(68, 2)">
          <rect x="0" y="2" width="18" height="24" rx="4" fill={draft.primary} stroke="#181B2C" strokeWidth="2.2" />
          {draft.stirrupStyle === 'double_stripe' ? (
            <>
              <rect x="1" y="8" width="16" height="3" fill={draft.accent} />
              <rect x="1" y="15" width="16" height="3" fill="#FFFDF7" />
            </>
          ) : null}
          {draft.stirrupStyle === 'high_neon_90s' ? (
            <rect x="1" y="4" width="16" height="9" fill={draft.accent} />
          ) : null}
          {draft.stirrupStyle === 'candy_cane' ? (
            <>
              <rect x="1" y="6" width="16" height="3" fill="#FFFDF7" />
              <rect x="1" y="12" width="16" height="3" fill={draft.accent} />
              <rect x="1" y="18" width="16" height="3" fill={draft.secondary} />
            </>
          ) : null}
        </g>
      </g>
    </svg>
  );
}

export function UniformDesignerPanel({ club, onNotice }: UniformDesignerPanelProps) {
  const [draft, setDraft] = useState<UniformCustomization>(() =>
    extractClubUniformCustomization(club),
  );
  const [appliedSaved, setAppliedSaved] = useState(false);
  const modelPlayer = club.roster[0];

  const updateDraft = (
    updater: UniformCustomization | ((prev: UniformCustomization) => UniformCustomization),
  ) => {
    setAppliedSaved(false);
    setDraft(updater);
  };

  const handleApply = () => {
    const res = applyHumanUniformCustomization(draft);
    if (res.applied) {
      setAppliedSaved(true);
    }
    onNotice(
      res.applied
        ? `Updated ${club.city} ${club.name} uniforms (${draft.monogram} • ${draft.jerseyPattern.replace(/_/g, ' ')})!`
        : (res.reason ?? 'Could not apply uniform.'),
    );
    soundEngine.play('level_up');
  };

  return (
    <div data-testid="uniform-designer-panel" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-4 items-start">
        {/* Live Kit + 2.5D Chibi Preview */}
        <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-3 text-center">
          <div className="font-display text-xs uppercase text-[#181B2C] flex items-center justify-center gap-1.5">
            <Palette className="w-4 h-4 text-[#E63946]" />
            Live Uniform &amp; Crest Preview
          </div>
          <UniformKitShowcaseSvg draft={draft} clubName={`${club.city} ${club.name}`} />
          {modelPlayer ? (
            <div className="w-32 h-36 mx-auto">
              <PaintedUniformPreview
                traits={modelPlayer.traits}
                team={{
                  primary: draft.primary,
                  secondary: draft.secondary,
                  accent: draft.accent,
                  monogram: draft.monogram || club.colors.monogram,
                }}
                jerseyNumber={modelPlayer.jerseyNumber}
                role={isPitcherPosition(modelPlayer.position) ? 'pitcher' : 'batter'}
                throwsHand={modelPlayer.throws}
                batSide={modelPlayer.bats === 'L' ? 'L' : 'R'}
                clip="idle"
              />
            </div>
          ) : null}
          <ComicButton
            size="md"
            variant={appliedSaved ? 'gold' : 'turf'}
            data-confirmed={appliedSaved ? 'true' : undefined}
            icon={<Sparkles className="w-4 h-4" />}
            className="w-full"
            onClick={handleApply}
          >
            {appliedSaved ? '✓ Uniform Applied!' : 'Apply Custom Uniform'}
          </ComicButton>
          {appliedSaved ? (
            <div
              role="status"
              data-testid="uniform-applied-status"
              className="px-2.5 py-1 rounded-lg border border-[#1B4332] bg-[#D8F3DC] text-[#1B4332] text-[11px] font-extrabold"
            >
              ✓ Saved to your 3D ballpark &amp; cards!
            </div>
          ) : null}
        </div>

        {/* Interactive Controls */}
        <div className="space-y-3">
          {/* 1-Tap 90s Team Kit Presets */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="font-display text-xs uppercase text-[#181B2C]">
              1-Tap 90s Throwback Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {UNIFORM_PRESETS.map((preset) => (
                <ComicButton
                  key={preset.id}
                  size="sm"
                  variant="cream"
                  onClick={() => {
                    updateDraft({
                      ...preset.config,
                      monogram: draft.monogram || preset.config.monogram,
                    });
                    soundEngine.play('ui_pop');
                  }}
                >
                  {preset.name}
                </ComicButton>
              ))}
            </div>
          </div>

          {/* Colors & Monogram */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label className="text-[11px] font-extrabold text-[#181B2C] flex flex-col gap-1">
              Primary Color
              <input
                aria-label="Primary Color"
                type="color"
                value={draft.primary}
                onChange={(e) => updateDraft((d) => ({ ...d, primary: e.target.value.toUpperCase() }))}
                className="w-full h-11 rounded-lg border-2 border-[#181B2C] cursor-pointer"
              />
            </label>
            <label className="text-[11px] font-extrabold text-[#181B2C] flex flex-col gap-1">
              Secondary Trim
              <input
                aria-label="Secondary Trim"
                type="color"
                value={draft.secondary}
                onChange={(e) => updateDraft((d) => ({ ...d, secondary: e.target.value.toUpperCase() }))}
                className="w-full h-11 rounded-lg border-2 border-[#181B2C] cursor-pointer"
              />
            </label>
            <label className="text-[11px] font-extrabold text-[#181B2C] flex flex-col gap-1">
              Accent Pop
              <input
                aria-label="Accent Pop"
                type="color"
                value={draft.accent}
                onChange={(e) => updateDraft((d) => ({ ...d, accent: e.target.value.toUpperCase() }))}
                className="w-full h-11 rounded-lg border-2 border-[#181B2C] cursor-pointer"
              />
            </label>
            <label className="text-[11px] font-extrabold text-[#181B2C] flex flex-col gap-1">
              Club Monogram
              <input
                aria-label="Club Monogram"
                type="text"
                maxLength={3}
                value={draft.monogram}
                onChange={(e) =>
                  updateDraft((d) => ({
                    ...d,
                    monogram: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3),
                  }))
                }
                className="w-full min-h-[44px] px-2.5 rounded-xl border-2 border-[#181B2C] bg-white font-display text-sm uppercase text-center"
              />
            </label>
          </div>

          {/* Jersey Pattern */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="font-display text-xs uppercase text-[#181B2C]">Jersey Pattern</div>
            <div className="flex flex-wrap gap-1.5">
              {JERSEY_PATTERNS.map((pat) => (
                <ComicButton
                  key={pat.id}
                  size="sm"
                  variant={draft.jerseyPattern === pat.id ? 'gold' : 'cream'}
                  active={draft.jerseyPattern === pat.id}
                  onClick={() => updateDraft((d) => ({ ...d, jerseyPattern: pat.id }))}
                >
                  {pat.label}
                </ComicButton>
              ))}
            </div>
          </div>

          {/* Cap Style & Stirrups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="font-display text-xs uppercase text-[#181B2C]">Cap Style</div>
              <div className="flex flex-wrap gap-1.5">
                {CAP_STYLES.map((cap) => (
                  <ComicButton
                    key={cap.id}
                    size="sm"
                    variant={draft.capStyle === cap.id ? 'gold' : 'cream'}
                    active={draft.capStyle === cap.id}
                    onClick={() => updateDraft((d) => ({ ...d, capStyle: cap.id }))}
                  >
                    {cap.label}
                  </ComicButton>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="font-display text-xs uppercase text-[#181B2C]">Stirrup Socks</div>
              <div className="flex flex-wrap gap-1.5">
                {STIRRUP_STYLES.map((sock) => (
                  <ComicButton
                    key={sock.id}
                    size="sm"
                    variant={draft.stirrupStyle === sock.id ? 'gold' : 'cream'}
                    active={draft.stirrupStyle === sock.id}
                    onClick={() => updateDraft((d) => ({ ...d, stirrupStyle: sock.id }))}
                  >
                    {sock.label}
                  </ComicButton>
                ))}
              </div>
            </div>
          </div>

          {/* Crest Emblem */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="font-display text-xs uppercase text-[#181B2C]">Club Crest Emblem</div>
            <div className="flex flex-wrap gap-1.5">
              {CREST_EMBLEMS.map((emblem) => (
                <ComicButton
                  key={emblem.id}
                  size="sm"
                  variant={draft.crestEmblem === emblem.id ? 'gold' : 'cream'}
                  active={draft.crestEmblem === emblem.id}
                  onClick={() => updateDraft((d) => ({ ...d, crestEmblem: emblem.id }))}
                >
                  {emblem.label}
                </ComicButton>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
