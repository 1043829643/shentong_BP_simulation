import { DRAFT_SEQUENCE } from '../data/dotaData';
import type { DraftAction, DraftConfig, DraftPlan, DraftStep, DraftTurn, Faction, Hero, HeroPool, PickOrder, PoolsState } from '../types';
import { buildOtherHeroPool, buildPoolData, buildReal741Pool, getHero } from './heroes';
import { defaultLaneForHero, getPreferredLaneForHero } from './lanes';

const draftSequence = DRAFT_SEQUENCE as Array<{ action: DraftAction; pickOrder: PickOrder }>;

export function createInitialPlan(): DraftPlan {
  return { id: 1, name: '方案 1', steps: [], laneAssignments: {} };
}

export function createInitialPools(config: DraftConfig, customPools?: { my?: HeroPool | null; enemy?: HeroPool | null }): PoolsState {
  const myPool = buildPoolData(config.myTeam, customPools?.my);
  const enemyPool = buildPoolData(config.enemyTeam, customPools?.enemy);
  return {
    my: myPool,
    enemy: enemyPool,
    other: buildOtherHeroPool(buildReal741Pool(), myPool)
  };
}

export function getDraftTurn(step: number, config: DraftConfig): DraftTurn | null {
  const item = draftSequence[step - 1];
  if (!item) return null;
  const side: Faction = item.pickOrder === config.pickOrder
    ? config.faction
    : config.faction === 'radiant' ? 'dire' : 'radiant';
  return { step, action: item.action, side };
}

export function getCurrentTurn(plan: DraftPlan | undefined, config: DraftConfig): DraftTurn | null {
  return getDraftTurn((plan?.steps.length || 0) + 1, config);
}

export function selectHeroInPlan(plan: DraftPlan, heroId: string, config: DraftConfig, pools: PoolsState): DraftPlan {
  if (isHeroSelected(plan, heroId)) return plan;
  if (plan.steps.length >= draftSequence.length) return plan;
  const turn = getCurrentTurn(plan, config);
  if (!turn) return plan;

  const selectedHero = getHero(heroId);
  const nextStep: DraftStep = { ...turn, hero: selectedHero };
  const nextPlan: DraftPlan = { ...plan, steps: [...plan.steps, nextStep] };

  if (turn.action === 'Pick') {
    const sidePool = turn.side === config.faction ? pools.my : pools.enemy;
    nextPlan.laneAssignments = {
      ...plan.laneAssignments,
      [heroId]: getPreferredLaneForHero(heroId, sidePool) || defaultLaneForHero(selectedHero)
    };
  } else {
    nextPlan.laneAssignments = { ...plan.laneAssignments };
  }

  return nextPlan;
}

export function cancelFromStep(plan: DraftPlan, startStep: number): DraftPlan {
  const steps = plan.steps.filter((step) => step.step < startStep);
  const remainingHeroIds = new Set(steps.map((step) => step.hero.id));
  const laneAssignments = Object.fromEntries(
    Object.entries(plan.laneAssignments).filter(([heroId]) => remainingHeroIds.has(heroId))
  );
  return { ...plan, steps, laneAssignments };
}

export function undoLastStep(plan: DraftPlan): DraftPlan {
  if (plan.steps.length === 0) return plan;
  return cancelFromStep(plan, plan.steps.length);
}

export function isHeroSelected(plan: DraftPlan, heroId: string): boolean {
  return plan.steps.some((step) => step.hero.id === heroId);
}

export function selectedHeroIds(plan?: DraftPlan): Set<string> {
  return new Set((plan?.steps || []).map((step) => step.hero.id));
}

export function getLineup(plan: DraftPlan, ownFaction: Faction): { own: Hero[]; enemy: Hero[] } {
  const picks = plan.steps.filter((step) => step.action === 'Pick');
  return {
    own: picks.filter((step) => step.side === ownFaction).map((step) => step.hero),
    enemy: picks.filter((step) => step.side !== ownFaction).map((step) => step.hero)
  };
}
