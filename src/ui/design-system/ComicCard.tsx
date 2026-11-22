import type { ReactNode } from 'react';

interface ComicCardProps {
  title?: string;
  subtitle?: string;
  headerBg?: string;
  badge?: ReactNode;
  halftone?: boolean;
  className?: string;
  children: ReactNode;
}

export function ComicCard({
  title,
  subtitle,
  headerBg = '#1B4332',
  badge,
  halftone = false,
  className = '',
  children,
}: ComicCardProps) {
  return (
    <section
      className={[
        'comic-panel overflow-hidden',
        halftone ? 'bg-halftone' : 'bg-[#FBF4E4]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? (
        <header
          className="px-4 py-2.5 border-b-[3px] border-[#181B2C] flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
          style={{ backgroundColor: headerBg }}
        >
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base tracking-wide text-[#FBF4E4] leading-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-[11px] font-bold text-[#FFD166] mt-1 leading-tight">{subtitle}</p>
            ) : null}
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
