/** Sanitizes player name & jersey number into a clean downloadable 90s card PNG filename. */
export function buildCardExportFilename(playerName: string, jerseyNumber: number): string {
  const slug = playerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `mbm-card-${slug || 'player'}-${jerseyNumber}.png`;
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
