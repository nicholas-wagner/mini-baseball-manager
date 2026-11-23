interface CoachPopsAvatarProps {
  size?: 'sm' | 'md';
  testId?: string;
}

/** Cute retro 90s Saturday-morning cartoon SVG avatar for Coach Pops. */
export function CoachPopsAvatar({ size = 'sm', testId = 'coach-pops-avatar' }: CoachPopsAvatarProps) {
  const dim = size === 'md' ? 'w-11 h-11' : 'w-9 h-9';
  return (
    <div
      data-testid={testId}
      aria-label="Coach Pops"
      className={`${dim} shrink-0 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] shadow-[2px_2px_0_#181B2C] overflow-hidden flex items-center justify-center`}
    >
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        {/* Background burst */}
        <circle cx="32" cy="34" r="28" fill="#FFE082" />
        {/* Dugout jacket shoulders */}
        <path d="M12 64 C14 50 50 50 52 64 Z" fill="#1B4332" stroke="#181B2C" strokeWidth="3" />
        {/* Whistle cord */}
        <path d="M25 53 L32 61 L39 53" fill="none" stroke="#FFC300" strokeWidth="2.5" />
        {/* Face */}
        <circle cx="32" cy="36" r="15" fill="#F8CBA6" stroke="#181B2C" strokeWidth="3" />
        {/* Rosy cheeks */}
        <circle cx="22" cy="39" r="2.6" fill="#FF8FA3" opacity="0.7" />
        <circle cx="42" cy="39" r="2.6" fill="#FF8FA3" opacity="0.7" />
        {/* Twinkling eyes */}
        <circle cx="26.5" cy="34" r="2.3" fill="#181B2C" />
        <circle cx="37.5" cy="34" r="2.3" fill="#181B2C" />
        <circle cx="27.2" cy="33.2" r="0.8" fill="#FFFFFF" />
        <circle cx="38.2" cy="33.2" r="0.8" fill="#FFFFFF" />
        {/* Friendly white Coach Pops mustache */}
        <path
          d="M21 42 Q26.5 38 32 41 Q37.5 38 43 42 Q38 46.5 32 44.5 Q26 46.5 21 42 Z"
          fill="#FFFFFF"
          stroke="#181B2C"
          strokeWidth="2.2"
        />
        {/* Smile */}
        <path d="M28 46 Q32 49.5 36 46" fill="none" stroke="#181B2C" strokeWidth="2" strokeLinecap="round" />
        {/* Forest Baseball Cap + Gold Star */}
        <path d="M15 26 C16 12 48 12 49 26 Z" fill="#1B4332" stroke="#181B2C" strokeWidth="3" />
        <path d="M13 26 Q32 21 53 27 Q32 29 13 26 Z" fill="#122D21" stroke="#181B2C" strokeWidth="2.5" />
        <circle cx="32" cy="19" r="3.4" fill="#FFC300" stroke="#181B2C" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
