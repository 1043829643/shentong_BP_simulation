import { laneLabels, laneOrderByFaction } from '../data/dotaData';
import type { DraftConfig, DraftPlan, Faction, Hero, HeroPool, LaneComparison, LaneGroup, LaneId, TierPool } from '../types';

const laneLabelMap = laneLabels as Record<LaneId, string>;
const laneOrderMap = laneOrderByFaction as Record<Faction, LaneId[]>;

export function factionLabel(side: Faction): string {
  return side === 'radiant' ? '天辉' : '夜魇';
}

export function pickOrderLabel(order: string): string {
  return order === 'first' ? '先选' : '后选';
}

export function sideLabel(side: Faction, ownFaction: Faction): string {
  return side === ownFaction ? '我方' : '对方';
}

export function getLaneOrder(faction: Faction): Array<{ id: LaneId; label: string }> {
  return (laneOrderMap[faction] || laneOrderMap.radiant).map((id) => ({
    id,
    label: laneLabelMap[id]
  }));
}

export function defaultLaneForHero(heroObj: Hero): LaneId {
  const heroRoles = heroObj.roles || [];
  if (heroRoles.includes(2)) return 'mid';
  if (heroRoles.includes(1) || heroRoles.includes(5)) return 'safe';
  return 'off';
}

export function getPreferredLaneForHero(heroId: string, pool?: HeroPool | null): LaneId | null {
  if (!pool) return null;
  const tierWeight: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };
  const roleScores = new Map<string, number>();

  for (const role of ['1', '2', '3', '4', '5']) {
    const roleValue = pool[role as keyof HeroPool];
    if (!roleValue) continue;
    if ('flat' in roleValue) {
      const count = roleValue.flat.filter((heroObj: Hero) => heroObj.id === heroId).length;
      if (count > 0) roleScores.set(role, (roleScores.get(role) || 0) + count);
      continue;
    }
    for (const [tier, heroes] of Object.entries(roleValue as TierPool)) {
      const count = heroes.filter((heroObj: Hero) => heroObj.id === heroId).length;
      if (count > 0) roleScores.set(role, (roleScores.get(role) || 0) + count * (tierWeight[tier] || 1));
    }
  }

  if (roleScores.size === 0) return null;
  const bestRole = [...roleScores.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return Number(left[0]) - Number(right[0]);
  })[0][0];
  return laneFromRole(bestRole);
}

export function laneFromRole(role: string): LaneId {
  if (role === '2') return 'mid';
  if (role === '1' || role === '5') return 'safe';
  return 'off';
}

export function getLaneGroups(plan: DraftPlan, faction: Faction): LaneGroup[] {
  const assignments = plan.laneAssignments || {};
  const picks = plan.steps.filter((step) => step.action === 'Pick' && step.side === faction);
  return getLaneOrder(faction).map((lane) => ({
    ...lane,
    heroes: picks
      .map((step) => step.hero)
      .filter((heroObj) => (assignments[heroObj.id] || defaultLaneForHero(heroObj)) === lane.id)
  }));
}

export function moveHeroToLane(plan: DraftPlan, heroId: string, laneId: LaneId): DraftPlan {
  if (!laneLabelMap[laneId]) return plan;
  const isPickedHero = plan.steps.some((step) => step.action === 'Pick' && step.hero.id === heroId);
  if (!isPickedHero) return plan;
  return {
    ...plan,
    laneAssignments: {
      ...plan.laneAssignments,
      [heroId]: laneId
    }
  };
}

export function lanePlan(plan: DraftPlan, config: DraftConfig): LaneComparison[] {
  const enemyFaction = config.faction === 'radiant' ? 'dire' : 'radiant';
  const ownGroups = Object.fromEntries(getLaneGroups(plan, config.faction).map((lane) => [lane.id, lane.heroes]));
  const enemyGroups = Object.fromEntries(getLaneGroups(plan, enemyFaction).map((lane) => [lane.id, lane.heroes]));
  return [
    { name: '优势路', own: ownGroups.safe || [], enemy: enemyGroups.off || [], ownLabel: '我方优势路', enemyLabel: '对方劣势路' },
    { name: '中路', own: ownGroups.mid || [], enemy: enemyGroups.mid || [], ownLabel: '我方中路', enemyLabel: '对方中路' },
    { name: '劣势路', own: ownGroups.off || [], enemy: enemyGroups.safe || [], ownLabel: '我方劣势路', enemyLabel: '对方优势路' }
  ];
}
