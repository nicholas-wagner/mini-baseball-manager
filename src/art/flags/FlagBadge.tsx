import type { NationalityId } from '../../engine/nationalities/types';

interface FlagBadgeProps {
  nationalityId: NationalityId;
  label?: string;
  size?: 'sm' | 'md';
}

function renderFlagArt(id: NationalityId) {
  switch (id) {
    case 'USA':
      return (
        <>
          <rect width="36" height="24" fill="#FFFFFF" />
          <rect y="0" width="36" height="3.5" fill="#D62828" />
          <rect y="6.8" width="36" height="3.5" fill="#D62828" />
          <rect y="13.6" width="36" height="3.5" fill="#D62828" />
          <rect y="20.4" width="36" height="3.6" fill="#D62828" />
          <rect width="16" height="13.5" fill="#1D3557" />
          <circle cx="4.5" cy="4" r="1.2" fill="#FFFFFF" />
          <circle cx="11.5" cy="4" r="1.2" fill="#FFFFFF" />
          <circle cx="8" cy="7" r="1.2" fill="#FFFFFF" />
          <circle cx="4.5" cy="10" r="1.2" fill="#FFFFFF" />
          <circle cx="11.5" cy="10" r="1.2" fill="#FFFFFF" />
        </>
      );
    case 'CAN':
      return (
        <>
          <rect width="36" height="24" fill="#FFFFFF" />
          <rect width="9" height="24" fill="#D62828" />
          <rect x="27" width="9" height="24" fill="#D62828" />
          <path
            d="M18 5 L20 10 L23.5 9 L21.5 13.5 L24 15 L19.2 15.6 L19.2 19.5 L16.8 19.5 L16.8 15.6 L12 15 L14.5 13.5 L12.5 9 L16 10 Z"
            fill="#D62828"
          />
        </>
      );
    case 'JPN':
      return (
        <>
          <rect width="36" height="24" fill="#FFFFFF" />
          <circle cx="18" cy="12" r="6.5" fill="#D62828" />
        </>
      );
    case 'KOR':
      return (
        <>
          <rect width="36" height="24" fill="#FFFFFF" />
          <circle cx="18" cy="12" r="6" fill="#D62828" />
          <path d="M12 12 A6 6 0 0 0 24 12 Q21 15 18 12 Q15 9 12 12 Z" fill="#1D4ED8" />
          <g stroke="#181B2C" strokeWidth="1.6">
            <line x1="5" y1="6" x2="9" y2="3" />
            <line x1="6.5" y1="8" x2="10.5" y2="5" />
            <line x1="27" y1="3" x2="31" y2="6" />
            <line x1="25.5" y1="5" x2="29.5" y2="8" />
            <line x1="5" y1="18" x2="9" y2="21" />
            <line x1="27" y1="21" x2="31" y2="18" />
          </g>
        </>
      );
    case 'MEX':
      return (
        <>
          <rect width="12" height="24" fill="#006847" />
          <rect x="12" width="12" height="24" fill="#FFFFFF" />
          <rect x="24" width="12" height="24" fill="#CE1126" />
          <circle cx="18" cy="12" r="3.2" fill="#8C5822" />
          <circle cx="18" cy="12" r="1.4" fill="#2FB356" />
        </>
      );
    case 'DOM':
      return (
        <>
          <rect width="36" height="24" fill="#FFFFFF" />
          <rect width="15" height="9.5" fill="#002D62" />
          <rect x="21" width="15" height="9.5" fill="#CE1126" />
          <rect y="14.5" width="15" height="9.5" fill="#CE1126" />
          <rect x="21" y="14.5" width="15" height="9.5" fill="#002D62" />
          <circle cx="18" cy="12" r="2.4" fill="#2FB356" stroke="#FFC300" strokeWidth="1" />
        </>
      );
    case 'PRI':
      return (
        <>
          <rect width="36" height="24" fill="#FFFFFF" />
          <rect y="0" width="36" height="4.8" fill="#CE1126" />
          <rect y="9.6" width="36" height="4.8" fill="#CE1126" />
          <rect y="19.2" width="36" height="4.8" fill="#CE1126" />
          <polygon points="0,0 18,12 0,24" fill="#1D4ED8" />
          <polygon
            points="6.5,8.5 7.5,11 10.2,11 8,12.6 8.8,15.2 6.5,13.6 4.2,15.2 5,12.6 2.8,11 5.5,11"
            fill="#FFFFFF"
          />
        </>
      );
    case 'BRA':
      return (
        <>
          <rect width="36" height="24" fill="#009B3A" />
          <polygon points="18,2.5 32.5,12 18,21.5 3.5,12" fill="#FFDF00" />
          <circle cx="18" cy="12" r="5" fill="#002776" />
          <path d="M13.5 11.2 Q18 10 22.5 12.6" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
        </>
      );
    case 'ARG':
      return (
        <>
          <rect width="36" height="8" fill="#6EC6FF" />
          <rect y="8" width="36" height="8" fill="#FFFFFF" />
          <rect y="16" width="36" height="8" fill="#6EC6FF" />
          <circle cx="18" cy="12" r="3.2" fill="#FFC300" stroke="#C98A00" strokeWidth="1" />
        </>
      );
    case 'AUS':
      return (
        <>
          <rect width="36" height="24" fill="#00247D" />
          <rect width="16" height="11" fill="#00247D" />
          <path d="M0 0 L16 11 M16 0 L0 11" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M8 0 L8 11 M0 5.5 L16 5.5" stroke="#FFFFFF" strokeWidth="3.2" />
          <path d="M8 0 L8 11 M0 5.5 L16 5.5" stroke="#CF142B" strokeWidth="1.7" />
          <circle cx="8" cy="17.5" r="2.2" fill="#FFFFFF" />
          <circle cx="27" cy="6" r="1.4" fill="#FFFFFF" />
          <circle cx="30.5" cy="11" r="1.4" fill="#FFFFFF" />
          <circle cx="25" cy="12.5" r="1.4" fill="#FFFFFF" />
          <circle cx="27.5" cy="18.5" r="1.6" fill="#FFFFFF" />
        </>
      );
    case 'IRL':
      return (
        <>
          <rect width="12" height="24" fill="#169B62" />
          <rect x="12" width="12" height="24" fill="#FFFFFF" />
          <rect x="24" width="12" height="24" fill="#FF883E" />
        </>
      );
  }
}

export function FlagBadge({ nationalityId, label, size = 'sm' }: FlagBadgeProps) {
  const dims = size === 'md' ? 'w-7 h-5' : 'w-6 h-4';
  return (
    <span className="inline-flex items-center gap-1">
      <svg
        viewBox="0 0 36 24"
        className={`${dims} rounded-[4px] border-[1.8px] border-[#181B2C] shrink-0 overflow-hidden bg-white`}
        role="img"
        aria-label={`${nationalityId} flag`}
      >
        {renderFlagArt(nationalityId)}
      </svg>
      {label ? (
        <span className="font-mono-tabular text-[10px] font-extrabold text-[#181B2C]">{label}</span>
      ) : null}
    </span>
  );
}
