import { describe, expect, it } from 'vitest';
import { createInitialPlan, createInitialPools, getDraftTurn, selectHeroInPlan, cancelFromStep } from './draft';
import { evaluateDraftWinrate, pickImpactLevel } from './evaluation';
import { createBranchFromPlan } from './plans';
import { moveHeroToLane } from './lanes';
import type { DraftConfig } from '../types';

const config: DraftConfig = { faction: 'radiant', pickOrder: 'first', myTeam: 'XG', enemyTeam: 'VG' };

describe('draft engine', () => {
  it('computes draft side from pick order and faction', () => {
    expect(getDraftTurn(1, config)).toMatchObject({ action: 'Ban', side: 'radiant' });
    expect(getDraftTurn(2, config)).toMatchObject({ action: 'Ban', side: 'dire' });
  });

  it('prevents selecting the same hero twice in one plan', () => {
    const pools = createInitialPools(config);
    const plan = selectHeroInPlan(createInitialPlan(), 'drow_ranger', config, pools);
    const samePlan = selectHeroInPlan(plan, 'drow_ranger', config, pools);
    expect(samePlan.steps).toHaveLength(1);
  });

  it('cancels target step and all following steps', () => {
    const pools = createInitialPools(config);
    let plan = createInitialPlan();
    plan = selectHeroInPlan(plan, 'drow_ranger', config, pools);
    plan = selectHeroInPlan(plan, 'tiny', config, pools);
    plan = selectHeroInPlan(plan, 'puck', config, pools);
    expect(cancelFromStep(plan, 2).steps.map((step) => step.hero.id)).toEqual(['drow_ranger']);
  });

  it('keeps branch state isolated from source plan', () => {
    const pools = createInitialPools(config);
    const picks = ['drow_ranger', 'tiny', 'puck', 'axe', 'bane', 'lina', 'mars', 'rubick'];
    let plan = createInitialPlan();
    for (const heroId of picks) plan = selectHeroInPlan(plan, heroId, config, pools);
    const branch = createBranchFromPlan(plan, 2);
    const moved = moveHeroToLane(branch, 'rubick', 'mid');
    expect(plan.laneAssignments.rubick).not.toBe('mid');
    expect(moved.laneAssignments.rubick).toBe('mid');
  });

  it('evaluates model winrate and pick impact from coefficient table', () => {
    const base = evaluateDraftWinrate(['drow_ranger'], ['axe']);
    expect(base.radiantWinrate).toBeGreaterThan(0);
    expect(base.radiantWinrate).toBeLessThan(1);

    const impact = pickImpactLevel(createInitialPlan(), 'drow_ranger', 'radiant', config);
    expect(impact).not.toBeNull();
    expect(Number.isFinite(impact?.deltaMyWinrate)).toBe(true);
    expect(Math.abs(impact?.level || 0)).toBeLessThanOrEqual(3);
  });
});
