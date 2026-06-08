import { createInitialPools } from '../domain/draft';
import type { BpViewMode, DraftConfig, DraftPlan, HeroPool, Page, PoolsState } from '../types';

const STORAGE_KEY = 'dota2bp:draft-state:v1';
const STORAGE_VERSION = 1;

export interface PersistedDraftState {
  version: number;
  savedAt: string;
  page: Page;
  bpViewMode: BpViewMode;
  config: DraftConfig;
  uploads: { myTeam: string; enemyTeam: string };
  importMessages: { myTeam: string; enemyTeam: string };
  customPools: { my?: HeroPool | null; enemy?: HeroPool | null };
  activePlanId: number;
  nextPlanId: number;
  plans: DraftPlan[];
}

export interface RestoredDraftState extends PersistedDraftState {
  pools: PoolsState | null;
}

export function saveDraftState(state: Omit<PersistedDraftState, 'version' | 'savedAt'>): void {
  if (!canUseStorage()) return;

  const payload: PersistedDraftState = {
    ...state,
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString()
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or unavailable in restricted browser contexts.
  }
}

export function loadDraftState(): RestoredDraftState | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDraftState;
    if (!isPersistedDraftState(parsed)) return null;

    return {
      ...parsed,
      bpViewMode: parsed.bpViewMode || 'heroPool',
      pools: parsed.page === 'setup' ? null : createInitialPools(parsed.config, parsed.customPools)
    };
  } catch {
    return null;
  }
}

export function clearDraftState(): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures so UI actions remain safe.
  }
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isPersistedDraftState(value: PersistedDraftState): value is PersistedDraftState {
  return Boolean(
    value &&
      value.version === STORAGE_VERSION &&
      (value.bpViewMode === undefined || value.bpViewMode === 'heroPool' || value.bpViewMode === 'traditional') &&
      value.config &&
      value.uploads &&
      value.importMessages &&
      value.customPools &&
      Array.isArray(value.plans) &&
      typeof value.activePlanId === 'number' &&
      typeof value.nextPlanId === 'number'
  );
}
