import { getStatGrade } from './statGrade';

interface StatBadgeProps {
  label: string;
  value: number;
  showBar?: boolean;
}

export function StatBadge({ label, value, showBar = false }: StatBadgeProps) {
  const clamped = Math.max(0, Math.min(99, Math.round(value)));
  const meta = getStatGrade(clamped);

  if (!showBar) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 border-[#181B2C] bg-[#F1E4C8]">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
          {label}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[11px] font-display leading-none border border-[#181B2C]"
          style={{ backgroundColor: meta.bg, color: meta.text }}
        >
          {meta.grade}
        </span>
        <span className="font-mono-tabular text-xs font-bold text-[#181B2C]">{clamped}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-extrabold uppercase tracking-wider text-[#181B2C]">{label}</span>
        <span className="flex items-center gap-1.5">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-display leading-none border border-[#181B2C]"
            style={{ backgroundColor: meta.bg, color: meta.text }}
          >
            {meta.grade}
          </span>
          <span className="font-mono-tabular font-bold text-[#181B2C] w-5 text-right">
            {clamped}
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#E6D7B8] border-2 border-[#181B2C] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clamped}%`, backgroundColor: meta.bg }}
        />
      </div>
    </div>
  );
}
