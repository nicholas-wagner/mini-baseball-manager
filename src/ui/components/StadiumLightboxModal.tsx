import { useEffect } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { BallparkPreset } from '../../engine/ballparks/stadiumCatalog';
import { ComicButton } from '../design-system/ComicButton';

interface StadiumLightboxModalProps {
  open: boolean;
  park: BallparkPreset;
  imageUrl: string;
  tierLabel?: string;
  capacity?: number;
  onClose: () => void;
}

export function StadiumLightboxModal({
  open,
  park,
  imageUrl,
  tierLabel,
  capacity,
  onClose,
}: StadiumLightboxModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/85 flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${park.name} Full-Size Ballpark Preview`}
      onClick={onClose}
    >
      <div
        data-testid="stadium-lightbox-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[8px_8px_0_#181B2C] overflow-hidden"
      >
        <div className="px-4 py-3 bg-[#1D3557] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="font-display text-sm sm:text-base flex items-center gap-1.5 truncate">
              <Maximize2 className="w-4 h-4 text-[#FFD166] shrink-0" />
              🏟️ {park.name} {tierLabel ? `— ${tierLabel}` : ''}
            </div>
            <div className="text-[11px] font-bold text-[#FFD166] truncate">{park.tagline}</div>
          </div>
          <button
            type="button"
            aria-label="Close Full-Size Stadium View"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1">
          <div className="rounded-xl border-[3px] border-[#181B2C] overflow-hidden bg-[#63CAFF] shadow-[4px_4px_0_#181B2C]">
            <img
              src={imageUrl}
              alt={`${park.name} full-size artwork`}
              data-testid="stadium-lightbox-img"
              className="w-full max-h-[60dvh] object-contain mx-auto block"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-[#181B2C]">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-[#D8F3DC] border border-[#181B2C]">
                LF {park.factors.leftWallFt} ft · CF {park.factors.centerWallFt} ft · RF {park.factors.rightWallFt} ft
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#FFF3BF] border border-[#181B2C]">
                HR Factor {park.factors.hrFactor.toFixed(2)}× (LHB {park.factors.leftyHrFactor.toFixed(2)}× / RHB {park.factors.rightyHrFactor.toFixed(2)}×)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#E0FBFC] border border-[#181B2C]">
                {park.factors.isDome ? 'Indoor Dome' : 'Open Air'} · {park.factors.surface === 'fast_turf' ? 'Fast Turf' : 'Natural Grass'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-[#181B2C]">
                Capacity: {(capacity ?? park.baseCapacity).toLocaleString()} fans
              </span>
            </div>
            <ComicButton size="sm" variant="gold" onClick={onClose}>
              Done Viewing
            </ComicButton>
          </div>
        </div>
      </div>
    </div>
  );
}
