import { useState } from 'react';
import { Building2, Gamepad2, GitBranch, Palette, Trophy, Users } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { AppShell, type NavItem } from './ui/design-system/AppShell';
import { ComicCard } from './ui/design-system/ComicCard';
import { DesignLabScreen } from './ui/screens/DesignLabScreen';

type TabId = 'lab' | 'gameday' | 'roster' | 'skills' | 'economy' | 'trophies';

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'lab', label: 'Design Lab', icon: <Palette className="w-4 h-4" />, badge: 'LIVE' },
  { id: 'gameday', label: 'Play Ball', icon: <Gamepad2 className="w-4 h-4" /> },
  { id: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
  { id: 'skills', label: 'Skill Tree', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'economy', label: 'Ballpark', icon: <Building2 className="w-4 h-4" /> },
  { id: 'trophies', label: 'Trophies', icon: <Trophy className="w-4 h-4" /> },
];

const UPCOMING_MILESTONES: Record<
  Exclude<TabId, 'lab'>,
  { title: string; milestone: string; summary: string }
> = {
  gameday: {
    title: 'Play Ball — Live 3D Games & Clutch Cam',
    milestone: 'Milestone 2 (Core Playable MVP)',
    summary:
      'Pitch-by-pitch seeded simulation wired directly to the over-the-shoulder 3D ballpark with 1x/2x/4x speeds, Clutch Moments, tactical calls, and Manager Powers.',
  },
  roster: {
    title: 'Clubhouse, Lineups, Draft & Free Agency',
    milestone: 'Milestones 2 & 4',
    summary:
      'Set your 9-man batting order, starting rotation, and bullpen; scout prospects, draft 90s rookies, sign free agents, and manage team rivalries.',
  },
  skills: {
    title: 'Branching Player & Manager Skill Trees',
    milestone: 'Milestone 3 (RPG Depth)',
    summary:
      'Spend Skill Points earned from games and animated practice drills to unlock Blazing Comet, Ghost Knuckle, Moonshot Bomb-Swing, Sky-High Leap, and Manager Powers.',
  },
  economy: {
    title: 'Sim-City Ballpark Economy & Upgrades',
    milestone: 'Milestone 5',
    summary:
      'Control ticket & concession pricing, sign 90s parody sponsors for your outfield wall, negotiate TV contracts, and visually upgrade your 3D stadium.',
  },
  trophies: {
    title: 'Trophy Room, Awards & Rivalry Cups',
    milestone: 'Milestone 6',
    summary:
      'Showcase MVP awards, championship pennants, Hall of Fame legends, unlockable uniforms/bat skins, and Traveling Rivalry Cups.',
  },
};

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('lab');
  const [muted, setMuted] = useState(false);

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.play('ui_pop');
    }
  };

  return (
    <AppShell
      clubName="Mini Baseball Manager"
      leagueLabel="Rookie Sandlot League"
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onSelectTab={(id) => {
        soundEngine.play('ui_pop');
        setActiveTab(id as TabId);
      }}
      muted={muted}
      onToggleMute={handleToggleMute}
    >
      {activeTab === 'lab' ? (
        <DesignLabScreen />
      ) : (
        <ComicCard
          title={UPCOMING_MILESTONES[activeTab].title}
          subtitle={UPCOMING_MILESTONES[activeTab].milestone}
          headerBg="#1B4332"
        >
          <p className="font-bold text-sm text-[#4A5068] leading-relaxed">
            {UPCOMING_MILESTONES[activeTab].summary}
          </p>
          <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-[#2FB356]">
            Tracked in PLAN.md — Ready to build right after our Milestone 1 visual checkpoint!
          </p>
        </ComicCard>
      )}
    </AppShell>
  );
}
