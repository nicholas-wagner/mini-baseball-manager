import type { NationalityId } from '../../engine/nationalities/types';

interface FlagBadgeProps {
  nationalityId: NationalityId;
  label?: string;
  size?: 'sm' | 'md';
}

function star(x: number, y: number, radius: number, color: string, rotation = 0) {
  return <path key={x + ',' + y} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${radius})`}
    d="M0 -1 .225 -.31 .951 -.31 .364 .118 .588 .809 0 .382 -.588 .809 -.364 .118 -.951 -.31 -.225 -.31Z" fill={color} />;
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
    case 'ITA':
      return (
        <>
          <path fill="#009246" d="M0 0h12v24H0z" />
          <path fill="#fff" d="M12 0h12v24H12z" />
          <path fill="#ce2b37" d="M24 0h12v24H24z" />
        </>
      );
    case 'NED':
      return (
        <>
          <rect width="36" height="24" fill="#fff" />
          <path fill="#ae1c28" d="M0 0h36v8H0z" />
          <path fill="#21468b" d="M0 16h36v8H0z" />
        </>
      );
    case 'TPE': {
      const blossom = 'M13 8c-1-7 11-7 10 0 7-2 9 7 3 9 1 6-5 8-8 3-4 5-10 3-8-3-6-3-4-10 3-9Z';
      return (
        <>
          <rect width="36" height="24" fill="#fff" />
          <path d={blossom} fill="#fff" stroke="#183e87" strokeWidth="2.1" />
          <path d={blossom} fill="none" stroke="#d83347" strokeWidth=".8" transform="translate(1.8 1.2) scale(.9)" />
          <circle cx="18" cy="10" r="3" fill="#183e87" />
          {star(18, 10, 2, 'white')}
          <g fill="none" strokeWidth=".65">
            <circle cx="15" cy="15" r="1.35" stroke="#267aae" />
            <circle cx="18" cy="15" r="1.35" stroke="#181b2c" />
            <circle cx="21" cy="15" r="1.35" stroke="#d83347" />
            <circle cx="16.5" cy="16.4" r="1.35" stroke="#d29c18" />
            <circle cx="19.5" cy="16.4" r="1.35" stroke="#25834a" />
          </g>
        </>
      );
    }
    case 'CUB':
      return (
        <>
          <rect width="36" height="24" fill="#fff" />
          <path d="M0 2.4h36M0 12h36M0 21.6h36" stroke="#002a8f" strokeWidth="4.8" />
          <path d="M0 0l20 12L0 24Z" fill="#cf142b" />
          {star(6.6, 12, 3.5, 'white')}
        </>
      );
    case 'VEN':
      return (
        <>
          <rect width="36" height="24" fill="#003893" />
          <path fill="#ffcc00" d="M0 0h36v8H0z" />
          <path fill="#cf142b" d="M0 16h36v8H0z" />
          {[[8,14],[10.5,12],[13.3,10.8],[16.4,10.2],[19.6,10.2],[22.7,10.8],[25.5,12],[28,14]].map(([x, y]) => star(x, y, 1.2, 'white'))}
        </>
      );
    case 'CHN':
      return (
        <>
          <rect width="36" height="24" fill="#de2910" />
          {star(6, 6, 3.6, '#ffde00')}
          {star(12, 2.4, 1.25, '#ffde00', 23)}
          {star(14.4, 4.8, 1.25, '#ffde00', 44)}
          {star(14.4, 8.4, 1.25, '#ffde00', 15)}
          {star(12, 10.8, 1.25, '#ffde00', 38)}
        </>
      );
    case 'PAN':
      return (
        <>
          <rect width="36" height="24" fill="#fff" />
          <path fill="#d21034" d="M18 0h18v12H18z" />
          <path fill="#005293" d="M0 12h18v12H0z" />
          {star(9, 6, 4, '#005293')}
          {star(27, 18, 4, '#d21034')}
        </>
      );
    case 'COL':
      return (
        <>
          <rect width="36" height="24" fill="#fcd116" />
          <path fill="#003893" d="M0 12h36v6H0z" />
          <path fill="#ce1126" d="M0 18h36v6H0z" />
        </>
      );
    case 'ISR':
      return (
        <>
          <rect width="36" height="24" fill="#fff" />
          <path d="M0 3h36M0 21h36" stroke="#0038b8" strokeWidth="2.6" />
          <path d="m18 6 5.2 9h-10.4z m0 12-5.2-9h10.4z" fill="none" stroke="#0038b8" strokeWidth="1.1" />
        </>
      );
    case 'CZE':
      return (
        <>
          <rect width="36" height="24" fill="#fff" />
          <path d="M0 12h36v12H0z" fill="#d7141a" />
          <path d="m0 0 18 12L0 24z" fill="#11457e" />
        </>
      );
    case 'GBR':
      return (
        <>
          <rect width="36" height="24" fill="#012169" />
          <path d="m0 0 36 24m0-24L0 24" stroke="#fff" strokeWidth="5" />
          <path d="m0 0 17 12m2 0 17 12M36 0 19 10M0 24l17-10" fill="none" stroke="#c8102e" strokeWidth="1.6" />
          <path d="M18 0v24M0 12h36" stroke="#fff" strokeWidth="8" />
          <path d="M18 0v24M0 12h36" stroke="#c8102e" strokeWidth="4.6" />
        </>
      );
    case 'NCA':
      return (
        <>
          <rect width="36" height="24" fill="#0067a5" />
          <path d="M0 8h36v8H0z" fill="#fff" />
          <circle cx="18" cy="12" r="3.4" fill="none" stroke="#c19d48" strokeWidth=".6" />
          <path d="m18 9.5 2.6 4.4h-5.2z" fill="#b2daed" stroke="#bc9447" strokeWidth=".55" />
          <path d="m16 13.5 1.3-1.5.8.6.8-1 1.2 1.9z" fill="#2e8b57" />
        </>
      );
    case 'RSA':
      return (
        <>
          <rect width="36" height="24" fill="#de3831" />
          <path fill="#002395" d="M0 12h36v12H0z" />
          <path d="m-2-1 18 13L-2 25m18-13h21" fill="none" stroke="#fff" strokeWidth="8" />
          <path d="m-2-1 18 13L-2 25m18-13h21" fill="none" stroke="#007749" strokeWidth="5.4" />
          <path d="m-1 3.1 12.5 8.9L-1 20.9z" fill="#000" stroke="#ffb81c" strokeWidth="1.6" />
        </>
      );
    case 'ESP':
      return (
        <>
          <rect width="36" height="24" fill="#aa151b" />
          <path fill="#f1bf00" d="M0 6h36v12H0z" />
          <path d="M8.5 10h5v3.8q-2.5 3-5 0z" fill="#b2252e" />
          <path d="M9 11h2v1.7H9zm2.2 1.9h1.7v1.5h-1.7z" fill="#efd588" />
          <path d="m8.8 8.3 1.1.6 1.1-1.2 1.1 1.2 1.2-.6-.5 1.3H9.3z" fill="#a22b2f" />
          <path d="M7.3 10v4.6m7.5-4.6v4.6" stroke="#f6e5be" strokeWidth="1" />
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
