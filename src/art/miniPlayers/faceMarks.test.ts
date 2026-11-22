import { describe, expect, it } from 'vitest';
import marks from './faceMarks.json';

describe('landmarks on the painted face', () => {
  it('registers the eyes, both lip corners and the chin for each visible face cel', () => {
    for (const [sheet, cells] of Object.entries(marks)) {
      expect(cells).toHaveLength(sheet.startsWith('gear-') ? 4 : 12);
      for (const [cell, face] of cells.entries()) {
        const [lx, ly, rx, ry] = face.eyes;
        const [left, yLeft, right, yRight, lowerLip] = face.mouth;
        const [nearCheek, , , , chin, bottom, , , farCheek] = face.jaw;
        expect(lx, sheet + cell).toBeLessThan(rx);
        expect(ly).toBeLessThan(yLeft);
        expect(ry).toBeLessThan(yRight);
        expect(left).toBeLessThan(right);
        expect(lowerLip).toBeGreaterThanOrEqual(Math.max(yLeft, yRight));
        expect(lowerLip).toBeLessThan(bottom);
        expect(chin).toBeGreaterThan(nearCheek);
        expect(chin).toBeLessThan(farCheek);
      }
    }
  });
});
