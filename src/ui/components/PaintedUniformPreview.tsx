import { useEffect, useRef, useState } from 'react';
import { createUniformPreview, type PreviewOptions } from '../../scene/characters/uniformPreview';

export function PaintedUniformPreview(options: PreviewOptions) {
  const host = useRef<HTMLDivElement>(null);
  const preview = useRef<ReturnType<typeof createUniformPreview> | null>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    try {
      preview.current = createUniformPreview(host.current, options);
    } catch {
      setFallback(true);
    }
    return () => { preview.current?.dispose(); preview.current = null; };
    // Keep the WebGL context across color edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { preview.current?.draw(options); }, [options]);
  return <div ref={host} role="img" aria-label="Home uniform preview" className="h-full grid place-items-center">
    {fallback && <span className="rounded-full border-4 px-5 py-3 font-display text-3xl"
      style={{background: options.team.primary, borderColor: options.team.accent, color: options.team.secondary}}>
      {options.team.monogram}
    </span>}
  </div>;
}
