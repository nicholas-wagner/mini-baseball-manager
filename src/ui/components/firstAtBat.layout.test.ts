import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const studioCss = readFileSync(resolve('src/ui/components/firstAtBat.css'), 'utf8');

function mediaBlock(css: string, header: string): string {
  const start = css.indexOf(header);
  if (start < 0) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return '';
}

describe('TASK-099 landscape and desktop studio layout', () => {
  const landscape = mediaBlock(
    studioCss,
    '@media (orientation: landscape) and (max-height: 540px) and (max-width: 1024px)',
  );
  const desktop = mediaBlock(studioCss, '@media (min-width: 1024px)');

  it('lays a short landscape phone out as a 2-column grid with the dock beside the diamond', () => {
    expect(landscape).toContain('grid-template-columns: minmax(0, 1fr) minmax(256px, 38vw)');
    expect(landscape).toContain('grid-template-rows: auto minmax(0, 1fr)');
    expect(landscape).toMatch(/\.live-score-row\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
    expect(landscape).toMatch(/\.live-stage\s*\{[^}]*grid-column:\s*1/);
    expect(landscape).toMatch(/\.live-stage\s*\{[^}]*grid-row:\s*2/);
    expect(landscape).toMatch(/\.live-dock\s*\{[^}]*grid-column:\s*2/);
    expect(landscape).toMatch(/\.live-dock\s*\{[^}]*grid-row:\s*2/);
    expect(landscape).toMatch(/\.live-dock\s*\{[^}]*overflow-y:\s*auto/);
    expect(landscape).toContain('width: min(62vw, calc(100vw - 260px))');
  });

  it('shortens the desktop studio so the diamond uses the vertical space under the app bar', () => {
    expect(desktop).toContain('height: calc(100dvh - 44px)');
    expect(desktop).not.toContain('height: calc(100dvh - 68px)');
  });
});
