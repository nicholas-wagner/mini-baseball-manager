/**
 * Pure domain identifiers for signature pitch, hit, and special-power visual cues.
 * Owned by `src/engine/` so simulation events and cultural heritage specs remain
 * 100% decoupled from `src/scene/` Three.js rendering.
 */
export type BallVfxStyle =
  | 'fastball'
  | 'blazing_comet'
  | 'ghost_knuckle'
  | 'tornado_slider'
  | 'moonshot_hr'
  | 'ninja_bunt'
  | 'line_drive';
