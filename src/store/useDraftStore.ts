import { create } from 'zustand';
import type { BpViewMode, DraftConfig, DraftPlan, HeroPool, LaneId, Page, PoolsState } from '../types';
import { createInitialPlan, createInitialPools, cancelFromStep, selectHeroInPlan, undoLastStep } from '../domain/draft';
import { moveHeroToLane } from '../domain/lanes';
import { createBranchFromPlan, replacePlan } from '../domain/plans';
import { clearDraftState, loadDraftState, saveDraftState } from '../persistence/draftStorage';

interface DraftStore {
  page: Page;
  bpViewMode: BpViewMode;
  config: DraftConfig;
  uploads: { myTeam: string; enemyTeam: string };
  importMessages: { myTeam: string; enemyTeam: string };
  customPools: { my?: HeroPool | null; enemy?: HeroPool | null };
  activePlanId: number;
  nextPlanId: number;
  plans: DraftPlan[];
  pools: PoolsState | null;
  setPage: (page: Page) => void;
  setBpViewMode: (mode: BpViewMode) => void;
  setConfig: (patch: Partial<DraftConfig>) => void;
  resetSetup: () => void;
  setImportedPool: (side: 'myTeam' | 'enemyTeam', fileName: string, pool: HeroPool, message: string) => void;
  setImportError: (side: 'myTeam' | 'enemyTeam', fileName: string, message: string) => void;
  startDraft: () => void;
  selectHero: (heroId: string) => void;
  cancelFromStep: (step: number) => void;
  undoLastStep: () => void;
  createBranch: () => void;
  activatePlan: (planId: number) => void;
  moveHeroToLane: (heroId: string, laneId: LaneId) => void;
  clearLocalDraft: () => void;
}

const defaultConfig: DraftConfig = { faction: 'radiant', pickOrder: 'first', myTeam: 'TRE', enemyTeam: 'VG' };
const restoredDraft = loadDraftState();

function persistCurrentState(state: DraftStore): void {
  saveDraftState({
    page: state.page,
    bpViewMode: state.bpViewMode,
    config: state.config,
    uploads: state.uploads,
    importMessages: state.importMessages,
    customPools: state.customPools,
    activePlanId: state.activePlanId,
    nextPlanId: state.nextPlanId,
    plans: state.plans
  });
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  page: restoredDraft?.page || 'setup',
  bpViewMode: restoredDraft?.bpViewMode || 'heroPool',
  config: restoredDraft?.config || defaultConfig,
  uploads: restoredDraft?.uploads || { myTeam: '', enemyTeam: '' },
  importMessages: restoredDraft?.importMessages || { myTeam: '', enemyTeam: '' },
  customPools: restoredDraft?.customPools || {},
  activePlanId: restoredDraft?.activePlanId || 1,
  nextPlanId: restoredDraft?.nextPlanId || 2,
  plans: restoredDraft?.plans || [createInitialPlan()],
  pools: restoredDraft?.pools || null,
  setPage: (page) => {
    set({ page });
    persistCurrentState(get());
  },
  setBpViewMode: (bpViewMode) => {
    set({ bpViewMode });
    persistCurrentState(get());
  },
  setConfig: (patch) => {
    set((state) => ({ config: { ...state.config, ...patch } }));
    persistCurrentState(get());
  },
  resetSetup: () => {
    set({
      config: defaultConfig,
      uploads: { myTeam: '', enemyTeam: '' },
      importMessages: { myTeam: '', enemyTeam: '' },
      customPools: {}
    });
    persistCurrentState(get());
  },
  setImportedPool: (side, fileName, pool, message) => {
    set((state) => ({
      uploads: { ...state.uploads, [side]: fileName },
      importMessages: { ...state.importMessages, [side]: message },
      customPools: { ...state.customPools, [side === 'myTeam' ? 'my' : 'enemy']: pool },
      config: { ...state.config, [side]: 'CUSTOM' }
    }));
    persistCurrentState(get());
  },
  setImportError: (side, fileName, message) => {
    set((state) => ({
      uploads: { ...state.uploads, [side]: fileName },
      importMessages: { ...state.importMessages, [side]: message }
    }));
    persistCurrentState(get());
  },
  startDraft: () => {
    const state = get();
    set({
      activePlanId: 1,
      nextPlanId: 2,
      plans: [createInitialPlan()],
      pools: createInitialPools(state.config, state.customPools),
      page: 'bp'
    });
    persistCurrentState(get());
  },
  selectHero: (heroId) => {
    const state = get();
    const activePlan = state.plans.find((plan) => plan.id === state.activePlanId);
    if (!activePlan || !state.pools) return;
    const updatedPlan = selectHeroInPlan(activePlan, heroId, state.config, state.pools);
    set({ plans: replacePlan(state.plans, updatedPlan) });
    persistCurrentState(get());
  },
  cancelFromStep: (step) => {
    const state = get();
    const activePlan = state.plans.find((plan) => plan.id === state.activePlanId);
    if (!activePlan) return;
    set({ plans: replacePlan(state.plans, cancelFromStep(activePlan, step)) });
    persistCurrentState(get());
  },
  undoLastStep: () => {
    const state = get();
    const activePlan = state.plans.find((plan) => plan.id === state.activePlanId);
    if (!activePlan) return;
    set({ plans: replacePlan(state.plans, undoLastStep(activePlan)) });
    persistCurrentState(get());
  },
  createBranch: () => {
    const state = get();
    const activePlan = state.plans.find((plan) => plan.id === state.activePlanId);
    if (!activePlan) return;
    const newPlan = createBranchFromPlan(activePlan, state.nextPlanId);
    set({
      plans: [...state.plans, newPlan],
      activePlanId: newPlan.id,
      nextPlanId: state.nextPlanId + 1
    });
    persistCurrentState(get());
  },
  activatePlan: (planId) => {
    if (get().plans.some((plan) => plan.id === planId)) {
      set({ activePlanId: planId });
      persistCurrentState(get());
    }
  },
  moveHeroToLane: (heroId, laneId) => {
    const state = get();
    const activePlan = state.plans.find((plan) => plan.id === state.activePlanId);
    if (!activePlan) return;
    set({ plans: replacePlan(state.plans, moveHeroToLane(activePlan, heroId, laneId)) });
    persistCurrentState(get());
  },
  clearLocalDraft: () => {
    clearDraftState();
    set({
      page: 'setup',
      bpViewMode: 'heroPool',
      config: defaultConfig,
      uploads: { myTeam: '', enemyTeam: '' },
      importMessages: { myTeam: '', enemyTeam: '' },
      customPools: {},
      activePlanId: 1,
      nextPlanId: 2,
      plans: [createInitialPlan()],
      pools: null
    });
  }
}));

export function getActivePlan(plans: DraftPlan[], activePlanId: number): DraftPlan | undefined {
  return plans.find((plan) => plan.id === activePlanId);
}
