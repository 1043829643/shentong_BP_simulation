export type Faction = 'radiant' | 'dire';
export type PickOrder = 'first' | 'second';
export type DraftAction = 'Ban' | 'Pick';
export type Page = 'setup' | 'bp' | 'overview';
export type BpViewMode = 'heroPool' | 'traditional';
export type Role = 1 | 2 | 3 | 4 | 5;
export type RoleKey = '1' | '2' | '3' | '4' | '5' | 'flex';
export type LaneId = 'safe' | 'mid' | 'off';
export type Tier = 'S' | 'A' | 'B' | 'C';
export type TeamId = 'NONE' | 'XG' | 'VG' | 'FALCONS' | 'LIQUID' | 'SPIRIT' | 'CUSTOM' | string;

export interface Hero {
  id: string;
  name: string;
  cn?: string;
  roles: Role[];
}

export interface DraftTurn {
  step: number;
  action: DraftAction;
  side: Faction;
}

export interface DraftStep extends DraftTurn {
  hero: Hero;
}

export interface DraftPlan {
  id: number;
  name: string;
  steps: DraftStep[];
  laneAssignments: Record<string, LaneId>;
}

export interface DraftConfig {
  faction: Faction;
  pickOrder: PickOrder;
  myTeam: TeamId;
  enemyTeam: TeamId;
}

export interface TierPool {
  S: Hero[];
  A: Hero[];
  B: Hero[];
  C: Hero[];
}

export interface FlatPool {
  flat: Hero[];
}

export type RolePool = TierPool | FlatPool;
export type HeroPool = Record<RoleKey, RolePool>;

export interface PoolsState {
  my: HeroPool;
  enemy: HeroPool;
  other: HeroPool;
}

export interface LaneGroup {
  id: LaneId;
  label: string;
  heroes: Hero[];
}

export interface LaneComparison {
  name: string;
  own: Hero[];
  enemy: Hero[];
  ownLabel: string;
  enemyLabel: string;
}

export interface ImportResult {
  pool: HeroPool | null;
  errors: string[];
  warnings: string[];
}
