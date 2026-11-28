import { useId } from 'react';
import { Sparkles, Star } from 'lucide-react';
import type { Player } from '../../engine/models/player';
import {
  canUnlockSkillNode,
  getNodesForBranch,
  type SkillBranchId,
  type SkillTreeNode,
} from '../../engine/rpg/skillTrees';
import {
  checkNodeMasteryGate,
  DISCIPLINE_LABELS,
  getDisciplinesForPlayer,
  getNodeMasteryDiscipline,
  resolvePlayerSkillMastery,
} from '../../engine/rpg/skillTreeMastery';
import type { CoachSkillRecommendation } from '../../engine/rpg/skillTreeAssist';
import { ComicButton } from '../design-system/ComicButton';

interface SkillTreeConstellationProps {
  player: Player;
  branch: SkillBranchId;
  selectedNodeId: string | null;
  coachRecommendation: CoachSkillRecommendation | null;
  onSelectNode: (nodeId: string) => void;
  onUnlockNode: (nodeId: string, nodeName: string) => void;
  onTogglePower: (powerId: string) => void;
}

const NODE_POSITIONS: Readonly<Record<string, { x: number; y: number }>> = {
  // Pitcher constellation (3 glowing lanes rising toward capstones)
  p_heat_1: { x: 112, y: 262 },
  p_spin_1: { x: 320, y: 268 },
  p_paint_1: { x: 528, y: 262 },
  p_heat_2: { x: 118, y: 170 },
  p_spin_2: { x: 296, y: 170 },
  p_paint_2: { x: 472, y: 168 },
  p_stamina_2: { x: 572, y: 186 },
  cap_blazing_comet: { x: 96, y: 74 },
  cap_tornado_slider: { x: 212, y: 66 },
  cap_ghost_knuckle: { x: 342, y: 74 },
  cap_ice_veins: { x: 492, y: 74 },

  // Batter constellation
  b_pwr_1: { x: 112, y: 262 },
  b_con_1: { x: 320, y: 268 },
  b_spd_1: { x: 528, y: 262 },
  b_pwr_2: { x: 116, y: 168 },
  b_con_2: { x: 268, y: 168 },
  b_eye_2: { x: 392, y: 168 },
  b_spd_2: { x: 534, y: 168 },
  cap_moonshot_bomb: { x: 112, y: 72 },
  cap_rally_spark: { x: 256, y: 72 },
  cap_laser_eye: { x: 396, y: 72 },
  cap_ninja_bunt: { x: 534, y: 72 },

  // Fielder constellation
  f_rng_1: { x: 120, y: 262 },
  f_arm_1: { x: 320, y: 266 },
  f_glv_1: { x: 520, y: 262 },
  f_rng_2: { x: 120, y: 168 },
  f_arm_2: { x: 320, y: 168 },
  f_glv_2: { x: 520, y: 168 },
  cap_sky_high_leap: { x: 120, y: 74 },
  cap_cannon_arm: { x: 320, y: 74 },
  cap_iron_vacuum: { x: 520, y: 74 },
};

const BG_STARS: readonly { x: number; y: number; r: number; o: number }[] = [
  { x: 34, y: 38, r: 1.4, o: 0.7 },
  { x: 74, y: 132, r: 1.1, o: 0.55 },
  { x: 158, y: 34, r: 1.6, o: 0.8 },
  { x: 186, y: 224, r: 1.2, o: 0.5 },
  { x: 242, y: 118, r: 1.3, o: 0.65 },
  { x: 288, y: 28, r: 1.1, o: 0.7 },
  { x: 374, y: 116, r: 1.5, o: 0.75 },
  { x: 438, y: 36, r: 1.2, o: 0.65 },
  { x: 452, y: 228, r: 1.1, o: 0.5 },
  { x: 562, y: 42, r: 1.7, o: 0.8 },
  { x: 604, y: 122, r: 1.2, o: 0.6 },
  { x: 58, y: 298, r: 1.1, o: 0.45 },
  { x: 416, y: 296, r: 1.3, o: 0.55 },
  { x: 598, y: 278, r: 1.2, o: 0.45 },
];

const BRANCH_LANE_HEADERS: Readonly<Record<SkillBranchId, readonly { x: number; label: string; color: string }[]>> = {
  pitcher: [
    { x: 112, label: '🔥 HEAT', color: '#FF6B6B' },
    { x: 320, label: '🌀 SPIN', color: '#C084FC' },
    { x: 528, label: '🧊 COMMAND', color: '#38BDF8' },
  ],
  batter: [
    { x: 112, label: '💣 POWER', color: '#FF6B6B' },
    { x: 320, label: '🎯 CONTACT & EYE', color: '#4ADE80' },
    { x: 528, label: '⚡ SPEED & BUNT', color: '#FBBF24' },
  ],
  fielder: [
    { x: 120, label: '🦅 RANGE', color: '#38BDF8' },
    { x: 320, label: '🚀 CANNON ARM', color: '#FB923C' },
    { x: 520, label: '🧤 SOFT HANDS', color: '#4ADE80' },
  ],
};

function getNodePos(node: SkillTreeNode): { x: number; y: number } {
  return NODE_POSITIONS[node.id] ?? { x: 120 + node.lane * 200, y: 260 - (node.tier - 1) * 92 };
}

export function SkillTreeConstellation({
  player,
  branch,
  selectedNodeId,
  coachRecommendation,
  onSelectNode,
  onUnlockNode,
  onTogglePower,
}: SkillTreeConstellationProps) {
  const uid = useId().replace(/:/g, '');
  const nodes = getNodesForBranch(branch);
  const mastery = resolvePlayerSkillMastery(player);
  const disciplines = getDisciplinesForPlayer(player);
  const selectedNode =
    nodes.find((n) => n.id === selectedNodeId) ??
    (coachRecommendation && nodes.some((n) => n.id === coachRecommendation.node.id)
      ? coachRecommendation.node
      : nodes[0]);

  const selectedUnlocked = selectedNode ? player.unlockedSkillIds.includes(selectedNode.id) : false;
  const selectedCheck = selectedNode ? canUnlockSkillNode(player, selectedNode.id) : { allowed: false };
  const selectedGate = selectedNode ? checkNodeMasteryGate(player, selectedNode.id) : null;
  const selectedEquipped =
    selectedNode?.capstonePowerId !== undefined &&
    player.equippedPowerIds.includes(selectedNode.capstonePowerId);
  const isCoachPickSelected = Boolean(
    selectedNode && coachRecommendation && coachRecommendation.node.id === selectedNode.id,
  );

  return (
    <div
      data-testid="skill-tree-constellation"
      className="rounded-2xl border-2 border-[#181B2C] bg-[#0B132B] overflow-hidden shadow-[4px_4px_0_#181B2C]"
    >
      {/* Skyrim-Style Discipline Mastery Ribbon */}
      <div
        data-testid="discipline-mastery-ribbon"
        className="px-3 py-2 bg-[#131D3A] border-b-2 border-[#2A3B6A] flex flex-wrap items-center gap-2"
      >
        <span className="font-display text-[10px] uppercase tracking-wider text-[#FFD166]">
          ✦ Baseball Mastery (Grows in Games &amp; Drills):
        </span>
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {disciplines.map((disc) => {
            const meta = DISCIPLINE_LABELS[disc];
            const score = mastery[disc];
            return (
              <div
                key={disc}
                data-testid={`mastery-pill-${disc}`}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[#3B4F84] bg-[#0B132B] text-white"
              >
                <span className="text-[10px] font-extrabold">
                  {meta.icon} {meta.label.split(' ')[0]}
                </span>
                <div className="w-12 h-1.5 rounded-full bg-[#1F2E56] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, score)}%`, backgroundColor: meta.color }}
                  />
                </div>
                <span className="font-mono text-[10px] font-bold text-[#FFD166]">{score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ballpark Twilight Constellation SVG Sky */}
      <div className="relative w-full bg-gradient-to-b from-[#070E22] via-[#101D3D] to-[#1B2F57] px-2 pt-2 pb-1">
        <svg
          viewBox="0 0 640 315"
          className="w-full h-auto max-h-[290px] block select-none"
          role="img"
          aria-label={`${player.name} ${branch} skill constellation`}
        >
          <defs>
            <radialGradient id={`skyGlow-${uid}`} cx="50%" cy="100%" r="72%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#1E3A8A" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#070E22" stopOpacity="0" />
            </radialGradient>
            <filter id={`starGlow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="640" height="315" fill={`url(#skyGlow-${uid})`} />

          {/* Stadium light-tower horizon silhouette */}
          <path
            d="M0 308 Q160 282 320 290 Q480 282 640 308 L640 315 L0 315 Z"
            fill="#0A1429"
            opacity="0.72"
          />

          {/* Background twilight starfield */}
          {BG_STARS.map((star, idx) => (
            <circle key={idx} cx={star.x} cy={star.y} r={star.r} fill="#E0F2FE" opacity={star.o} />
          ))}

          {/* Tier altitude guide labels */}
          <text x="12" y="76" fill="#93C5FD" opacity="0.65" fontSize="9.5" fontWeight="800">
            TIER 3 · CAPSTONE (50)
          </text>
          <text x="12" y="172" fill="#93C5FD" opacity="0.55" fontSize="9.5" fontWeight="800">
            TIER 2 · CRAFT (20)
          </text>
          <text x="12" y="266" fill="#93C5FD" opacity="0.55" fontSize="9.5" fontWeight="800">
            TIER 1 · ROOKIE (0)
          </text>

          {/* Lane Constellation Headers */}
          {BRANCH_LANE_HEADERS[branch].map((lane) => (
            <text
              key={lane.label}
              x={lane.x}
              y="26"
              textAnchor="middle"
              fill={lane.color}
              fontSize="11"
              fontWeight="900"
              letterSpacing="0.8"
            >
              {lane.label}
            </text>
          ))}

          {/* Starlight prerequisite beams */}
          {nodes.map((node) => {
            const to = getNodePos(node);
            const nodeUnlocked = player.unlockedSkillIds.includes(node.id);
            const nodeReady = canUnlockSkillNode(player, node.id).allowed;
            return node.prerequisiteIds.map((reqId) => {
              const reqNode = nodes.find((n) => n.id === reqId);
              if (!reqNode) return null;
              const from = getNodePos(reqNode);
              const reqUnlocked = player.unlockedSkillIds.includes(reqId);
              const stroke = nodeUnlocked
                ? '#FFD166'
                : reqUnlocked && nodeReady
                  ? '#38BDF8'
                  : reqUnlocked
                    ? '#60A5FA'
                    : '#334155';
              return (
                <line
                  key={`${reqId}-${node.id}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={stroke}
                  strokeWidth={nodeUnlocked ? 3.5 : reqUnlocked ? 2.5 : 1.8}
                  strokeDasharray={nodeUnlocked || reqUnlocked ? undefined : '5 5'}
                  opacity={nodeUnlocked ? 0.96 : reqUnlocked ? 0.85 : 0.55}
                />
              );
            });
          })}

          {/* Interactive Star Nodes */}
          {nodes.map((node) => {
            const pos = getNodePos(node);
            const unlocked = player.unlockedSkillIds.includes(node.id);
            const check = canUnlockSkillNode(player, node.id);
            const isCoachPick = coachRecommendation?.node.id === node.id;
            const isSelected = selectedNode?.id === node.id;
            const disc = getNodeMasteryDiscipline(node);
            const accent = DISCIPLINE_LABELS[disc].color;
            const radius = node.tier === 3 ? 19 : 14;
            const fill = unlocked
              ? '#FFD166'
              : check.allowed
                ? accent
                : '#1E293B';
            const stroke = isSelected
              ? '#FFFFFF'
              : unlocked
                ? '#FEF08A'
                : check.allowed
                  ? '#E0F2FE'
                  : '#475569';

            return (
              <g
                key={node.id}
                data-testid={`constellation-star-${node.id}`}
                role="button"
                tabIndex={0}
                aria-label={`${node.name} (${node.spCost} SP)`}
                className="cursor-pointer outline-none"
                onClick={() => onSelectNode(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectNode(node.id);
                  }
                }}
              >
                {isCoachPick ? (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius + 8}
                    fill="none"
                    stroke="#FFD166"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                  />
                ) : null}
                {isSelected ? (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius + 5}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.2"
                  />
                ) : null}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={unlocked || check.allowed || isCoachPick ? `url(#starGlow-${uid})` : undefined}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill={unlocked ? '#181B2C' : '#FFFFFF'}
                  fontSize={node.tier === 3 ? '12' : '10.5'}
                  fontWeight="900"
                >
                  {unlocked ? '★' : node.tier === 3 ? '♛' : `${node.spCost}`}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + radius + 14}
                  textAnchor="middle"
                  fill={unlocked ? '#FEF08A' : check.allowed ? '#FFFFFF' : '#94A3B8'}
                  fontSize="10"
                  fontWeight="800"
                >
                  {node.name}
                </text>
                {isCoachPick ? (
                  <text
                    x={pos.x}
                    y={pos.y - radius - 8}
                    textAnchor="middle"
                    fill="#FFD166"
                    fontSize="9.5"
                    fontWeight="900"
                  >
                    ★ COACH PICK
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Star Inspector Bar */}
      {selectedNode ? (
        <div
          data-testid="constellation-inspector"
          className="px-3 py-2.5 bg-[#131D3A] border-t-2 border-[#2A3B6A] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-[#FFD166] text-[#FFD166] shrink-0" />
              <span className="font-display text-xs text-[#FFD166]">{selectedNode.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#1F2E56] text-[#93C5FD] text-[10px] font-extrabold">
                Tier {selectedNode.tier} · {selectedNode.spCost} SP
              </span>
              {isCoachPickSelected ? (
                <span className="px-1.5 py-0.5 rounded bg-[#FFD166] text-[#181B2C] text-[10px] font-display">
                  ★ Coach&apos;s Pick
                </span>
              ) : null}
            </div>
            <p className="text-[11px] font-bold text-[#E2E8F0]">{selectedNode.description}</p>
            {selectedGate && selectedGate.required > 0 ? (
              <div className="text-[10px] font-extrabold text-[#93C5FD]">
                {DISCIPLINE_LABELS[selectedGate.discipline].icon}{' '}
                {DISCIPLINE_LABELS[selectedGate.discipline].label} Mastery: {selectedGate.current}/
                {selectedGate.required} {selectedGate.met ? '✓ Ready' : '— play games or train to unlock'}
              </div>
            ) : null}
            {isCoachPickSelected && coachRecommendation ? (
              <div className="text-[10px] font-bold text-[#FDE68A]">
                Coach Pops: &ldquo;{coachRecommendation.reason}&rdquo;
              </div>
            ) : null}
          </div>

          <div className="shrink-0">
            {selectedUnlocked ? (
              selectedNode.capstonePowerId ? (
                <ComicButton
                  size="sm"
                  data-testid="constellation-equip-btn"
                  variant={selectedEquipped ? 'turf' : 'sky'}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => onTogglePower(selectedNode.capstonePowerId!)}
                >
                  {selectedEquipped ? 'Power Equipped ✓' : 'Equip Capstone'}
                </ComicButton>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2FB356] text-white text-xs font-display">
                  ★ Star Unlocked
                </span>
              )
            ) : (
              <ComicButton
                size="sm"
                data-testid="constellation-unlock-btn"
                variant={selectedCheck.allowed ? 'gold' : 'cream'}
                disabled={!selectedCheck.allowed}
                onClick={() => onUnlockNode(selectedNode.id, selectedNode.name)}
              >
                {selectedCheck.allowed
                  ? `Awaken Star (${selectedNode.spCost} SP)`
                  : selectedCheck.reason ?? 'Locked'}
              </ComicButton>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
