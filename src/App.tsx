import type { ClutchMomentLaunch } from './engine/gm/gameDayMoments';
import { Activity, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
import { TrophyCaseModal } from './ui/components/TrophyCaseModal';
import { AppShell, type NavItem } from './ui/design-system/AppShell';
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
  { id: 'economy', label: 'Clubhouse', icon: <Building2 className="w-4 h-4" /> },
];

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
  const [opening, setOpening] = useState<ClutchMomentLaunch | null>(null);
  const startOpening = (moment: ClutchMomentLaunch) => { setOpening(moment); setActiveTab('gameday'); };
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(() => bgmEngine.getState().enabled);
  const [guideOpen, setGuideOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);
  const [trophyOpen, setTrophyOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hubInitialSubTab, setHubInitialSubTab] = useState<'stadiums' | 'relics' | 'uniforms'>('stadiums');
  const humanClub = useGameStore((s) => s.getHumanClub());
  const slotId = useCareerStoryStore(s => s.activeSlotId);
  const worldSeed = useGameStore(s => s.worldSeed);
  const careerKey = slotId + '/' + worldSeed + '/' + humanClub?.id;
  const [liveCareer, setLiveCareer] = useState<string | null>(null);
  const onLiveChange = useCallback((live: boolean) => setLiveCareer(live ? careerKey : null), [careerKey]);
  const onGameDay = activeTab === 'gameday' || (activeTab === 'lab' && !designLabVisible);
  const inDugout = onGameDay && liveCareer === careerKey && Boolean(humanClub);
  const menuRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = menuRef.current;
    if (mobileMenuOpen) {
      if (dialog?.showModal) dialog.showModal();
      else dialog?.setAttribute('open', '');
    }
    return () => dialog?.close?.();
  }, [mobileMenuOpen]);
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

  // Automatically sync league-tier soundtrack & ballpark theme whenever club tier or home ballpark changes
  useEffect(() => {
    bgmEngine.syncLeagueTier(humanClub?.leagueTier ?? 'rookie');
    bgmEngine.syncStadium(humanClub?.stadium.ballparkId ?? 'sandlot_commons');
  }, [humanClub?.leagueTier, humanClub?.stadium.ballparkId]);

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

  const gamesPlayed = humanClub ? humanClub.wins + humanClub.losses : 0;
  const hasUnreadChapter = Boolean(
    humanClub &&
      getNextAvailableStoryChapter(storyState, {
        gamesPlayed,
        seasonNumber,
      }),
  );

  const hasMobileBadge = gamesPlayed >= 1 && hasUnreadChapter;
  const showHeaderPackButton = Boolean(humanClub && unopenedPackCount > 0 && gamesPlayed >= 1);

  const mobileUtilityActions = (
    <div className="flex items-center gap-1.5">
      {showHeaderPackButton ? (
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
            data-testid="mobile-menu-badge-dot"
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF4D6D] border-2 border-[#181B2C]"
          />
        ) : null}
      </button>
    </div>
  );

  const desktopUtilityActions = (
    <div className="space-y-1.5">
      {showHeaderPackButton ? (
        <button
          type="button"
          onClick={() => {
            soundEngine.play('ui_pop');
            setPacksOpen(true);
          }}
          className="w-full comic-btn bg-[#FFC300] text-[#181B2C] px-2.5 py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[40px]"
          aria-label="Open 1994 Foil Packs"
          title="1994 Foil Card Booster Packs"
        >
          <Gift className="w-3.5 h-3.5 shrink-0" />
          <span>Foil Packs ({unopenedPackCount})</span>
        </button>
      ) : null}
      <div data-testid="desktop-utility-grid" className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => {
            soundEngine.play('ui_pop');
            setGuideOpen(true);
          }}
          className="comic-btn bg-[#FFF3BF] text-[#181B2C] px-2 py-1.5 text-[11px] flex items-center justify-center gap-1 min-h-[40px]"
          aria-label="Open Dugout Guide"
          title="Coach Pops’ Guide"
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span>Guide</span>
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.play('ui_pop');
            setSlotsOpen(true);
          }}
          className="comic-btn bg-[#D8F3DC] text-[#1B4332] px-2 py-1.5 text-[11px] flex items-center justify-center gap-1 min-h-[40px]"
          aria-label="Open 4 Career Save Slots"
          title="4 Save Slots"
        >
          <HardDrive className="w-3.5 h-3.5 shrink-0" />
          <span>Saves{lastAutoSavedIso ? ' ✓' : ''}</span>
        </button>
        {humanClub ? (
          <button
            type="button"
            onClick={() => {
              soundEngine.play('ui_pop');
              setStoryOpen(true);
            }}
            className={`comic-btn px-2 py-1.5 text-[11px] flex items-center justify-center gap-1 min-h-[40px] ${
              hasUnreadChapter ? 'bg-[#FFC300] text-[#181B2C]' : 'bg-[#FBF4E4] text-[#181B2C]'
            }`}
            aria-label="Open Dynasty Story"
            title="Story & Origins"
          >
            <ScrollText className="w-3.5 h-3.5 shrink-0" />
            <span>Story{hasUnreadChapter ? ' ★' : ''}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            soundEngine.play('ui_pop');
            setJukeboxOpen(true);
          }}
          className={`comic-btn px-2 py-1.5 text-[11px] flex items-center justify-center gap-1 min-h-[40px] ${
            bgmEnabled && !muted ? 'bg-[#E0C3FC] text-[#181B2C]' : 'bg-[#FBF4E4] text-[#4A5068]'
          }`}
          aria-label="Open 90s Music Jukebox"
          title="90s Music Jukebox"
        >
          <Disc3 className="w-3.5 h-3.5 shrink-0" />
          <span>Music</span>
        </button>
        {humanClub && !showHeaderPackButton ? (
          <button
            type="button"
            onClick={() => {
              soundEngine.play('ui_pop');
              setPacksOpen(true);
            }}
            className="comic-btn bg-[#F5EEFF] text-[#4C1D95] px-2 py-1.5 text-[11px] flex items-center justify-center gap-1 min-h-[40px]"
            aria-label="Open 1994 Foil Packs"
            title="1994 Foil Card Booster Packs"
          >
            <Gift className="w-3.5 h-3.5 shrink-0" />
            <span>Packs</span>
          </button>
        ) : null}
        {humanClub ? (
          <button
            type="button"
            onClick={() => {
              soundEngine.play('ui_pop');
              setTrophyOpen(true);
            }}
            className="comic-btn bg-[#FFF8E7] text-[#181B2C] px-2 py-1.5 text-[11px] flex items-center justify-center gap-1 min-h-[40px]"
            aria-label="Open Trophy and Sticker Album"
            title="Trophy & Sticker Album"
          >
            <Trophy className="w-3.5 h-3.5 shrink-0 text-[#F77F00]" />
            <span>Trophies</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            soundEngine.play('ui_pop');
            setSettingsOpen(true);
          }}
          className={`comic-btn bg-[#E0FBFC] text-[#1D3557] px-2 py-1.5 text-[11px] flex items-center justify-center gap-1 min-h-[40px] ${
            humanClub && unopenedPackCount === 0 ? 'col-span-2' : ''
          }`}
          aria-label="Open Settings and Accessibility"
          title="Settings & Accessibility"
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          <span>Settings</span>
        </button>
      </div>
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

  const visibleNavItems = !humanClub
    ? designLabVisible
      ? NAV_ITEMS.filter((item) => item.id === 'lab' || item.id === 'gameday')
      : []
    : (designLabVisible ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.id !== 'lab')).map((item) => {
        if (item.id === 'roster' && inboxBadges.roster) return { ...item, badge: inboxBadges.roster };
        if (item.id === 'skills' && inboxBadges.skills) return { ...item, badge: inboxBadges.skills };
        if (item.id === 'league' && inboxBadges.league) return { ...item, badge: inboxBadges.league };
        if (item.id === 'economy' && inboxBadges.economy) return { ...item, badge: inboxBadges.economy };
        return item;
      });

  const handleOpenRelics = () => {
    setHubInitialSubTab('relics');
    setActiveTab('economy');
  };

  const handleOpenUniforms = () => {
    setHubInitialSubTab('uniforms');
    setActiveTab('economy');
  };

  const renderMainContent = () => {
    if (activeTab === 'lab' && designLabVisible) {
      return <DesignLabScreen />;
    }
    if (onGameDay) return humanClub ? null : <ClubCreatorScreen onCreated={startOpening} />;
    if (activeTab === 'roster') {
      return humanClub ? (
        <RosterLineupScreen
          onPlayBall={() => setActiveTab('gameday')}
          onOpenUniforms={handleOpenUniforms}
        />
      ) : (
        <ClubCreatorScreen onCreated={startOpening} />
      );
    }
    if (activeTab === 'league') {
      return humanClub ? (
        <LeagueScreen onPlayLivePlayoffGame={() => setActiveTab('gameday')} />
      ) : (
        <ClubCreatorScreen onCreated={startOpening} />
      );
    }
    if (activeTab === 'skills') {
      return humanClub ? (
        <SkillTreeScreen />
      ) : (
        <ClubCreatorScreen onCreated={startOpening} />
      );
    }

    return humanClub ? (
      <ClubHubScreen initialSubTab={hubInitialSubTab} />
    ) : (
      <ClubCreatorScreen onCreated={startOpening} />
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
      liveGame={inDugout}
      navItems={visibleNavItems}
      activeTab={activeTab}
      onSelectTab={(id) => {
        soundEngine.play('ui_pop');
        if (id === 'economy') setHubInitialSubTab('stadiums');
        setActiveTab(id as TabId);
      }}
      muted={muted}
      onToggleMute={handleToggleMute}
      utilityActions={desktopUtilityActions}
      mobileUtilityActions={mobileUtilityActions}
    >
      <PwaInstallBanner deferred={!humanClub || inDugout} />
      <Suspense
        fallback={
          <div className="p-6 text-center font-display text-sm text-[#181B2C] bg-[#FFFDF7] rounded-2xl border-2 border-[#181B2C] shadow-[4px_4px_0_#181B2C]">
            ⚾ Warming Up the Bullpen...
          </div>
        }
      >
        {humanClub && (onGameDay || liveCareer === careerKey) && (
          <Activity key={careerKey} mode={onGameDay ? 'visible' : 'hidden'}>
            <GameDayScreen openingRequest={opening} onOpeningStarted={() => setOpening(null)}
              onLiveChange={onLiveChange} onOpenDugout={() => setMobileMenuOpen(true)}
              onJumpToTab={tab => {
                if (tab === 'economy') setHubInitialSubTab('stadiums');
                setActiveTab(tab);
              }}
              onOpenStory={() => setStoryOpen(true)} onOpenRelics={handleOpenRelics} onOpenUniforms={handleOpenUniforms} />
          </Activity>
        )}
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
      <MusicJukeboxModal
        open={jukeboxOpen}
        leagueTier={humanClub?.leagueTier ?? 'rookie'}
        onClose={() => setJukeboxOpen(false)}
      />
      <FoilPackModal
        open={packsOpen}
        onClose={() => setPacksOpen(false)}
        backLabel={gamesPlayed === 0 ? '⚾ Back to Opening Day' : '⚾ Back to Game Day'}
        onBackToGame={() => {
          setPacksOpen(false);
          setActiveTab('gameday');
        }}
        onViewRelics={
          humanClub
            ? () => {
                setPacksOpen(false);
                handleOpenRelics();
              }
            : undefined
        }
      />
      <TrophyCaseModal open={trophyOpen} onClose={() => setTrophyOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Clean Mobile Clubhouse Utility Menu (replaces 6 crowded mobile header icons!) */}
      {mobileMenuOpen ? (
        <dialog ref={menuRef} onCancel={() => setMobileMenuOpen(false)}
          data-testid="mobile-clubhouse-menu"
          className="club-menu-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={inDugout ? 'Dugout' : 'Clubhouse Menu'}
        >
          <div className="w-full max-w-sm mt-6 rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden">
            <div className="px-4 py-3 bg-[#1B4332] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between">
              <span className="font-display text-sm tracking-wide">{inDugout ? 'Dugout' : '⚾ CLUBHOUSE MENU'}</span>
              <button
                type="button"
                aria-label="Close clubhouse menu"
                onClick={() => setMobileMenuOpen(false)}
                className="w-12 h-12 rounded-xl bg-[#FFFDF7] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {inDugout && <nav aria-label="Dugout destinations" className="grid grid-cols-2 gap-2">
                {visibleNavItems.map(item => <button key={item.id} type="button" className="dugout-link" onClick={() => {
                  setMobileMenuOpen(false);
                  if (item.id === 'economy') setHubInitialSubTab('stadiums');
                  setActiveTab(item.id as TabId);
                }}>{item.icon}{item.id === 'gameday' ? 'Back to play' : item.label}</button>)}
                <button className="dugout-link" onClick={handleToggleMute}>{muted ? 'Unmute audio' : 'Mute audio'}</button>
              </nav>}
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
                aria-label="Open Trophy and Sticker Album"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTrophyOpen(true);
                  soundEngine.play('ui_pop');
                }}
                className="w-full comic-btn bg-[#FFF8E7] text-[#181B2C] px-3 py-2.5 text-xs flex items-center gap-2 min-h-[44px]"
              >
                <Trophy className="w-4 h-4 shrink-0 text-[#F77F00]" />
                <span>Trophy &amp; Sticker Album</span>
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
              <div className="pt-1 text-center text-[10px] font-extrabold text-[#1B4332]">
                ✓ 100% Offline Ready • Local Saves, 3D &amp; Audio
              </div>
            </div>
          </div>
        </dialog>
      ) : null}
    </AppShell>
  );
}
