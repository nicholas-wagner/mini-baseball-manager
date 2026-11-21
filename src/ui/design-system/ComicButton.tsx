import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ComicButtonVariant =
  | 'turf'
  | 'coral'
  | 'gold'
  | 'sky'
  | 'cream'
  | 'scoreboard'
  | 'violet';

export type ComicButtonSize = 'sm' | 'md' | 'lg';

interface ComicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ComicButtonVariant;
  size?: ComicButtonSize;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ComicButtonVariant, string> = {
  turf: 'bg-[#2FB356] text-white',
  coral: 'bg-[#FF4D6D] text-white',
  gold: 'bg-[#FFC300] text-[#181B2C]',
  sky: 'bg-[#4CC3FF] text-[#181B2C]',
  cream: 'bg-[#FBF4E4] text-[#181B2C]',
  scoreboard: 'bg-[#1B4332] text-[#FFD166]',
  violet: 'bg-[#9B5DE5] text-white',
};

const SIZE_CLASSES: Record<ComicButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px]',
  md: 'px-4 py-2 text-sm min-h-[44px]',
  lg: 'px-5 py-3 text-base min-h-[50px]',
};

export function ComicButton({
  variant = 'cream',
  size = 'md',
  active = false,
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ComicButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={active ? true : undefined}
      className={[
        'comic-btn inline-flex items-center justify-center gap-2 tracking-wide',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        active ? 'ring-3 ring-[#FFC300] ring-offset-2 ring-offset-[#FBF4E4]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? <span className="shrink-0 flex items-center">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
