import { useEffect, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string;
}

interface AppShellProps {
  liveGame?: boolean;
  clubName: string;
  leagueLabel: string;
  navItems: readonly NavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  muted: boolean;
  onToggleMute: () => void;
  utilityActions?: ReactNode;
  mobileUtilityActions?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  liveGame = false,
  clubName,
  leagueLabel,
  navItems,
  activeTab,
  onSelectTab,
  muted,
  onToggleMute,
  utilityActions,
  mobileUtilityActions,
  children,
}: AppShellProps) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } catch {
      // Ignore jsdom scrollTo stub
    }
  }, [activeTab]);

  return (
    <div data-live-game={liveGame || undefined} className="career-shell min-h-screen bg-halftone flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 shrink-0 bg-[#1B4332] text-[#FBF4E4] border-r-[3px] border-[#181B2C] p-4 gap-4">
        <div className="bg-[#122D21] border-2 border-[#0B1E16] rounded-2xl p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFD166]">
            {leagueLabel}
          </div>
          <div className="font-display text-lg leading-tight mt-0.5">{clubName}</div>
        </div>

        {navItems.length > 0 ? (
          <nav aria-label="Primary Navigation" className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={[
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl font-heading font-bold text-sm border-2 transition-all cursor-pointer',
                    isActive
                      ? 'bg-[#FFC300] text-[#181B2C] border-[#181B2C] shadow-[3px_3px_0_#181B2C]'
                      : 'bg-[#21513D] text-[#FBF4E4] border-[#0E291E] hover:bg-[#29634B]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span
                      aria-hidden="true"
                      className="text-[10px] font-display px-1.5 py-0.5 rounded bg-[#FF4D6D] text-white border border-[#181B2C]"
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {utilityActions ? (
          <div className="space-y-1.5 pt-1 border-t border-white/15">{utilityActions}</div>
        ) : null}

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="comic-btn bg-[#FBF4E4] text-[#181B2C] px-3 py-2 text-xs flex items-center justify-center gap-2"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{muted ? 'SFX Muted' : '90s Audio ON'}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Club Strip */}
        <header
          className="md:hidden sticky top-0 z-30 bg-[#1B4332] text-[#FBF4E4] border-b-[3px] border-[#181B2C] px-3 py-2 flex items-center justify-between gap-2"
          style={{ paddingTop: 'max(0.5rem, var(--safe-top))' }}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFD166] truncate">
              {leagueLabel}
            </div>
            <div className="font-display text-sm leading-tight truncate">{clubName}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {mobileUtilityActions ?? utilityActions}
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="w-11 h-11 rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] shadow-[2px_2px_0_#181B2C] flex items-center justify-center shrink-0"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main
          className={`flex-1 p-3 sm:p-5 ${
            navItems.length > 0 ? 'pb-24 md:pb-6' : 'pb-6'
          } max-w-7xl w-full mx-auto`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (hidden on Screen 0 before club creation) */}
      {navItems.length > 0 ? (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#1B4332] border-t-[3px] border-[#181B2C] px-2 pt-1.5 flex items-center justify-around gap-1"
          style={{ paddingBottom: 'max(0.45rem, var(--safe-bottom))' }}
        >
          {navItems.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={[
                  'relative flex-1 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-heading font-bold transition-colors',
                  isActive
                    ? 'bg-[#FFC300] text-[#181B2C] border-2 border-[#181B2C]'
                    : 'text-[#E3F2EA]',
                ].join(' ')}
              >
                {item.badge ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 right-0.5 text-[8px] leading-none font-display px-1 py-0.5 rounded-full bg-[#FF4D6D] text-white border border-[#181B2C]"
                  >
                    {item.badge}
                  </span>
                ) : null}
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
