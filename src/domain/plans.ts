import type { DraftPlan } from '../types';

export function createBranchFromPlan(activePlan: DraftPlan, nextPlanId: number): DraftPlan {
  return {
    id: nextPlanId,
    name: '方案 ' + nextPlanId,
    steps: activePlan.steps.map((step) => ({ ...step, hero: { ...step.hero } })),
    laneAssignments: { ...activePlan.laneAssignments }
  };
}

export function replacePlan(plans: DraftPlan[], updatedPlan: DraftPlan): DraftPlan[] {
  return plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan));
}
