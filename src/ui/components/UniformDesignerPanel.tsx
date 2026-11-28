import { type ReactElement, useId, useState } from 'react';
import { Palette, Sparkles } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  CAP_STYLES,
  CREST_EMBLEMS,
  deriveRoadPreviewCustomization,
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

type CrestIconRenderer = (accent: string, primary: string) => ReactElement;

const CREST_ICON_RENDERERS: Readonly<Record<CrestEmblemId, CrestIconRenderer>> = {
  baseball_diamond: (accent) => (
    <g>
      <polygon points="50,24 72,46 50,68 28,46" fill={accent} stroke="#181B2C" strokeWidth="2.5" />
      <circle cx="50" cy="46" r="6" fill="#FFFFFF" stroke="#181B2C" strokeWidth="2" />
    </g>
  ),
  lightning_bolt: (accent) => (
    <path
      d="M52 24 L38 50 L49 50 L43 72 L62 44 L51 44 Z"
      fill={accent}
      stroke="#181B2C"
      strokeWidth="2.5"
    />
  ),
  comet_star: (accent) => (
    <path
      d="M50 23 L55 39 L72 39 L58 49 L63 65 L50 55 L37 65 L42 49 L28 39 L45 39 Z"
      fill={accent}
      stroke="#181B2C"
      strokeWidth="2.5"
    />
  ),
  crown_shield: (accent) => (
    <path
      d="M32 60 L35 34 L44 46 L50 30 L56 46 L65 34 L68 60 Z"
      fill={accent}
      stroke="#181B2C"
      strokeWidth="2.5"
    />
  ),
  crossed_bats: (accent, primary) => (
    <g stroke="#181B2C" strokeWidth="2.2">
      <path d="M32 64 L66 30 L70 34 L36 68 Z" fill={accent} />
      <path d="M68 64 L34 30 L30 34 L64 68 Z" fill={primary} />
    </g>
  ),
  rocket_paw: (accent) => (
    <g fill={accent} stroke="#181B2C" strokeWidth="2">
      <circle cx="50" cy="54" r="10" />
      <circle cx="37" cy="40" r="4.5" />
      <circle cx="46" cy="34" r="4.5" />
      <circle cx="55" cy="34" r="4.5" />
      <circle cx="63" cy="40" r="4.5" />
    </g>
  ),
  flaming_baseball: (accent, primary) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <path
        d="M34 55 C26 42 36 28 49 23 C47 30 54 27 60 22 C63 32 72 35 67 51 C63 62 43 65 34 55 Z"
        fill={accent}
      />
      <circle cx="48" cy="49" r="11" fill="#FFFDF7" />
      <path d="M41 42 C45 47 45 52 41 56 M55 42 C51 47 51 52 55 56" fill="none" stroke={primary} strokeWidth="2" />
    </g>
  ),
  winged_cleat: (accent) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M29 44 L45 34 L42 42 L54 36 L47 47 L34 50 Z" fill={accent} />
      <path d="M35 52 L53 45 L58 51 L69 52 L69 60 L35 60 Z" fill="#FFFDF7" />
      <path d="M40 60 L40 65 M50 60 L50 65 M62 60 L62 65" stroke="#181B2C" strokeWidth="2.5" />
    </g>
  ),
  anchor_bay: (accent) => (
    <g fill="none" stroke="#181B2C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="29" r="5" fill={accent} />
      <path d="M50 34 L50 62 M39 40 L61 40" stroke={accent} strokeWidth="4.5" />
      <path d="M50 34 L50 62 M39 40 L61 40" stroke="#181B2C" strokeWidth="1.8" />
      <path d="M32 50 C34 62 44 65 50 64 C56 65 66 62 68 50" stroke={accent} strokeWidth="4.5" />
      <path d="M32 50 C34 62 44 65 50 64 C56 65 66 62 68 50" stroke="#181B2C" strokeWidth="1.8" />
      <polygon points="29,51 36,47 35,55" fill={accent} stroke="#181B2C" strokeWidth="1.8" />
      <polygon points="71,51 64,47 65,55" fill={accent} stroke="#181B2C" strokeWidth="1.8" />
    </g>
  ),
  sakura_blossom: (accent, primary) => (
    <g stroke="#181B2C" strokeWidth="2">
      <ellipse cx="50" cy="33" rx="6.5" ry="10" fill={accent} />
      <ellipse cx="62" cy="43" rx="6.5" ry="10" transform="rotate(72 62 43)" fill={accent} />
      <ellipse cx="58" cy="57" rx="6.5" ry="10" transform="rotate(144 58 57)" fill={accent} />
      <ellipse cx="42" cy="57" rx="6.5" ry="10" transform="rotate(-144 42 57)" fill={accent} />
      <ellipse cx="38" cy="43" rx="6.5" ry="10" transform="rotate(-72 38 43)" fill={accent} />
      <circle cx="50" cy="46" r="5.5" fill="#FFFDF7" />
      <circle cx="50" cy="46" r="2.2" fill={primary} stroke="none" />
    </g>
  ),
  thunder_bird: (accent) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <path
        d="M50 26 L56 35 L73 32 L64 44 L70 50 L56 50 L60 64 L50 58 L40 64 L44 50 L30 50 L36 44 L27 32 L44 35 Z"
        fill={accent}
      />
      <polygon points="50,38 56,47 50,53 44,47" fill="#FFFDF7" stroke="#181B2C" strokeWidth="1.8" />
    </g>
  ),
  rocket_ship: (accent, primary) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M50 22 C58 30 60 44 58 56 L42 56 C40 44 42 30 50 22 Z" fill="#FFFDF7" />
      <path d="M42 46 L32 58 L42 56 Z M58 46 L68 58 L58 56 Z" fill={accent} />
      <polygon points="45,56 50,67 55,56" fill={accent} />
      <circle cx="50" cy="40" r="5" fill={primary} />
    </g>
  ),
  desert_cactus: (accent) => (
    <g fill={accent} stroke="#181B2C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="45" y="25" width="10" height="40" rx="5" />
      <path d="M45 47 H36 C33 47 32 45 32 42 V35 C32 32 37 32 37 35 V42 H45 Z" />
      <path d="M55 42 H64 C67 42 68 40 68 37 V30 C68 27 63 27 63 30 V37 H55 Z" />
      <line x1="50" y1="30" x2="50" y2="60" stroke="#181B2C" strokeWidth="1.5" />
    </g>
  ),
  mountain_peak: (accent, primary) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <polygon points="26,62 43,31 58,62" fill={accent} />
      <polygon points="44,62 59,36 74,62" fill={primary} />
      <polygon points="38,40 43,31 48,40 45,38 43,41 41,38" fill="#FFFDF7" stroke="#181B2C" strokeWidth="1.5" />
      <polygon points="55,43 59,36 63,43 61,41 59,44 57,41" fill="#FFFDF7" stroke="#181B2C" strokeWidth="1.5" />
    </g>
  ),
  shamrock_clover: (accent) => (
    <g fill={accent} stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <circle cx="50" cy="34" r="9.5" />
      <circle cx="39" cy="46" r="9.5" />
      <circle cx="61" cy="46" r="9.5" />
      <path d="M50 47 C50 56 46 62 42 66" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <path d="M50 47 C50 56 46 62 42 66" fill="none" stroke="#181B2C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="44" r="3.5" fill="#FFFDF7" stroke="none" />
    </g>
  ),
  dragon_crest: (accent) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <path
        d="M32 60 C31 44 37 31 50 26 L46 34 L58 28 L55 37 L69 40 L63 48 L68 53 L52 54 L56 62 L38 62 Z"
        fill={accent}
      />
      <polygon points="51,42 58,40 55,46" fill="#FFFDF7" stroke="#181B2C" strokeWidth="1.5" />
      <path d="M40 50 L47 49" stroke="#181B2C" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  vintage_mitt: (accent) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <path
        d="M33 52 C29 38 38 25 51 25 C64 25 71 35 68 49 C66 60 56 65 44 64 C37 63 34 58 33 52 Z"
        fill={accent}
      />
      <path d="M42 29 L46 42 M52 27 L52 40 M61 31 L57 42" stroke="#181B2C" strokeWidth="1.8" />
      <circle cx="50" cy="49" r="7.5" fill="#FFFDF7" />
      <path d="M46 45 C49 48 49 51 46 53 M54 45 C51 48 51 51 54 53" fill="none" stroke="#181B2C" strokeWidth="1.5" />
    </g>
  ),
  sunburst_wave: (accent) => (
    <g stroke="#181B2C" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M36 47 A14 14 0 0 1 64 47 Z" fill={accent} />
      <path
        d="M50 24 V30 M35 30 L39 34 M65 30 L61 34 M28 42 H33 M67 42 H72"
        stroke={accent}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M27 54 C35 46 44 47 50 53 C56 58 64 56 72 49 C71 58 63 64 50 64 C37 64 30 60 27 54 Z"
        fill="#FFFDF7"
      />
    </g>
  ),
};

export function ClubCrestIcon({
  emblem,
  accent,
  primary,
}: {
  emblem: CrestEmblemId;
  accent: string;
  primary: string;
}) {
  return CREST_ICON_RENDERERS[emblem](accent, primary);
}

function UniformKitShowcaseSvg({
  draft,
  clubName,
  previewMode,
}: {
  draft: UniformCustomization;
  clubName: string;
  previewMode: 'home' | 'road';
}) {
  const uid = useId().replace(/:/g, '');
  const isPinstripe = draft.jerseyPattern === 'vintage_pinstripes';
  const isRaglan = draft.jerseyPattern === 'raglan_sleeves';
  const isGradient = draft.jerseyPattern === 'neon_90s_gradient';
  const isStripe = draft.jerseyPattern === 'racing_chest_stripe';
  const isVest = draft.jerseyPattern === 'retro_vest';

  return (
    <svg
      data-testid="uniform-kit-showcase"
      data-preview-mode={previewMode}
      data-primary-color={draft.primary}
      viewBox="0 0 260 155"
      className="w-full max-h-[132px] max-w-[280px] mx-auto rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7]"
      role="img"
      aria-label={`${clubName} ${previewMode === 'road' ? 'road' : 'home'} uniform preview`}
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={draft.primary} />
          <stop offset="55%" stopColor={draft.secondary} />
          <stop offset="100%" stopColor={draft.accent} />
        </linearGradient>
        <pattern id={`pin-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={previewMode === 'road' ? '#E5E9EF' : '#FFFDF7'} />
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
        <g data-testid="uniform-active-crest-icon" data-emblem={draft.crestEmblem}>
          <ClubCrestIcon emblem={draft.crestEmblem} accent={draft.accent} primary={draft.primary} />
        </g>
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
                  ? previewMode === 'road'
                    ? '#E5E9EF'
                    : '#FFFDF7'
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
  const [previewMode, setPreviewMode] = useState<'home' | 'road'>('home');
  const [appliedSaved, setAppliedSaved] = useState(false);
  const modelPlayer = club.roster[0];

  const previewKit =
    previewMode === 'road' ? deriveRoadPreviewCustomization(draft) : draft;

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
    <div
      data-testid="uniform-designer-panel"
      className="grid grid-cols-1 gap-3 min-w-0 overflow-x-clip xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:items-start xl:gap-6"
    >
      <div data-testid="uniform-above-fold" className="grid grid-cols-1 gap-3 min-w-0 xl:contents">
        {/* Compact kit + chibi. Presets and colors stay in this fold on phones. */}
        <div className="p-2.5 sm:p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2.5 text-center xl:col-start-1">
          <div className="font-display text-xs uppercase text-[#181B2C] flex items-center justify-center gap-1.5">
            <Palette className="w-4 h-4 text-[#E63946]" />
            Live Uniform &amp; Crest Preview
          </div>
          <div
            data-testid="uniform-preview-mode-toggle"
            className="grid grid-cols-2 gap-1.5"
          >
            <ComicButton
              size="sm"
              variant={previewMode === 'home' ? 'gold' : 'cream'}
              active={previewMode === 'home'}
              aria-pressed={previewMode === 'home'}
              className="w-full px-2 text-[11px]"
              onClick={() => {
                setPreviewMode('home');
                soundEngine.play('ui_pop');
              }}
            >
              🏠 Home Kit
            </ComicButton>
            <ComicButton
              size="sm"
              variant={previewMode === 'road' ? 'gold' : 'cream'}
              active={previewMode === 'road'}
              aria-pressed={previewMode === 'road'}
              className="w-full px-2 text-[11px]"
              onClick={() => {
                setPreviewMode('road');
                soundEngine.play('ui_pop');
              }}
            >
              ✈️ Road Preview
            </ComicButton>
          </div>
          <div
            data-testid="uniform-hero-strip"
            className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-2"
          >
            <UniformKitShowcaseSvg
              draft={previewKit}
              clubName={`${club.city} ${club.name}`}
              previewMode={previewMode}
            />
            {modelPlayer ? (
              <div className="w-[88px] h-[104px] mx-auto rounded-xl border-2 border-[#181B2C]/20 bg-[#FFFDF7] flex items-center justify-center overflow-hidden">
                <PaintedUniformPreview
                  traits={modelPlayer.traits}
                  team={{
                    primary: previewKit.primary,
                    secondary: previewKit.secondary,
                    accent: previewKit.accent,
                    monogram: previewKit.monogram || club.colors.monogram,
                  }}
                  jerseyNumber={modelPlayer.jerseyNumber}
                  role={isPitcherPosition(modelPlayer.position) ? 'pitcher' : 'batter'}
                  throwsHand={modelPlayer.throws}
                  batSide={modelPlayer.bats === 'L' ? 'L' : 'R'}
                  clip="idle"
                />
              </div>
            ) : null}
          </div>
          {previewMode === 'road' ? (
            <div
              data-testid="uniform-road-note"
              className="px-2 py-1 rounded-lg border border-[#181B2C]/20 bg-[#FFFDF7] text-[11px] font-bold text-[#181B2C]"
            >
              Road kit auto-contrasts on away trips &amp; rival color clashes.
            </div>
          ) : null}
          <ComicButton
            size="sm"
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

        <div className="space-y-3 min-w-0 xl:col-start-2 xl:row-start-1">
          {/* 1-Tap 90s Team Kit Presets */}
          <div className="p-2.5 sm:p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-xs uppercase text-[#181B2C]">
                1-Tap 90s Throwback Presets
              </div>
              <span className="text-[10px] font-extrabold uppercase text-[#181B2C]/70">
                {UNIFORM_PRESETS.length} Kits
              </span>
            </div>
            <div
              data-testid="uniform-presets-grid"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-[216px] overflow-y-auto pr-0.5"
            >
              {UNIFORM_PRESETS.map((preset) => (
                <ComicButton
                  key={preset.id}
                  size="sm"
                  variant="cream"
                  className="w-full px-2 text-[11px] leading-tight justify-start text-left"
                  onClick={() => {
                    updateDraft({
                      ...preset.config,
                      monogram: draft.monogram || preset.config.monogram,
                    });
                    soundEngine.play('ui_pop');
                  }}
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className="inline-flex shrink-0 w-3.5 h-3.5 rounded-full border border-[#181B2C] overflow-hidden"
                    >
                      <span className="w-1/2 h-full" style={{ background: preset.config.primary }} />
                      <span className="w-1/2 h-full" style={{ background: preset.config.accent }} />
                    </span>
                    <span className="truncate">{preset.name}</span>
                  </span>
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
        </div>
      </div>

      <div className="space-y-3 min-w-0 xl:col-start-2">
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
          <div className="flex items-center justify-between gap-2">
            <div className="font-display text-xs uppercase text-[#181B2C]">Club Crest Emblem</div>
            <span className="text-[10px] font-extrabold uppercase text-[#181B2C]/70">
              {CREST_EMBLEMS.length} Emblems
            </span>
          </div>
          <div
            data-testid="uniform-crest-emblems-grid"
            className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
          >
            {CREST_EMBLEMS.map((emblem) => (
              <ComicButton
                key={emblem.id}
                size="sm"
                variant={draft.crestEmblem === emblem.id ? 'gold' : 'cream'}
                active={draft.crestEmblem === emblem.id}
                className="w-full px-2 text-[11px] justify-start text-left"
                onClick={() => updateDraft((d) => ({ ...d, crestEmblem: emblem.id }))}
              >
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <svg
                    aria-hidden="true"
                    viewBox="22 18 56 56"
                    className="w-5 h-5 shrink-0 rounded bg-[#181B2C]/10"
                  >
                    <ClubCrestIcon
                      emblem={emblem.id}
                      accent={previewKit.accent}
                      primary={previewKit.primary}
                    />
                  </svg>
                  <span className="truncate">{emblem.label}</span>
                </span>
              </ComicButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
