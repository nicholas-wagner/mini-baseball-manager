import type { ClubColors } from '../../engine/models/club';
import { computePlayerOverall, type Player } from '../../engine/models/player';
import { buildPlayerCardStatProfile } from '../../engine/models/playerCardStats';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sanitizes player name & jersey number into a clean downloadable 90s card PNG filename. */
export function buildCardExportFilename(playerName: string, jerseyNumber: number): string {
  const slug = playerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `mbm-card-${slug || 'player'}-${jerseyNumber}.png`;
}

/** Generates a standalone 280x380 retro 90s Holo Foil Baseball Card SVG ready for PNG export. */
export function renderExportableCardSvg(
  player: Player,
  team: Pick<ClubColors, 'primary' | 'secondary' | 'accent' | 'monogram'>,
  clubName = 'Mini Baseball Manager',
): string {
  const ovr = computePlayerOverall(player);
  const profile = buildPlayerCardStatProfile(player);
  const roleLabel = profile.roleGroup === 'pitcher' ? 'PITCHER CARD' : 'POSITION CARD';
  const statRows = profile.ratings
    .map((bar, idx) => {
      const y = 216 + idx * 24;
      const barWidth = Math.round((Math.min(99, Math.max(10, bar.value)) / 99) * 140);
      return `
        <text x="26" y="${y}" fill="#181B2C" font-size="11" font-weight="800" font-family="sans-serif">${escapeXml(bar.label)}</text>
        <rect x="98" y="${y - 10}" width="140" height="11" rx="4" fill="#E9DFC9" stroke="#181B2C" stroke-width="1.4" />
        <rect x="98" y="${y - 10}" width="${barWidth}" height="11" rx="4" fill="${team.primary}" />
        <text x="246" y="${y}" fill="#181B2C" font-size="11" font-weight="900" font-family="monospace">${bar.value}</text>
      `;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 380" width="560" height="760">
    <defs>
      <linearGradient id="holoBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${team.primary}" />
        <stop offset="50%" stop-color="${team.secondary}" />
        <stop offset="100%" stop-color="${team.accent}" />
      </linearGradient>
    </defs>
    <rect width="280" height="380" rx="20" fill="url(#holoBg)" stroke="#181B2C" stroke-width="6" />
    <rect x="12" y="12" width="256" height="356" rx="14" fill="#FBF4E4" stroke="#181B2C" stroke-width="3" />
    <rect x="12" y="12" width="256" height="58" rx="12" fill="${team.secondary}" />
    <text x="24" y="34" fill="#FFD166" font-size="10" font-weight="900" font-family="sans-serif">${escapeXml(clubName.toUpperCase())}</text>
    <text x="24" y="56" fill="#FBF4E4" font-size="16" font-weight="900" font-family="sans-serif">${escapeXml(player.name)}</text>
    <rect x="210" y="20" width="46" height="42" rx="10" fill="#FFC300" stroke="#181B2C" stroke-width="2.5" />
    <text x="233" y="36" text-anchor="middle" fill="#181B2C" font-size="9" font-weight="900" font-family="sans-serif">OVR</text>
    <text x="233" y="55" text-anchor="middle" fill="#181B2C" font-size="18" font-weight="900" font-family="sans-serif">${ovr}</text>

    <rect x="24" y="82" width="232" height="106" rx="12" fill="${team.primary}" stroke="#181B2C" stroke-width="2.5" />
    <circle cx="140" cy="134" r="38" fill="${team.accent}" stroke="#181B2C" stroke-width="3" />
    <text x="140" y="146" text-anchor="middle" fill="#181B2C" font-size="30" font-weight="900" font-family="sans-serif">#${player.jerseyNumber}</text>
    <rect x="34" y="92" width="44" height="20" rx="6" fill="#181B2C" />
    <text x="56" y="106" text-anchor="middle" fill="#FFD166" font-size="11" font-weight="900" font-family="sans-serif">${escapeXml(player.position)}</text>
    <rect x="184" y="92" width="62" height="20" rx="6" fill="#181B2C" />
    <text x="215" y="106" text-anchor="middle" fill="#FBF4E4" font-size="10" font-weight="800" font-family="monospace">${escapeXml(player.nationalityId)} ${player.bats}/${player.throws}</text>

    <text x="140" y="202" text-anchor="middle" fill="#4A5068" font-size="10" font-weight="800" font-family="sans-serif">"${escapeXml(player.nickname)}" • ${roleLabel}</text>
    ${statRows}
    <rect x="22" y="334" width="236" height="24" rx="7" fill="#181B2C" />
    <text x="140" y="350" text-anchor="middle" fill="#FFD166" font-size="9.5" font-weight="800" font-family="monospace">${escapeXml(profile.statLine)}</text>
  </svg>`;
}

/** Wraps inline SVG baseball-card markup as a UTF-8 SVG Data URL safe for Canvas/PNG export. */
export function serializeCardSvgToDataUrl(svgMarkup: string): string {
  const normalized = svgMarkup.trim().startsWith('<svg')
    ? svgMarkup.trim()
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 380">${svgMarkup}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`;
}

/**
 * Renders SVG baseball card markup onto an offscreen canvas and exports a crisp PNG Data URL.
 * Gracefully falls back to the SVG Data URL in headless/non-canvas environments.
 */
export async function exportCardSvgToPngDataUrl(
  svgMarkup: string,
  width = 560,
  height = 760,
): Promise<{ dataUrl: string; format: 'png' | 'svg' }> {
  const svgUrl = serializeCardSvgToDataUrl(svgMarkup);
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return { dataUrl: svgUrl, format: 'svg' };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: svgUrl, format: 'svg' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), format: 'png' });
    };
    img.onerror = () => resolve({ dataUrl: svgUrl, format: 'svg' });
    img.src = svgUrl;
  });
}

/** Exports a player's 90s Holo Foil card as a downloadable PNG (or SVG fallback) and returns filename. */
export async function downloadPlayerCardPng(
  player: Player,
  team: Pick<ClubColors, 'primary' | 'secondary' | 'accent' | 'monogram'>,
  clubName: string,
): Promise<{ filename: string; format: 'png' | 'svg' }> {
  const svg = renderExportableCardSvg(player, team, clubName);
  const { dataUrl, format } = await exportCardSvgToPngDataUrl(svg);
  const filename = buildCardExportFilename(player.name, player.jerseyNumber);

  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = format === 'png' ? filename : filename.replace(/\.png$/, '.svg');
    link.style.display = 'none';
    document.body.appendChild(link);
    try {
      link.click();
    } catch {
      // jsdom does not implement navigation on anchor clicks
    }
    document.body.removeChild(link);
  }
  return { filename, format };
}
