import { lazy, Suspense, useEffect, useState } from 'react';
import {
  BookOpen,
  Building2,
  Disc3,
  Gamepad2,
  Gift,
  GitBranch,
  HardDrive,
  Menu,
  Palette,
  ScrollText,
  Settings,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { bgmEngine } from './audio/bgmEngine';
import { soundEngine } from './audio/soundEngine';
import { buildManagerActionInbox } from './engine/gm/managerActionInbox';
import { getNextAvailableStoryChapter } from './engine/story/storyEngine';
import { useCareerStoryStore } from './store/careerSlots';
import { useFoilPackStore } from './store/foilPackStore';
import { useGameStore } from './store/gameStore';
import { CareerSlotsModal } from './ui/components/CareerSlotsModal';
import { DugoutGuideModal } from './ui/components/DugoutGuideModal';
import { FoilPackModal } from './ui/components/FoilPackModal';
import { MusicJukeboxModal } from './ui/components/MusicJukeboxModal';
import { PwaInstallBanner } from './ui/components/PwaInstallBanner';
import { SettingsModal } from './ui/components/SettingsModal';
import { StoryChapterModal } from './ui/components/StoryChapterModal';
import { AppShell, type NavItem } from './ui/design-system/AppShell';
import { ComicCard } from './ui/design-system/ComicCard';
import { ClubCreatorScreen } from './ui/screens/ClubCreatorScreen';
import { GameDayScreen } from './ui/screens/GameDayScreen';

const ClubHubScreen = lazy(() =>
  import('./ui/screens/ClubHubScreen').then((m) => ({ default: m.ClubHubScreen })),
);
const DesignLabScreen = lazy(() =>
  import('./ui/screens/DesignLabScreen').then((m) => ({ default: m.DesignLabScreen })),
);
const LeagueScreen = lazy(() =>
  import('./ui/screens/LeagueScreen').then((m) => ({ default: m.LeagueScreen })),
);
const RosterLineupScreen = lazy(() =>
  import('./ui/screens/RosterLineupScreen').then((m) => ({ default: m.RosterLineupScreen })),
);
const SkillTreeScreen = lazy(() =>
  import('./ui/screens/SkillTreeScreen').then((m) => ({ default: m.SkillTreeScreen })),
);
import {
  createKeySequenceTracker,
  DESIGN_LAB_SHORTCUT_COUNT,
  DESIGN_LAB_SHORTCUT_KEY,
  DESIGN_LAB_SHORTCUT_WINDOW_MS,
  isEditableEventTarget,
} from './ui/utils/designLabShortcut';

type TabId = 'lab' | 'gameday' | 'roster' | 'league' | 'skills' | 'economy';

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'lab', label: 'Design Lab', icon: <Palette className="w-4 h-4" />, badge: 'LIVE' },
  { id: 'gameday', label: 'Play Ball', icon: <Gamepad2 className="w-4 h-4" /> },
  { id: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
  { id: 'league', label: 'League', icon: <Trophy className="w-4 h-4" /> },
  { id: 'skills', label: 'Skill Tree', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'economy', label: 'Ballpark', icon: <Building2 className="w-4 h-4" /> },
];

const UPCOMING_MILESTONES: Record<
  Exclude<TabId, 'lab' | 'gameday' | 'roster' | 'league' | 'skills'>,
  { title: string; milestone: string; summary: string }
> = {
  economy: {
    title: 'Sim-City Ballpark Economy & Upgrades',
    milestone: 'Milestone 5',
    summary:
      'Control ticket & concession pricing, sign 90s parody sponsors for your outfield wall, negotiate TV contracts, and visually upgrade your 3D stadium.',
  },
};

export function App() {
  const [designLabVisible, setDesignLabVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('lab') === '1';
  });
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('lab') === '1') {
      return 'lab';
    }
    return 'gameday';
  });
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(() => bgmEngine.getState().enabled);
  const [guideOpen, setGuideOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const humanClub = useGameStore((s) => s.getHumanClub());
  const manager = useGameStore((s) => s.manager);
  const currentSeriesIndex = useGameStore((s) => s.currentSeriesIndex);
  const unopenedPackCount = useFoilPackStore((s) => s.unopenedPacks.length);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const storyState = useCareerStoryStore((s) => s.storyState);
  const lastAutoSavedIso = useCareerStoryStore((s) => s.lastAutoSavedIso);
  const resumeLastSavedCareer = useCareerStoryStore((s) => s.resumeLastSavedCareer);
  const autoSaveActiveCareer = useCareerStoryStore((s) => s.autoSaveActiveCareer);

  // Secret developer/power-user shortcut: press "d" 5 times rapidly to show or hide Design Lab
  useEffect(() => {
    const tracker = createKeySequenceTracker({
      targetKey: DESIGN_LAB_SHORTCUT_KEY,
      requiredCount: DESIGN_LAB_SHORTCUT_COUNT,
      windowMs: DESIGN_LAB_SHORTCUT_WINDOW_MS,
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableEventTarget(event.target)) {
        tracker.reset();
        return;
      }
      if (tracker.recordKey(event.key)) {
        setDesignLabVisible((wasVisible) => {
          const nextVisible = !wasVisible;
          if (nextVisible) {
            setActiveTab('lab');
            soundEngine.play('level_up');
          } else {
            setActiveTab((tab) => (tab === 'lab' ? 'gameday' : tab));
            soundEngine.play('ui_pop');
          }
          return nextVisible;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Keep UI synced with BGM Jukebox state & start gentle arcade music cleanly on first browser interaction
  useEffect(() => {
    const unsub = bgmEngine.subscribe((s) => setBgmEnabled(s.enabled));
    const unlockBgm = () => {
      bgmEngine.startIfAllowed();
    };
    window.addEventListener('pointerdown', unlockBgm, { once: true });
    window.addEventListener('keydown', unlockBgm, { once: true });
    return () => {
      unsub();
      window.removeEventListener('pointerdown', unlockBgm);
      window.removeEventListener('keydown', unlockBgm);
    };
  }, []);

  // Automatically sync stadium environmental soundtrack whenever the active club's home ballpark changes
  useEffect(() => {
    bgmEngine.syncStadium(humanClub?.stadium.ballparkId ?? 'sandlot_commons');
  }, [humanClub?.stadium.ballparkId]);

  // Resume the last active saved career slot automatically on boot
  useEffect(() => {
    if (!useGameStore.getState().humanClubId) {
      resumeLastSavedCareer();
    }
  }, [resumeLastSavedCareer]);

  // Seamlessly auto-save active career whenever club/league/manager state changes
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (!state.humanClubId) return;
      if (
        state.humanClubId !== prev.humanClubId ||
        state.leagues !== prev.leagues ||
        state.manager !== prev.manager ||
        state.seasonNumber !== prev.seasonNumber
      ) {
        autoSaveActiveCareer();
      }
    });
    return unsubscribe;
  }, [autoSaveActiveCareer]);

  const hasUnreadChapter = Boolean(
    humanClub &&
      getNextAvailableStoryChapter(storyState, {
        gamesPlayed: humanClub.wins + humanClub.losses,
        seasonNumber,
      }),
  );

  const hasMobileBadge = hasUnreadChapter || unopenedPackCount > 0;

  const mobileUtilityActions = (
    <div className="flex items-center gap-1.5">
      {unopenedPackCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            soundEngine.play('ui_pop');
            setPacksOpen(true);
          }}
          className="comic-btn bg-[#FFC300] text-[#181B2C] px-2.5 h-11 text-xs flex items-center justify-center gap-1 min-h-[44px] shrink-0"
          aria-label="Open 1994 Foil Packs"
        >
          <Gift className="w-4 h-4 shrink-0" />
          <span>{unopenedPackCount}</span>
        </button>
      ) : null}
      <button
        type="button"
        data-testid="mobile-menu-toggle"
        onClick={() => {
          soundEngine.play('ui_pop');
          setMobileMenuOpen(true);
        }}
        className="relative comic-btn bg-[#FFF3BF] text-[#181B2C] px-2.5 h-11 text-xs flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
        aria-label="Open clubhouse menu"
      >
        <Menu className="w-4 h-4 shrink-0" />
        <span>Menu</span>
        {hasMobileBadge ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF4D6D] border-2 border-[#181B2C]"
          />
        ) : null}
      </button>
    </div>
  );

  const desktopUtilityActions = (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setGuideOpen(true);
        }}
        className="comic-btn bg-[#FFF3BF] text-[#181B2C] px-2.5 py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
        aria-label="Open Dugout Guide"
        title="Coach Pops’ Guide"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>Coach Pops’ Guide</span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setStoryOpen(true);
        }}
        className={`comic-btn px-2.5 py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0 ${
          hasUnreadChapter ? 'bg-[#FFC300] text-[#181B2C]' : 'bg-[#FBF4E4] text-[#181B2C]'
        }`}
        aria-label="Open Dynasty Story"
        title="Story & Origins"
      >
        <ScrollText className="w-3.5 h-3.5 shrink-0" />
        <span>Story &amp; Origins{hasUnreadChapter ? ' ★' : ''}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setSlotsOpen(true);
        }}
        className="comic-btn bg-[#D8F3DC] text-[#1B4332] px-2.5 py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
        aria-label="Open 4 Career Save Slots"
        title="4 Save Slots"
      >
        <HardDrive className="w-3.5 h-3.5 shrink-0" />
        <span>4 Save Slots{lastAutoSavedIso ? ' ✓' : ''}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setJukeboxOpen(true);
        }}
        className={`comic-btn px-2.5 py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0 ${
          bgmEnabled && !muted ? 'bg-[#E0C3FC] text-[#181B2C]' : 'bg-[#FBF4E4] text-[#4A5068]'
        }`}
        aria-label="Open 90s Music Jukebox"
        title="90s Music Jukebox"
      >
        <Disc3 className="w-3.5 h-3.5 shrink-0" />
        <span>{bgmEnabled && !muted ? 'Jukebox: ON' : 'Jukebox: OFF'}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setPacksOpen(true);
        }}
        className={`comic-btn px-2.5 py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0 ${
          unopenedPackCount > 0 ? 'bg-[#FFC300] text-[#181B2C]' : 'bg-[#F5EEFF] text-[#4C1D95]'
        }`}
        aria-label="Open 1994 Foil Packs"
        title="1994 Foil Card Booster Packs"
      >
        <Gift className="w-3.5 h-3.5 shrink-0" />
        <span>Foil Packs{unopenedPackCount > 0 ? ` (${unopenedPackCount})` : ''}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setSettingsOpen(true);
        }}
        className="comic-btn bg-[#E0FBFC] text-[#1D3557] px-2.5 py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
        aria-label="Open Settings and Accessibility"
        title="Settings & Accessibility"
      >
        <Settings className="w-3.5 h-3.5 shrink-0" />
        <span>Settings</span>
      </button>
    </div>
  );

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    bgmEngine.setMasterMuted(nextMuted);
    setMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.play('ui_pop');
    }
  };

  const inboxBadges = humanClub
    ? buildManagerActionInbox({
        club: humanClub,
        manager,
        currentSeriesIndex,
        unopenedPackCount,
      }).tabBadges
    : {};

  const visibleNavItems = (designLabVisible
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.id !== 'lab')
  ).map((item) => {
    if (item.id === 'roster' && inboxBadges.roster) return { ...item, badge: inboxBadges.roster };
    if (item.id === 'skills' && inboxBadges.skills) return { ...item, badge: inboxBadges.skills };
    if (item.id === 'league' && inboxBadges.league) return { ...item, badge: inboxBadges.league };
    if (item.id === 'economy' && inboxBadges.economy) return { ...item, badge: inboxBadges.economy };
    return item;
  });

  const renderMainContent = () => {
    if (activeTab === 'lab' && designLabVisible) {
      return <DesignLabScreen />;
    }
    if (activeTab === 'gameday' || activeTab === 'lab') {
      return humanClub ? (
        <GameDayScreen onJumpToTab={(tab) => setActiveTab(tab)} />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('gameday')} />
      );
    }
    if (activeTab === 'roster') {
      return humanClub ? (
        <RosterLineupScreen onPlayBall={() => setActiveTab('gameday')} />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('roster')} />
      );
    }
    if (activeTab === 'league') {
      return humanClub ? (
        <LeagueScreen onPlayLivePlayoffGame={() => setActiveTab('gameday')} />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('league')} />
      );
    }
    if (activeTab === 'skills') {
      return humanClub ? (
        <SkillTreeScreen />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('skills')} />
      );
    }

    if (activeTab === 'economy' && humanClub) {
      return <ClubHubScreen />;
    }

    const upcoming = UPCOMING_MILESTONES[activeTab];
    return (
      <ComicCard title={upcoming.title} subtitle={upcoming.milestone} headerBg="#1B4332">
        <p className="font-bold text-sm text-[#4A5068] leading-relaxed">{upcoming.summary}</p>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-[#2FB356]">
          Tracked in PLAN.md — Milestone 2 MVP Play Ball & Roster tabs are now live!
        </p>
      </ComicCard>
    );
  };

  return (
    <AppShell
      clubName={humanClub ? `${humanClub.city} ${humanClub.name}` : 'Mini Baseball Manager'}
      leagueLabel={
        humanClub
          ? `${humanClub.leagueTier.toUpperCase()} LEAGUE • ${humanClub.wins}-${humanClub.losses}`
          : 'Rookie Sandlot League'
      }
      navItems={visibleNavItems}
      activeTab={activeTab}
      onSelectTab={(id) => {
        soundEngine.play('ui_pop');
        setActiveTab(id as TabId);
      }}
      muted={muted}
      onToggleMute={handleToggleMute}
      utilityActions={desktopUtilityActions}
      mobileUtilityActions={mobileUtilityActions}
    >
      <PwaInstallBanner />
      <Suspense
        fallback={
          <div className="p-6 text-center font-display text-sm text-[#181B2C] bg-[#FFFDF7] rounded-2xl border-2 border-[#181B2C] shadow-[4px_4px_0_#181B2C]">
            ⚾ Warming Up the Bullpen...
          </div>
        }
      >
        {renderMainContent()}
      </Suspense>
      <DugoutGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onJumpToTab={(tab) => setActiveTab(tab)}
      />
      <StoryChapterModal open={storyOpen} onClose={() => setStoryOpen(false)} />
      <CareerSlotsModal
        open={slotsOpen}
        onClose={() => setSlotsOpen(false)}
        onStartNewInSlot={() => setActiveTab('gameday')}
      />
      <MusicJukeboxModal open={jukeboxOpen} onClose={() => setJukeboxOpen(false)} />
      <FoilPackModal open={packsOpen} onClose={() => setPacksOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Clean Mobile Clubhouse Utility Menu (replaces 6 crowded mobile header icons!) */}
      {mobileMenuOpen ? (
        <div
          data-testid="mobile-clubhouse-menu"
          className="fixed inset-0 z-50 bg-[#181B2C]/75 p-4 flex items-start justify-center overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Clubhouse Menu"
        >
          <div className="w-full max-w-sm mt-6 rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden">
            <div className="px-4 py-3 bg-[#1B4332] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between">
              <span className="font-display text-sm tracking-wide">⚾ CLUBHOUSE MENU</span>
              <button
                type="button"
                aria-label="Close clubhouse menu"
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#FFFDF7] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <button
                type="button"
                aria-label="Open Dugout Guide"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setGuideOpen(true);
                  soundEngine.play('ui_pop');
                }}
                className="w-full comic-btn bg-[#FFF3BF] text-[#181B2C] px-3 py-2.5 text-xs flex items-center gap-2 min-h-[44px]"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Coach Pops’ Dugout Guide</span>
              </button>
              <button
                type="button"
                aria-label="Open Dynasty Story"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setStoryOpen(true);
                  soundEngine.play('ui_pop');
                }}
                className={`w-full comic-btn px-3 py-2.5 text-xs flex items-center gap-2 min-h-[44px] ${
                  hasUnreadChapter ? 'bg-[#FFC300] text-[#181B2C]' : 'bg-[#FFFDF7] text-[#181B2C]'
                }`}
              >
                <ScrollText className="w-4 h-4 shrink-0" />
                <span>Story &amp; Origins{hasUnreadChapter ? ' ★ NEW!' : ''}</span>
              </button>
              <button
                type="button"
                aria-label="Open 4 Career Save Slots"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSlotsOpen(true);
                  soundEngine.play('ui_pop');
                }}
                className="w-full comic-btn bg-[#D8F3DC] text-[#1B4332] px-3 py-2.5 text-xs flex items-center gap-2 min-h-[44px]"
              >
                <HardDrive className="w-4 h-4 shrink-0" />
                <span>4 Career Save Slots{lastAutoSavedIso ? ' ✓' : ''}</span>
              </button>
              <button
                type="button"
                aria-label="Open 90s Music Jukebox"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setJukeboxOpen(true);
                  soundEngine.play('ui_pop');
                }}
                className="w-full comic-btn bg-[#E0C3FC] text-[#181B2C] px-3 py-2.5 text-xs flex items-center gap-2 min-h-[44px]"
              >
                <Disc3 className="w-4 h-4 shrink-0" />
                <span>90s Music Jukebox ({bgmEnabled && !muted ? 'ON' : 'OFF'})</span>
              </button>
              <button
                type="button"
                aria-label="Open 1994 Foil Packs"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setPacksOpen(true);
                  soundEngine.play('ui_pop');
                }}
                className={`w-full comic-btn px-3 py-2.5 text-xs flex items-center gap-2 min-h-[44px] ${
                  unopenedPackCount > 0 ? 'bg-[#FFC300] text-[#181B2C]' : 'bg-[#F5EEFF] text-[#4C1D95]'
                }`}
              >
                <Gift className="w-4 h-4 shrink-0" />
                <span>1994 Foil Booster Packs{unopenedPackCount > 0 ? ` (${unopenedPackCount})` : ''}</span>
              </button>
              <button
                type="button"
                aria-label="Open Settings and Accessibility"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSettingsOpen(true);
                  soundEngine.play('ui_pop');
                }}
                className="w-full comic-btn bg-[#E0FBFC] text-[#1D3557] px-3 py-2.5 text-xs flex items-center gap-2 min-h-[44px]"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Settings &amp; Accessibility</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
