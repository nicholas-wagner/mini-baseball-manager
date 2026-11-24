import { useId } from 'react';
import './mascotCap.css';
export type MascotMood = 'happy' | 'cheering' | 'rally' | 'determined' | 'watching' | 'peeking';

interface ClubMascotBuddyProps {
  mascot: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
  tipCap?: boolean;
}

type MascotSpecies = 'dog' | 'otter' | 'fox' | 'bear' | 'baseball';

const SIZE_CLASSES: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'w-11 h-11',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

function detectMascotSpecies(label: string): MascotSpecies {
  const lower = label.toLowerCase();
  if (/dog|pup|hound|rocket|terrier|husky|corgi/.test(lower)) return 'dog';
  if (/otter|duck|shark|whale|crab|seal|splash/.test(lower)) return 'otter';
  if (/fox|cat|tiger|lynx|wolf|clover|kit/.test(lower)) return 'fox';
  if (/bear|cub|panda|grizz|astro|koala/.test(lower)) return 'bear';
  return 'baseball';
}

const SPECIES_COLORS: Readonly<Record<MascotSpecies, { fur: string; snout: string; ear: string }>> = {
  dog: { fur: '#E8A864', snout: '#FFF1DC', ear: '#A45A28' },
  otter: { fur: '#8D6E63', snout: '#F5E6D3', ear: '#5D4037' },
  fox: { fur: '#F77F00', snout: '#FFF8EC', ear: '#C94A00' },
  bear: { fur: '#7F5539', snout: '#F3D5B5', ear: '#582F0E' },
  baseball: { fur: '#FFFDF7', snout: '#FFFDF7', ear: '#E63946' },
};

/**
 * Cute 90s Saturday-morning cartoon SVG team mascot buddy that reacts with cheers,
 * sparkles, and club colors across the Clubhouse, Home Run celebrations & Post-Game Victory screens!
 */
export function ClubMascotBuddy({
  mascot,
  primaryColor,
  secondaryColor,
  accentColor,
  mood = 'happy',
  size = 'md',
  tipCap = false,
  testId = 'club-mascot-buddy',
}: ClubMascotBuddyProps) {
  const species = detectMascotSpecies(mascot);
  const palette = SPECIES_COLORS[species];
  const uid = useId();
  const isCheering = mood === 'cheering';
  const isRally = mood === 'rally';

  return (
    <div
      data-testid={testId}
      title={`${mascot} (${mood})`}
      className={`${SIZE_CLASSES[size]} rounded-2xl border-2 border-[#181B2C] bg-[#FFF8E7] shadow-[3px_3px_0_#181B2C] overflow-hidden shrink-0 flex items-center justify-center ${
        isCheering ? 'animate-bounce' : ''
      }`}
    >
      <svg viewBox="0 0 64 64" className="w-full h-full" role="img" aria-label={mascot + (mood === 'watching' ? ' covers its eyes' : mood === 'peeking' ? ' peeks at the call' : ' mascot')}>
        <defs>
          <radialGradient id={`mb-bg-${uid}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="64" height="64" fill={`url(#mb-bg-${uid})`} />

        {/* Celebratory sparkles */}
        {isCheering || isRally ? (
          <g fill={accentColor} stroke="#181B2C" strokeWidth="1.2">
            <polygon points="10,12 12,16 16,17 12,19 10,23 8,19 4,17 8,16" />
            <polygon points="54,10 56,14 60,15 56,17 54,21 52,17 48,15 52,14" />
          </g>
        ) : null}

        {/* Species Ears */}
        {species === 'dog' ? (
          <g stroke="#181B2C" strokeWidth="2.2" fill={palette.ear}>
            <ellipse cx="14" cy="36" rx="6" ry="11" transform="rotate(14 14 36)" />
            <ellipse cx="50" cy="36" rx="6" ry="11" transform="rotate(-14 50 36)" />
          </g>
        ) : null}
        {species === 'fox' ? (
          <g stroke="#181B2C" strokeWidth="2.2">
            <polygon points="15,28 11,11 27,20" fill={palette.fur} />
            <polygon points="49,28 53,11 37,20" fill={palette.fur} />
            <polygon points="16,24 14,15 23,20" fill="#FFF8EC" stroke="none" />
            <polygon points="48,24 50,15 41,20" fill="#FFF8EC" stroke="none" />
          </g>
        ) : null}
        {species === 'bear' || species === 'otter' ? (
          <g stroke="#181B2C" strokeWidth="2.2" fill={palette.fur}>
            <circle cx="17" cy="21" r="6.5" />
            <circle cx="47" cy="21" r="6.5" />
            <circle cx="17" cy="21" r="3" fill={palette.snout} stroke="none" />
            <circle cx="47" cy="21" r="3" fill={palette.snout} stroke="none" />
          </g>
        ) : null}

        {/* Jersey Shoulders */}
        <path
          d="M14 62 Q32 50 50 62 Z"
          fill={primaryColor}
          stroke="#181B2C"
          strokeWidth="2.4"
        />

        {/* Head */}
        <circle cx="32" cy="36" r="18" fill={palette.fur} stroke="#181B2C" strokeWidth="2.5" />

        {/* Baseball stitches for baseball mascot */}
        {species === 'baseball' ? (
          <g stroke="#E63946" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M18 27 Q23 36 18 45" />
            <path d="M46 27 Q41 36 46 45" />
          </g>
        ) : (
          <ellipse cx="32" cy="42" rx="10" ry="7.5" fill={palette.snout} />
        )}

        {/* Team Baseball Cap (tilted backwards in rally mood!) */}
        <g className={tipCap ? 'mascot-cap-tip' : undefined} transform={isRally ? 'rotate(-8 32 22)' : undefined}>
          <path
            d="M16 24 C17 12, 47 12, 48 24 Z"
            fill={secondaryColor}
            stroke="#181B2C"
            strokeWidth="2.3"
          />
          <path
            d={isRally ? 'M14 23 Q32 19 52 24 L48 27 Q32 23 15 26 Z' : 'M15 24 Q32 20 53 25 L50 28 Q32 24 16 27 Z'}
            fill={primaryColor}
            stroke="#181B2C"
            strokeWidth="2.2"
          />
          <circle cx="32" cy="18.5" r="2.6" fill={accentColor} stroke="#181B2C" strokeWidth="1.2" />
        </g>

        {/* Big Cute 90s Cartoon Eyes */}
        {isCheering ? (
          <g stroke="#181B2C" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M21 34 Q24.5 30 28 34" />
            <path d="M36 34 Q39.5 30 43 34" />
          </g>
        ) : (
          <g>
            <circle cx="24.5" cy="34" r="3.4" fill="#181B2C" />
            <circle cx="39.5" cy="34" r="3.4" fill="#181B2C" />
            <circle cx="25.6" cy="32.8" r="1.3" fill="#FFFFFF" />
            <circle cx="40.6" cy="32.8" r="1.3" fill="#FFFFFF" />
            {mood === 'determined' ? (
              <g stroke="#181B2C" strokeWidth="2.2" strokeLinecap="round">
                <line x1="20" y1="29.5" x2="28" y2="31.5" />
                <line x1="44" y1="29.5" x2="36" y2="31.5" />
              </g>
            ) : null}
          </g>
        )}

        {/* Rosy Cheeks */}
        <ellipse cx="19" cy="39.5" rx="3" ry="1.8" fill="#FF4D6D" fillOpacity="0.45" />
        <ellipse cx="45" cy="39.5" rx="3" ry="1.8" fill="#FF4D6D" fillOpacity="0.45" />

        {/* Cute Nose + Whiskers (for Otter/Fox) */}
        {species !== 'baseball' ? (
          <ellipse cx="32" cy="39.5" rx="3.2" ry="2.2" fill="#181B2C" />
        ) : null}
        {species === 'otter' || species === 'fox' ? (
          <g stroke="#181B2C" strokeWidth="1.3" strokeLinecap="round" opacity="0.75">
            <line x1="16" y1="41" x2="23" y2="42" />
            <line x1="16" y1="44" x2="23" y2="44" />
            <line x1="48" y1="41" x2="41" y2="42" />
            <line x1="48" y1="44" x2="41" y2="44" />
          </g>
        ) : null}

        {/* Big Smile / Cheer Mouth */}
        {isCheering ? (
          <path
            d="M26 43 Q32 51 38 43 Z"
            fill="#FF4D6D"
            stroke="#181B2C"
            strokeWidth="2"
          />
        ) : mood === 'determined' ? (
          <path
            d="M27 45 Q32 43 37 45"
            fill="none"
            stroke="#181B2C"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M26 43.5 Q32 48.5 38 43.5"
            fill="none"
            stroke="#181B2C"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        )}
        {(mood === 'watching' || mood === 'peeking') && <g stroke="#302636" strokeWidth="1.8" fill={palette.fur}>
          <g transform="rotate(-18 23 37)"><ellipse cx="24" cy="35" rx="7" ry="8" /><path d="m20 31 1 4m3-5 1 4" fill="none"/></g>
          <g className="mascot-peek-paw" transform={mood === 'peeking' ? 'translate(4 10)' : undefined}>
            <ellipse cx="40" cy="35" rx="7" ry="8"/><path d="m38 30-1 4m5-3-1 4" fill="none"/>
          </g>
        </g>}
      </svg>
    </div>
  );
}
