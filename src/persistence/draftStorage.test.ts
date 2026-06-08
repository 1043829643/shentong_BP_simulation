import { describe, expect, it, beforeEach } from 'vitest';
import { createInitialPlan } from '../domain/draft';
import type { DraftConfig } from '../types';
import { clearDraftState, loadDraftState, saveDraftState } from './draftStorage';

const config: DraftConfig = { faction: 'radiant', pickOrder: 'first', myTeam: 'XG', enemyTeam: 'VG' };

describe('draft storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and restores draft state with rebuilt pools', () => {
    saveDraftState({
      page: 'bp',
      bpViewMode: 'traditional',
      config,
      uploads: { myTeam: '', enemyTeam: '' },
      importMessages: { myTeam: '', enemyTeam: '' },
      customPools: {},
      activePlanId: 1,
      nextPlanId: 2,
      plans: [createInitialPlan()]
    });

    const restored = loadDraftState();
    expect(restored?.page).toBe('bp');
    expect(restored?.bpViewMode).toBe('traditional');
    expect(restored?.plans).toHaveLength(1);
    expect(restored?.pools?.my).toBeTruthy();
  });

  it('clears saved draft state', () => {
    saveDraftState({
      page: 'setup',
      bpViewMode: 'heroPool',
      config,
      uploads: { myTeam: '', enemyTeam: '' },
      importMessages: { myTeam: '', enemyTeam: '' },
      customPools: {},
      activePlanId: 1,
      nextPlanId: 2,
      plans: [createInitialPlan()]
    });

    clearDraftState();
    expect(loadDraftState()).toBeNull();
  });
});
